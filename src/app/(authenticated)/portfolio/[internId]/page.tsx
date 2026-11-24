import { notFound } from "next/navigation";
import Link from "next/link";
import { AutomaticPortfolioEvidence } from "@/components/automatic-portfolio-evidence";
import { PortfolioSection } from "@/components/portfolio-section";
import { PageHeader } from "@/components/ui";
import { requirePortfolioViewer } from "@/lib/portfolio/authorization";
import { textList } from "@/lib/portfolio/domain";
import { getPortfolioSource, portfolioHref } from "@/lib/portfolio/source";
import { defaultPortfolioTitle } from "@/lib/portfolio/snapshot";

export default async function ReviewPortfolio({ params, searchParams }: { params: Promise<{ internId: string }>; searchParams: Promise<{ assignment?: string }> }) {
  const context = await requirePortfolioViewer();
  const { internId } = await params;
  const { assignment } = await searchParams;
  const source = await getPortfolioSource(context, typeof assignment === "string" ? assignment : null);
  if (!source || source.report.internProfile.userId !== internId) notFound();
  const report = source.report;
  const p = source.assignment.portfolio;
  const { evidence, mode } = source;
  const id = source.assignment.id;

  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl">
    <PageHeader
      eyebrow="Authorized Portfolio"
      title={p?.title ?? defaultPortfolioTitle(source.assignment.positionTitle)}
      description={`${report.internProfile.user.firstName} ${report.internProfile.user.lastName} · ${report.internProfile.school.name}`}
      actions={<><Link className="button button-secondary" href={portfolioHref(id)}>My Portfolio</Link><a className="button button-primary" href={portfolioHref(id, "/pdf")}>Export Portfolio PDF</a></>}
    />
    <AutomaticPortfolioEvidence data={evidence} mode={mode}/>
    <section className="mt-7" aria-label="Intern-reviewed Portfolio content">
      <h2 className="mb-4 text-xl font-semibold">Optional Intern-reviewed sections</h2>
      {p ? <div className="grid gap-5 lg:grid-cols-2">
        <PortfolioSection title="Professional summary" value={p.professionalSummary}/>
        <PortfolioSection title="Personal reflection" value={p.reflection}/>
        <PortfolioSection title="Curated skills" value={textList(p.skills).join("\n") || null}/>
        <PortfolioSection title="Personal highlights" value={textList(p.achievements).join("\n") || null}/>
        <PortfolioSection title="Selected work notes" value={textList(p.selectedWork).join("\n") || null}/>
      </div> : <p className="ui-card p-6 text-secondary">No personal sections have been saved. Verified internship evidence is already compiled above, without AI or invented accomplishments.</p>}
    </section>
  </section></div>;
}
