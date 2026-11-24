// DEC-2026-020 — Portfolio-specific PDF content for exactly one internship assignment.
// Pure: the caller supplies the selected assignment's evidence (saved snapshot for completed
// internships, live evidence for the active one) and that same assignment's narrative.
import type { AutomaticPortfolio } from "./automatic";
import { textList } from "./domain";

export type PortfolioPdfInput = {
  internName: string;
  schoolName: string | null;
  companyName: string;
  positionTitle: string | null;
  mode: "LIVE" | "SNAPSHOT" | "LEGACY_ON_DEMAND";
  snapshotCompletedAt: string | null;
  evidence: AutomaticPortfolio;
  portfolio: { title: string; professionalSummary: string | null; skills: unknown; achievements: unknown; selectedWork: unknown; reflection: string | null } | null;
  defaultTitle: string;
  generatedAt: Date;
};

const hours = (minutes: number | null) => minutes === null ? "Not provided" : `${(minutes / 60).toLocaleString("en-PH", { maximumFractionDigits: 2 })} h`;
const list = (items: string[], limit = 30) => [
  ...(items.length ? items.slice(0, limit).map((item) => "- " + item) : ["No verified records available."]),
  ...(items.length > limit ? [`Showing ${limit} of ${items.length} records.`] : []),
];
const day = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });

const SOURCE_LABEL = {
  LIVE: "Live evidence: current internship, compiled from eligible records at export time.",
  SNAPSHOT: "Saved completion snapshot: evidence saved automatically when this internship was completed.",
  LEGACY_ON_DEMAND: "On-demand evidence: this internship was completed before automatic snapshots; no completion snapshot was saved, so eligible records were compiled at export time.",
} as const;

export function portfolioPdfLines(input: PortfolioPdfInput): string[] {
  const { evidence: e, portfolio: p } = input;
  return [
    "INTELLITRACK - BO'S COFFEE",
    "INTERNSHIP PORTFOLIO",
    "",
    "Intern: " + input.internName,
    ...(input.schoolName ? ["School: " + input.schoolName] : []),
    "Portfolio title: " + (p?.title ?? input.defaultTitle),
    "Internship: " + input.companyName + (input.positionTitle ? " - " + input.positionTitle : ""),
    "Internship period: " + e.period,
    "Recorded internship status: " + e.status,
    "Evidence source: " + SOURCE_LABEL[input.mode] + (input.mode === "SNAPSHOT" && input.snapshotCompletedAt ? " Saved " + day(input.snapshotCompletedAt) + "." : ""),
    "",
    "INTERNSHIP OVERVIEW",
    "This section is generated from authorized internship records, not generative AI.",
    e.overview,
    "Credited Attendance hours: " + hours(e.creditedMinutes),
    "Required hours: " + hours(e.requiredMinutes),
    "Remaining hours: " + hours(e.remainingMinutes),
    "Days with credited Attendance: " + String(e.approvedAttendanceDays),
    "Completed Tasks: " + String(e.tasks.length),
    "Submitted Work Logs: " + String(e.workLogs.length),
    "Finalized Evaluations: " + String(e.evaluations.length),
    "Authorized Feedback records: " + String(e.feedbackCount),
    "Approved eligible Document records: " + String(e.documents.length),
    "",
    "SKILLS EXPLICITLY RECORDED IN WORK LOGS",
    ...list(e.skills),
    "",
    "COMPLETED TASKS",
    ...list(e.tasks.map((item) => item.title + " (" + item.date + ")" + (item.description ? " - " + item.description : ""))),
    "",
    "WORK LOG HIGHLIGHTS",
    ...list(e.workLogs.map((item) => item.title + " (" + item.date + ")" + (item.description ? " - " + item.description : ""))),
    "",
    "FINALIZED EVALUATION SUMMARY",
    ...list(e.evaluations.map((item) => item.title + " (" + item.date + ")" + (item.period ? " - " + item.period : "") + (item.score === null ? " - No overall score" : " - " + item.score + " / 100"))),
    "",
    "APPROVED PORTFOLIO-ELIGIBLE DOCUMENT METADATA",
    ...list(e.documents.map((item) => item.title + " (" + item.category + ", " + item.date + ")")),
    "",
    "INTERN-AUTHORED PERSONAL SECTIONS (OPTIONAL)",
    ...(p && (p.professionalSummary || p.reflection || textList(p.skills).length || textList(p.achievements).length || textList(p.selectedWork).length) ? [
      "PROFESSIONAL SUMMARY", p.professionalSummary || "Not provided.", "",
      "CURATED SKILLS", ...list(textList(p.skills)), "",
      "PERSONAL HIGHLIGHTS AND ACHIEVEMENTS", ...list(textList(p.achievements)), "",
      "SELECTED WORK NOTES", ...list(textList(p.selectedWork)), "",
      "REFLECTION", p.reflection || "Not provided.",
    ] : ["No Intern-authored narrative has been saved for this internship. The verified evidence above is complete without it."]),
    "",
    "SOURCE AND REVIEW NOTE",
    "Only approved Attendance receives credited hours. Skills are listed only when explicitly recorded in submitted or approved Work Logs; no proficiency is inferred.",
    "Verified evidence is system-compiled and presented separately from the Intern-authored narrative. AI suggestions, when used, are review-only and never change verified records.",
    "",
    "Generated: " + input.generatedAt.toLocaleString("en-PH", { timeZone: "Asia/Manila" }),
  ];
}
