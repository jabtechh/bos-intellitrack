// DEC-2026-021 Amendment A — the three intern-visible certificate checks, with exactly what is missing.
import Link from "next/link";
import { hoursText } from "@/lib/certificates/domain";
import type { CertificateEligibility } from "@/lib/certificates/eligibility";

const dateLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" });

export function CertificateChecklist({ eligibility, compact = false }: { eligibility: CertificateEligibility; compact?: boolean }) {
  const { hours, workLogs, gettingStarted } = eligibility;
  const done = [hours.done, workLogs.done, gettingStarted.done].filter(Boolean).length;
  return <section className="certificate-checklist" aria-label="Certificate checklist" data-certificate-checklist data-checks-done={done}>
    {!compact ? <p className="text-sm text-secondary">{done} of 3 done. Your certificate is issued automatically as soon as all three are complete.</p> : null}
    <ul>
      <Check done={hours.done} title="Required hours" detail={hours.requiredHours === null ? "Your required hours have not been confirmed yet." : `${hoursText(hours.creditedMinutes)} of ${hours.requiredHours} hours credited from approved Attendance.`}
        action={!hours.done ? <Link href="/attendance">Go to Attendance</Link> : null} />
      <Check done={workLogs.done} title="Daily Work Logs" detail={workLogs.attendedDays === 0 ? "No attended days yet." : `${workLogs.loggedDays} of ${workLogs.attendedDays} attended days have a submitted Work Log.`}
        extra={!workLogs.done && workLogs.missingLogDays.length ? <p className="certificate-check-missing">Missing: {workLogs.missingLogDays.slice(0, 6).map(dateLabel).join(", ")}{workLogs.missingLogDays.length > 6 ? ` and ${workLogs.missingLogDays.length - 6} more` : ""}</p> : null}
        action={!workLogs.done ? <Link href="/work-logs">Open Work Logs</Link> : null} />
      <Check done={gettingStarted.done} title="Getting started" detail={`${gettingStarted.profileComplete ? "Profile complete" : "Profile incomplete"} · ${gettingStarted.documentsSubmitted} of ${gettingStarted.documentsRequired} required documents submitted.`}
        extra={!gettingStarted.done && gettingStarted.missingDocuments.length ? <p className="certificate-check-missing">Missing: {gettingStarted.missingDocuments.join(", ")}</p> : null}
        action={!gettingStarted.done ? <Link href="/onboarding">Open Getting started</Link> : null} />
    </ul>
  </section>;
}

function Check({ done, title, detail, extra, action }: { done: boolean; title: string; detail: string; extra?: React.ReactNode; action?: React.ReactNode }) {
  return <li className={done ? "is-done" : undefined} data-check={title}>
    <span aria-hidden="true">{done ? "✓" : "○"}</span>
    <div><strong>{title}<span className="sr-only">{done ? " — complete" : " — not complete"}</span></strong><p>{detail}</p>{extra}</div>
    {action ? <div className="certificate-check-action">{action}</div> : null}
  </li>;
}
