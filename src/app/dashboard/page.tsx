import { logout } from "@/app/(auth)/actions";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { localDate } from "@/lib/attendance/domain";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const fullName = `${user.firstName} ${user.lastName}`;
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      internProfile: { include: { school: true } },
      supervisorProfile: { include: { company: true } },
      coordinatorProfile: { include: { school: true } },
      representativeProfile: { include: { company: true } },
    },
  });
  const organization = profile?.internProfile?.school.name
    ?? profile?.coordinatorProfile?.school.name
    ?? profile?.supervisorProfile?.company.name
    ?? profile?.representativeProfile?.company.name
    ?? "System administration";
  const attendanceSummary = await getAttendanceSummary(user.id, user.role);

  return (
    <main className="min-h-screen bg-canvas px-5 py-12 sm:px-8">
      <section className="mx-auto max-w-3xl rounded-lg border border-border bg-surface p-6 shadow-surface sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent-700">
          Signed in
        </p>
        <h1 className="mt-3 font-heading text-3xl font-semibold text-brand-900">
          Welcome, {fullName}
        </h1>
        <dl className="mt-6 grid gap-4 border-y border-border py-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Status</dt>
            <dd className="mt-1 font-medium text-primary">Authenticated</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Organization</dt>
            <dd className="mt-1 font-medium text-primary">{organization}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Role</dt>
            <dd className="mt-1 font-medium text-primary">{user.role}</dd>
          </div>
        </dl>
        <p className="mt-5 text-sm leading-6 text-secondary">
          Your role-specific dashboard will be added in a future implementation phase.
        </p>
        {user.role === "ADMIN" ? <Link href="/admin" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white">Open Admin area</Link> : null}
        {attendanceSummary ? <section className="mt-7 border-t border-border pt-6"><h2 className="font-heading text-2xl font-semibold text-brand-900">Attendance operations</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{attendanceSummary.items.map(([label,value])=><div key={label} className="rounded-md bg-stone-100 p-4"><p className="text-xs uppercase text-muted">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}</div><Link href={attendanceSummary.href} className="mt-5 inline-flex min-h-11 items-center rounded-md border border-brand-700 px-4 text-sm font-semibold text-brand-700">{attendanceSummary.link}</Link></section> : null}
        <form action={logout} className="mt-7">
          <button type="submit" className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold text-primary hover:bg-stone-100">
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}

async function getAttendanceSummary(userId:string,role:string){
  if(role==="INTERN"){const assignment=await prisma.internshipAssignment.findFirst({where:{status:"ACTIVE",internProfile:{userId}},include:{company:true,attendance:{orderBy:{attendanceDate:"desc"},take:3}}});if(!assignment)return {items:[["Today","No active assignment"]] as [string,string][],href:"/attendance",link:"Open attendance"};const today=assignment.attendance.find(x=>x.attendanceDate.getTime()===localDate(new Date(),assignment.company.timezone).getTime());return {items:[["Today",today?.status??"Not started"],["Bo’s Coffee Branch",[assignment.company.name,assignment.company.branchName].filter(Boolean).join(" — ")],["Recent records",String(assignment.attendance.length)]] as [string,string][],href:"/attendance",link:today?.clockIn&&!today.clockOut?"Clock out":"Open attendance"};}
  if(role==="SUPERVISOR"){const count=await prisma.attendance.count({where:{status:"PENDING_REVIEW",assignment:{supervisorProfile:{userId}}}});return {items:[["Pending reviews",String(count)]] as [string,string][],href:"/attendance/review",link:"Open review queue"};}
  if(role==="REPRESENTATIVE"){const profile=await prisma.representativeProfile.findUnique({where:{userId},select:{companyId:true}});const count=profile?await prisma.attendance.count({where:{status:"PENDING_REVIEW",assignment:{companyId:profile.companyId}}}):0;return {items:[["Branch reviews",String(count)]] as [string,string][],href:"/attendance/review",link:"Open review queue"};}
  if(role==="ADMIN"){const today=localDate(new Date(),"Asia/Manila");const [pending,total]=await Promise.all([prisma.attendance.count({where:{status:"PENDING_REVIEW"}}),prisma.attendance.count({where:{attendanceDate:today}})]);return {items:[["Pending reviews",String(pending)],["Today’s records",String(total)]] as [string,string][],href:"/attendance/review",link:"Open review queue"};}
  return null;
}
