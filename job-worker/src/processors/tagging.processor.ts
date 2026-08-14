import { Worker } from "bullmq";
import { createRedisConnection } from "../shared/redis";
import { callGeminiVision, parseGeminiJson } from "../shared/gemini";
import { sendJson } from "../shared/http";
import { TaggingJobData } from "../queues/tagging.queue";

interface GeminiTaggingResult {
  category: "TOP" | "BOTTOM" | "SHOES" | "OUTERWEAR" | "ACCESSORY" | "DRESS" | "BAG";
  primary_color: string;
  formality_level: number;
  season_tags: Array<"spring" | "summer" | "fall" | "winter">;
  fabric: string | null;
}

const TAGGING_PROMPT = `Analyze this clothing item image and return ONLY valid JSON with no markdown:
{
  category: one of TOP|BOTTOM|SHOES|OUTERWEAR|ACCESSORY|DRESS|BAG,
  primary_color: hex string e.g. #FF0000,
  formality_level: integer 1-5 where 1=very casual 5=black tie,
  season_tags: array containing any of spring|summer|fall|winter,
  fabric: string describing fabric or null
}`;

export function startTaggingWorker(): Worker<TaggingJobData> {
  return new Worker<TaggingJobData>(
    "wardrobe-tagging",
    async (job) => {
      const { itemId, imageUrl } = job.data;
      console.log(`[wardrobe-tagging] started job ${job.id} for item ${itemId}`);

      const patchStatus = async (
        tagging_status: "done" | "failed",
        body: Partial<GeminiTaggingResult> = {},
      ) => {
        await sendJson(
          `${process.env.DJANGO_INTERNAL_URL || "http://localhost:8000"}/api/wardrobe/items/${itemId}/`,
          "PATCH",
          {
            ...body,
            tagging_status,
          },
          {
            Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
          },
        );
      };

      try {
        const raw = await callGeminiVision(TAGGING_PROMPT, [imageUrl]);
        const parsed = parseGeminiJson<GeminiTaggingResult>(raw);

        await patchStatus("done", parsed);
        console.log(`[wardrobe-tagging] completed job ${job.id} for item ${itemId}`);
      } catch (error) {
        console.error(`[wardrobe-tagging] failed job ${job.id} for item ${itemId}`, error);
        try {
          await patchStatus("failed");
        } catch (patchError) {
          console.error(`[wardrobe-tagging] failed to mark item ${itemId} as failed`, patchError);
        }
        throw error;
      }
    },
    {
      connection: createRedisConnection() as any,
    },
  );
}
