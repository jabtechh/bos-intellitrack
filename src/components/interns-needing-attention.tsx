// DEC-2026-022 — "Interns needing attention" panel for Supervisor, Coordinator and Representative home pages.
// Rows arrive already scoped and ranked (worst first) by loadInternStatuses.
import Link from "next/link";
import { StatusBadge } from "@/components/ui";
import { statusTone } from "@/lib/insights/intern-status";
import { statusCounts, type InternStatusRow } from "@/lib/insights/intern-status-data";

export function InternsNeedingAttention({ rows, viewAllHref, noun = "Interns", showSupervisor = false, filterable = true, limit = 6 }: { rows: InternStatusRow[]; viewAllHref: string; noun?: string; showSupervisor?: boolean; filterable?: boolean; limit?: number }) {
  const filterHref = (level: string) => (filterable ? `${viewAllHref}?status=${encodeURIComponent(level)}` : viewAllHref);
  const counts = statusCounts(rows);
  const flagged = rows.filter((row) => row.status.level === "At risk" || row.status.level === "Needs attention");
  return <section className="ui-card overflow-hidden" aria-labelledby="needing-attention-title" data-needing-attention>
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
      <div>
        <h2 id="needing-attention-title" className="font-semibold text-foreground">{noun} needing attention</h2>
        <p className="mt-1 text-xs text-muted">Rule-based signals from attendance, Work Logs, Tasks and Evaluations. Each flag shows its reason.</p>
      </div>
      <Link href={viewAllHref} className="button button-secondary">View all {noun}</Link>
    </header>
    <div className="grid grid-cols-3 gap-px bg-border text-center">
      {([["On track", counts.onTrack, "On track"], ["Needs attention", counts.attention, "Needs attention"], ["At risk", counts.atRisk, "At risk"]] as const).map(([label, value, level]) =>
        <Link key={label} href={filterHref(level)} className="bg-surface px-3 py-3 hover:bg-canvas" data-attention-count={label}>
          <strong className="block text-2xl text-foreground">{value}</strong>
          <StatusBadge tone={statusTone(level)}>{label}</StatusBadge>
        </Link>)}
    </div>
    {flagged.length ? <ul className="divide-y divide-border">
      {flagged.slice(0, limit).map((row) => <li key={row.assignmentId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2"><strong className="text-foreground">{row.name}</strong><StatusBadge tone={statusTone(row.status.level)}>{row.status.level}</StatusBadge></p>
          <p className="mt-1 text-xs text-secondary">{[...row.status.flags.map((flag) => flag.label), ...row.status.staffFlags].join(" · ")}{showSupervisor && row.supervisorName ? ` · Supervisor: ${row.supervisorName}` : ""}</p>
        </div>
        <Link href={`/profile/${row.internUserId}`} className="button button-secondary">View</Link>
      </li>)}
      {flagged.length > limit ? <li className="px-5 py-3 text-sm"><Link href={filterHref("At risk")} className="font-semibold text-primary hover:underline">{flagged.length - limit} more needing attention</Link></li> : null}
    </ul> : <div className="dashboard-positive-empty m-5"><span aria-hidden="true">✓</span><div><strong>All clear</strong><p>{counts.active ? `All ${counts.active} active ${noun.toLowerCase()} are on track.` : `No active ${noun.toLowerCase()}.`}</p></div></div>}
  </section>;
}
