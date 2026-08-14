import { Queue } from "bullmq";
import { createRedisConnection } from "../shared/redis";

export interface TaggingJobData {
  itemId: string;
  imageUrl: string;
}

export const taggingQueue = new Queue<TaggingJobData>("wardrobe-tagging", {
  connection: createRedisConnection() as any,
});
