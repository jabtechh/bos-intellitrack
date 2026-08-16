// SERVER-ONLY MODULE: import only from Server Components, Server Actions, or trusted server services.
import { Prisma } from "@/generated/prisma/client";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { prisma } from "@/lib/prisma";
import { notificationInputSchema, type NotificationInput } from "./domain";

const actorSelect = { id: true, firstName: true, lastName: true, profilePhotoPath: true } as const;

export async function createNotification(input: NotificationInput) {
  const data = notificationInputSchema.parse(input);
  try {
    return { created: true as const, notification: await prisma.notification.create({ data, include: { actor: { select: actorSelect } } }) };
  } catch (error) {
    if (data.dedupeKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { created: false as const, notification: null };
    }
    throw error;
  }
}

export async function getNotificationsForCurrentUser(options: { unreadOnly?: boolean } = {}) {
  const user = await requireCurrentUser();
  return prisma.notification.findMany({ where: { recipientId: user.id, ...(options.unreadOnly ? { readAt: null } : {}) }, include: { actor: { select: actorSelect } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
}
export async function getUnreadNotificationCount() { const user = await requireCurrentUser(); return prisma.notification.count({ where: { recipientId: user.id, readAt: null } }); }
export async function markNotificationRead(notificationId: string) { const user = await requireCurrentUser(); return prisma.notification.updateMany({ where: { id: notificationId, recipientId: user.id, readAt: null }, data: { readAt: new Date() } }); }
export async function markAllNotificationsRead() { const user = await requireCurrentUser(); return prisma.notification.updateMany({ where: { recipientId: user.id, readAt: null }, data: { readAt: new Date() } }); }
