import Link from "next/link";
import { Icon } from "@/components/icons";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { requireInternAssignment } from "@/lib/required-hours/intern-context";
import { prisma } from "@/lib/prisma";
import { workLogLabel } from "@/lib/work-logs/domain";

export default async function WorkLogs() {
  const user = await requireCurrentUser();
  if (user.role === "INTERN") await requireInternAssignment();
  const rows = user.role === "INTERN" ? await prisma.workLog.findMany({ where: { assignment: { internProfile: { userId: user.id } } }, orderBy: { workDate: "desc" } }) : [];
  return <div className="px-5 py-8 sm:px-8 lg:px-12 lg:py-12"><section className="mx-auto max-w-6xl">
    <PageHeader eyebrow="Internship documentation" title="Daily work logs" description="Capture your accomplishments, learning, and hours in one consistent record." actions={<Link href="/work-logs/new" className="button button-primary"><Icon name="plus" />Create work log</Link>} />
    <section className="ui-card overflow-hidden">
      {rows.length ? <div className="divide-y divide-border">{rows.map(row => <Link key={row.id} href={`/work-logs/${row.id}`} className="group grid gap-3 p-5 transition-colors hover:bg-stone-50 sm:grid-cols-[9rem_minmax(0,1fr)_auto_auto] sm:items-center sm:px-6">
        <time className="text-sm text-secondary">{row.workDate.toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" })}</time>
        <strong className="min-w-0 truncate text-sm text-brand-900">{row.title}</strong>
        <StatusBadge tone={row.status === "APPROVED" ? "success" : row.status === "SUBMITTED" ? "info" : row.status === "REJECTED" ? "danger" : "neutral"}>{workLogLabel(row.status)}</StatusBadge>
        <span className="flex items-center justify-between gap-3 text-xs text-muted sm:justify-end">{row.hoursReported ? `${row.hoursReported} hours` : "Hours not reported"}<Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
      </Link>)}</div> : <EmptyState title="No daily work logs yet" description="Create your first log after documenting today’s work, learning, and rendered hours." action={{ href: "/work-logs/new", label: "Create work log" }} />}
    </section>
  </section></div>;
}
