import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveAnnouncement, cancelAnnouncement, publishAnnouncement } from "@/app/announcements/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { Icon } from "@/components/icons";
import { PageHeader, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import {
  announcementManageWhere,
  announcementReaderWhere,
  canManageAnnouncements,
  requireAnnouncementViewer,
} from "@/lib/announcements/authorization";
import {
  AUDIENCE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  isExpired,
  statusTone,
} from "@/lib/announcements/domain";

export const dynamic = "force-dynamic";

function formatDateTime(value: Date | null) {
  if (!value) return "—";
  return value.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AnnouncementDetail({
  params,
  searchParams,
}: {
  params: Promise<{ announcementId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const c = await requireAnnouncementViewer();
  const { announcementId } = await params;
  const { error } = await searchParams;
  const now = new Date();

  const isManager = canManageAnnouncements(c);
  const where = isManager
    ? { id: announcementId, ...announcementManageWhere(c) }
    : { id: announcementId, ...announcementReaderWhere(c) };

  const announcement = await prisma.announcement.findFirst({
    where,
    select: {
      id: true,
      title: true,
      content: true,
      priority: true,
      audience: true,
      status: true,
      isPinned: true,
      scheduledFor: true,
      publishedAt: true,
      expiresAt: true,
      archivedAt: true,
      createdAt: true,
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });

  if (!announcement) notFound();

  const expired = isExpired(announcement, now);
  const editable = isManager && ["DRAFT", "SCHEDULED"].includes(announcement.status);
  const canPublish = isManager && ["DRAFT", "SCHEDULED"].includes(announcement.status);
  const canArchive = isManager && announcement.status !== "ARCHIVED" && announcement.status !== "CANCELLED";
  const canCancel = isManager && ["DRAFT", "SCHEDULED"].includes(announcement.status);

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-12">
      <section className="mx-auto max-w-4xl">
        <PageHeader
          eyebrow="Announcement"
          title={announcement.title}
          description={`${PRIORITY_LABELS[announcement.priority]} priority · ${AUDIENCE_LABELS[announcement.audience]}`}
          actions={
            <>
              <StatusBadge tone={expired ? "neutral" : statusTone(announcement.status)}>
                {expired ? "Expired" : STATUS_LABELS[announcement.status]}
              </StatusBadge>
              {editable ? (
                <Link href={`/announcements/${announcement.id}/edit`} className="button button-secondary">
                  Edit
                </Link>
              ) : null}
            </>
          }
        />
        {error ? (
          <p className="inline-notice" role="alert">
            {error}
          </p>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="ui-card space-y-6 p-5 sm:p-7">
            <div>
              <h2 className="section-title">Message</h2>
              <p className="mt-2 whitespace-pre-wrap text-secondary">{announcement.content}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <p>
                <small className="text-muted">Published</small>
                <strong className="block">{formatDateTime(announcement.publishedAt)}</strong>
              </p>
              <p>
                <small className="text-muted">Expires</small>
                <strong className="block">{formatDateTime(announcement.expiresAt)}</strong>
              </p>
              <p>
                <small className="text-muted">Scheduled for</small>
                <strong className="block">{formatDateTime(announcement.scheduledFor)}</strong>
              </p>
              <p>
                <small className="text-muted">Created</small>
                <strong className="block">{formatDateTime(announcement.createdAt)}</strong>
              </p>
            </div>
          </section>
          <aside className="space-y-5">
            <section className="ui-card p-5">
              <h2 className="section-title">Details</h2>
              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="text-xs text-muted">Author</dt>
                  <dd>
                    {announcement.createdBy.firstName} {announcement.createdBy.lastName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Audience</dt>
                  <dd>{AUDIENCE_LABELS[announcement.audience]}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Priority</dt>
                  <dd>{PRIORITY_LABELS[announcement.priority]}</dd>
                </div>
                {announcement.isPinned ? (
                  <div>
                    <dt className="text-xs text-muted">Pinned</dt>
                    <dd>Highlighted in feeds</dd>
                  </div>
                ) : null}
              </dl>
            </section>
            {isManager ? (
              <section className="ui-card space-y-3 p-5">
                <h2 className="section-title">Actions</h2>
                {canPublish ? (
                  <form action={publishAnnouncement}>
                    <input type="hidden" name="announcementId" value={announcement.id} />
                    <ConfirmButton
                      className="button button-primary w-full"
                      message="Publish this announcement now? It will be visible to the selected audience."
                    >
                      <Icon name="check" /> Publish
                    </ConfirmButton>
                  </form>
                ) : null}
                {canArchive ? (
                  <form action={archiveAnnouncement}>
                    <input type="hidden" name="announcementId" value={announcement.id} />
                    <ConfirmButton
                      className="button button-secondary w-full"
                      message="Archive this announcement? It will no longer be visible to readers."
                    >
                      <Icon name="journal" /> Archive
                    </ConfirmButton>
                  </form>
                ) : null}
                {canCancel ? (
                  <form action={cancelAnnouncement}>
                    <input type="hidden" name="announcementId" value={announcement.id} />
                    <ConfirmButton
                      className="button button-secondary w-full"
                      message="Cancel this announcement? It will not be published."
                    >
                      Cancel
                    </ConfirmButton>
                  </form>
                ) : null}
                {announcement.status === "ARCHIVED" || announcement.status === "CANCELLED" ? (
                  <Link href="/announcements/manage" className="button button-secondary w-full">
                    <Icon name="arrow" /> Back to management
                  </Link>
                ) : null}
              </section>
            ) : null}
          </aside>
        </div>
      </section>
    </div>
  );
}