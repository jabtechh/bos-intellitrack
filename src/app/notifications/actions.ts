"use server";
import { revalidatePath } from "next/cache";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications/service";
export async function markNotificationReadAction(id: string) { await markNotificationRead(id); revalidatePath("/notifications"); }
export async function markAllNotificationsReadAction() { await markAllNotificationsRead(); revalidatePath("/notifications"); }
