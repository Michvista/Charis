import "dotenv/config";
import dns from "node:dns";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

import { Worker } from "bullmq";
import { closeRedisConnection } from "./shared/redis";
import { startTaggingWorker } from "./processors/tagging.processor";
import { startComboWorker } from "./processors/combo.processor";
import { startVerdictWorker } from "./processors/verdict.processor";
import { startNotificationsWorker } from "./notifications/notification.worker";

const workers: Worker[] = [
  startTaggingWorker(),
  startComboWorker(),
  startVerdictWorker(),
  startNotificationsWorker(),
];

console.log(
  "job-worker listening on queues: wardrobe-tagging, combo-generation, outfit-verdict, notifications",
);

async function shutdown(signal: string): Promise<void> {
  console.log(`[job-worker] received ${signal}, closing workers...`);
  await Promise.allSettled(workers.map((worker) => worker.close()));
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
