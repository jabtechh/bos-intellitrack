import Link from "next/link";
import { Icon } from "@/components/icons";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import {
  announcementReaderWhere,
  canManageAnnouncements,
  requireAnnouncementViewer,
} from "@/lib/announcements/authorization";
import {
  AUDIENCE_LABELS,
  PRIORITY_LABELS,
  isExpired,
  statusTone,
} from "@/lib/announcements/domain";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const c = await requireAnnouncementViewer();
  const now = new Date();
  const rows = await prisma.announcement.findMany({
    where: announcementReaderWhere(c),
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take: 50,
    select: {
      id: true,
      title: true,
      content: true,
      priority: true,
      audience: true,
      publishedAt: true,
      expiresAt: true,
      isPinned: true,
    },
  });

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <section className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Announcements"
          title="Announcements"
          description="Stay informed with the latest notices and updates."
          actions={
            canManageAnnouncements(c) ? (
              <Link href="/announcements/manage" className="button button-secondary">
                <Icon name="settings" /> Manage
              </Link>
            ) : undefined
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
                    className="group grid gap-2 p-5 transition-colors hover:bg-canvas sm:grid-cols-[minmax(0,1fr)_8rem_7rem_auto] sm:items-center sm:px-6"
                  >
                    <div className="min-w-0">
                      <strong className="block truncate text-sm text-foreground">
                        {row.isPinned ? <Icon name="bell" className="mr-1 inline h-3 w-3" /> : null}
                        {row.title}
                      </strong>
                      <small className="text-muted">
                        {AUDIENCE_LABELS[row.audience]} · {PRIORITY_LABELS[row.priority]} priority
                      </small>
                    </div>
                    <span className="text-sm text-secondary">
                      {row.publishedAt
                        ? row.publishedAt.toLocaleDateString("en-PH", { dateStyle: "medium" })
                        : "—"}
                    </span>
                    <span className="text-sm text-secondary">
                      {row.expiresAt ? `Until ${row.expiresAt.toLocaleDateString("en-PH", { dateStyle: "medium" })}` : ""}
                    </span>
                    <StatusBadge tone={expired ? "neutral" : statusTone("PUBLISHED")}>
                      {expired ? "Expired" : "Active"}
                    </StatusBadge>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No announcements"
              description="Active announcements will appear here when published."
            />
          )}
        </section>
      </section>
    </div>
  );
}
