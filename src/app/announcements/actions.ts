"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  announcementManageWhere,
  canManageAnnouncements,
  requireAnnouncementViewer,
} from "@/lib/announcements/authorization";
import { resolveAnnouncementRecipientIds } from "@/lib/announcements/recipients";
import {
  announcementInputSchema,
  safeAnnouncementError,
  toTimestamp,
} from "@/lib/announcements/domain";
import { createNotificationsInTransaction } from "@/lib/notifications/service";
import { NotificationUnavailableError, throwNotificationUnavailable } from "@/lib/notifications/errors";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function refresh(id?: string) {
  revalidatePath("/announcements");
  revalidatePath("/announcements/manage");
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/announcements/${id}`);
}

export async function createAnnouncement(formData: FormData) {
  const c = await requireAnnouncementViewer();
  if (!canManageAnnouncements(c) || c.kind !== "REPRESENTATIVE") redirect("/announcements");

  const parsed = announcementInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) fail("/announcements/new", parsed.error.issues[0]?.message ?? "Review the announcement.");

  const scheduledFor = toTimestamp(parsed.data.scheduledFor);
  const status = scheduledFor ? "SCHEDULED" : "DRAFT";

  const announcement = await prisma.announcement.create({
    data: {
      id: randomUUID(),
      createdById: c.user.id,
      companyId: c.companyId,
      title: parsed.data.title,
      content: parsed.data.content,
      priority: parsed.data.priority,
      audience: parsed.data.audience,
      status,
      scheduledFor,
      expiresAt: toTimestamp(parsed.data.expiresAt),
    },
  });

  refresh(announcement.id);
  redirect(`/announcements/${announcement.id}`);
}

export async function updateAnnouncement(formData: FormData) {
  const c = await requireAnnouncementViewer();
  if (!canManageAnnouncements(c) || c.kind !== "REPRESENTATIVE") redirect("/announcements");

  const id = String(formData.get("announcementId"));
  const parsed = announcementInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) fail(`/announcements/${id}/edit`, parsed.error.issues[0]?.message ?? "Review the announcement.");

  const scheduledFor = toTimestamp(parsed.data.scheduledFor);
  const status = scheduledFor ? "SCHEDULED" : "DRAFT";

  const result = await prisma.announcement.updateMany({
    where: {
      id,
      status: { in: ["DRAFT", "SCHEDULED"] },
      ...announcementManageWhere(c),
    },
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      priority: parsed.data.priority,
      audience: parsed.data.audience,
      status,
      scheduledFor,
      expiresAt: toTimestamp(parsed.data.expiresAt),
    },
  });

  if (result.count !== 1) fail(`/announcements/${id}/edit`, safeAnnouncementError());
  refresh(id);
  redirect(`/announcements/${id}`);
}

export async function publishAnnouncement(formData: FormData) {
  const c = await requireAnnouncementViewer();
  if (!canManageAnnouncements(c) || c.kind !== "REPRESENTATIVE") redirect("/announcements");

  const id = String(formData.get("announcementId"));
  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      const announcement = await tx.announcement.findFirst({
        where: {
          id,
          status: { in: ["DRAFT", "SCHEDULED"] },
          ...announcementManageWhere(c),
        },
        select: { id: true, title: true, content: true, audience: true, companyId: true },
      });
      if (!announcement?.companyId) throw new AnnouncementPublishError("This announcement is unavailable or already published.");

      const recipientIds = await resolveAnnouncementRecipientIds(tx, announcement.companyId, announcement.audience);
      const claimed = await tx.announcement.updateMany({
        where: {
          id: announcement.id,
          status: { in: ["DRAFT", "SCHEDULED"] },
          ...announcementManageWhere(c),
        },
        data: { status: "PUBLISHED", publishedAt: now, scheduledFor: null },
      });
      if (claimed.count !== 1) throw new AnnouncementPublishError("This announcement changed before it could be published.");

      if (recipientIds.length) {
        await createNotificationsInTransaction(
          tx,
          recipientIds.map((recipientId) => ({
            recipientId,
            actorId: c.user.id,
            type: "announcement.published" as const,
            title: announcement.title,
            body: announcement.content.slice(0, 500),
            href: `/announcements/${announcement.id}`,
            entityType: "announcement",
            entityId: announcement.id,
            dedupeKey: `announcement:${announcement.id}:published`,
          })),
        );
      }
    });
  } catch (error) {
    try {
      throwNotificationUnavailable(error);
    } catch (notificationError) {
      if (notificationError instanceof NotificationUnavailableError) {
        fail(`/announcements/${id}`, "Publishing is unavailable because in-app notifications are not initialized for this environment.");
      }
      if (error instanceof AnnouncementPublishError) fail(`/announcements/${id}`, error.message);
      fail(`/announcements/${id}`, safeAnnouncementError());
    }
  }

  refresh(id);
  redirect(`/announcements/${id}?published=1`);
}

export async function archiveAnnouncement(formData: FormData) {
  const c = await requireAnnouncementViewer();
  if (!canManageAnnouncements(c) || c.kind !== "REPRESENTATIVE") redirect("/announcements");

  const id = String(formData.get("announcementId"));
  const result = await prisma.announcement.updateMany({
    where: { id, status: { not: "ARCHIVED" }, ...announcementManageWhere(c) },
    data: { status: "ARCHIVED", archivedAt: new Date() },
  });
  if (result.count !== 1) fail(`/announcements/${id}`, safeAnnouncementError());
  refresh(id);
  redirect(`/announcements/${id}`);
}

export async function cancelAnnouncement(formData: FormData) {
  const c = await requireAnnouncementViewer();
  if (!canManageAnnouncements(c) || c.kind !== "REPRESENTATIVE") redirect("/announcements");

  const id = String(formData.get("announcementId"));
  const result = await prisma.announcement.updateMany({
    where: { id, status: { in: ["DRAFT", "SCHEDULED"] }, ...announcementManageWhere(c) },
    data: { status: "CANCELLED" },
  });
  if (result.count !== 1) fail(`/announcements/${id}`, safeAnnouncementError());
  refresh(id);
  redirect(`/announcements/${id}`);
}

class AnnouncementPublishError extends Error {}
