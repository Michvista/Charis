import { Worker } from "bullmq";
import { createRedisConnection } from "../shared/redis";
import { callGeminiVision, parseGeminiJson } from "../shared/gemini";
import { sendJson } from "../shared/http";
import { ComboJobData } from "../queues/combo.queue";

interface ComboVisualResult {
  confirmed: boolean;
  visualScore: number;
  visualNotes: string;
}

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
      const { outfitId, wardrobeItems, occasionFormality, targetSeason, maxResults } = job.data;
      console.log(`[combo-generation] started job ${job.id} for outfit ${outfitId}`);

      const response = await sendJson<{ combinations: GeneratedCombo[]; status: string }>(
        `${process.env.STYLING_SERVICE_INTERNAL_URL || "http://localhost:3000"}/combos/generate-sync`,
        "POST",
        {
          wardrobeItems,
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
      const occasionLabel = targetSeason ? `${targetSeason} occasion` : "selected occasion";

      for (const combo of topCombos) {
        const imageUrls = combo.items
          .map((item) => item.imageUrl || wardrobeItems.find((wardrobeItem) => wardrobeItem.id === item.id)?.imageUrl)
          .filter((url): url is string => Boolean(url));
        const visualAnalysis = await callGeminiVision(COMBO_PROMPT(occasionLabel), imageUrls);
        const parsed = parseGeminiJson<ComboVisualResult>(visualAnalysis);
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
      const topRecommendations = reranked.slice(0, 3);

      await sendJson(
        `${process.env.STYLING_SERVICE_INTERNAL_URL || "http://localhost:3000"}/outfits/${outfitId}/complete`,
        "PATCH",
        {
          combos: topRecommendations,
          status: "done",
        },
        {
          Authorization: `Bearer ${process.env.INTERNAL_API_KEY || ""}`,
        },
      );

      console.log(`[combo-generation] completed job ${job.id} for outfit ${outfitId}`);
    },
    {
      connection: createRedisConnection() as any,
    },
  );
}
