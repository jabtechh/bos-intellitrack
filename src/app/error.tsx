"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flex min-h-[70dvh] items-center px-5"><section className="ui-card mx-auto max-w-lg p-7 text-center"><p className="eyebrow">Something went wrong</p><h1 className="mt-3 font-heading text-3xl font-semibold text-brand-900">We couldn&apos;t load this page</h1><p className="mt-3 text-sm leading-6 text-secondary">Your data is safe. Try loading the page again, or return to your dashboard.</p><div className="mt-6 flex justify-center gap-3"><button className="button button-primary" onClick={reset}>Try again</button><Link className="button button-secondary" href="/dashboard">Dashboard</Link></div></section></main>;
}
