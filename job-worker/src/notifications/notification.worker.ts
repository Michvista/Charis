import { Worker } from "bullmq";
import { createWorkerOptions } from "../shared/worker-options";
import {
  NotificationPayload,
  NotificationService,
} from "./notification.service";

export type NotificationJobType = "weather_change" | "outfit_reminder" | "packing_reminder";

export interface NotificationJobData extends NotificationPayload {
  type: NotificationJobType;
}

export function startNotificationsWorker(): Worker<NotificationJobData> {
  const notificationService = new NotificationService();

  return new Worker<NotificationJobData>(
    "notifications",
    async (job) => {
      const { userId, type, message, dedupeKey } = job.data;

      try {
        const sent = await notificationService.sendNotification({
          userId,
          type,
          message,
          dedupeKey,
        });

        if (!sent) {
          console.log(`Notification skipped (duplicate): ${dedupeKey}`);
          return;
        }

        console.log(`Notification sent: ${type} to user ${userId}`);
      } catch (error) {
        console.error(`[notifications] failed job ${job.id}`, error);
        throw error;
      }
    },
    createWorkerOptions(),
  );
}
