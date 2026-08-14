import IORedis from "ioredis";

function normalizeRedisUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);

  if (parsed.hostname.endsWith("upstash.io")) {
    const password = encodeURIComponent(parsed.password);
    return `rediss://:${password}@${parsed.hostname}:${parsed.port || "6379"}`;
  }

  return rawUrl;
}

export function createRedisConnection(): IORedis {
  const redisUrl = normalizeRedisUrl(process.env.REDIS_URL || "redis://localhost:6379");
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });
}
