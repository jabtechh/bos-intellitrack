import Link from "next/link";
import { clockIn, clockOut } from "@/app/attendance/actions";
import { EvidenceCapture } from "@/app/attendance/evidence-capture";
import { localDate } from "@/lib/attendance/domain";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function AttendancePage() {
  const user = await requireCurrentUser();
  if (user.role !== "INTERN") return <Message title="Intern attendance" text="Attendance capture is available only to active intern accounts." />;
  const profile = await prisma.internProfile.findUnique({ where: { userId: user.id }, include: { assignments: { where: { status: "ACTIVE" }, take: 1, include: { company: true } } } }); const assignment = profile?.assignments[0];
  if (!assignment) return <Message title="No active assignment" text="Attendance becomes available after an administrator activates your internship assignment." />;
  const today = await prisma.attendance.findUnique({ where: { assignmentId_attendanceDate: { assignmentId: assignment.id, attendanceDate: localDate(new Date(), assignment.company.timezone) } } });
  return <main className="min-h-screen bg-canvas px-5 py-10"><section className="mx-auto max-w-3xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-accent-700">Daily attendance</p><h1 className="mt-2 font-heading text-3xl font-semibold text-brand-900">{today?.clockIn && !today.clockOut ? "Clock out" : today ? "Today’s attendance" : "Clock in"}</h1></div><Link href="/attendance/history" className="text-sm font-semibold text-brand-700">View history</Link></div><div className="mt-6 rounded-lg border border-border bg-surface p-6"><dl className="grid gap-4 sm:grid-cols-2"><Item label="Bo’s Coffee Branch" value={[assignment.company.name,assignment.company.branchName].filter(Boolean).join(" — ")} /><Item label="Schedule" value={formatSchedule(assignment.scheduleStartTime, assignment.scheduleEndTime)} /><Item label="Today’s state" value={today ? today.clockOut ? today.status : "CLOCKED IN" : "NOT STARTED"} /></dl>{!today ? <EvidenceCapture action={clockIn} label="Submit clock-in" /> : today.clockIn && !today.clockOut ? <EvidenceCapture action={clockOut} label="Submit clock-out" /> : <p className="mt-6 rounded-md bg-stone-100 p-4 text-sm text-secondary">Attendance is complete for today. Current status: <strong>{today.status}</strong>.</p>}</div></section></main>;
}
function Item({label,value}:{label:string;value:string}){return <div><dt className="text-xs uppercase tracking-wide text-muted">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>}
function Message({title,text}:{title:string;text:string}){return <main className="flex min-h-screen items-center bg-canvas px-5"><section className="mx-auto max-w-xl rounded-lg border border-border bg-surface p-7"><h1 className="font-heading text-3xl font-semibold text-brand-900">{title}</h1><p className="mt-4 text-secondary">{text}</p><Link href="/dashboard" className="mt-6 inline-block font-semibold text-brand-700">Return to dashboard</Link></section></main>}
function formatSchedule(start:Date|null,end:Date|null){const f=(v:Date)=>v.toLocaleTimeString("en-PH",{hour:"numeric",minute:"2-digit",timeZone:"UTC"});return start&&end?`${f(start)}–${f(end)}`:"Not specified"}
