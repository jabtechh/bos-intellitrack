import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      internProfile: { include: { school: true } },
      supervisorProfile: { include: { company: true } },
      coordinatorProfile: { include: { school: true } },
      representativeProfile: { include: { company: true } },
    },
  });
  return <><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-accent-700">Access control</p><h1 className="mt-2 font-heading text-3xl font-semibold text-brand-900">Users</h1></div><Link className="rounded-md bg-brand-700 px-4 py-3 text-sm font-semibold text-white" href="/admin/users/new">Invite user</Link></div><div className="mt-7 overflow-x-auto rounded-lg border border-border bg-surface"><table className="w-full text-left text-sm"><thead className="bg-stone-100 text-secondary"><tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Organization</th><th className="p-4">Status</th><th className="p-4">Created</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t border-border"><td className="p-4 font-medium">{user.firstName} {user.lastName}</td><td className="p-4">{user.email}</td><td className="p-4">{user.role}</td><td className="p-4">{organizationName(user)}</td><td className="p-4">{user.isActive ? "Active" : "Inactive"}</td><td className="p-4">{user.createdAt.toLocaleDateString("en-PH")}</td></tr>)}</tbody></table>{users.length === 0 ? <p className="p-6 text-secondary">No application users have been provisioned.</p> : null}</div></>;
}

function organizationName(user: Awaited<ReturnType<typeof prisma.user.findMany>>[number] & Record<string, unknown>) {
  const value = user as unknown as { internProfile?: { school: { name: string } } | null; supervisorProfile?: { company: { name: string; branchName: string | null } } | null; coordinatorProfile?: { school: { name: string } } | null; representativeProfile?: { company: { name: string; branchName: string | null } } | null };
  const school = value.internProfile?.school ?? value.coordinatorProfile?.school;
  const company = value.supervisorProfile?.company ?? value.representativeProfile?.company;
  return school?.name ?? (company ? [company.name, company.branchName].filter(Boolean).join(" — ") : "System administration");
}
