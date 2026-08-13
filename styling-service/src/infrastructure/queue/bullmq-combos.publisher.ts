// BullMQ combos publisher

import { Queue } from "bullmq";

export class BullMQCombosPublisher {
  private comboQueue: Queue;

  constructor() {
    this.comboQueue = new Queue("styling-combos-queue", {
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    });
  }

  async publishComboJob(userId: string, items: any[]): Promise<string> {
    const job = await this.comboQueue.add("generate-combos-async", {
      userId,
      items,
      requestedAt: new Date().toISOString(),
    });
    return job.id || "job-queued";
  }
}