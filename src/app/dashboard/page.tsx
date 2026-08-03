import { logout } from "@/app/(auth)/actions";
import { requireCurrentUser } from "@/lib/auth/require-current-user";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const fullName = `${user.firstName} ${user.lastName}`;

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
            <dt className="text-xs uppercase tracking-wide text-muted">Role</dt>
            <dd className="mt-1 font-medium text-primary">{user.role}</dd>
          </div>
        </dl>
        <p className="mt-5 text-sm leading-6 text-secondary">
          Your role-specific dashboard will be added in a future implementation phase.
        </p>
        <form action={logout} className="mt-7">
          <button type="submit" className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold text-primary hover:bg-stone-100">
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
