import { z } from "zod";
import type { AnnouncementAudience, AnnouncementPriority, AnnouncementStatus, UserRole } from "@/generated/prisma/enums";

export const PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  ALL_USERS: "Everyone",
  INTERNS: "Interns",
  SUPERVISORS: "Supervisors",
  COORDINATORS: "School Coordinators",
  REPRESENTATIVES: "Representatives",
  ADMINISTRATORS: "Administrators",
  SCHOOL: "School",
  COMPANY: "Office staff",
};

export const STATUS_LABELS: Record<AnnouncementStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  EXPIRED: "Expired",
  ARCHIVED: "Archived",
  CANCELLED: "Cancelled",
};

export const AUDIENCE_OPTIONS: AnnouncementAudience[] = [
  "ALL_USERS",
  "INTERNS",
  "SUPERVISORS",
  "COORDINATORS",
  "REPRESENTATIVES",
  "ADMINISTRATORS",
  "COMPANY",
];

const optionalTimestamp = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a valid date and time.")
    .optional(),
);

export const announcementInputSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(255, "Title is too long."),
    content: z.string().trim().min(1, "Content is required.").max(10000, "Content is too long."),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
    audience: z.enum([
      "ALL_USERS",
      "INTERNS",
      "SUPERVISORS",
      "COORDINATORS",
      "REPRESENTATIVES",
      "ADMINISTRATORS",
      "COMPANY",
    ]),
    scheduledFor: optionalTimestamp,
    expiresAt: optionalTimestamp,
  })
  .superRefine((data, ctx) => {
    if (data.scheduledFor && data.expiresAt && new Date(data.expiresAt) <= new Date(data.scheduledFor)) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Expiration cannot be before publication." });
    }
    if (data.expiresAt && !data.scheduledFor && new Date(data.expiresAt) <= new Date()) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Expiration must be in the future." });
    }
  });

export function isExpired(announcement: { expiresAt: Date | null }, now = new Date()) {
  return Boolean(announcement.expiresAt && announcement.expiresAt < now);
}

export function isLive(announcement: { status: AnnouncementStatus; publishedAt: Date | null; expiresAt: Date | null }, now = new Date()) {
  if (announcement.status !== "PUBLISHED" || !announcement.publishedAt || announcement.publishedAt > now) return false;
  if (announcement.expiresAt && announcement.expiresAt <= now) return false;
  return true;
}

export function canManageAnnouncements(role: UserRole) {
  return role === "REPRESENTATIVE" || role === "ADMIN";
}

export type AnnouncementViewerKind =
  | "ADMIN"
  | "REPRESENTATIVE"
  | "INTERN"
  | "SUPERVISOR"
  | "COORDINATOR";

export function audienceMatchesRole(
  audience: AnnouncementAudience,
  kind: AnnouncementViewerKind,
  hasCompany: boolean = false,
): boolean {
  if (audience === "ALL_USERS") return true;
  if (kind === "ADMIN") return true;

  if (audience === "INTERNS") return kind === "INTERN";
  if (audience === "SUPERVISORS") return kind === "SUPERVISOR";
  if (audience === "COORDINATORS") return kind === "COORDINATOR";
  if (audience === "REPRESENTATIVES") return kind === "REPRESENTATIVE";
  if (audience === "ADMINISTRATORS") return false;

  if (audience === "SCHOOL") {
    return kind === "INTERN" || kind === "COORDINATOR";
  }

  if (audience === "COMPANY") {
    if (kind === "SUPERVISOR" || kind === "REPRESENTATIVE") return true;
    if (kind === "INTERN" && hasCompany) return true;
    return false;
  }

  return false;
}

export function safeAnnouncementError() {
  return "The announcement could not be updated. Refresh and try again.";
}

export function toTimestamp(value: string | undefined) {
  return value ? new Date(value) : null;
}

export function statusTone(status: AnnouncementStatus): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "PUBLISHED") return "success";
  if (status === "SCHEDULED") return "info";
  if (status === "ARCHIVED" || status === "CANCELLED" || status === "EXPIRED") return "neutral";
  return "warning";
}