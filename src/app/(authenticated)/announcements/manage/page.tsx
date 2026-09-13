import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import {
  announcementManageWhere,
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

export default async function ManageAnnouncements() {
  const c = await requireAnnouncementViewer();
  if (!canManageAnnouncements(c)) redirect("/announcements");

  const now = new Date();
  const rows = await prisma.announcement.findMany({
    where: announcementManageWhere(c),
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      priority: true,
      audience: true,
      status: true,
      publishedAt: true,
      expiresAt: true,
      updatedAt: true,
    },
  });

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <section className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Company Operations"
          title="Announcement management"
          description="Create, publish, and archive announcements for your audience."
          actions={
            <Link href="/announcements/new" className="button button-primary">
              <Icon name="plus" /> New announcement
            </Link>
          }
        />
        <section className="ui-card overflow-hidden">
          {rows.length ? (
            <div className="divide-y divide-border">
              {rows.map((row) => {
                const expired = isExpired(row, now);
                return (
                  <Link
                    key={row.id}
                    href={`/announcements/${row.id}`}
                    className="grid gap-3 p-5 transition-colors hover:bg-canvas sm:grid-cols-[minmax(0,1fr)_9rem_8rem_8rem_auto] sm:items-center sm:px-6"
                  >
                    <div className="min-w-0">
                      <strong className="block truncate text-sm text-foreground">{row.title}</strong>
                      <small className="text-muted">
                        {AUDIENCE_LABELS[row.audience]} · {PRIORITY_LABELS[row.priority]} priority
                      </small>
                    </div>
                    <span className="text-sm text-secondary">
                      {row.publishedAt
                        ? row.publishedAt.toLocaleDateString("en-PH", { dateStyle: "medium" })
                        : "Not published"}
                    </span>
                    <span className="text-sm text-secondary">
                      {row.expiresAt
                        ? `Until ${row.expiresAt.toLocaleDateString("en-PH", { dateStyle: "medium" })}`
                        : ""}
                    </span>
                    <span className="text-sm text-muted">
                      {row.updatedAt.toLocaleDateString("en-PH", { dateStyle: "medium" })}
                    </span>
                    <StatusBadge tone={expired ? "neutral" : statusTone(row.status)}>
                      {expired ? "Expired" : STATUS_LABELS[row.status]}
                    </StatusBadge>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No announcements"
              description="Create your first announcement to get started."
              action={{ href: "/announcements/new", label: "New announcement" }}
            />
          )}
        </section>
      </section>
    </div>
  );
}