import { Worker } from "bullmq";
import { createRedisConnection } from "../shared/redis";
import {
  callGeminiVision,
  parseGeminiJson,
  validateVerdictResult,
} from "../shared/gemini";
import { sendJson } from "../shared/http";
import { VerdictJobData } from "../queues/verdict.queue";

const getStylingServiceBaseUrl = (): string =>
  process.env.STYLING_SERVICE_INTERNAL_URL || "http://localhost:3000";

const getVerdictCompleteUrl = (outfitId: string): string =>
  `${getStylingServiceBaseUrl()}/verdict/${outfitId}/complete`;

const VERDICT_PROMPT = (occasion: string, formality: number) =>
  `These clothing items are for ${occasion} (formality level ${formality}/5). Do they work together? Check visual harmony, patterns, textures, and colour balance.
Return ONLY valid JSON with no markdown:
{
  verdict: works|doesnt_work|partially_works,
  confidence: number 0-100,
  visualNotes: string explaining why,
  patternClash: boolean,
  colourClash: boolean
}`;

export function startVerdictWorker(): Worker<VerdictJobData> {
  return new Worker<VerdictJobData>(
    "outfit-verdict",
    async (job) => {
      const { outfitId, items, occasion, occasionFormality } = job.data;
      console.log(`[outfit-verdict] started job ${job.id} for outfit ${outfitId}`);

      try {
        const imageUrls = items.map((item) => item.imageUrl);
        const raw = await callGeminiVision(VERDICT_PROMPT(occasion, occasionFormality), imageUrls);
        const parsed = validateVerdictResult(parseGeminiJson(raw));

        await sendJson(
          getVerdictCompleteUrl(outfitId),
          "PATCH",
          {
            aiVerdict: parsed,
            status: "done",
          },
          {
            Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
          },
        );

        console.log(`[outfit-verdict] completed job ${job.id} for outfit ${outfitId}`);
      } catch (error) {
        console.error(`[outfit-verdict] failed job ${job.id} for outfit ${outfitId}`, error);
        await sendJson(
          getVerdictCompleteUrl(outfitId),
          "PATCH",
          {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Verdict worker failed",
          },
          {
            Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
          },
        ).catch((patchError) => {
          console.error(`[outfit-verdict] failed to mark outfit ${outfitId} as failed`, patchError);
        });
        throw error;
      }
    },
    {
      connection: createRedisConnection() as any,
    },
  );
}
