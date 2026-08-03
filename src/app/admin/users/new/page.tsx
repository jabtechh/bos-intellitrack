import { prisma } from "@/lib/prisma";
import { ProvisionUserForm } from "./provision-user-form";

export default async function NewUserPage() {
  const [schools, companies] = await Promise.all([
    prisma.school.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.company.findMany({ where: { isActive: true }, select: { id: true, name: true, branchName: true }, orderBy: [{ name: "asc" }, { branchName: "asc" }] }),
  ]);
  return <section className="max-w-4xl"><p className="text-xs font-semibold uppercase tracking-wider text-accent-700">Access control</p><h1 className="mt-2 font-heading text-3xl font-semibold text-brand-900">Invite a user</h1><p className="mt-3 text-sm text-secondary">The selected role is controlled by an active administrator. The invited user establishes their own password.</p><ProvisionUserForm schools={schools} companies={companies} /></section>;
}
