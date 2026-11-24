import { z } from "zod";

const dateValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export type InsightPeriod = { from?: Date; to?: Date };

export function parseInsightPeriod(input: { from?: string; to?: string }):
  | { success: true; period: InsightPeriod; values: { from: string; to: string } }
  | { success: false; error: string; values: { from: string; to: string } } {
  const values = { from: input.from ?? "", to: input.to ?? "" };
  if ((values.from && !dateValue.safeParse(values.from).success) || (values.to && !dateValue.safeParse(values.to).success)) {
    return { success: false, error: "Choose valid calendar dates.", values };
  }
  if (values.from && values.to && values.from > values.to) {
    return { success: false, error: "The start date cannot be after the end date.", values };
  }
  return {
    success: true,
    period: {
      from: values.from ? new Date(`${values.from}T00:00:00.000Z`) : undefined,
      to: values.to ? new Date(`${values.to}T23:59:59.999Z`) : undefined,
    },
    values,
  };
}

export function periodWhere(period: InsightPeriod) {
  return period.from || period.to ? { gte: period.from, lte: period.to } : undefined;
}

export function taskCounts(tasks: { status: string; dueAt: Date | null }[], now = new Date()) {
  const eligible = tasks.filter((task) => task.status !== "CANCELLED");
  const completed = eligible.filter((task) => task.status === "COMPLETED").length;
  const active = eligible.filter((task) => task.status !== "COMPLETED").length;
  const overdue = eligible.filter((task) => task.status !== "COMPLETED" && task.dueAt !== null && task.dueAt < now).length;
  return {
    active,
    completed,
    overdue,
    completionRate: eligible.length ? Math.round((completed / eligible.length) * 100) : null,
    denominator: eligible.length,
  };
}

export function attendanceCounts(rows: { classification: string }[]) {
  return {
    days: rows.length,
    late: rows.filter((row) => row.classification === "LATE" || row.classification === "LATE_AND_EARLY_DEPARTURE").length,
    early: rows.filter((row) => row.classification === "EARLY_DEPARTURE" || row.classification === "LATE_AND_EARLY_DEPARTURE").length,
  };
}

export function hoursProgress(requiredHours: number | null, creditedMinutes: number) {
  const creditedHours = creditedMinutes / 60;
  if (requiredHours === null) return { requiredHours: null, creditedHours, remainingHours: null, percentage: null };
  return {
    requiredHours,
    creditedHours,
    remainingHours: Math.max(requiredHours - creditedHours, 0),
    percentage: Math.min(Math.round((creditedHours / requiredHours) * 100), 100),
  };
}

export function recordedSkills(values: unknown[]): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (typeof item !== "string") continue;
      const skill = item.trim();
      if (skill && !seen.has(skill.toLocaleLowerCase())) seen.add(skill.toLocaleLowerCase());
    }
  }
  const labels = new Map<string, string>();
  for (const value of values) if (Array.isArray(value)) for (const item of value) if (typeof item === "string" && item.trim()) labels.set(item.trim().toLocaleLowerCase(), item.trim());
  return [...seen].map((key) => labels.get(key)!).slice(0, 30);
}

export function sourcePeriodLabel(period: InsightPeriod, internship: { startDate: Date; endDate: Date }) {
  const date = (value: Date) => value.toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" });
  return `${date(period.from ?? internship.startDate)} – ${date(period.to ?? internship.endDate)}`;
}


export type SkillEvidenceRecord = { workDate: Date; skillsApplied: unknown };

export function skillEvidenceTimeline(records: SkillEvidenceRecord[]) {
  const map = new Map<string,{label:string;dates:Set<string>}>();
  for (const record of records) {
    if (!Array.isArray(record.skillsApplied)) continue;
    for (const value of record.skillsApplied) {
      if (typeof value !== "string" || !value.trim()) continue;
      const label=value.trim(),key=label.toLocaleLowerCase(),day=record.workDate.toISOString().slice(0,10);
      const item=map.get(key)??{label,dates:new Set<string>()};
      item.dates.add(day);
      map.set(key,item);
    }
  }
  return [...map.values()].map((item)=>{
    const dates=[...item.dates].sort();
    return{skill:item.label,firstSeen:dates[0],lastSeen:dates.at(-1)!,count:dates.length,dates};
  }).sort((a,b)=>a.firstSeen.localeCompare(b.firstSeen)||a.skill.localeCompare(b.skill));
}
