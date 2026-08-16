import { z } from "zod";

export const NOTIFICATION_TYPES = [
  "attendance.exception", "attendance.correction.submitted", "attendance.correction.resolved",
  "work_log.submitted", "work_log.approved", "work_log.revision_requested",
  "task.assigned", "task.submitted", "task.accepted", "task.revision_requested",
  "document.approved", "document.replacement_requested", "evaluation.finalized",
  "announcement.published", "message.received",
] as const;

export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const safeNotificationHrefSchema = z.string().max(2048).refine(
  (value) => value.startsWith("/") && !value.startsWith("//") && !/[\\\r\n]/.test(value),
  "Notification links must be safe internal paths.",
);

export const notificationInputSchema = z.object({
  recipientId: z.uuid(), actorId: z.uuid().nullable().optional(), type: notificationTypeSchema,
  title: z.string().trim().min(1).max(255), body: z.string().trim().max(2000).nullable().optional(),
  href: safeNotificationHrefSchema.nullable().optional(), entityType: z.string().trim().min(1).max(50).nullable().optional(),
  entityId: z.uuid().nullable().optional(), dedupeKey: z.string().trim().min(1).max(150).nullable().optional(),
}).strict();

export type NotificationInput = z.infer<typeof notificationInputSchema>;
export function formatNotificationBadge(count: number) { return count <= 0 ? null : count > 99 ? "99+" : String(count); }
