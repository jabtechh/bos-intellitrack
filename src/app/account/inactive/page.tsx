import { logout } from "@/app/(auth)/actions";
import { requireAuthUser } from "@/lib/auth/require-auth-user";

export const dynamic = "force-dynamic";

export default async function InactiveAccountPage() {
  await requireAuthUser();

  return (
    <main className="flex min-h-screen items-center bg-canvas px-5 py-12">
      <section className="mx-auto w-full max-w-xl rounded-lg border border-border bg-surface p-6 shadow-surface sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Account status</p>
        <h1 className="mt-3 font-heading text-3xl font-semibold text-foreground">IntelliTrack access is inactive</h1>
        <p className="mt-4 leading-7 text-secondary">Your identity is authenticated, but this IntelliTrack account is currently inactive.</p>
        <p className="mt-3 text-sm leading-6 text-muted">Contact your Company Representative or System Administrator for assistance.</p>
        <form action={logout} className="mt-7">
          <button type="submit" className="min-h-11 rounded-md bg-primary hover:bg-primary-hover px-4 text-sm font-semibold text-white">Sign out</button>
        </form>
      </section>
    </main>
  );
}
