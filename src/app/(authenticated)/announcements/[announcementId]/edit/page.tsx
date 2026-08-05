import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateAnnouncement } from "@/app/announcements/actions";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import {
  announcementManageWhere,
  canManageAnnouncements,
  requireAnnouncementViewer,
} from "@/lib/announcements/authorization";
import { AUDIENCE_LABELS, AUDIENCE_OPTIONS } from "@/lib/announcements/domain";

export const dynamic = "force-dynamic";

function toDateTimeLocal(value: Date | null): string {
  if (!value) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export default async function EditAnnouncement({
  params,
  searchParams,
}: {
  params: Promise<{ announcementId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const c = await requireAnnouncementViewer();
  if (!canManageAnnouncements(c)) redirect("/announcements");
  const { announcementId } = await params;
  const { error } = await searchParams;

  const announcement = await prisma.announcement.findFirst({
    where: { id: announcementId, status: { in: ["DRAFT", "SCHEDULED"] }, ...announcementManageWhere(c) },
    select: {
      id: true,
      title: true,
      content: true,
      priority: true,
      audience: true,
      scheduledFor: true,
      expiresAt: true,
    },
  });

  if (!announcement) notFound();

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-12">
      <section className="mx-auto max-w-3xl">
        <PageHeader
          eyebrow="Company Operations"
          title="Edit announcement"
          description="Update the draft before publishing. Changes are saved to the existing record."
        />
        {error ? (
          <p className="inline-notice" role="alert">
            {error}
          </p>
        ) : null}
        <form action={updateAnnouncement} className="ui-card space-y-6 p-5 sm:p-7">
          <input type="hidden" name="announcementId" value={announcement.id} />
          <label className="field">
            <span>Title</span>
            <input name="title" maxLength={255} defaultValue={announcement.title} required />
          </label>
          <label className="field">
            <span>Content</span>
            <textarea name="content" rows={8} maxLength={10000} defaultValue={announcement.content} required />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="field">
              <span>Priority</span>
              <select name="priority" defaultValue={announcement.priority}>
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>
            <label className="field">
              <span>Audience</span>
              <select name="audience" defaultValue={announcement.audience}>
                {AUDIENCE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {AUDIENCE_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Schedule for (optional)</span>
              <input
                name="scheduledFor"
                type="datetime-local"
                defaultValue={toDateTimeLocal(announcement.scheduledFor)}
              />
              <small>Leave blank to save as a draft.</small>
            </label>
            <label className="field">
              <span>Expires at (optional)</span>
              <input
                name="expiresAt"
                type="datetime-local"
                defaultValue={toDateTimeLocal(announcement.expiresAt)}
              />
              <small>Hide automatically after this time.</small>
            </label>
          </div>
          <div className="action-bar justify-end">
            <Link href={`/announcements/${announcement.id}`} className="button button-secondary">
              Cancel
            </Link>
            <button className="button button-primary">Save changes</button>
          </div>
        </form>
      </section>
    </div>
  );
}