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
import {
  announcementInputSchema,
  safeAnnouncementError,
  toTimestamp,
} from "@/lib/announcements/domain";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function refresh(id?: string) {
  revalidatePath("/announcements");
  revalidatePath("/announcements/manage");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/announcements/${id}`);
}

export async function createAnnouncement(formData: FormData) {
  const c = await requireAnnouncementViewer();
  if (!canManageAnnouncements(c)) redirect("/announcements");

  const parsed = announcementInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) fail("/announcements/new", parsed.error.issues[0]?.message ?? "Review the announcement.");

  const companyId = c.kind === "REPRESENTATIVE" ? c.companyId : c.kind === "ADMIN" ? await resolveBoCoffeeCompanyId() : null;
  if (!companyId) fail("/announcements/new", "Your office could not be resolved.");

  const scheduledFor = toTimestamp(parsed.data.scheduledFor);
  const status = scheduledFor ? "SCHEDULED" : "DRAFT";

  const announcement = await prisma.announcement.create({
    data: {
      id: randomUUID(),
      createdById: c.user.id,
      companyId,
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
  if (!canManageAnnouncements(c)) redirect("/announcements");

  const id = String(formData.get("announcementId"));
  const parsed = announcementInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) fail(`/announcements/${id}/edit`, parsed.error.issues[0]?.message ?? "Review the announcement.");

  const companyId = c.kind === "REPRESENTATIVE" ? c.companyId : c.kind === "ADMIN" ? await resolveBoCoffeeCompanyId() : null;
  if (!companyId) fail(`/announcements/${id}/edit`, "Your office could not be resolved.");

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
  if (!canManageAnnouncements(c)) redirect("/announcements");

  const id = String(formData.get("announcementId"));
  const now = new Date();

  const result = await prisma.announcement.updateMany({
    where: {
      id,
      status: { in: ["DRAFT", "SCHEDULED"] },
      ...announcementManageWhere(c),
    },
    data: {
      status: "PUBLISHED",
      publishedAt: now,
    },
  });

  if (result.count !== 1) fail(`/announcements/${id}`, safeAnnouncementError());
  refresh(id);
  redirect(`/announcements/${id}`);
}

export async function archiveAnnouncement(formData: FormData) {
  const c = await requireAnnouncementViewer();
  if (!canManageAnnouncements(c)) redirect("/announcements");

  const id = String(formData.get("announcementId"));
  const now = new Date();

  const result = await prisma.announcement.updateMany({
    where: {
      id,
      status: { not: "ARCHIVED" },
      ...announcementManageWhere(c),
    },
    data: {
      status: "ARCHIVED",
      archivedAt: now,
    },
  });

  if (result.count !== 1) fail(`/announcements/${id}`, safeAnnouncementError());
  refresh(id);
  redirect(`/announcements/${id}`);
}

export async function cancelAnnouncement(formData: FormData) {
  const c = await requireAnnouncementViewer();
  if (!canManageAnnouncements(c)) redirect("/announcements");

  const id = String(formData.get("announcementId"));

  const result = await prisma.announcement.updateMany({
    where: {
      id,
      status: { in: ["DRAFT", "SCHEDULED"] },
      ...announcementManageWhere(c),
    },
    data: {
      status: "CANCELLED",
    },
  });

  if (result.count !== 1) fail(`/announcements/${id}`, safeAnnouncementError());
  refresh(id);
  redirect(`/announcements/${id}`);
}

async function resolveBoCoffeeCompanyId(): Promise<string | null> {
  const company = await prisma.company.findFirst({
    where: { companyCode: "BO_MAIN_OFFICE", isActive: true },
    select: { id: true },
  });
  return company?.id ?? null;
}