"use client";

import { useState } from "react";
import Link from "next/link";
import type { EvaluationType } from "@/generated/prisma/enums";
import { TYPE_LABELS, criteriaFromJson } from "@/lib/evaluations/domain";
import { canonicalWeekForLocalDate, isDateOnly } from "@/lib/evaluations/weekly-period";

type Intern = { userId: string; name: string };
type Value = {
  id: string;
  internUserId: string;
  evaluationType: EvaluationType;
  evaluationDate: Date;
  periodKey: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  criteriaScores: unknown;
  overallScore: unknown;
  strengths: string | null;
  areasForImprovement: string | null;
  comments: string | null;
};
const date = (x: Date | null | undefined) => x?.toISOString().slice(0, 10) ?? "";
const human = (x: string) => new Date(x + "T00:00:00.000Z")
  .toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" });

export function EvaluationForm({
  action, interns, value,
}: {
  action: (data: FormData) => void | Promise<void>;
  interns: Intern[];
  value?: Value;
}) {
  const [type, setType] = useState<EvaluationType>(value?.evaluationType ?? "MIDTERM");
  const [weekDate, setWeekDate] = useState(
    value?.evaluationType === "PROGRESS" ? value.periodKey : "",
  );
  const criteria = criteriaFromJson(value?.criteriaScores);
  while (criteria.length < 3) criteria.push({ criterion: "", rating: 3 });
  const week = isDateOnly(weekDate) ? canonicalWeekForLocalDate(weekDate) : null;

  return <form action={action} className="ui-card space-y-7 p-5 sm:p-7">
    {value ? <input type="hidden" name="evaluationId" value={value.id}/> : null}
    <section>
      <h2 className="section-title">Evaluation context</h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <label className="field">
          <span>Intern</span>
          <select name="internUserId" required defaultValue={value?.internUserId ?? ""}>
            <option value="">Select an Intern</option>
            {interns.map(intern => <option key={intern.userId} value={intern.userId}>{intern.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Evaluation type</span>
          <select name="evaluationType" required value={type} onChange={event => setType(event.target.value as EvaluationType)}>
            {Object.entries(TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>
              {key === "PROGRESS" ? "Weekly progress" : label}
            </option>)}
          </select>
        </label>
        <label className="field">
          <span>Evaluation date</span>
          <input name="evaluationDate" type="date" required defaultValue={date(value?.evaluationDate)}/>
          <small>Date this evaluation is recorded. It can differ from the week being evaluated.</small>
        </label>
        <label className="field">
          <span>Overall score (0–100)</span>
          <input name="overallScore" type="number" min="0" max="100" step="0.01" required
            defaultValue={value?.overallScore == null ? "" : String(value.overallScore)}/>
        </label>
      </div>
      {type === "PROGRESS" ? <div className="mt-5 rounded-lg border border-border bg-canvas/60 p-4">
        <label className="field">
          <span>Week to evaluate</span>
          <input name="weekDate" type="date" required value={weekDate} onChange={event => setWeekDate(event.target.value)}/>
          <small>Choose any date in the intended week. IntelliTrack determines the Monday–Sunday week automatically. Past and current weeks are allowed only when the entire week falls inside the assignment dates; future weeks are not allowed.</small>
        </label>
        {week ? <p className="mt-3 text-sm font-medium text-foreground" role="status">
          Weekly evaluation: {human(week.periodStart)} – {human(week.periodEnd)}
        </p> : null}
        <p className="mt-2 text-xs text-muted">A week can have only one evaluation, including drafts or voided records. The week and period cannot be overridden by hidden form fields.</p>
      </div> : <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="field"><span>Period start (optional)</span><input name="periodStart" type="date" defaultValue={date(value?.periodStart)}/></label>
        <label className="field"><span>Period end (optional)</span><input name="periodEnd" type="date" defaultValue={date(value?.periodEnd)}/></label>
        <p className="sm:col-span-2 text-xs text-muted">Initial, Midterm, and Final are one-time evaluations per internship assignment.</p>
      </div>}
    </section>
    <section>
      <h2 className="section-title">Evaluation criteria</h2>
      <p className="mt-2 text-sm text-secondary">Name each criterion and rate it from 1 (needs substantial support) to 5 (consistently excellent). Ratings are shown individually and are not automatically weighted.</p>
      <div className="mt-4 space-y-4">{criteria.map((criterion, index) =>
        <div key={index} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <label className="field"><span>Criterion {index + 1}</span><input name="criterion" required maxLength={200} defaultValue={criterion.criterion}/></label>
          <label className="field"><span>Rating</span><select name="rating" required defaultValue={criterion.rating}>
            {[1,2,3,4,5].map(rating => <option key={rating} value={rating}>{rating} — {rating === 1 ? "Needs substantial support" : rating === 2 ? "Developing" : rating === 3 ? "Meets expectations" : rating === 4 ? "Strong" : "Consistently excellent"}</option>)}
          </select></label>
        </div>)}</div>
    </section>
    <section className="space-y-5">
      <h2 className="section-title">Constructive review</h2>
      <label className="field"><span>Strengths</span><textarea name="strengths" rows={5} required defaultValue={value?.strengths ?? ""}/></label>
      <label className="field"><span>Areas for improvement</span><textarea name="areasForImprovement" rows={5} required defaultValue={value?.areasForImprovement ?? ""}/></label>
      <label className="field"><span>Supervisor remarks</span><textarea name="comments" rows={6} required defaultValue={value?.comments ?? ""}/></label>
    </section>
    <div className="action-bar justify-end">
      <Link href="/evaluations" className="button button-secondary">Cancel</Link>
      <button className="button button-primary">Save draft</button>
    </div>
  </form>;
}
