import Link from "next/link";
import { Icon } from "@/components/icons";
import { EmptyState, MetricCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import type { AnnouncementViewer } from "@/lib/announcements/authorization";
import { announcementReaderWhere } from "@/lib/announcements/authorization";
import { AUDIENCE_LABELS, PRIORITY_LABELS } from "@/lib/announcements/domain";

export async function AnnouncementReaderSummary({ viewer }: { viewer: AnnouncementViewer }) {
  const rows = await prisma.announcement.findMany({
    where: announcementReaderWhere(viewer),
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take: 3,
    select: { id: true, title: true, priority: true, audience: true, publishedAt: true, isPinned: true },
  });

  return (
    <section className="ui-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
        <div>
          <p className="eyebrow">Announcements</p>
          <h2 className="font-semibold text-foreground">Latest notices</h2>
        </div>
        <Link href="/announcements" className="button button-secondary">
          View all <Icon name="arrow" />
        </Link>
      </div>
      {rows.length ? (
        <div className="compact-list">
          {rows.map((row) => (
            <Link key={row.id} href={`/announcements/${row.id}`} className="flex items-center justify-between gap-4 border-b border-border p-4">
              <span>
                <strong>{row.isPinned ? <Icon name="bell" className="mr-1 inline h-3 w-3" /> : null}{row.title}</strong>
                <small className="block text-muted">
                  {AUDIENCE_LABELS[row.audience]} · {PRIORITY_LABELS[row.priority]} priority
                </small>
              </span>
              <span className="text-sm text-secondary">
                {row.publishedAt?.toLocaleDateString("en-PH", { dateStyle: "medium" }) ?? "—"}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-5">
          <EmptyState title="No active announcements" description="Published notices will appear here." />
        </div>
      )}
    </section>
  );
}

export async function AnnouncementManagerSummary({ viewer }: { viewer: AnnouncementViewer }) {
  const now = new Date();
  const where = viewer.kind === "REPRESENTATIVE" ? { companyId: viewer.companyId } : { id: "__not_manageable__" };

  const [active, scheduled, expired, drafts] = await Promise.all([
    prisma.announcement.count({
      where: { ...where, status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    }),
    prisma.announcement.count({ where: { ...where, status: "SCHEDULED" } }),
    prisma.announcement.count({
      where: { ...where, status: "PUBLISHED", expiresAt: { lt: now } },
    }),
    prisma.announcement.count({ where: { ...where, status: "DRAFT" } }),
  ]);

  return (
    <section className="dashboard-page pt-0">
      <div className="ui-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Announcements</p>
            <h2 className="font-semibold text-foreground">Overview</h2>
          </div>
          <Link href="/announcements/manage" className="button button-secondary">
            Manage <Icon name="arrow" />
          </Link>
        </div>
        <div className="metric-grid mt-5">
          <MetricCard label="Active" value={active} icon="bell" />
          <MetricCard label="Scheduled" value={scheduled} icon="clock" />
          <MetricCard label="Expired" value={expired} icon="journal" />
          <MetricCard label="Drafts" value={drafts} icon="review" />
        </div>
      </div>
    </section>
  );
}