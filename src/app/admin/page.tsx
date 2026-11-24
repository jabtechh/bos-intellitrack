import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { DashboardKpiCard, PageHeader, StatusBadge } from "@/components/ui";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { requireCompanyOperationsManager } from "@/lib/auth/require-company-operations-manager";
import { prisma } from "@/lib/prisma";
import { InternsNeedingAttention } from "@/components/interns-needing-attention";
import { loadInternStatuses } from "@/lib/insights/intern-status-data";

export default async function AdminPage() {
  const current = await requireCurrentUser();
  if (current.role === "ADMIN") redirect("/admin/system");
  const actor = await requireCompanyOperationsManager();
  const companyId = actor.companyId;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const assignmentScope = { assignment: { companyId } };

  const statuses = await loadInternStatuses({ companyId }); // DEC-2026-022, company-wide
  const [
    office,
    activeInterns,
    present,
    exceptions,
    pendingCorrections,
    supervisors,
    coordinators,
    assignments,
    submittedWorkLogs,
    submittedTasks,
    finalizedEvaluations,
    documents,
    credited,
  ] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true, isActive: true } }),
    prisma.internshipAssignment.count({ where: { companyId, status: "ACTIVE", internProfile: { user: { isActive: true } } } }),
    prisma.attendance.count({ where: { ...assignmentScope, attendanceDate: { gte: today, lt: tomorrow }, clockIn: { not: null } } }),
    prisma.attendance.count({ where: { ...assignmentScope, OR: [{ reviewRequired: true }, { status: { in: ["PENDING_REVIEW", "REJECTED", "INCOMPLETE", "ABSENT"] } }] } }),
    prisma.attendanceCorrection.count({ where: { status: "PENDING", attendance: assignmentScope } }),
    prisma.supervisorProfile.count({ where: { companyId, user: { isActive: true } } }),
    prisma.coordinatorProfile.count({ where: { assignments: { some: { companyId, status: "ACTIVE" } }, user: { isActive: true } } }),
    prisma.internshipAssignment.findMany({ where: { companyId, status: { in: ["ACTIVE", "COMPLETED"] } }, select: { internProfile: { select: { schoolId: true } } } }),
    prisma.workLog.count({ where: { status: "SUBMITTED", ...assignmentScope } }),
    prisma.task.count({ where: { status: "SUBMITTED", ...assignmentScope } }),
    prisma.evaluation.count({ where: { status: { in: ["SUBMITTED", "ACKNOWLEDGED"] }, ...assignmentScope } }),
    prisma.document.count({ where: { status: { not: "ARCHIVED" }, ...assignmentScope } }),
    prisma.attendance.aggregate({ where: { status: "APPROVED", ...assignmentScope }, _sum: { creditedMinutes: true } }),
  ]);

  const schools = new Set(assignments.map((row) => row.internProfile.schoolId)).size;
  const creditedHours = (credited._sum.creditedMinutes ?? 0) / 60;
  const setup = [
    ["Company configured", Boolean(office?.isActive), "/admin"],
    ["Partner school available", schools > 0, "/admin/schools"],
    ["Coordinator linked", coordinators > 0, "/admin/users?role=COORDINATOR"],
    ["Supervisor available", supervisors > 0, "/admin/users?role=SUPERVISOR"],
    ["Active Intern enrolled", activeInterns > 0, "/admin/users?role=INTERN"],
  ] as const;
  const completedSetup = setup.filter(([, done]) => done).length;

  return <div className="mx-auto w-full max-w-7xl space-y-6 px-5 py-7 sm:px-7 lg:px-8">
    <PageHeader
      eyebrow="Company Operations"
      title="Dashboard"
      className="brand-banner"
      description="Monitor the internship program, keep company setup current, and see where Supervisor-owned workflow attention is needed."
      actions={<><Link href="/admin/users/new" className="button button-secondary"><Icon name="plus" />Add user</Link><Link href="/reports" className="button button-primary">Company report</Link></>}
    />

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Program metrics">
      <Kpi label="Active Interns" value={String(activeInterns)} detail={schools ? "Across " + schools + " partner school" + (schools === 1 ? "" : "s") : "No active school relationships"} icon="users" tone="success" />
      <Kpi label="Present today" value={String(present)} detail="Recorded Time In today" icon="clock" />
      <Kpi label="Attendance exceptions" value={String(exceptions)} detail="Supervisor review ownership" icon="review" tone={exceptions ? "warning" : "success"} />
      <Kpi label="Pending corrections" value={String(pendingCorrections)} detail="Supervisor decision ownership" icon="journal" tone={pendingCorrections ? "warning" : "success"} />
    </section>

    <InternsNeedingAttention rows={statuses} viewAllHref="/admin/assignments" showSupervisor filterable={false}/>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,.85fr)]">
      <div className="space-y-6">
        <section className="ui-card overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
            <div><h2 className="font-semibold text-foreground">Program attention</h2><p className="mt-1 text-xs text-muted">Operational signals only. Attendance and correction decisions remain with Company Supervisors.</p></div>
            <StatusBadge tone={exceptions + pendingCorrections ? "warning" : "success"}>{exceptions + pendingCorrections ? String(exceptions + pendingCorrections) + " flagged" : "All clear"}</StatusBadge>
          </header>
          <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
            <Signal icon="clock" title="Attendance exceptions" value={exceptions} detail="Supervisor review" />
            <Signal icon="review" title="Correction requests" value={pendingCorrections} detail="Supervisor decision" />
            <Signal icon="journal" title="Work Log journals" value={submittedWorkLogs} detail="Submitted records" />
            <Signal icon="review" title="Task submissions" value={submittedTasks} detail="Supervisor completion" />
          </div>
        </section>

        <section className="ui-card overflow-hidden">
          <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
            <div><h2 className="font-semibold text-foreground">Program snapshot</h2><p className="mt-1 text-xs text-muted">Verified counts and accumulated records</p></div>
            <Link href="/reports" className="text-xs font-semibold text-primary">Open company report →</Link>
          </header>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
            <Snapshot label="Submitted Work Logs" value={submittedWorkLogs} icon="journal" />
            <Snapshot label="Finalized Evaluations" value={finalizedEvaluations} icon="review" />
            <Snapshot label="Credited hours" value={formatHours(creditedHours)} icon="clock" />
            <Snapshot label="Task submissions" value={submittedTasks} icon="review" />
            <Snapshot label="Company Supervisors" value={supervisors} icon="users" />
            <Snapshot label="Partner schools" value={schools} icon="school" />
            <Snapshot label="Documents" value={documents} icon="journal" />
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="ui-card overflow-hidden">
          <header className="border-b border-border px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div><h2 className="font-semibold">Workspace setup</h2><p className="mt-1 text-xs text-muted">Core internship-program readiness</p></div>
              <StatusBadge tone={completedSetup === setup.length ? "success" : "warning"}>{completedSetup}/{setup.length} complete</StatusBadge>
            </div>
          </header>
          <div className="h-1 bg-canvas"><div className="h-full bg-success" style={{ width: String(completedSetup / setup.length * 100) + "%" }} /></div>
          <div className="divide-y divide-border">
            {setup.map(([label, done, href]) => <Link key={label} href={href} className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-canvas"><span className="text-sm font-medium">{label}</span><StatusBadge tone={done ? "success" : "warning"}>{done ? "Complete" : "Action needed"}</StatusBadge></Link>)}
          </div>
        </section>
        <section className="ui-card p-5">
          <p className="eyebrow">Scope</p>
          <h2 className="mt-2 font-semibold">Company Representative operations</h2>
          <p className="mt-2 text-sm leading-6 text-secondary">Manage normal business users, assignments, partner-school references, announcements, and company reporting. Supervisor review decisions and System Administrator recovery work stay separate.</p>
        </section>
      </div>
    </div>
  </div>;
}

function Kpi({ label, value, detail, icon, tone = "neutral" }: { label: string; value: string; detail: string; icon: "users" | "clock" | "review" | "journal"; tone?: "neutral" | "warning" | "success" }) {
  return <DashboardKpiCard label={label} value={value} detail={detail} icon={icon} tone={tone} />;
}

function Signal({ icon, title, value, detail }: { icon: "clock" | "review" | "journal"; title: string; value: number; detail: string }) {
  return <div className="bg-surface p-5 sm:p-6"><span className="metric-icon"><Icon name={icon} /></span><strong className="mt-4 block text-sm">{title}</strong><span className="mt-1 block text-2xl font-bold">{value}</span><small className="text-muted">{detail}</small></div>;
}

function Snapshot({ label, value, icon }: { label: string; value: string | number; icon: "journal" | "review" | "clock" | "users" | "school" }) {
  return <div className="flex items-center gap-3 rounded-lg border border-border bg-canvas/50 p-3.5"><span className="metric-icon"><Icon name={icon} /></span><span><small className="block text-xs text-muted">{label}</small><strong className="mt-0.5 block text-lg">{value}</strong></span></div>;
}

function formatHours(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
