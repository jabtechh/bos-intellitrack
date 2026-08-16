// SERVER-ONLY MODULE: import only from Server Components, Server Actions, or trusted server services.
import { Prisma } from "@/generated/prisma/client";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { prisma } from "@/lib/prisma";
import { notificationInputSchema, type NotificationInput } from "./domain";
import { missingNotificationTableFallback, throwNotificationUnavailable } from "./errors";

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
  try {
    const items = await prisma.notification.findMany({ where: { recipientId: user.id, ...(options.unreadOnly ? { readAt: null } : {}) }, include: { actor: { select: actorSelect } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    return { initialized: true as const, items };
  } catch (error) {
    return missingNotificationTableFallback(error, { initialized: false as const, items: [] });
  }
}
export async function getUnreadNotificationCount() { const user = await requireCurrentUser(); try { return await prisma.notification.count({ where: { recipientId: user.id, readAt: null } }); } catch (error) { return missingNotificationTableFallback(error, 0); } }
export async function markNotificationRead(notificationId: string) { const user = await requireCurrentUser(); try { return await prisma.notification.updateMany({ where: { id: notificationId, recipientId: user.id, readAt: null }, data: { readAt: new Date() } }); } catch (error) { throwNotificationUnavailable(error); } }
export async function markAllNotificationsRead() { const user = await requireCurrentUser(); try { return await prisma.notification.updateMany({ where: { recipientId: user.id, readAt: null }, data: { readAt: new Date() } }); } catch (error) { throwNotificationUnavailable(error); } }
