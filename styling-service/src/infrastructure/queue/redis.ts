import IORedis from "ioredis";
import type { RedisOptions } from "ioredis";

function normalizeRedisUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);

  if (parsed.hostname.endsWith("upstash.io")) {
    const username = parsed.username || "default";
    const password = encodeURIComponent(parsed.password);
    return `rediss://${encodeURIComponent(username)}:${password}@${parsed.hostname}:${parsed.port || "6379"}`;
  }

  return rawUrl;
}

const REDIS_OPTIONS: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false,
  keepAlive: 30_000,
};

let sharedConnection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!sharedConnection) {
    const redisUrl = normalizeRedisUrl(process.env.REDIS_URL || "redis://localhost:6379");
    sharedConnection = new IORedis(redisUrl, REDIS_OPTIONS);
  }
  return sharedConnection;
}

export function createWorkerRedisConnection(): IORedis {
  return getRedisConnection().duplicate();
}
