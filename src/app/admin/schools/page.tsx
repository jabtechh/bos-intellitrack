import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function SchoolsPage() {
  const schools = await prisma.school.findMany({ orderBy: { name: "asc" } });
  return <><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-accent-700">Organizations</p><h1 className="mt-2 font-heading text-3xl font-semibold text-brand-900">Schools</h1></div><Link className="rounded-md bg-brand-700 px-4 py-3 text-sm font-semibold text-white" href="/admin/schools/new">Add school</Link></div><div className="mt-7 overflow-x-auto rounded-lg border border-border bg-surface"><table className="w-full text-left text-sm"><thead className="bg-stone-100 text-secondary"><tr><th className="p-4">Code</th><th className="p-4">Name</th><th className="p-4">Location</th><th className="p-4">Status</th></tr></thead><tbody>{schools.map((school) => <tr key={school.id} className="border-t border-border"><td className="p-4">{school.schoolCode ?? "—"}</td><td className="p-4 font-medium">{school.name}</td><td className="p-4">{[school.city, school.province].filter(Boolean).join(", ") || "—"}</td><td className="p-4">{school.isActive ? "Active" : "Inactive"}</td></tr>)}</tbody></table>{schools.length === 0 ? <p className="p-6 text-secondary">No schools have been added.</p> : null}</div></>;
}
