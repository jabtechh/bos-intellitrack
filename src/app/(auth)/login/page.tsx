import { getSafeRedirectPath } from "@/lib/auth/redirects";

import Image from "next/image";

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
    <main className="login-shell">
      <section className="login-brand-panel">
        <div className="relative z-10 max-w-xl">
          <div className="login-brand-mark">
            <Image src="/brand/bos-cup-mark.png" alt="Bo's Coffee" width={72} height={72} priority />
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-200">
              IntelliTrack · Bo&apos;s Coffee
            </p>
          </div>
          <h1 className="mt-5 font-heading text-4xl font-semibold leading-tight sm:text-5xl">
            AI-Powered Internship Management System
          </h1>
          <p className="mt-6 max-w-lg leading-7 text-slate-200">
            Secure access is limited to accounts provisioned for approved
            Interns, Company Supervisors, School Coordinators, Company Representatives, and System Administrators.
          </p>
        </div>
      </section>

      <section className="login-form-panel" aria-labelledby="login-title">
        <div className="mx-auto w-full max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Account access
          </p>
          <h2 id="login-title" className="mt-3 font-heading text-3xl font-semibold text-foreground">
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
