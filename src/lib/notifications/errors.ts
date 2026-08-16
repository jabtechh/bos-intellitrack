import type { Prisma } from "@/generated/prisma/client";

export class NotificationUnavailableError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("Notifications are unavailable for this environment.", options);
    this.name = "NotificationUnavailableError";
  }
}

function identifiesNotificationTable(value: unknown) {
  if (typeof value !== "string") return false;
  const normalized = value.replaceAll('"', "").toLowerCase();
  return normalized === "notification" || normalized === "notifications" || normalized.endsWith(".notifications");
}

export function isMissingNotificationTableError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  if (!(error instanceof Error)) return false;
  const candidate = error as Error & { code?: unknown; meta?: Record<string, unknown> };
  if (candidate.code !== "P2021") return false;
  const meta = candidate.meta;
  const identifiers = [meta?.table, meta?.modelName].filter((value): value is string => typeof value === "string");
  if (identifiers.length > 0) return identifiers.some(identifiesNotificationTable);
  return /(?:public\.)?["']?notifications["']?|model\s+["']?Notification["']?/i.test(error.message);
}

export function missingNotificationTableFallback<T>(error: unknown, fallback: T): T {
  if (isMissingNotificationTableError(error)) return fallback;
  throw error;
}

export function throwNotificationUnavailable(error: unknown): never {
  if (isMissingNotificationTableError(error)) throw new NotificationUnavailableError({ cause: error });
  throw error;
}
