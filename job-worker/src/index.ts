import "dotenv/config";
import { Worker } from "bullmq";
import { startTaggingWorker } from "./processors/tagging.processor";
import { startComboWorker } from "./processors/combo.processor";
import { startVerdictWorker } from "./processors/verdict.processor";

const workers: Worker[] = [
  startTaggingWorker(),
  startComboWorker(),
  startVerdictWorker(),
];

console.log("job-worker listening on queues: wardrobe-tagging, combo-generation, outfit-verdict");

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
