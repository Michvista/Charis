import { Queue } from "bullmq";
import { createRedisConnection } from "../shared/redis";

export interface ComboJobData {
  outfitId: string;
  wardrobeItems: Array<{
    id: string;
    imageUrl?: string;
    category: string;
    colorHex: string;
    formalityLevel?: number;
    seasonTags?: string[];
  }>;
  occasion: string;
  occasionFormality: number;
  targetSeason?: string;
  maxResults?: number;
}

export const comboQueue = new Queue<ComboJobData>("combo-generation", {
  connection: createRedisConnection() as any,
});
