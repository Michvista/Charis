import { WorkerOptions } from "bullmq";
import { createWorkerRedisConnection } from "../shared/redis";

/** Shared BullMQ worker options — one Redis duplicate per worker, slower stall checks for Upstash. */
export function createWorkerOptions(): WorkerOptions {
  return {
    connection: createWorkerRedisConnection() as WorkerOptions["connection"],
    stalledInterval: 120_000,
    lockDuration: 120_000,
  };
}
