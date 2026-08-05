import Link from "next/link";
import { redirect } from "next/navigation";
import { createAnnouncement } from "@/app/announcements/actions";
import { PageHeader } from "@/components/ui";
import {
  canManageAnnouncements,
  requireAnnouncementViewer,
} from "@/lib/announcements/authorization";
import { AUDIENCE_LABELS, AUDIENCE_OPTIONS } from "@/lib/announcements/domain";

export const dynamic = "force-dynamic";

export default async function NewAnnouncement({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const c = await requireAnnouncementViewer();
  if (!canManageAnnouncements(c)) redirect("/announcements");
  const { error } = await searchParams;

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-12">
      <section className="mx-auto max-w-3xl">
        <PageHeader
          eyebrow="Company Operations"
          title="New announcement"
          description="Draft a notice for your selected audience. You can publish it when ready."
        />
        {error ? (
          <p className="inline-notice" role="alert">
            {error}
          </p>
        ) : null}
        <form action={createAnnouncement} className="ui-card space-y-6 p-5 sm:p-7">
          <label className="field">
            <span>Title</span>
            <input name="title" maxLength={255} required />
          </label>
          <label className="field">
            <span>Content</span>
            <textarea name="content" rows={8} maxLength={10000} required />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="field">
              <span>Priority</span>
              <select name="priority" defaultValue="NORMAL">
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>
            <label className="field">
              <span>Audience</span>
              <select name="audience" defaultValue="ALL_USERS">
                {AUDIENCE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {AUDIENCE_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Schedule for (optional)</span>
              <input name="scheduledFor" type="datetime-local" />
              <small>Leave blank to save as a draft.</small>
            </label>
            <label className="field">
              <span>Expires at (optional)</span>
              <input name="expiresAt" type="datetime-local" />
              <small>Hide automatically after this time.</small>
            </label>
          </div>
          <div className="action-bar justify-end">
            <Link href="/announcements/manage" className="button button-secondary">
              Cancel
            </Link>
            <button className="button button-primary">Save announcement</button>
          </div>
        </form>
      </section>
    </div>
  );
}