import Link from "next/link";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const filtersSchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "COMPLETED", "CANCELLED", "TERMINATED"]).optional().catch(undefined),
  company: z.string().uuid().optional().catch(undefined), supervisor: z.string().uuid().optional().catch(undefined),
  coordinator: z.string().uuid().optional().catch(undefined), search: z.string().trim().max(100).optional().catch(undefined),
});

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const filters = filtersSchema.parse(Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, typeof value === "string" ? value : undefined])));
  const where = {
    ...(filters.status ? { status: filters.status } : {}), ...(filters.company ? { companyId: filters.company } : {}),
    ...(filters.supervisor ? { supervisorProfileId: filters.supervisor } : {}), ...(filters.coordinator ? { coordinatorProfileId: filters.coordinator } : {}),
    ...(filters.search ? { OR: [
      { assignmentCode: { contains: filters.search, mode: "insensitive" as const } },
      { internProfile: { user: { firstName: { contains: filters.search, mode: "insensitive" as const } } } },
      { internProfile: { user: { lastName: { contains: filters.search, mode: "insensitive" as const } } } },
    ] } : {}),
  };
  const [assignments, companies, supervisors, coordinators] = await Promise.all([
    prisma.internshipAssignment.findMany({ where, orderBy: { createdAt: "desc" }, include: { internProfile: { include: { user: true } }, company: true, supervisorProfile: { include: { user: true } }, coordinatorProfile: { include: { user: true } } } }),
    prisma.company.findMany({ select: { id: true, name: true, branchName: true }, orderBy: { name: "asc" } }),
    prisma.supervisorProfile.findMany({ select: { id: true, user: { select: { firstName: true, lastName: true } } }, orderBy: { user: { lastName: "asc" } } }),
    prisma.coordinatorProfile.findMany({ select: { id: true, user: { select: { firstName: true, lastName: true } } }, orderBy: { user: { lastName: "asc" } } }),
  ]);
  return <><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-accent-700">Placement operations</p><h1 className="mt-2 font-heading text-3xl font-semibold text-brand-900">Internship assignments</h1></div><Link href="/admin/assignments/new" className="rounded-md bg-brand-700 px-4 py-3 text-sm font-semibold text-white">Create assignment</Link></div>
    <form className="mt-7 grid gap-3 rounded-lg border border-border bg-surface p-4 md:grid-cols-6" aria-label="Assignment filters"><input className="min-h-10 rounded-md border border-border px-3 md:col-span-2" name="search" placeholder="Code or intern name" defaultValue={filters.search} /><Filter name="status" label="All statuses" value={filters.status} options={["PENDING","ACTIVE","COMPLETED","CANCELLED","TERMINATED"].map((x) => [x,x])} /><Filter name="company" label="All companies" value={filters.company} options={companies.map((x) => [x.id, [x.name,x.branchName].filter(Boolean).join(" — ")])} /><Filter name="supervisor" label="All supervisors" value={filters.supervisor} options={supervisors.map((x) => [x.id, `${x.user.firstName} ${x.user.lastName}`])} /><Filter name="coordinator" label="All coordinators" value={filters.coordinator} options={coordinators.map((x) => [x.id, `${x.user.firstName} ${x.user.lastName}`])} /><button className="min-h-10 rounded-md border border-brand-700 px-4 text-sm font-semibold text-brand-700 md:col-span-6 md:justify-self-end">Apply filters</button></form>
    <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-stone-100 text-secondary"><tr>{["Code","Intern","Company","Supervisor","Coordinator","Dates","Progress","Status"].map((x) => <th key={x} className="p-4">{x}</th>)}</tr></thead><tbody>{assignments.map((a) => <tr key={a.id} className="border-t border-border"><td className="p-4"><Link className="font-semibold text-brand-700 underline-offset-2 hover:underline" href={`/admin/assignments/${a.id}`}>{a.assignmentCode}</Link></td><td className="p-4">{a.internProfile.user.firstName} {a.internProfile.user.lastName}</td><td className="p-4">{a.company.name}{a.company.branchName ? ` — ${a.company.branchName}` : ""}</td><td className="p-4">{a.supervisorProfile.user.firstName} {a.supervisorProfile.user.lastName}</td><td className="p-4">{a.coordinatorProfile.user.firstName} {a.coordinatorProfile.user.lastName}</td><td className="p-4">{formatDate(a.startDate)} – {formatDate(a.endDate)}</td><td className="p-4">{a.renderedHours.toString()} / {a.requiredHours} hrs</td><td className="p-4"><Status value={a.status} /></td></tr>)}</tbody></table>{assignments.length === 0 ? <p className="p-7 text-secondary">No assignments match the current filters.</p> : null}</div></>;
}

function Filter({ name, label, value, options }: { name: string; label: string; value?: string; options: string[][] }) { return <select className="min-h-10 rounded-md border border-border px-2" name={name} defaultValue={value ?? ""} aria-label={label}><option value="">{label}</option>{options.map(([id,text]) => <option key={id} value={id}>{text}</option>)}</select>; }
function Status({ value }: { value: string }) { return <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-brand-900">{value}</span>; }
function formatDate(value: Date) { return value.toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" }); }
