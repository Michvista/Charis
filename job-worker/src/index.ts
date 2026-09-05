import "dotenv/config";
import dns from "node:dns";
import http from "node:http";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

import { Worker } from "bullmq";
import { closeRedisConnection, getRedisConnection } from "./shared/redis";
import { startTaggingWorker } from "./processors/tagging.processor";
import { startComboWorker } from "./processors/combo.processor";
import { startVerdictWorker } from "./processors/verdict.processor";
import { startNotificationsWorker } from "./notifications/notification.worker";

// Log loudly if the worker cannot reach Redis — a silent mismatch between the
// publisher's REDIS_URL and the worker's is the #1 cause of jobs never running.
async function reportRedisStatus(): Promise<void> {
  try {
    const pong = await getRedisConnection().ping();
    console.log(`[job-worker] Redis reachable (${pong})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[job-worker] CRITICAL: cannot reach Redis — ${message}`);
    console.error(
      `[job-worker] check REDIS_URL=${process.env.REDIS_URL || "(unset, defaulting to localhost:6379)"}`,
    );
  }
}

const workers: Worker[] = [
  startTaggingWorker(),
  startComboWorker(),
  startVerdictWorker(),
  startNotificationsWorker(),
];

for (const worker of workers) {
  worker.on("error", (error) => {
    console.error(`[job-worker] ${worker.name} worker error:`, error?.message ?? error);
  });
  worker.on("failed", (job, err) => {
    console.error(`[job-worker] ${worker.name} job ${job?.id} failed:`, err?.message ?? err);
  });
}

void reportRedisStatus();

console.log(
  "job-worker listening on queues: wardrobe-tagging, combo-generation, outfit-verdict, notifications",
);

// Minimal HTTP health endpoint so the worker can be hosted as a Render
// (or similar) web service — Render requires services to bind the $PORT it
// assigns. The process still does all the queue work; this just keeps the
// platform's health checks happy and the dyno awake.
const healthPort = Number(process.env.PORT || 8080);
const healthServer = http.createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("ok");
});
healthServer.on("error", (error) => {
  // Port conflicts (e.g. something already on 8080 locally) must never take
  // down the workers — log and continue.
  console.warn(`[job-worker] health endpoint failed to start: ${error.message}`);
});
healthServer.listen(healthPort, () => {
  console.log(`[job-worker] health endpoint listening on port ${healthPort}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[job-worker] received ${signal}, closing workers...`);
  await Promise.allSettled(workers.map((worker) => worker.close()));
  healthServer.close();
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
