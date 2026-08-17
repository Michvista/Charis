// BullMQ queue publisher

import IORedis from "ioredis";
import { Queue } from "bullmq";

function normalizeRedisUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);

  if (parsed.hostname.endsWith("upstash.io")) {
    const username = parsed.username || "default";
    const password = encodeURIComponent(parsed.password);
    return `rediss://${encodeURIComponent(username)}:${password}@${parsed.hostname}:${parsed.port || "6379"}`;
  }

  return rawUrl;
}

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
    const redisUrl = normalizeRedisUrl(process.env.REDIS_URL || "redis://localhost:6379");
    this.connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.comboQueue = new Queue<ComboGenerationJobData>("combo-generation", {
      connection: this.connection as any,
    });
    this.verdictQueue = new Queue<VerdictJobData>("outfit-verdict", {
      connection: this.connection as any,
    });
  }

  async publishComboJob(data: ComboGenerationJobData): Promise<string> {
    const job = await this.comboQueue.add("combo-generation", data);
    return job.id || "job-queued";
  }

  async publishVerdictJob(data: VerdictJobData): Promise<string> {
    const job = await this.verdictQueue.add("outfit-verdict", data);
    return job.id || "job-queued";
  }
}
