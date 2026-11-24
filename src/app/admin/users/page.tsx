import Link from "next/link";
import { Icon } from "@/components/icons";
import { UsersDataTable, type DirectoryUser } from "@/components/users-data-table";
import { MetricCard, PageHeader } from "@/components/ui";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { roleLabel } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ role?: string; status?: string; q?: string }> }) {
  const actor = await requireCurrentUser();
  const filters = await searchParams;
  const representative = actor.role === "REPRESENTATIVE";

  // The authorized scope is enforced on the server. Client-side filters only
  // operate on rows already permitted for this user's role.
  const users = await prisma.user.findMany({
    where: representative ? { role: { not: "ADMIN" } } : {},
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      internProfile: { select: { school: { select: { name: true } } } },
      coordinatorProfile: { select: { school: { select: { name: true } } } },
      supervisorProfile: { select: { company: { select: { name: true } } } },
      representativeProfile: { select: { company: { select: { name: true } } } },
    },
  });
  const activeByRole = {
    interns: users.filter((user) => user.role === "INTERN" && user.isActive).length,
    supervisors: users.filter((user) => user.role === "SUPERVISOR" && user.isActive).length,
    coordinators: users.filter((user) => user.role === "COORDINATOR" && user.isActive).length,
  };
  const rows: DirectoryUser[] = users.map((user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    roleName: roleLabel(user.role),
    context: user.internProfile?.school.name ?? user.coordinatorProfile?.school.name ??
      user.supervisorProfile?.company.name ?? user.representativeProfile?.company.name ?? "System maintenance",
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  }));

  return <div className="mx-auto w-full max-w-7xl space-y-6 px-5 py-7 sm:px-7 lg:px-8">
    <PageHeader
      eyebrow={representative ? "Company Operations" : "System Administrator"}
      title="Users"
      description={representative ? "Manage normal internship-program users and role assignments within the approved business scope." : "Technical account directory. Business workflow authority is not granted from this screen."}
      actions={representative ? <Link className="button button-primary" href="/admin/users/new"><Icon name="plus" />Invite user</Link> : undefined}
    />
    {representative ? <section className="metric-grid" aria-label="Active user summary">
      <MetricCard label="Active Interns" value={activeByRole.interns} detail="Internship participants" icon="users" />
      <MetricCard label="Active Company Supervisors" value={activeByRole.supervisors} detail="Direct supervision accounts" icon="users" />
      <MetricCard label="Active School Coordinators" value={activeByRole.coordinators} detail="Partner-school monitoring accounts" icon="school" />
    </section> : null}
    <UsersDataTable key={`${filters.role ?? ""}|${filters.status ?? ""}|${filters.q ?? ""}`} users={rows} representative={representative} initialRole={filters.role} initialStatus={filters.status} initialSearch={filters.q} />
  </div>;
}
