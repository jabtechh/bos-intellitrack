import { getSafeRedirectPath } from "@/lib/auth/redirects";

import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const requestedNext = (await searchParams).next;
  const next =
    typeof requestedNext === "string"
      ? getSafeRedirectPath(requestedNext)
      : "/dashboard";

  return (
    <main className="grid min-h-screen bg-canvas lg:grid-cols-[minmax(0,1fr)_30rem]">
      <section className="flex items-center bg-brand-900 px-6 py-12 text-white sm:px-12 lg:px-16">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-200">
            IntelliTrack
          </p>
          <h1 className="mt-5 font-heading text-4xl font-semibold leading-tight sm:text-5xl">
            AI-Powered Internship Management System
          </h1>
          <p className="mt-6 max-w-lg leading-7 text-stone-200">
            Secure access is limited to accounts provisioned for approved
            Interns, Company Supervisors, School Coordinators, Company Representatives, and System Administrators.
          </p>
        </div>
      </section>

      <section className="flex items-center px-6 py-12 sm:px-10" aria-labelledby="login-title">
        <div className="mx-auto w-full max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-700">
            Account access
          </p>
          <h2 id="login-title" className="mt-3 font-heading text-3xl font-semibold text-brand-900">
            Sign in
          </h2>
          <p className="mt-3 text-sm leading-6 text-secondary">
            Use the email and password issued for your IntelliTrack account.
          </p>
          <LoginForm next={next} />
          <p className="mt-6 border-t border-border pt-5 text-xs leading-5 text-muted">
            Access is provisioned by Company Operations. Public registration is not available.
          </p>
        </div>
      </section>
    </main>
  );
}
