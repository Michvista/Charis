import assert from "node:assert/strict";
import { NotificationService } from "../src/notifications/notification.service";

class FakeRedis {
  private readonly store = new Map<string, string>();

  async get(key: string) {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string, mode?: string, ttl?: number, flag?: string) {
    if (mode === "EX" && flag === "NX" && this.store.has(key)) {
      return null;
    }

    this.store.set(key, value);
    return "OK";
  }

  async del(key: string) {
    return this.store.delete(key) ? 1 : 0;
  }

  has(key: string) {
    return this.store.has(key);
  }

  getValue(key: string) {
    return this.store.get(key);
  }
}

async function testFirstNotificationIsSent() {
  const redis = new FakeRedis();
  const service = new NotificationService(redis as never);

  const result = await service.sendNotification({
    userId: "user-1",
    type: "outfit_reminder",
    message: "Try the navy blazer tonight.",
    dedupeKey: "night-out-1",
  });

  assert.equal(result, true);
  assert.equal(redis.has("notif:sent:night-out-1"), true);
}

async function testDuplicateNotificationIsSkipped() {
  const redis = new FakeRedis();
  const service = new NotificationService(redis as never);

  await service.sendNotification({
    userId: "user-1",
    type: "outfit_reminder",
    message: "Try the navy blazer tonight.",
    dedupeKey: "night-out-2",
  });

  const result = await service.sendNotification({
    userId: "user-1",
    type: "outfit_reminder",
    message: "Try the navy blazer tonight.",
    dedupeKey: "night-out-2",
  });

  assert.equal(result, false);
}

async function testConcurrentDuplicateJobsCannotBothSend() {
  const redis = new FakeRedis();
  const service = new NotificationService(redis as never);

  const [first, second] = await Promise.all([
    service.sendNotification({
      userId: "user-1",
      type: "packing_reminder",
      message: "Pack the silk shirt.",
      dedupeKey: "packing-1",
    }),
    service.sendNotification({
      userId: "user-1",
      type: "packing_reminder",
      message: "Pack the silk shirt.",
      dedupeKey: "packing-1",
    }),
  ]);

  assert.equal([first, second].filter(Boolean).length, 1);
}

async function testFailedSendReleasesClaimForRetry() {
  const redis = new FakeRedis();
  const service = new NotificationService(redis as never);
  const originalLog = console.log;

  console.log = () => {
    throw new Error("boom");
  };

  await assert.rejects(
    () =>
      service.sendNotification({
        userId: "user-1",
        type: "weather_change",
        message: "Wear a lighter coat.",
        dedupeKey: "weather-1",
      }),
    /boom/,
  );

  assert.equal(redis.has("notif:sent:weather-1"), false);

  console.log = originalLog;

  const retry = await service.sendNotification({
    userId: "user-1",
    type: "weather_change",
    message: "Wear a lighter coat.",
    dedupeKey: "weather-1",
  });

  assert.equal(retry, true);
}

async function main() {
  await testFirstNotificationIsSent();
  await testDuplicateNotificationIsSkipped();
  await testConcurrentDuplicateJobsCannotBothSend();
  await testFailedSendReleasesClaimForRetry();
  console.log("notification-service tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
