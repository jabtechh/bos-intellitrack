export default function Home() {
  return (
    <div className="min-h-screen bg-canvas text-primary">
      <header className="border-b border-border bg-brand-900 text-white">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center px-5 sm:px-8">
          <span className="text-base font-semibold tracking-wide">IntelliTrack</span>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center lg:py-24">
        <section aria-labelledby="page-title" className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-accent-700">
            System foundation
          </p>
          <h1
            id="page-title"
            className="font-heading text-4xl font-semibold leading-tight text-brand-900 sm:text-5xl"
          >
            IntelliTrack
          </h1>
          <p className="mt-4 text-xl font-medium leading-8 text-primary sm:text-2xl">
            AI-Powered Internship Management System
          </p>
          <p className="mt-5 max-w-xl leading-7 text-secondary">
            The core application and database foundations are in place. Secure
            access and internship workflows will be introduced in the next
            implementation phases.
          </p>
        </section>

        <aside
          id="authentication"
          aria-labelledby="authentication-title"
          className="rounded-lg border border-border bg-surface p-6 shadow-surface sm:p-7"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Access
          </p>
          <h2
            id="authentication-title"
            className="mt-3 font-heading text-2xl font-semibold text-brand-900"
          >
            Authentication coming soon
          </h2>
          <p className="mt-3 text-sm leading-6 text-secondary">
            Role-based sign-in is reserved for a future phase. No account action
            is required at this stage.
          </p>
          <button
            type="button"
            disabled
            aria-describedby="authentication-note"
            className="mt-6 min-h-11 w-full rounded-md bg-brand-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Sign in unavailable
          </button>
          <p id="authentication-note" className="mt-3 text-xs leading-5 text-muted">
            Authentication has not been configured.
          </p>
        </aside>
      </main>
    </div>
  );
}
