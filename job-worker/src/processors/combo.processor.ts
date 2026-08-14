import { Worker } from "bullmq";
import { createRedisConnection } from "../shared/redis";
import {
  callGeminiVision,
  parseGeminiJson,
  validateComboVisualResult,
} from "../shared/gemini";
import { sendJson } from "../shared/http";
import { ComboJobData } from "../queues/combo.queue";

const getStylingServiceBaseUrl = (): string =>
  process.env.STYLING_SERVICE_INTERNAL_URL || "http://localhost:3000";

const getVerdictCompleteUrl = (outfitId: string): string =>
  `${getStylingServiceBaseUrl()}/verdict/${outfitId}/complete`;

interface GeneratedCombo {
  items: Array<{
    id: string;
    imageUrl?: string;
    category: string;
    colorHex: string;
    formalityLevel?: number;
    seasonTags?: string[];
  }>;
  score: number;
  comboId?: string;
  finalScore?: number;
  visualScore?: number;
  visualNotes?: string;
  confirmed?: boolean;
}

const COMBO_PROMPT = (occasion: string) =>
  `These clothing items are intended for ${occasion}. Do they work together visually? Check pattern clashes, colour harmony, and overall aesthetic.
Return ONLY valid JSON with no markdown:
{
  confirmed: boolean,
  visualScore: number 0-100,
  visualNotes: string one sentence max
}`;

export function startComboWorker(): Worker<ComboJobData> {
  return new Worker<ComboJobData>(
    "combo-generation",
    async (job) => {
      const {
        outfitId,
        wardrobeItems,
        occasion,
        occasionFormality,
        targetSeason,
        maxResults,
      } = job.data;
      console.log(`[combo-generation] started job ${job.id} for outfit ${outfitId}`);

      try {
        const response = await sendJson<{ combinations: GeneratedCombo[]; status: string }>(
          `${process.env.STYLING_SERVICE_INTERNAL_URL || "http://localhost:3000"}/combos/generate-sync`,
          "POST",
          {
            wardrobeItems,
            occasion,
            occasionFormality,
            targetSeason,
            maxResults,
          },
          {
            Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
          },
        );

        const topCombos = (response.combinations || []).slice(0, 10);
        const reranked: Array<GeneratedCombo & { finalScore: number }> = [];

        for (const combo of topCombos) {
          const imageUrls = combo.items
            .map((item) => item.imageUrl || wardrobeItems.find((wardrobeItem) => wardrobeItem.id === item.id)?.imageUrl)
            .filter((url): url is string => Boolean(url));
          const visualAnalysis = await callGeminiVision(
            `${COMBO_PROMPT(occasion)}${targetSeason ? ` Season context: ${targetSeason}.` : ""}`,
            imageUrls,
          );
          const parsed = validateComboVisualResult(parseGeminiJson(visualAnalysis));
          const finalScore = Number(combo.score) * 0.5 + Number(parsed.visualScore) * 0.5;

          reranked.push({
            ...combo,
            confirmed: parsed.confirmed,
            visualScore: parsed.visualScore,
            visualNotes: parsed.visualNotes,
            finalScore,
          });
        }

        reranked.sort((left, right) => right.finalScore - left.finalScore);

        await sendJson(
          getVerdictCompleteUrl(outfitId),
          "PATCH",
          {
            combos: reranked.slice(0, 10),
            status: "done",
          },
          {
            Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
          },
        );

        console.log(`[combo-generation] completed job ${job.id} for outfit ${outfitId}`);
      } catch (error) {
        console.error(`[combo-generation] failed job ${job.id} for outfit ${outfitId}`, error);
        await sendJson(
          getVerdictCompleteUrl(outfitId),
          "PATCH",
          {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Combo worker failed",
          },
          {
            Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
          },
        ).catch((patchError) => {
          console.error(`[combo-generation] failed to mark outfit ${outfitId} as failed`, patchError);
        });
        throw error;
      }
    },
    {
      connection: createRedisConnection() as any,
    },
  );
}
