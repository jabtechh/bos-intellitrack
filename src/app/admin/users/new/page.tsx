import { prisma } from "@/lib/prisma";
import { ProvisionUserForm } from "./provision-user-form";

export default async function NewUserPage() {
  const [schools, supervisors, coordinators] = await Promise.all([
    prisma.school.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.supervisorProfile.findMany({ where: { user: { isActive: true }, company: { companyCode: "BO_MAIN_OFFICE", isActive: true } }, select: { id: true, user: { select: { firstName: true, lastName: true } } }, orderBy: { user: { lastName: "asc" } } }),
    prisma.coordinatorProfile.findMany({ where: { user: { isActive: true }, school: { isActive: true } }, select: { id: true, schoolId: true, user: { select: { firstName: true, lastName: true } }, school: { select: { name: true } } }, orderBy: { user: { lastName: "asc" } } }),
  ]);
  return <section className="max-w-4xl"><p className="text-xs font-semibold uppercase tracking-wider text-accent-700">Access control</p><h1 className="mt-2 font-heading text-3xl font-semibold text-brand-900">Invite a user</h1><p className="mt-3 text-sm text-secondary">The selected role is controlled by an active administrator. Interns are enrolled directly at Bo’s Coffee Main Office.</p><ProvisionUserForm schools={schools} supervisors={supervisors} coordinators={coordinators} /></section>;
}
