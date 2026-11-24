# Gate A browser verification scaffold

This directory is Gate E1 tooling only. It must not be used against the current environment unless Gate E2 has first proven that Auth and PostgreSQL are isolated non-production targets.

## Gate E2 environment preflight

`.env.gatea.local` is the only environment file used by the Gate A browser config. The file is ignored by Git. Run `npm run gatea:env:preflight` before any future Gate A service or browser execution. The preflight compares only normalized target identities and emits fingerprints/booleans; it never prints database passwords, Supabase keys, connection strings, or cookies.

A PASS requires a real disposable test Supabase URL/keys plus `DATABASE_URL` and `DIRECT_URL` that are distinct from the currently configured environment. Empty or placeholder values fail closed.

## Execution contract

The scaffold is intentionally skipped unless all of the following are provided:

- `GATEA_EXECUTION_APPROVED=1` — set only after Gate E5 approval.
- `GATEA_ENVIRONMENT_VERIFIED=1` — evidence from the Gate E2 isolation preflight.
- `GATEA_TARGET_ENV=test`.
- `GATEA_RUN_ID=<unique run id>`.
- `GATEA_BASE_URL=<local or test app URL>`.

When execution is approved, each role project expects an authenticated Playwright storage state in:

- `.gatea/auth/intern.json`
- `.gatea/auth/supervisor.json`
- `.gatea/auth/coordinator.json`
- `.gatea/auth/representative.json`
- `.gatea/auth/admin.json`

Those files are not created in Gate E1. Gate E4/E5 must create them from disposable non-production accounts.

## Matrix

The Playwright config declares exactly 20 projects: five roles × widths 390, 768, 1024, and 1440. Each project uses system Google Chrome through Playwright's `channel: "chrome"` setting.

Gate E1 validation may run `playwright test --list`; it does not authenticate, start the app, or launch a browser.

Actual screenshots, route navigation, and authenticated checks are Gate E5 only.
