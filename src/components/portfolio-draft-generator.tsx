"use client";

import { useActionState, useState } from "react";
import { generatePortfolioDraft } from "@/app/ai/actions";
import { initialPortfolioAiState } from "@/lib/ai/domain";

export function PortfolioDraftGenerator({ enabled, assignmentId }: { enabled: boolean; assignmentId?: string }){
  const[state,action,pending]=useActionState(generatePortfolioDraft,initialPortfolioAiState);
  const[confirmed,setConfirmed]=useState(false);

  function setField(id:string,value:string){
    const target=document.getElementById(id) as HTMLTextAreaElement|null;
    if(!target)return;
    target.value=value;
    target.dispatchEvent(new Event("input",{bubbles:true}));
  }

  function apply(){
    if(!confirmed||!state.draft)return;
    setField("portfolio-professional-summary",state.draft.professionalSummary);
    setField("portfolio-skills",state.draft.skills.join("\n"));
    setField("portfolio-achievements",state.draft.achievements.join("\n"));
    setField("portfolio-selected-work",state.draft.selectedWork.join("\n"));
    setField("portfolio-reflection",state.draft.reflection);
    document.getElementById("portfolio-professional-summary")?.focus();
  }

  return <section className="ui-card border-dashed p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow">AI Portfolio assistant</p><h2 className="mt-1 font-semibold">Generate Portfolio with AI</h2><p className="mt-1 max-w-2xl text-sm text-secondary">AI drafts your summary, skills, achievements, selected work and reflection using only authorized, redacted internship records. You review every section before saving.</p></div>
      <form action={action}>{assignmentId?<input type="hidden" name="assignmentId" value={assignmentId}/>:null}<button disabled={!enabled || pending} className="button button-primary">{pending?"Generating…":"Generate AI draft"}</button></form>
    </div>
    <p className="mt-4 text-xs text-muted">Selecting Generate AI draft sends a minimized, redacted summary of your authorized internship evidence to Google Gemini for text generation. Free-tier provider data practices may not be suitable for real student records without school approval; use synthetic data for demonstration until privacy requirements are cleared.</p>
    {!enabled?<p className="mt-4 text-sm text-muted" role="status">AI generation is not configured in this environment. Use the manual editor below until an authorized server-side Gemini model and key are configured.</p>:null}
    {pending?<p className="mt-4 text-sm" role="status">Creating a grounded Portfolio draft. No record will be changed.</p>:null}
    {state.message?<p className="inline-notice mt-4" role="status">{state.message}</p>:null}
    {state.draft?<div className="mt-5 space-y-5">
      <p className="font-semibold text-primary">AI-generated draft — review before use.</p>
      <Preview title="Professional summary" value={state.draft.professionalSummary}/>
      <ListPreview title="Skills" values={state.draft.skills}/>
      <ListPreview title="Achievements" values={state.draft.achievements}/>
      <ListPreview title="Selected work" values={state.draft.selectedWork}/>
      <Preview title="Reflection" value={state.draft.reflection}/>
      {state.draft.sourceLimitations.length?<div><h3 className="text-sm font-semibold">Source limitations</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-secondary">{state.draft.sourceLimitations.map((item)=><li key={item}>{item}</li>)}</ul></div>:null}
      <p className="text-xs text-muted">Source period: {state.period}. Categories used: {state.categories?.join(", ")||"No eligible record categories"}.</p>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={(event)=>setConfirmed(event.target.checked)}/>I reviewed the generated draft and understand that I must verify it before saving.</label>
      <button type="button" className="button button-primary" disabled={!confirmed} onClick={apply}>Apply reviewed draft to editor</button>
    </div>:null}
  </section>;
}

function Preview({title,value}:{title:string;value:string}){return <div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-canvas/60 p-3 text-sm text-secondary">{value}</p></div>}
function ListPreview({title,values}:{title:string;values:string[]}){return <div><h3 className="text-sm font-semibold">{title}</h3>{values.length?<ul className="mt-2 list-disc space-y-1 rounded-lg border border-border bg-canvas/60 p-3 pl-8 text-sm text-secondary">{values.map((value)=><li key={value}>{value}</li>)}</ul>:<p className="mt-2 text-sm text-muted">No supported items were generated.</p>}</div>}
