import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { PortfolioDraftGenerator } from "@/components/portfolio-draft-generator";
import { isGeminiConfigured } from "@/lib/ai/config";
import { requirePortfolioViewer } from "@/lib/portfolio/authorization";
import { getPortfolioAssignment, portfolioHref } from "@/lib/portfolio/source";
import { defaultPortfolioTitle } from "@/lib/portfolio/snapshot";
import { textList } from "@/lib/portfolio/domain";
import { savePortfolio } from "@/app/portfolio/actions";

export default async function Edit({searchParams}:{searchParams:Promise<{error?:string;assignment?:string}>}){
  const c=await requirePortfolioViewer();
  const q=await searchParams;
  // Re-authorized server-side: a candidate assignment that is not this Intern's own returns 404.
  const a=await getPortfolioAssignment(c,typeof q.assignment==="string"?q.assignment:null);
  if(!a)notFound();
  const p=a.portfolio;

  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-4xl">
    <PageHeader eyebrow={`Optional personal writing · ${a.company.name}${a.status==="COMPLETED"?" · Completed internship":" · Current internship"}`} title="Edit Portfolio" description="Your verified internship evidence is compiled automatically, even without saving this form. These optional fields are for your own curated story or reviewed AI suggestions. Nothing is saved until you explicitly submit this form."/>
    {q.error?<p className="inline-notice" role="alert">{q.error}</p>:null}
    <div id="ai-generator" className="mb-6 scroll-mt-6"><PortfolioDraftGenerator enabled={isGeminiConfigured()} assignmentId={a.id}/></div>
    <form id="portfolio-editor" action={savePortfolio} className="ui-card space-y-6 p-5 sm:p-7">
      <input type="hidden" name="assignmentId" value={a.id}/>
      <label className="field"><span>Portfolio title</span><input name="title" required maxLength={255} defaultValue={p?.title??defaultPortfolioTitle(a.positionTitle)}/></label>
      <label className="field"><span>Professional summary</span><textarea id="portfolio-professional-summary" name="professionalSummary" rows={6} maxLength={5000} defaultValue={p?.professionalSummary??""}/></label>
      <label className="field"><span>Skills</span><textarea id="portfolio-skills" name="skills" rows={6} maxLength={4000} defaultValue={textList(p?.skills).join("\n")}/><small>One truthful, evidence-supported skill per line.</small></label>
      <label className="field"><span>Highlights and achievements</span><textarea id="portfolio-achievements" name="achievements" rows={6} maxLength={4000} defaultValue={textList(p?.achievements).join("\n")}/><small>One item per line.</small></label>
      <label className="field"><span>Selected work</span><textarea id="portfolio-selected-work" name="selectedWork" rows={6} maxLength={4000} defaultValue={textList(p?.selectedWork).join("\n")}/><small>One item per line.</small></label>
      <label className="field"><span>Reflection</span><textarea id="portfolio-reflection" name="reflection" rows={9} maxLength={10000} defaultValue={p?.reflection??""}/></label>
      <p className="text-xs text-muted">Generated suggestions are review-only. Saving this form is your explicit decision to keep the content shown above.</p>
      <div className="action-bar justify-end"><Link href={portfolioHref(a.id)} className="button button-secondary">Cancel</Link><button className="button button-primary">Save Portfolio</button></div>
    </form>
  </section></div>;
}
