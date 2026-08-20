import IORedis from "ioredis";
import { getRedisConnection } from "../shared/redis";

export type NotificationType =
  | "weather_change"
  | "outfit_reminder"
  | "packing_reminder";

export interface NotificationPayload {
  userId: string;
  type: NotificationType | string;
  message: string;
  dedupeKey: string;
}

/**
 * NotificationService deduplicates repeated notification jobs for a 1-hour window.
 * If Redis already contains the dedupe key, the notification is skipped so the
 * same reminder is not emitted twice in rapid succession.
 */
export class NotificationService {
  constructor(private readonly redis: IORedis = getRedisConnection()) {}

  /**
   * Sends a structured console notification unless Redis says this dedupe key
   * was already handled recently.
   *
   * Returns `false` when the dedupe key already exists and `true` only when the
   * notification was emitted and the dedupe key was stored for one hour.
   */
  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    const redisKey = `notif:sent:${payload.dedupeKey}`;
    const claimed = await this.redis.set(
      redisKey,
      `pending:${Date.now()}`,
      "EX",
      60 * 60,
      "NX",
    );

    if (claimed !== "OK") {
      return false;
    }

    try {
      const timestamp = new Date().toISOString();
      console.log("[notification]", {
        userId: payload.userId,
        type: payload.type,
        message: payload.message,
        timestamp,
      });

      await this.redis.set(redisKey, `sent:${timestamp}`, "EX", 60 * 60);
      return true;
    } catch (error) {
      await this.redis.del(redisKey);
      throw error;
    }
  }
}
