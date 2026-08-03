import Link from "next/link";
import { prisma } from "@/lib/prisma";

const areas = [
  ["Schools", "Manage partner schools and coordinator organizations.", "/admin/schools"],
  ["Companies", "Manage internship companies, branches, and geofences.", "/admin/companies"],
  ["Users", "Invite users with controlled roles and organization profiles.", "/admin/users"],
  ["Assignments", "Create placements and manage their controlled lifecycle.", "/admin/assignments"],
] as const;

export default async function AdminPage() {
  const [pending, active, completed, activeInterns, activeSchools, activeCompanies, recent] = await Promise.all([
    prisma.internshipAssignment.count({ where: { status: "PENDING" } }), prisma.internshipAssignment.count({ where: { status: "ACTIVE" } }), prisma.internshipAssignment.count({ where: { status: "COMPLETED" } }),
    prisma.user.count({ where: { role: "INTERN", isActive: true } }), prisma.school.count({ where: { isActive: true } }), prisma.company.count({ where: { isActive: true } }),
    prisma.internshipAssignment.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { internProfile: { include: { user: true } }, company: true } }),
  ]);
  const summary = [["Pending assignments",pending],["Active assignments",active],["Completed assignments",completed],["Active interns",activeInterns],["Active schools",activeSchools],["Active companies",activeCompanies]] as const;
  return <><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-700">Operations</p><h1 className="mt-2 font-heading text-4xl font-semibold text-brand-900">Administrator area</h1>
    <dl className="mt-7 grid overflow-hidden rounded-lg border border-border bg-surface sm:grid-cols-3 lg:grid-cols-6">{summary.map(([label,value]) => <div key={label} className="border-b border-border p-4 last:border-b-0 sm:border-r sm:last:border-r-0"><dt className="text-xs leading-5 text-muted">{label}</dt><dd className="mt-1 text-2xl font-semibold text-brand-900">{value}</dd></div>)}</dl>
    <section className="mt-8" aria-labelledby="recent-title"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-accent-700">Activity ledger</p><h2 id="recent-title" className="mt-1 font-heading text-2xl font-semibold text-brand-900">Recent assignments</h2></div><Link className="text-sm font-semibold text-brand-700" href="/admin/assignments">View all</Link></div><div className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">{recent.map((item) => <Link key={item.id} href={`/admin/assignments/${item.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold text-primary">{item.assignmentCode}</p><p className="mt-1 text-sm text-secondary">{item.internProfile.user.firstName} {item.internProfile.user.lastName} · {item.company.name}</p></div><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold">{item.status}</span></Link>)}{recent.length === 0 ? <p className="p-5 text-sm text-secondary">No assignments have been created.</p> : null}</div></section>
    <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{areas.map(([title, description, href]) => <Link key={href} href={href} className="rounded-lg border border-border bg-surface p-5 shadow-surface"><h2 className="font-heading text-xl font-semibold text-brand-900">{title}</h2><p className="mt-2 text-sm leading-6 text-secondary">{description}</p></Link>)}</div></>;
}
