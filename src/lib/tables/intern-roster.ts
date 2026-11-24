// Shared rows/columns for the Supervisor "Interns" and Coordinator "Students" data tables.
import type { RecordColumn, RecordRow } from "./records";
import { statusTone, type InternStatus } from "@/lib/insights/intern-status";

type RosterAssignment = {
  id: string; status: string; positionTitle: string | null; requiredHours: number | null; completedAt: Date | null;
  internProfile: { userId: string; user: { firstName: string; lastName: string }; school: { name: string } };
  attendance: { creditedMinutes: number }[];
  evaluations?: { id: string }[];
};

const hours = (minutes: number) => (Math.floor((minutes / 60) * 10) / 10).toLocaleString("en-PH", { maximumFractionDigits: 1 });
const date = (value: Date) => value.toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" });

export function internRosterRows(assignments: RosterAssignment[], certificates: Map<string, { status: string; certificateNumber: string }>, statuses?: Map<string, InternStatus>): RecordRow[] {
  return assignments.map((row) => {
    const credited = row.attendance.reduce((sum, a) => sum + a.creditedMinutes, 0);
    const certificate = certificates.get(row.id);
    const user = row.internProfile.user;
    const progress = statuses?.get(row.id);
    const issues = progress ? [...progress.flags.map((flag) => flag.label), ...progress.staffFlags] : [];
    return {
      id: row.id,
      href: `/reports/intern/${row.internProfile.userId}`,
      cells: {
        name: { text: `${user.firstName} ${user.lastName}`, sort: `${user.lastName} ${user.firstName}` },
        position: { text: row.positionTitle ?? "Intern" },
        school: { text: row.internProfile.school.name },
        hours: { text: `${hours(credited)} h${row.requiredHours ? ` of ${row.requiredHours} h` : ""}`, sort: credited },
        evaluations: { text: String(row.evaluations?.length ?? 0), sort: row.evaluations?.length ?? 0 },
        status: { text: row.status === "COMPLETED" ? "Completed" : "Active", tone: row.status === "COMPLETED" ? "neutral" : "success" },
        progress: progress ? { text: progress.level, tone: statusTone(progress.level), sort: progress.level === "At risk" ? 0 : progress.level === "Needs attention" ? 1 : progress.level === "On track" ? 2 : 3 } : { text: "—" },
        issues: { text: issues.length ? issues.join(" · ") : "—" },
        completed: { text: row.completedAt ? date(row.completedAt) : "—", sort: row.completedAt?.getTime() ?? 0 },
        certificate: certificate
          ? { text: certificate.status === "ISSUED" ? `Certificate ${certificate.certificateNumber}` : "Certificate (revoked)", href: `/certificates/${row.id}` }
          : { text: "—" },
      },
    };
  });
}

export function internRosterColumns(showSchool: boolean, showEvaluations = false): RecordColumn[] {
  return [
    { key: "name", label: "Name", primary: true },
    { key: "position", label: "Position" },
    ...(showSchool ? [{ key: "school", label: "School" }] : []),
    { key: "hours", label: "Hours rendered" },
    ...(showEvaluations ? [{ key: "evaluations", label: "Finalized evaluations" }] : []),
    { key: "progress", label: "Status" },
    { key: "issues", label: "Issues", sortable: false },
    { key: "status", label: "Internship" },
    { key: "completed", label: "Completed" },
    { key: "certificate", label: "Certificate", sortable: false },
  ];
}
