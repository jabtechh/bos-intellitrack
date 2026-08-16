import { InfoPopover } from "@/components/info-popover";
import { formatHours, internshipProgress, scheduledPeriod } from "@/lib/internship-progress/domain";

export function InternshipProgress({ requiredHours, creditedMinutes, startDate, endDate, projectedDate }: { requiredHours: number | null; creditedMinutes: number; startDate: Date; endDate: Date; projectedDate: Date | null }) {
  const progress = internshipProgress(requiredHours, creditedMinutes);
  return <section className="internship-progress">
    <p className="eyebrow">Internship hours</p>
    {progress.requiredHours === null ? <p className="mt-3 text-sm text-secondary">Required internship hours have not been provided yet.</p> : <>
      <div className="progress-summary"><strong>{formatHours(progress.creditedHours).replace(" h", "")} of {formatHours(progress.requiredHours).replace(" h", "")} hours credited</strong><span>{progress.percentage}%</span></div>
      <div className="progress-track" role="progressbar" aria-label="Credited internship hours" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.visualPercentage!}><span style={{ width: `${progress.visualPercentage}%` }} /></div>
      <dl className="progress-stats"><Stat label="Credited" value={formatHours(progress.creditedHours)} /><Stat label="Remaining" value={formatHours(progress.remainingHours!)} /><Stat label="Required" value={formatHours(progress.requiredHours)} info="This requirement is based on the internship hours entered from your partner school’s guidelines." /></dl>
    </>}
    <dl className="progress-context"><Stat label="Status" value="Active" /><Stat label="Scheduled internship period" value={scheduledPeriod(startDate, endDate)} /><Stat label="Projected hours completion" value={projectedDate ? `Approximately ${projectedDate.toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" })}` : progress.remainingHours === 0 ? "Required hours completed" : "Not enough attendance data yet"} info="This is an estimate based on your current credited hours and internship schedule. Absences, schedule changes, and attendance corrections may change the projected completion date." /></dl>
  </section>;
}
function Stat({ label, value, info }: { label: string; value: string; info?: string }) { return <div><dt>{label}{info ? <InfoPopover label={label === "Projected hours completion" ? "About projected completion date" : `About ${label.toLowerCase()}`}>{info}</InfoPopover> : null}</dt><dd>{value}</dd></div>; }
