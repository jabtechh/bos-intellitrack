import { redirect } from "next/navigation";
import Link from "next/link";
import { InternDashboard } from "@/components/intern-dashboard-data";
import { Icon } from "@/components/icons";
import { EmptyState } from "@/components/ui";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { prisma } from "@/lib/prisma";
import { creditedMinutesFromAttendance } from "@/lib/internship-progress/domain";
import { AttentionQueue, DashboardMetricCard, DashboardMetricGrid, DashboardSection, ProgressRow, RoleDashboardHeader } from "@/components/role-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  if (user.role === "INTERN") return <InternDashboard user={user} />;
  if (user.role === "SUPERVISOR") return <SupervisorRoleDashboard user={user} />;
  if (user.role === "COORDINATOR") return <CoordinatorRoleDashboard user={user} />;
  if (user.role === "REPRESENTATIVE") redirect("/admin");
  redirect("/admin/system");
}

async function SupervisorRoleDashboard({ user }: { user: Awaited<ReturnType<typeof requireCurrentUser>> }) {
  const scope = { assignment: { supervisorProfile: { userId: user.id } } };
  const [profile, exceptions, corrections, submissions, evaluationsDue, taskCounts, attendanceQueue, taskQueue] = await Promise.all([
    prisma.supervisorProfile.findUnique({ where: { userId: user.id }, select: { assignments: { where: { status: "ACTIVE" }, select: { id: true, positionTitle: true, requiredHours: true, attendance: { where: { status: "APPROVED" }, select: { status: true, creditedMinutes: true } }, internProfile: { select: { user: { select: { firstName: true, lastName: true } } } } } } } }),
    prisma.attendance.count({ where: { status: "PENDING_REVIEW", ...scope } }),
    prisma.attendanceCorrection.count({ where: { status: "PENDING", attendance: scope } }),
    prisma.task.count({ where: { status: "SUBMITTED", ...scope } }),
    prisma.evaluation.count({ where: { status: "DRAFT", evaluatorId: user.id, ...scope } }),
    Promise.all(["TODO", "IN_PROGRESS", "SUBMITTED", "COMPLETED"].map((status) => prisma.task.count({ where: { status: status as "TODO", ...scope } }))),
    prisma.attendance.findMany({ where: { status: "PENDING_REVIEW", ...scope }, orderBy: { attendanceDate: "desc" }, take: 3, select: { id: true, attendanceDate: true, assignment: { select: { internProfile: { select: { user: { select: { firstName: true, lastName: true } } } } } } } }),
    prisma.task.findMany({ where: { status: "SUBMITTED", ...scope }, orderBy: { submittedAt: "desc" }, take: 3, select: { id: true, title: true, submittedAt: true, assignment: { select: { internProfile: { select: { user: { select: { firstName: true, lastName: true } } } } } } } }),
  ]);
  const interns = profile?.assignments ?? [];
  const needsAttention = exceptions + corrections + submissions + evaluationsDue;
  const queue = [
    ...attendanceQueue.map((item) => ({ id: "a-"+item.id, kind: "Attendance exception", title: item.assignment.internProfile.user.firstName+" "+item.assignment.internProfile.user.lastName+" · "+formatDate(item.attendanceDate), detail: "Attendance evidence requires review", href: "/attendance/review/"+item.id, action: "Review" })),
    ...taskQueue.map((item) => ({ id: "t-"+item.id, kind: "Task submission", title: item.assignment.internProfile.user.firstName+" "+item.assignment.internProfile.user.lastName+" · "+item.title, detail: item.submittedAt ? "Submitted "+item.submittedAt.toLocaleDateString("en-PH",{dateStyle:"medium"}) : "Submitted for completion", href: "/tasks/review/"+item.id, action: "Review" })),
  ].slice(0,5);

  return <div className="dashboard-page role-dashboard">
    <RoleDashboardHeader eyebrow="Company Supervisor" name={user.firstName} description="Monitor your directly assigned Interns and the review work that needs your decision." action={{href:"/reviews",label:"Open Reviews"}}/>
    <DashboardMetricGrid>
      <DashboardMetricCard label="Assigned Interns" value={interns.length} icon="users" tone="success"/>
      <DashboardMetricCard label="Needs Attention" value={needsAttention} icon="review" tone={needsAttention?"warning":"success"}/>
      <DashboardMetricCard label="Task Submissions" value={submissions} icon="journal" tone="info"/>
      <DashboardMetricCard label="Draft Evaluations" value={evaluationsDue} icon="clock" tone={evaluationsDue?"warning":"neutral"}/>
    </DashboardMetricGrid>
    <div className="role-dashboard-grid">
      <DashboardSection title="Needs your attention" description="Authorized review work from your assigned Interns." action={{href:"/reviews",label:"Open Reviews"}}><AttentionQueue items={queue}/></DashboardSection>
      <DashboardSection title="Tasks & Evaluations" description="Current directly assigned workload."><div className="dashboard-mini-summary"><div><strong>{taskCounts[0]+taskCounts[1]}</strong><span>Active Tasks</span></div><div><strong>{taskCounts[2]}</strong><span>Submitted</span></div><div><strong>{taskCounts[3]}</strong><span>Completed</span></div><div><strong>{evaluationsDue}</strong><span>Draft Evaluations</span></div></div><div className="dashboard-section-links"><Link href="/tasks">View Tasks <Icon name="arrow"/></Link><Link href="/evaluations">View Evaluations <Icon name="arrow"/></Link></div></DashboardSection>
    </div>
    <DashboardSection title="Intern progress" description="Attendance-based credited hours for your directly assigned active Interns." action={{href:"/interns",label:"View Interns"}}>
      {interns.length?<div className="dashboard-progress-list">{interns.map((item)=><ProgressRow key={item.id} name={item.internProfile.user.firstName+" "+item.internProfile.user.lastName} subtitle={item.positionTitle??"Intern"} credited={creditedMinutesFromAttendance(item.attendance)/60} required={item.requiredHours}/>)}</div>:<EmptyState title="No assigned Interns" description="Assigned active Interns will appear here."/>}
    </DashboardSection>
  </div>;
}

