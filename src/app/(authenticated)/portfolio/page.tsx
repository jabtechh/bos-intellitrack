import Link from "next/link";
import { notFound } from "next/navigation";
import { AutomaticPortfolioEvidence } from "@/components/automatic-portfolio-evidence";
import { PortfolioSection } from "@/components/portfolio-section";
import { PageHeader, StatusBadge } from "@/components/ui";
import { isGeminiConfigured } from "@/lib/ai/config";
import { requirePortfolioViewer } from "@/lib/portfolio/authorization";
import { portfolioCompleteness, textList } from "@/lib/portfolio/domain";
import { defaultPortfolioTitle } from "@/lib/portfolio/snapshot";
import { getPortfolioSource, listPortfolioArchive, portfolioHref, type PortfolioArchiveEntry, type PortfolioEvidenceMode } from "@/lib/portfolio/source";

const dateLabel = (value: Date | string) => new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" });
const hours = (minutes: number) => (minutes / 60).toLocaleString("en-PH", { maximumFractionDigits: 2 }) + " h";

const MODE_DESCRIPTION: Record<PortfolioEvidenceMode, string> = {
  LIVE: "Your internship evidence appears automatically and updates when eligible records change. You control any personal writing or AI-assisted draft.",
  SNAPSHOT: "This internship is complete. Its verified evidence was saved automatically when it was completed and no longer changes. You control any personal writing.",
  LEGACY_ON_DEMAND: "This internship was completed before automatic Portfolio snapshots existed. Its evidence is compiled on demand from current eligible records. You control any personal writing.",
};

export default async function PortfolioPage({ searchParams }: { searchParams: Promise<{ saved?: string; assignment?: string }> }) {
  const context = await requirePortfolioViewer();
  const q = await searchParams;
  const candidate = typeof q.assignment === "string" ? q.assignment : null;
  const [archive, source] = await Promise.all([listPortfolioArchive(context), getPortfolioSource(context, candidate)]);
  // A requested internship that is not the Intern's own is never substituted with another one.
  if (candidate && !source) notFound();
  const aiEnabled = isGeminiConfigured();

  if (!source) {
    return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Internship Portfolio" title="My Internship Portfolio" description="Your Portfolio will compile verified records when you have an active or completed Main Office internship."/>
      <div className="ui-card p-6">
        <h2 className="font-semibold">No eligible internship record yet</h2>
        <p className="mt-2 text-sm text-secondary">When an internship is available, IntelliTrack automatically compiles the recorded activity. No AI key or manual Portfolio setup is required.</p>
      </div>
    </section></div>;
  }

  const { assignment, evidence, mode } = source;
  const p = assignment.portfolio;
  const complete = portfolioCompleteness(p);
  const editHref = portfolioHref(assignment.id, "/edit");

  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl">
    <PageHeader
      eyebrow="Automatically compiled from verified records"
      title={p?.title ?? defaultPortfolioTitle(assignment.positionTitle)}
      description={MODE_DESCRIPTION[mode]}
      actions={<>
        <Link href={`${editHref}#portfolio-editor`} className="button button-secondary">{p ? "Edit personal sections" : "Add personal sections"}</Link>
        <a href={portfolioHref(assignment.id, "/pdf")} className="button button-primary">Export Portfolio PDF</a>
      </>}
    />
    {q.saved ? <p className="inline-notice mb-5" role="status">Your personal Portfolio sections were saved{mode === "LIVE" ? ". Verified records continue updating automatically." : " for this internship."}</p> : null}

    <PortfolioArchive entries={archive} selectedId={assignment.id}/>

    <AutomaticPortfolioEvidence data={evidence} mode={mode}/>

    <section aria-labelledby="portfolio-personal-title" className="mt-7 space-y-4">
      <div>
        <p className="eyebrow">Intern-reviewed additions</p>
        <h2 id="portfolio-personal-title" className="mt-1 text-xl font-semibold text-foreground">Your professional story</h2>
        <p className="mt-2 text-sm text-secondary">
          Personal reflections and curated highlights are separate from verified records. {p && complete.completed > 1 ? `${complete.completed} of ${complete.total} optional fields contain saved content.` : "You haven't saved personal sections for this internship yet; its automatically compiled Portfolio is already available."}
        </p>
      </div>
      {p ? <div className="grid gap-5 lg:grid-cols-2">
        <PortfolioSection title="Professional summary (Intern-reviewed)" value={p.professionalSummary}/>
        <PortfolioSection title="Personal reflection" value={p.reflection}/>
        <ListSection title="Curated skills" items={textList(p.skills)}/>
        <ListSection title="Personal highlights and achievements" items={textList(p.achievements)}/>
        <ListSection title="Selected work notes" items={textList(p.selectedWork)}/>
      </div> : null}
      <div className="ui-card p-5 sm:p-6">
        <h3 className="font-semibold">Optional AI writing assistant</h3>
        <p className="mt-2 text-sm text-secondary">Gemini can suggest professional wording from redacted authorized evidence. You must review and explicitly save any draft. Your verified internship records never change when you use AI.</p>
        {aiEnabled ? <Link href={`${editHref}#ai-generator`} className="button button-secondary mt-4">Improve writing with AI</Link> : <p className="mt-3 text-sm text-muted">AI writing is unavailable in this environment. Automatic Portfolio evidence and PDF export still work normally.</p>}
      </div>
      <p className="text-xs text-muted">Automatically compiled evidence is system-calculated and is not generative AI. AI-assisted personal writing is optional and must be reviewed before saving.</p>
    </section>
  </section></div>;
}

