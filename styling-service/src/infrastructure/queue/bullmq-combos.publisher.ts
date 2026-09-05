// BullMQ queue publisher

import IORedis from "ioredis";
import { Queue } from "bullmq";
import { getRedisConnection } from "./redis";

export interface ComboGenerationJobData {
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

export class BullMQPublisher {
  private readonly connection: IORedis;
  private readonly comboQueue: Queue<ComboGenerationJobData>;
  private readonly verdictQueue: Queue<VerdictJobData>;

  constructor() {
    this.connection = getRedisConnection();
    this.comboQueue = new Queue<ComboGenerationJobData>("combo-generation", {
      connection: this.connection as any,
    });
    this.verdictQueue = new Queue<VerdictJobData>("outfit-verdict", {
      connection: this.connection as any,
    });
  }

  async publishComboJob(data: ComboGenerationJobData): Promise<string> {
    try {
      const job = await this.comboQueue.add("combo-generation", data);
      return job.id || "job-queued";
    } catch (error) {
      // Redis unreachable (e.g. missing REDIS_URL on the host). Combos have a
      // frontend fallback, so degrade gracefully instead of 500-ing the request.
      console.error("[combos] failed to publish combo job:", error);
      return "job-unavailable";
    }
  }

  async publishVerdictJob(data: VerdictJobData): Promise<string> {
    // Verdicts REQUIRE the worker, so a Redis failure stays loud here.
    const job = await this.verdictQueue.add("outfit-verdict", data);
    return job.id || "job-queued";
  }
}
