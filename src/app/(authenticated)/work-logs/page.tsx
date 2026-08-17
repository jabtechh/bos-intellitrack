import Link from "next/link";
import { Icon } from "@/components/icons";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { portfolioAssignmentWhere, requirePortfolioViewer } from "@/lib/portfolio/authorization";
import { workLogLabel } from "@/lib/work-logs/domain";

export default async function WorkLogs() {
  const context = await requirePortfolioViewer();
  const rows = await prisma.workLog.findMany({
    where: { assignment: portfolioAssignmentWhere(context) },
    orderBy: [{ workDate: "desc" }, { updatedAt: "desc" }],
    include: { assignment: { select: { internProfile: { select: { user: { select: { firstName: true, lastName: true } } } } } } },
  });

  return <div className="operational-page">
    <PageHeader eyebrow="Daily journal" title="Daily Work Logs" description={context.kind === "INTERN" ? "A simple history of the work you recorded each day." : "Read-only daily journal records in your authorized Intern scope."} actions={context.kind === "INTERN" ? <Link href="/work-logs/new" className="button button-primary"><Icon name="plus" />Create work log</Link> : undefined} />
    <section className="journal-history">{rows.length ? (rows.map(row => {
      const skills = Array.isArray(row.skillsApplied) ? row.skillsApplied.filter((value): value is string => typeof value === "string").slice(0, 4) : [];
      return <Link key={row.id} href={`/work-logs/${row.id}`}>
        <div className="journal-date"><time dateTime={row.workDate.toISOString().slice(0, 10)}><span>{row.workDate.toLocaleDateString("en-PH", { month: "short", timeZone: "UTC" })}</span><strong>{row.workDate.toLocaleDateString("en-PH", { day: "2-digit", timeZone: "UTC" })}</strong><small>{row.workDate.toLocaleDateString("en-PH", { weekday: "short", timeZone: "UTC" })}</small></time></div>
        <div className="journal-entry-summary">{context.kind !== "INTERN" ? <p className="journal-intern">{row.assignment.internProfile.user.firstName} {row.assignment.internProfile.user.lastName}</p> : null}<h2>{row.title}</h2><p>{row.description.slice(0, 180)}{row.description.length > 180 ? "…" : ""}</p>{skills.length ? <ul aria-label="Skills applied">{skills.map(skill => <li key={skill}>{skill}</li>)}</ul> : null}</div>
        <aside><StatusBadge tone={row.status === "SUBMITTED" || row.status === "APPROVED" ? "info" : "neutral"}>{workLogLabel(row.status)}</StatusBadge><span>{row.status === "DRAFT" && context.kind === "INTERN" ? "Continue editing" : "View entry"}<Icon name="arrow" /></span></aside>
      </Link>;
    })) : (<EmptyState title="No daily work logs yet" description={context.kind === "INTERN" ? "Create your first journal entry when you are ready." : "No journal records are available in your authorized scope."} />)}</section>
  </div>;
}
