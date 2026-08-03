import { logout } from "@/app/(auth)/actions";
import { requireAuthUser } from "@/lib/auth/require-auth-user";

export const dynamic = "force-dynamic";

export default async function NotProvisionedPage() {
  await requireAuthUser();

  return <AccountStatus title="Account awaiting provisioning" message="Authentication succeeded, but your IntelliTrack access has not yet been provisioned by an administrator." />;
}

function AccountStatus({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-screen items-center bg-canvas px-5 py-12">
      <section className="mx-auto w-full max-w-xl rounded-lg border border-border bg-surface p-6 shadow-surface sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-700">Account status</p>
        <h1 className="mt-3 font-heading text-3xl font-semibold text-brand-900">{title}</h1>
        <p className="mt-4 leading-7 text-secondary">{message}</p>
        <p className="mt-3 text-sm leading-6 text-muted">Contact your IntelliTrack administrator if you believe this is unexpected.</p>
        <form action={logout} className="mt-7">
          <button type="submit" className="min-h-11 rounded-md bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-600">Sign out</button>
        </form>
      </section>
    </main>
  );
}
