// DEC-2026-022 — the Intern's own status on the dashboard, with friendly reminders and where to fix each one.
import Link from "next/link";
import { StatusBadge } from "@/components/ui";
import { statusTone, type StatusFlagKey } from "@/lib/insights/intern-status";
import { loadInternStatuses } from "@/lib/insights/intern-status-data";

const FIX: Record<StatusFlagKey, { href: string; action: string }> = {
  BEHIND_HOURS: { href: "/attendance", action: "View attendance" },
  LATE_OFTEN: { href: "/attendance/history", action: "View attendance" },
  MISSING_ATTENDANCE: { href: "/attendance/history", action: "View attendance" },
  MISSING_WORK_LOGS: { href: "/work-logs", action: "Write Work Logs" },
  OVERDUE_TASKS: { href: "/tasks", action: "Open Tasks" },
  LOW_EVALUATION: { href: "/evaluations", action: "Read feedback" },
};

/** The caller passes the Intern's own, already-authorized assignment id. */
export async function MyStatusCard({ assignmentId }: { assignmentId: string }) {
  const [row] = await loadInternStatuses({ id: assignmentId });
  if (!row || row.status.level === "Completed") return null;
  const { level, flags } = row.status;
  return <section className="ui-card mb-5 p-5" aria-labelledby="my-status-title" data-my-status={level}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">My internship status</p>
        <h2 id="my-status-title" className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold text-foreground">{level === "On track" ? "You're on track" : level === "At risk" ? "Let's get back on track" : "A few things need your attention"} <StatusBadge tone={statusTone(level)}>{level}</StatusBadge></h2>
      </div>
    </div>
    {flags.length ? <ul className="mt-3 grid gap-2 sm:grid-cols-2">
      {flags.map((flag) => <li key={flag.key} className="flex items-center justify-between gap-3 rounded-md border border-border bg-canvas px-3 py-2 text-sm">
        <span className="text-foreground">{flag.label}</span>
        <Link href={FIX[flag.key].href} className="shrink-0 text-xs font-semibold text-primary hover:underline">{FIX[flag.key].action}</Link>
      </li>)}
    </ul> : <p className="mt-2 text-sm text-secondary">Your attendance, Work Logs, Tasks and Evaluations are all up to date. Keep it up!</p>}
  </section>;
}
