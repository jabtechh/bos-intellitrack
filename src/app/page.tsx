import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

export default async function Home() {
  const currentUser = await getCurrentUser();
  const destination =
    currentUser.status === "active"
      ? "/dashboard"
      : currentUser.status === "not-provisioned"
        ? "/account/not-provisioned"
        : currentUser.status === "inactive"
          ? "/account/inactive"
          : "/login";
  const actionLabel =
    currentUser.status === "active"
      ? "Continue to dashboard"
      : currentUser.status === "unauthenticated"
        ? "Sign in"
        : "View account status";

  return (
    <div className="min-h-screen bg-canvas text-primary">
      <header className="border-b border-border bg-brand-900 text-white">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center px-5 sm:px-8">
          <span className="text-base font-semibold tracking-wide">IntelliTrack</span>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center lg:py-24">
        <section aria-labelledby="page-title" className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-accent-700">System foundation</p>
          <h1 id="page-title" className="font-heading text-4xl font-semibold leading-tight text-brand-900 sm:text-5xl">IntelliTrack</h1>
          <p className="mt-4 text-xl font-medium leading-8 text-primary sm:text-2xl">AI-Powered Internship Management System</p>
          <p className="mt-5 max-w-xl leading-7 text-secondary">A secure, centralized foundation for managing internship operations, progress, and communication.</p>
        </section>
        <aside className="rounded-lg border border-border bg-surface p-6 shadow-surface sm:p-7" aria-labelledby="access-title">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Access</p>
          <h2 id="access-title" className="mt-3 font-heading text-2xl font-semibold text-brand-900">IntelliTrack account</h2>
          <p className="mt-3 text-sm leading-6 text-secondary">Access is limited to identities provisioned through the internship program.</p>
          <Link href={destination} className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-600">{actionLabel}</Link>
        </aside>
      </main>
    </div>
  );
}