async function CoordinatorRoleDashboard({ user }: { user: Awaited<ReturnType<typeof requireCurrentUser>> }) {
  const profile = await prisma.coordinatorProfile.findUnique({
    where:{userId:user.id},
    select:{school:{select:{name:true}},assignments:{where:{status:"ACTIVE"},select:{id:true,positionTitle:true,requiredHours:true,internProfile:{select:{user:{select:{firstName:true,lastName:true}}}},attendance:{where:{status:"APPROVED"},select:{status:true,creditedMinutes:true}},evaluations:{where:{status:{in:["SUBMITTED","ACKNOWLEDGED"]}},select:{id:true}}}}},
  });
  const students=profile?.assignments??[];
  const finalized=students.reduce((sum,row)=>sum+row.evaluations.length,0);
  const withHours=students.filter(row=>row.requiredHours!=null).length;

  return <div className="dashboard-page role-dashboard">
    <RoleDashboardHeader eyebrow="School Coordinator" name={user.firstName} description={"Read-only internship monitoring for "+(profile?.school.name??"your partner school")+". "} action={{href:"/students",label:"View Students"}}/>
    <DashboardMetricGrid>
      <DashboardMetricCard label="Monitored Students" value={students.length} icon="users" tone="info"/>
      <DashboardMetricCard label="Hours Requirement Set" value={withHours} icon="clock" tone={withHours===students.length?"success":"warning"}/>
      <DashboardMetricCard label="Finalized Evaluations" value={finalized} icon="journal" tone="success"/>
      <DashboardMetricCard label="Reports" value={students.length} icon="review"/>
    </DashboardMetricGrid>
    <DashboardSection title="Student progress" description="School-scoped, read-only Attendance-based rendered-hour progress." action={{href:"/reports",label:"View Reports"}}>
      {students.length?<div className="dashboard-progress-list">{students.map((item)=><ProgressRow key={item.id} name={item.internProfile.user.firstName+" "+item.internProfile.user.lastName} subtitle={item.positionTitle??"Intern"} credited={creditedMinutesFromAttendance(item.attendance)/60} required={item.requiredHours}/>)}</div>:<EmptyState title="No active students" description="Students associated with your school will appear here."/>}
    </DashboardSection>
  </div>;
}

function formatDate(value:Date){return value.toLocaleDateString("en-PH",{dateStyle:"medium",timeZone:"UTC"})}
