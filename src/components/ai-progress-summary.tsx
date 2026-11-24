"use client";

import { useActionState } from "react";
import { generateProgressSummary } from "@/app/ai/actions";
import { initialAiState } from "@/lib/ai/domain";

type Props = {
  internId: string;
  from: string;
  to: string;
  enabled: boolean;
};

export function AiProgressSummary({ internId, from, to, enabled }: Props) {
  const [state, action, pending] = useActionState(generateProgressSummary, initialAiState);

  return <section className="ui-card mb-6 p-5 sm:p-6" aria-labelledby="ai-progress-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <p className="eyebrow">Optional AI assistance</p>
        <h2 id="ai-progress-title" className="mt-1 font-semibold text-foreground">AI Progress Summary</h2>
        <p className="mt-2 text-sm text-secondary">
          Generate a readable summary from your authorized internship records. Your hours, Tasks and Evaluations remain the official source of truth.
        </p>
      </div>
      <form action={action}>
        <input type="hidden" name="internId" value={internId} />
        <input type="hidden" name="from" value={from} />
        <input type="hidden" name="to" value={to} />
        <button className="button button-primary" disabled={!enabled || pending}>
          {pending ? "Generating…" : "Generate AI Summary"}
        </button>
      </form>
    </div>
    {!enabled ? <p className="mt-4 text-sm text-muted" role="status">
      AI summaries are not configured in this environment. Your verified progress and internship records remain available below.
    </p> : null}
    {state.message ? <p className="inline-notice mt-4" role="status">{state.message}</p> : null}
    {state.draft ? <div className="mt-5 space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">AI-generated interpretation — verify against your records</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-secondary">{state.draft.summary}</p>
      </div>
      <SummaryList title="Supported accomplishments" values={state.draft.accomplishments}/>
      <SummaryList title="Areas for attention" values={state.draft.areasForAttention}/>
      <SummaryList title="Suggested next steps" values={state.draft.nextSteps}/>
      <SummaryList title="Missing evidence / limitations" values={state.draft.sourceLimitations}/>
      <p className="text-xs text-muted">Source period: {state.period}. Evidence categories used: {state.categories?.join(", ") || "None"}. This summary does not change your internship records.</p>
    </div> : null}
  </section>;
}

function SummaryList({ title, values }: { title: string; values: string[] }) {
  return values.length ? <section>
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-secondary">
      {values.map((value, index) => <li key={index}>{value}</li>)}
    </ul>
  </section> : null;
}
