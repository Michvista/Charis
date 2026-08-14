import { Queue } from "bullmq";
import { createRedisConnection } from "../shared/redis";

export interface VerdictJobData {
  outfitId: string;
  items: Array<{
    imageUrl: string;
    category: string;
    colorHex: string;
    formalityLevel: number;
  }>;
  occasion: string;
  occasionFormality: number;
}

export const verdictQueue = new Queue<VerdictJobData>("outfit-verdict", {
  connection: createRedisConnection() as any,
});