/** DEC-2026-020: each internship keeps its own Portfolio; completed internships are never overwritten. */
function PortfolioArchive({ entries, selectedId }: { entries: PortfolioArchiveEntry[]; selectedId: string }) {
  return <section aria-labelledby="portfolio-archive-title" className="mb-7" data-portfolio-archive>
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div><p className="eyebrow">Portfolio archive</p><h2 id="portfolio-archive-title" className="mt-1 text-xl font-semibold text-foreground">Your internship Portfolios</h2></div>
      <p className="text-xs text-muted">{entries.length} {entries.length === 1 ? "internship" : "internships"}</p>
    </div>
    <ul className="grid gap-3 md:grid-cols-2">{entries.map((entry) => {
      const selected = entry.assignmentId === selectedId;
      return <li key={entry.assignmentId} data-portfolio-entry={entry.assignmentId} className={`ui-card p-4 sm:p-5 ${selected ? "ring-2 ring-[var(--secondary)]" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0"><h3 className="break-words font-semibold text-foreground">{entry.title}</h3><p className="mt-1 text-sm text-secondary">{entry.companyName}{entry.positionTitle ? ` · ${entry.positionTitle}` : ""}</p></div>
          <StatusBadge tone={entry.status === "ACTIVE" ? "info" : "success"}>{entry.status === "ACTIVE" ? "In progress" : "Completed"}</StatusBadge>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div><dt className="text-muted">Internship dates</dt><dd className="mt-0.5 text-foreground">{dateLabel(entry.startDate)} – {dateLabel(entry.endDate)}</dd></div>
          <div><dt className="text-muted">Credited hours</dt><dd className="mt-0.5 text-foreground">{hours(entry.creditedMinutes)}{entry.requiredHours ? ` of ${entry.requiredHours} h` : ""}</dd></div>
          <div className="col-span-2"><dt className="text-muted">Portfolio</dt><dd className="mt-0.5 text-foreground">{entry.mode === "LIVE" ? "Live evidence, updates automatically" : entry.mode === "SNAPSHOT" ? `Saved automatically at completion${entry.snapshotAt ? ` (${dateLabel(entry.snapshotAt)})` : ""}` : "On-demand evidence (completed before automatic snapshots)"}</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={portfolioHref(entry.assignmentId)} aria-current={selected ? "page" : undefined} className={`button ${selected ? "button-primary" : "button-secondary"}`}>{selected ? "Viewing Portfolio" : "Open Portfolio"}</Link>
          <a href={portfolioHref(entry.assignmentId, "/pdf")} className="button button-secondary">Download PDF</a>
          <Link href={`/certificates/${entry.assignmentId}`} className="button button-secondary">{entry.certificateStatus === "ISSUED" ? "Certificate" : "Certificate preview"}</Link>
        </div>
      </li>;
    })}</ul>
  </section>;
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return <section className="ui-card p-5 sm:p-6">
    <h3 className="font-semibold text-foreground">{title}</h3>
    {items.length ? <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-secondary">{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p className="mt-3 text-sm text-secondary">Not provided.</p>}
  </section>;
}
