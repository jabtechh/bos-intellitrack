import type { AutomaticPortfolio } from "@/lib/portfolio/automatic";

const hours = (minutes: number) => (minutes / 60).toLocaleString("en-PH", { maximumFractionDigits: 2 }) + " h";

const MODE_COPY = {
  LIVE: { eyebrow: "System-compiled evidence · no AI required", note: "These sections are built automatically from your authorized IntelliTrack records each time you open or export your Portfolio. They are read-only, never overwrite your saved writing, and include no AI-generated claims." },
  SNAPSHOT: { eyebrow: "Saved completion snapshot · no AI required", note: "These sections were saved automatically from your authorized IntelliTrack records when this internship was completed. They are read-only, stay the same in every view and PDF export, never overwrite your saved writing, and include no AI-generated claims." },
  LEGACY_ON_DEMAND: { eyebrow: "On-demand evidence · no saved completion snapshot", note: "This internship was completed before automatic Portfolio snapshots were introduced, so no completion snapshot was saved. These sections are compiled on demand from the eligible records currently in IntelliTrack, and include no AI-generated claims." },
} as const;

export function AutomaticPortfolioEvidence({ data, mode = "LIVE" }: { data: AutomaticPortfolio; mode?: keyof typeof MODE_COPY }) {
  const copy = MODE_COPY[mode];
  return <section aria-labelledby="automatic-portfolio-title" className="space-y-5" data-evidence-mode={mode}>
    <div className="ui-card p-5 sm:p-7">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h2 id="automatic-portfolio-title" className="mt-1 text-xl font-semibold text-foreground">Your recorded internship experience</h2>
      <p className="mt-2 text-sm text-secondary">
        {copy.note}
      </p>
      <p className="mt-3 text-xs text-muted">Internship period: {data.period} · Recorded status: {data.status.toLowerCase().replaceAll("_", " ")}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Credited hours" value={hours(data.creditedMinutes)}/>
        <Metric label="Completed Tasks" value={String(data.tasks.length)}/>
        <Metric label="Submitted Work Logs" value={String(data.workLogs.length)}/>
        <Metric label="Finalized Evaluations" value={String(data.evaluations.length)}/>
      </div>
      <p className="mt-4 text-sm text-secondary">{data.overview}</p>
      {data.requiredMinutes === null
        ? <p className="mt-2 text-xs text-muted">Required internship hours have not been confirmed.</p>
        : <p className="mt-2 text-xs text-muted">Required: {hours(data.requiredMinutes)} · Remaining: {hours(data.remainingMinutes ?? 0)} · Days with credited Attendance: {data.approvedAttendanceDays}</p>}
    </div>

    {!data.hasEvidence ? <div className="ui-card p-5 sm:p-6">
      <h3 className="font-semibold">No verified activity yet</h3>
      <p className="mt-2 text-sm text-secondary">Eligible Attendance, submitted Work Logs, completed Tasks, finalized Evaluations, and approved Portfolio-eligible Documents will appear automatically when available. You can still write a personal reflection.</p>
    </div> : null}

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="ui-card p-5 sm:p-6">
        <h3 className="font-semibold">Skills recorded in Work Logs</h3>
        <p className="mt-1 text-xs text-muted">Explicitly documented skills only; no inferred proficiency or rankings.</p>
        {data.skills.length
          ? <ul className="mt-4 flex flex-wrap gap-2">{data.skills.map(skill => <li key={skill} className="status-badge status-info">{skill}</li>)}</ul>
          : <p className="mt-3 text-sm text-secondary">No skills recorded in eligible Work Logs.</p>}
      </section>
      <EvidenceList title="Completed Tasks" note="Only Tasks marked completed" items={data.tasks}/>
      <EvidenceList title="Submitted Work Logs" note="Only submitted or approved Work Logs" items={data.workLogs}/>
      <EvidenceList title="Finalized Evaluations" note="Supervisor-entered results, not AI-generated ratings" items={data.evaluations.map(e => ({ title: e.title, detail: e.score === null ? "No overall score" : `Score: ${e.score} / 100`, description: e.period, date: e.date }))}/>
      <EvidenceList title="Eligible Documents" note="Approved, Portfolio-eligible Document metadata only; no private file contents" items={data.documents.map(d => ({ title: d.title, detail: d.category, date: d.date }))}/>
      <section className="ui-card p-5 sm:p-6">
        <h3 className="font-semibold">Authorized Feedback</h3>
        <p className="mt-3 text-sm text-secondary">{data.feedbackCount} visible feedback {data.feedbackCount === 1 ? "record" : "records"} available in your internship records.</p>
        <p className="mt-2 text-xs text-muted">Feedback text is not republished in your Portfolio automatically.</p>
      </section>
    </div>
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border bg-surface-muted p-3">
    <dt className="text-xs text-muted">{label}</dt>
    <dd className="mt-1 text-lg font-semibold text-foreground">{value}</dd>
  </div>;
}

function EvidenceList({ title, note, items }: {
  title: string;
  note: string;
  items: { title: string; date: string; detail?: string; description?: string | null }[];
}) {
  const visible = items.slice(0, 8);
  return <section className="ui-card p-5 sm:p-6">
    <h3 className="font-semibold">{title} <span className="text-sm font-normal text-muted">({items.length})</span></h3>
    <p className="mt-1 text-xs text-muted">{note}</p>
    {visible.length
      ? <ul className="mt-3 divide-y divide-border">{visible.map((item, index) => <li key={index} className="py-3">
        <strong className="block break-words text-sm">{item.title}</strong>
        <p className="mt-1 text-xs text-muted">{item.date}{item.detail ? ` · ${item.detail}` : ""}</p>
        {item.description ? <p className="mt-2 whitespace-pre-wrap break-words text-sm text-secondary">{item.description}</p> : null}
      </li>)}</ul>
      : <p className="mt-3 text-sm text-secondary">No verified records available.</p>}
    {items.length > visible.length ? <p className="mt-2 text-xs text-muted">Showing {visible.length} of {items.length} records. The Portfolio PDF includes the first 30 records in this category.</p> : null}
  </section>;
}
