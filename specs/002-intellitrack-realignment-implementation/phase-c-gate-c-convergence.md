# Phase C — Gate C convergence (2026-11-04)

## Decision
**GATE C: CONDITIONAL / NOT FULLY VERIFIED.** Application changes for T140–T147 are present and the static/unit suites pass. T148 and the environment-backed portions of T150–T154 are blocked by a failed protected Gate A fixture check. This report is not an authorization to deploy.

## Boundaries respected
- `npm run gatea:env:preflight` PASS: test target `127.0.0.1:3100`, isolated local database at `127.0.0.1:54322`; fingerprints `d6389fa7d65f` (DB) and `12ca17b49af2` (Supabase).
- No database writes, migrations, seeds, fixture repairs, deployment, push, or commit were run in this verification.
- No application request was made to port 3000.
- The earlier B3 record documents application of only `20261104120000_support_weekly_evaluations`; `restore_branches` remains pending, not applied.
- Pre-existing unrelated/uncommitted work was not reset or overwritten.

## Implementation traceability (source inspection + static/unit tests)
- T140 / REQ-FR-EVL-2: `src/lib/evaluations/weekly-period.ts`, `period-for-save.ts`: canonical Monday–Sunday, assignment-local timezone with fallback, no future weeks, full-week assignment bounds.
- T141–T143 / REQ-FR-EVL-1/2/3/5: `src/app/evaluations/actions.ts`: active direct-Supervisor assignment lookup, server-derived PROGRESS identity on create/update, `SINGLE` identity for one-off evaluations, unique-conflict user messages, DRAFT-only updates.
- T144–T145 / S-06 / AC-A-06: `src/components/evaluation-form.tsx` and Evaluation routes: weekly selection and displayed dates; finalized Intern and school-scoped Coordinator reads.
- T146 / REQ-FR-AI-3/6 / AC-S-05: `src/lib/reports/data.ts`, `src/components/intern-report.tsx`, `src/lib/insights/data.ts`, `src/lib/ai/evaluation-selection.ts`: stable Evaluation row IDs, repeated finalized progress retention, milestones reserved before newest weekly AI evidence.
- T147: `scripts/test-weekly-evaluation-application.ts` plus existing Evaluation/AI/role suites, including timezone/normalization and static authorization assertions.
- Generated Prisma model includes the `periodKey` and composite identity types, but this verification did **not** invoke Prisma Client regeneration independently. Regeneration provenance is therefore not independently established here.

## Test evidence
- `npm run gatea:env:preflight`: PASS.
- `npm run gatea:fixtures:verify`: **FAIL** — `Expected exactly 8 tagged Gate A Auth users.` The discrepancy is not diagnosed; do not infer the fixtures were unchanged.
- Weekly application + migration suites: 31/31 PASS.
- Auth, role, Evaluation, AI, Insights, report, mobile, navigation, dashboard, Work Log, Task suites: 91/91 PASS.
- Attendance, correction, document, announcement, notification, provisioning, onboarding, profile, required-hours, calendar, progress, UI and shell suites: 220/220 PASS.
- Total unit/static assertions run: **342 PASS / 0 FAIL**.
- `npm run typecheck`: PASS.
- Targeted ESLint on Evaluation/AI/report UI and libraries: PASS.
- `git diff --check`: **FAIL**, trailing whitespace in existing generated Prisma files (a generated-output formatting issue). It was not normalized because that would rewrite substantial generated files outside a verified regeneration step.
- Full `npm run lint`, safe isolated `npm run build`, browser role-authorization flows and 390/768/1024/1440 responsive matrix: **NOT EXECUTED**. Code-level tests do not substitute for browser acceptance.

## T134 / T148 block
B3 verified schema constraints structurally, but **did not exercise database uniqueness through inserts**. During this pass, the read-only fixture verifier failed at the Auth user count/tag assertion. No disposable synthetic assignment or Evaluation records were inserted. T134 different-week, same-week and one-off uniqueness integration checks therefore remain **BLOCKED**, not passed.

## Remaining acceptance and risk
- Reconcile the local test Auth fixture discrepancy **read-only first** and validate accepted E6 invariants before any synthetic test records are created.
- Then run T134/T148 using completely separate disposable synthetic fixtures with cleanup and before/after fixture fingerprints.
- Re-run authorized Supervisor/Intern/Coordinator/Representative/Admin browser role matrix **only** against port 3100.
- Run 390/768/1024/1440 viewport acceptance on Evaluations, Growth and report views, followed by isolated build/full lint and re-run fixture verification.
- Reconcile all 51 requirement rows against browser/data evidence. Until then, T150–T154 are only partially substantiated, and Gate C is **not green**.
- Production deployment remains behind the separately approved Gate D.

## Continuation verification — 2026-11-04 (supersedes earlier blocked status)

**Gate C remains CONDITIONAL, but T134/T148 now PASS.**

1. Read-only `scripts/diagnose-gate-c-fixtures.ts` found 9 total Auth accounts (8 tagged E6, 1 untagged) and 9 application users (8 tagged E6, 1 untagged). Additional untagged data accounts for the strict-baseline discrepancy. The original exact-total fixture test remains strict by default.
2. `GATEA_VERIFY_TAGGED_ONLY=1 npm run gatea:fixtures:verify`: **PASS**. All eight tagged E6 users, accepted role distribution, organizations, terminal assignment statuses, 1350 credited minutes, ANN-3 and its three deliveries, and absent Branch migration/schema were verified. Counts of other non-E6 test data differ from the original baseline (4 Work Logs, 3 Tasks, 3 Evaluations, 2 Feedback). Tagged-only mode is explicit, not silently substituted for the strict baseline.
3. `scripts/test-gate-c-uniqueness.ts` under the verified local 54322 test DB: **PASS**. Two distinct synthetic assignments were created inside a transaction, and tests proved two different PROGRESS weeks coexist, same-week same-assignment duplicates reject with PostgreSQL 23505, same week on separate assignments succeeds, INITIAL/MIDTERM/FINAL each reject repeats, and a non-Monday key rejects with PostgreSQL 23514. Entire transaction was **rolled back**; zero synthetic assignments or Evaluations persisted. The first trial encountered the existing one-active-assignment-per-intern constraint; the synthetic assignment status was switched to COMPLETED for the successful rollback-only test. No existing assignment was updated.
4. `npx eslint src scripts/test-gate-c-uniqueness.ts scripts/diagnose-gate-c-fixtures.ts` and `npm run typecheck`: **PASS**.
5. Isolated production build: `GATEA_NEXT_DIST_DIR=.next-gatec` with variables from verified `.env.gatea.local`: **PASS**. The normal `.next` path was not used. Next's incidental `tsconfig.json` additions were reverted; its generated `next-env.d.ts` import was restored to the prior isolated-build reference.
6. `npm run gatea:e2e`: **20/20 PASS**, five roles × 390/768/1024/1440 widths on configured port 3100. The initial Intern 390 failure reflected a stale mobile More navigation expectation in `tests/gatea/t105.spec.ts`; it was updated to the actual approved menu, and the full suite passed on rerun. This covers route/shell/role access and responsive overflow checks; it is **not** proof of every interactive Evaluation create/update scenario.
7. `npm run lint` across the entire repo: **FAIL**, dominated by linting generated Next output in `.next-login-diagnose` and other generated files (5,024 errors / 18,575 warnings). Application-source lint passes. `git diff --check` also fails on existing generated Prisma whitespace. Both remain tooling hygiene risks, not application-source lint regressions.

### Outstanding checks before a green Gate C

- The exact-total baseline fixture verifier remains FAIL by design because untagged local test records exist; tagged E6 invariants PASS. Do not delete untagged records without separate authorization.
- Interactive negative authorization (tampered mutation payloads) and weekly create/edit/finalize browser acceptance should be explicitly tested; existing source tests and role-based route sweeps cover only part of this matrix.
- T150/T151/T153/T154 retain incomplete acceptance where the all-suite/full-lint/51-REQ matrix or deeper UI interactions are not proven. Browser viewport route sweep is green but not a detailed screen-specific functional audit.
- Generated files and untracked build output remain outside code cleanup scope; preserve unrelated work. Gate D is **not** approved.

## Gate C final acceptance continuation (2026-11-04)
- Added `tests/gatea/gate-c-evaluations.spec.ts` (20 role × viewport browser checks). The suite passed **20/20** on rerun after handling asynchronous authorization redirects and a transient aborted redirect navigation. This adds actual Evaluation list authorization, Supervisor-only new form, visible Monday–Sunday label, absent client period key, one-off mode controls and no horizontal overflow on 390/768/1024/1440. It does **not** submit Evaluation mutations.
- Prior general Playwright route matrix remains **20/20 PASS**. Together there are two distinct 20-case browser matrices; they test different behavior.
- Updated `eslint.config.mjs` to exclude `.next-gatec`, `.next-login-diagnose` and `.gatea/next-build` generated output. **`npm run lint` now PASS**, not by disabling application lint. `npm run typecheck` PASS; a focused 73-case Evaluation/AI/role/report suite PASS.
- Added `phase-c-51-requirement-traceability.md` with **51/51 requirement IDs classified**: 34 evidence-verified and 17 conditional pending specific end-to-end/browser mutation or edge authorization checks; none unaccounted. T150, T153, T154 checklist marks refer to completed evidence review and broad matrices, **not** blanket runtime acceptance of all 51 requirements.
- T151 remains incomplete: existing trailing whitespace in generated Prisma Client files causes `git diff --check` failure, while typecheck, full lint, isolated production build all pass. No destructive normalization of generated files attempted.
- `npx prisma generate` completed successfully with the verified isolated environment overlay; Prisma Client 7.9.0 regenerated against the approved schema without running migrations or database queries. Follow-up `npm run typecheck` and `npm run lint` PASS. Generator-produced trailing spaces still cause `git diff --check -- src/generated/prisma` to fail.
- Repeated tagged E6 fixture verification PASS after Client regeneration, and isolated T134/T148 uniqueness checks PASS with rollback and zero synthetic residue.
- Gate C was conditional at this checkpoint; the subsequent final disposition below supersedes it. Protected E6 records were not modified; port 3000 was not accessed.

## FINAL GATE C DISPOSITION — 2026-11-04 (authoritative)

**DECISION: BLOCKED / NOT DEPLOYMENT-READY.** This closes the Gate C execution and reporting stage with an explicit non-PASS result. It is not Gate D approval.

### Final positive evidence
- `npm run gatea:env:preflight`: PASS, verified port **3100** and isolated PostgreSQL **127.0.0.1:54322**.
- Tagged E6 fixtures: PASS after all synthetic tests (8 tagged Auth/application users, accepted terminal assignments, exactly 1350 credited minutes, ANN-3 published and 3 deliveries, `restore_branches` unapplied). The strict exact-total verifier still intentionally fails because one unrelated untagged test account exists; explicit tagged-only mode was used instead.
- `tests/gatea/gate-c-lifecycle.spec.ts`: **PASS**. Distinct disposable Intern Auth/user/profile and active assignment. Tested genuine server-action creation of two canonical PROGRESS weeks, same-week duplicate create and update rejection, draft update, forged hidden period identity ignored, forged other-supervisor Intern creation denied, tampered finalize denied, finalized lock, Intern draft invisibility and acknowledgment, tampered acknowledgment denied, School Coordinator finalized visibility and draft denial. **All synthetic rows and the synthetic Auth identity removed**.
- `scripts/test-gate-c-uniqueness.ts`: PASS, rollback-only SQL uniqueness/one-offs; zero persistent rows.
- Full regression with isolated environment variables explicitly loaded: **516 tests PASS / 0 FAIL**, covering all `scripts/test-*.ts` test files. Existing `scripts/test-single-organization.ts` was updated to assert company-scoped Representative assignment visibility instead of incorrectly expecting a redirect.
- `npm run gatea:e2e`: **41 PASS / 19 intentionally SKIPPED / 0 FAIL**. Twenty global role/viewport matrix checks, twenty Evaluation-specific role/viewport checks, one synthetic Evaluation lifecycle at S-1440. Skips are the 19 redundant lifecycle replicates.
- `npm run lint`, `npm run typecheck`, and isolated build (Next distDir `.next-gatec`): **PASS**. The isolated build's auto-modifications to `tsconfig.json` were reverted and `next-env.d.ts` restored to its prior `.gatea/next-build` reference.
- `git diff --check`: **PASS**, with a new tightly scoped `.gitattributes` rule exempting only Prisma-generator JSDoc trailing-space formatting from that check. Other source whitespace validation still applies. The attribute file must accompany the source changes when reviewed; do not treat the override as correction of upstream generator behavior.
- Requirement traceability: **51/51 IDs classified, 38 Verified, 13 Conditional**, zero unaccounted. See `phase-c-51-requirement-traceability.md`.

### Explicit blockers
1. **Isolation incident.** An initial unqualified wildcard run `npx tsx --test scripts/test-*.ts` unintentionally executed the existing `test-admin.ts` and `test-db.ts` diagnostics without loading the verified isolated env overlay. The diagnostics accessed the repository's default configured Auth/database target and reported 32 Auth/application users and 18 internship assignments, rather than the verified isolated DB's 9 Auth accounts. Those diagnostics are read-only and produced no write evidence, but the target **could be Production-backed**. This deviated from the strict boundary and requires independent audit/authorization review. This exception supersedes earlier statements claiming every database access was isolated.
2. **13 conditional product requirements remain:** `URM-2` (logout); `PRO-1/6` (profile/emergency-contact mutations); `ATT-1/3/5` (real clock, GPS, camera); `DWL-1/2` (Work Log submission/attachment); `TSK-1` (Task assignment); `EVL-4` (workmate feedback submission); `AI-1/4` (Portfolio generation/export); `DOC-1` (document upload). Unit/source and role-route coverage exist, but specific interactive/data/storage/device checks were not re-executed during final acceptance. Do **not** silently convert these to Verified.
3. The `git diff --check` generator whitespace fix is a scoped Git attribute, not a generated-code rewrite. Preserve and review `.gitattributes` with all changes.

### Scope / stop
No migration, deployment, push, or commit was executed. No request was sent to port **3000**. No protected Gate A E6 fixtures were changed. Disposable synthetic rows and Auth account were verified absent, and the tagged-only E6 fixture verifier passed afterward. The isolated build used a separate dist directory. **Gate D is not authorized.** A fresh gate decision must explicitly address the isolation incident and all remaining conditional workflows before deployment.

## Gate C continuation — reduced blockers (2026-11-04 evening, supersedes prior counts)

**Decision remains BLOCKED / NOT APPROVED FOR DEPLOYMENT.**

- The isolated `tests/gatea/gate-c-lifecycle.spec.ts` now covers **two** distinct synthetic Intern Auth/accounts, same-Supervisor active assignments, original weekly Evaluation lifecycle and tampered requests, genuine workmate-feedback submission, Supervisor-created Task, Intern-submitted Work Log, profile and emergency-contact persistence, automatically compiled Portfolio display, valid downloadable PDF, and authenticated logout with protected-route denial. The complete extended lifecycle passed; both Auth accounts and all temporary Task/Work Log/Feedback/Evaluation/assignment/profile/user records were removed, with zero synthetic rows remaining.
- Traceability: **51/51 mapped, 46 verified, 5 conditional**. Remaining: **ATT-1** live Time In/Out, **ATT-3** physical/device GPS capture, **ATT-5** actual camera/selfie capture, **DWL-2** Work Log attachment Storage upload, **DOC-1** internship document Storage upload.
- `scripts/gate-c-storage-preflight.ts` read-only, guarded to the isolated target: local Supabase Storage returned **StorageApiError HTTP 503** on bucket enumeration; Storage-dependent acceptance cannot be safely run or declared successful. No local bucket or production Storage resources were created/modified. Physical camera/GPS exercise also remains unverified; source/unit tests continue to pass.
- New `npm run gatec:regression` always starts with `gatea:env:preflight`, then runs the 516-case regression suite with the explicit `.env.gatea.local` environment. The suite passed **516/516**. `scripts/test-admin.ts` and `scripts/test-db.ts` now fail closed before querying unless the isolated test target + known Gate A run id and ports are verified. This mitigates the previous diagnostic isolation error but **does not independently clear the prior incident**.
- The original default-environment read-only diagnostic incident remains documented and requires external audit/review. No conclusion that the default target was non-Production is supported.
- No Production access, port 3000 access, deployment, migration, seed, push, commit, or modification to protected E6 fixtures was performed in this continuation. All later database/Storage operations were checked against the verified isolated target.
- Gate D remains separately gated. Do not reinterpret completed Phase C checklist entries as proof that the five remaining device/Storage requirements passed.

## Gate C blocker-resolution authorized verification — 2026-11-04 (latest)

**Final decision: BLOCKED.** Infrastructure, device acceptance, and incident-review gates remain open. This verification did not authorize or perform infrastructure repair.

### Isolated Storage diagnosis (read-only)
1. `npm run gatea:env:preflight` PASS, `GATEA_VERIFY_TAGGED_ONLY=1 npm run gatea:fixtures:verify` PASS; target verified as app port 3100, local PostgreSQL `127.0.0.1:54322`, and Supabase gateway `127.0.0.1:54321`. E6 invariants retained.
2. `docker ps --format ...` inspection shows `supabase_auth_local-supabase`, `supabase_kong_local-supabase`, and `supabase_db_local-supabase` running healthy. **No `supabase_storage_*` container is running.**
3. Read-only HTTP probes of loopback `54321` show `/auth/v1/health` **200**, `/storage/v1/bucket` **503**. The guarded SDK preflight `npx tsx --env-file=.env.gatea.local scripts/gate-c-storage-preflight.ts` also returned **StorageApiError, HTTP 503**. This supports the missing Storage-service cause; it does not establish bucket existence or service data integrity.
4. No Docker container was started, restarted or created. No Storage bucket, object, policy, migration, or schema was created/changed. Work Log attachment and internship Document upload require a separately approved isolated Storage service and bucket-validation gate and remain unverified.

### Attendance simulated-browser evidence
- The disposable Intern test now authorizes browser geolocation exclusively for the isolated `127.0.0.1:3100` origin and supplies **simulated** latitude `14.5547`, longitude `121.0244`, accuracy `18`.
- Browser location-capture status and hidden form values matched; **Time In remained disabled without a confirmed selfie**, and the isolated DB contained **zero Attendance rows** for the synthetic assignment before and after the check.
- This is a positive geolocation UI/negative-submit acceptance test, **not** actual physical GPS accuracy or a face/camera capture, and **not** Time In/Time Out acceptance. ATT-1, ATT-3, ATT-5 remain conditional. No synthetic selfie, fabricated photo, or bypass of face detection was used.

### Isolation incident review and disposition
- The previous inadvertent `npx tsx --test scripts/test-*.ts` invocation lacked the `.env.gatea.local` override and executed `scripts/test-admin.ts` and `scripts/test-db.ts`, whose source was reviewed. Their operations are `listUsers`, `findMany`, `count`, and output only; no write/update/seed/migrate operations appear in these two diagnostics.
- The reported counts (32 Auth users, 32 app users, 18 assignments) differ from the verified isolated test database (9 Auth users), so the **read-only access was not to the authorized isolated test target**. It could have been Production-backed. Do not claim a definitive benign classification.
- Permanent fail-closed loopback, run-id and environment guards were added to both diagnostics and `gatec:regression` explicitly loads the test overlay. These controls reduce recurrence. **Independent environment-owner review of the incident remains required**; this run cannot retrospectively authorize the earlier access.

### Revalidation after diagnosis
- `npm run gatec:regression`: **516/516 PASS** with explicit verified test overlay.
- `npm run gatea:e2e`: **41 PASS, 19 intentionally SKIPPED**, 0 failed. The expanded synthetic lifecycle also verifies simulated GPS capture without Attendance persistence; both disposable Intern Auth users and all synthetic application data were cleaned up.
- Isolated Next.js build using `GATEA_NEXT_DIST_DIR=.next-gatec`: **PASS**; Next-generated `tsconfig.json` and `next-env.d.ts` changes were reverted to the immediately preceding checkout state.
- 51 canonical requirements remain **46 verified, 5 conditional** (ATT-1/3/5, DWL-2, DOC-1). No new claim of complete hardware or upload acceptance is warranted.

**Stop:** Gate C remains BLOCKED. No access to port 3000, no Production mutation, no migration, no Storage infrastructure change, no deploy/commit/push. Gate D is not authorized.

## Gate C.1 — Isolated Storage service recovery review (2026-11-04)

**Decision: BLOCKED — no safe service-only restoration possible within approval.**

- Preflight: `npm run gatea:env:preflight` PASS; run `gatea-20261103-2318`, API gateway `127.0.0.1:54321`, database `127.0.0.1:54322`, app `127.0.0.1:3100`. Protected E6 tagged-only fixture verification PASS before diagnostic.
- Local project identity checked: `com.supabase.cli.project=local-supabase`, `com.supabase.cli.workdir=C:\\Coding\\bos-intellitrack\\.gatea\\local-supabase`. `.gatea/local-supabase/supabase/config.toml` explicitly enables `[storage]`, with database port 54322 and API port 54321. This file was read, not modified.
- `docker ps -a` listed healthy `supabase_auth_local-supabase`, `supabase_kong_local-supabase`, and `supabase_db_local-supabase`, but **no running or stopped `supabase_storage_local-supabase` container**. The Storage API image `public.ecr.aws/supabase/storage-api:v1.88.0` is cached, but that is not a configured container to restart; local Supabase CLI executable was not available in either project `node_modules/.bin` path.
- Read-only loopback probes: `http://127.0.0.1:54321/auth/v1/health` => HTTP 200, `http://127.0.0.1:54321/storage/v1/bucket` => HTTP 503. This confirms the Storage route is unavailable, not that any upload code was exercised.
- Read-only catalog inspection in **existing isolated DB container**, `BEGIN READ ONLY` / `COMMIT`: `information_schema.schemata` contains `storage` and `storage.buckets` table exists. **`SELECT COUNT(*) FROM storage.buckets` => 0**; no bucket names exist. The required `work-log-attachments` and `internship-documents` buckets are therefore absent. No schema/bucket/policy/row mutations were executed.
- Starting a brand-new Storage container requires reconstructing a service configuration; the image's server entrypoint may initialize or migrate metadata. Given explicit prohibition on changing schema, policies or existing buckets, **no new container was created and no service was started**. The missing buckets cannot be initialized under this approval.
- Remediation requires separate explicit authorization for **isolated** Storage container creation and required private bucket setup, together with safety/pre- and post-checks. Do not use the default project, port 3000, or any external/Production Supabase service.
- Gate C.1 provides diagnosis, **not PASS**. Gate C remains BLOCKED with five unresolved requirements (ATT-1/3/5, DWL-2, DOC-1) plus the historical isolation-incident review; Gate D remains unauthorized.

## Gate C.1B — Isolated Storage setup review (2026-11-04)

**FINAL DECISION: BLOCKED.** This approval requires stopping before any unverified database migration or initialization. No persistent Storage service or private bucket was created.

- Preflight verified test run `gatea-20261103-2318`, gateway `127.0.0.1:54321`, database `127.0.0.1:54322`, app `127.0.0.1:3100`; fingerprints `12ca17b49af2` and `d6389fa7d65f`. Tagged-only protected E6 fixtures passed both before and after inspection, including 1350 credited minutes and three ANN-3 deliveries.
- Existing Docker project `local-supabase` has healthy Auth, Kong and PostgreSQL containers but no running/stopped Storage container to restart. `.gatea/local-supabase/supabase/config.toml` enables Storage, and `public.ecr.aws/supabase/storage-api:v1.88.0` is cached, but no verified prior Storage container environment/volume configuration is available.
- Read-only offline image inspection via disposable `docker run --rm --network none --read-only --entrypoint sh` (the Storage server was **not** started; no DB/network or mounted data) found the default startup command `node dist/start/server.js`. That server invokes `runMigrationsOnTenant` on single-tenant startup **before serving HTTP**. The `DB_MIGRATIONS_FREEZE_AT` configuration exists, but was not independently proven sufficient to prevent all startup DB writes or schema changes.
- Read-only isolated SQL: `storage.migrations` has 80 entries (IDs 0–79; ID 0 creates the migration table, ID 79 is `lifecycle-writer-coordination`). The cached image lists 79 tenant migration files 0001–0079. This is suggestive of version parity **not proof of hash compatibility, startup side-effect safety, or correct environment wiring**. `storage.buckets` exists but has 0 rows.
- Intended minimum private buckets, **not created**: `attendance-evidence`, `work-log-attachments`, `internship-documents`, all `public=false`. Attendance requires captured image evidence; Work Log/Document validation currently caps individual files at 25 MiB. Exact Storage policies, MIME limits and startup backend configuration must be checked before write operations.
- Read-only Storage gateway remains HTTP 503 and SDK bucket enumeration unavailable. Starting a guessed service could invoke migrations. Per the mandatory stop condition, **no service/container or bucket creation, DB initialization, schema/policy modification, upload test, migration, reset, deploy, commit, push, Production or port 3000 access was attempted**. The transient offline inspection process was removed.
- To unblock, independently verify an isolated Storage container launch specification and the server's migration behavior (database URL, API keys, network aliases, file-backend volume, freeze setting and exact startup side effects) before approving a controlled launch and minimum private bucket provisioning. Historical non-isolated read-only diagnostic incident still needs independent review. **Gate C remains BLOCKED (46/51 verified; 5 conditional); Gate D unauthorized.**

## Gate C.1C — Storage Startup Compatibility Verification (2026-11-04)

**DECISION: BLOCKED — file-migration parity proven; complete no-mutation startup safety and service configuration not yet verified. This is a strictly read-only investigation.**

### Isolated safety preflight
- `npm run gatea:env:preflight`: PASS, isolated run `gatea-20261103-2318`; app `127.0.0.1:3100`, gateway `127.0.0.1:54321`, PostgreSQL `127.0.0.1:54322`. Fingerprints `12ca17b49af2` (Supabase) and `d6389fa7d65f` (database/direct); all separate from current/default targets.
- `GATEA_VERIFY_TAGGED_ONLY=1 npm run gatea:fixtures:verify`: PASS at start. Protected E6 8 tagged users, assignment statuses, 1350 credited minutes, and 3 ANN-3 notifications preserved. The one unrelated untagged Auth account is not modified.
- Docker inspection: existing `supabase_network_local-supabase` bridge with the same healthy Auth/Kong/DB containers; no Storage container or independent Storage volume. No Docker services were started or stopped.

### Full cached-image / isolated-DB migration comparison
- Offline cached image: `public.ecr.aws/supabase/storage-api:v1.88.0`, inspected only via `docker run --rm --network none --read-only --entrypoint node|sh` with no host mounts. **No Storage server executable was launched and no network/database access was possible from inspection containers.**
- The image bundles `postgres-migrations`. Inspection of `/app/node_modules/postgres-migrations/dist/migration-file.js` established the actual migration hash algorithm: **SHA-1 of the filename concatenated with the unmodified UTF-8 SQL file contents**; using `sha1sum` of SQL contents alone would incorrectly report mismatches.
- Computed the true `id|name|hash` triplet for each of the **79 bundled tenant migrations, IDs 1–79**, and compared them in memory with `SELECT id,name,hash FROM storage.migrations` executed on the verified isolated DB via **`BEGIN READ ONLY`**. **79/79 IDs, names, and hashes match exactly; 0 mismatches; no extra or missing file migrations.** The DB also has bootstrap `id=0, name=create-migrations-table` (not a tenant SQL file), so DB ledger total is 80.
- Source analysis of `dist/start/server.js` confirms that single-tenant startup calls `runMigrationsOnTenant` before HTTP. `dist/internal/database/migrations/migrate.js` loads tenant files, checks the existing `storage.migrations` table, validates hashes, filters unapplied files, and has conditional **schema creation / migration execution / migration-hash refresh / migration-position rewrite** branches. Given the observed ledger, the file-migration branch should have no outstanding SQL migrations; this is **not a guarantee that the full service startup is read-only**.
- `DB_MIGRATIONS_FREEZE_AT` is recognized by the image, using an existing **migration name**, e.g. `lifecycle-writer-coordination` for bundled version 79. `DB_ALLOW_MIGRATION_REFRESH=false` disables automatic migration-hash refresh on mismatch. Neither has been deployed or verified in a running service. Do not assert that these options eliminate all startup database activity. Startup may also initialize runtime components such as PubSub; non-migration startup mutation behavior was not exhaustively proved.

### Required isolated runtime configuration — proposed, not applied
- Kong's **existing** read-only inspected route configuration directs `/storage/v1/` and `/storage/v1/s3/` to **`supabase_storage_local-supabase:5000`** on the already-existing `supabase_network_local-supabase` network. Therefore the new service must resolve at precisely that network alias; no gateway edit is necessary.
- The cached image's default start command is `node dist/start/server.js`, HTTP port default **5000**. Relevant env contracts from `dist/config.js`: `DATABASE_URL` (must be sourced only from verified local DB service, not default target); `PGRST_JWT_SECRET` or `AUTH_JWT_SECRET` with matching isolated Auth JWT; `SERVICE_KEY`/`ANON_KEY` if configured, never copied to documentation; `SERVER_PORT=5000`; `STORAGE_BACKEND=file`; `FILE_STORAGE_BACKEND_PATH` or `STORAGE_FILE_BACKEND_PATH`; and explicit migration/queue/vector safeguards as appropriate (`DB_ALLOW_MIGRATION_REFRESH=false`, `DB_MIGRATIONS_FREEZE_AT=lifecycle-writer-coordination`, `PG_QUEUE_ENABLE=false`, `VECTOR_STORE_MIGRATIONS_ENABLED=false`).
- The file backend `dist/storage/backend/file.js` **throws when FILE_STORAGE_BACKEND_PATH is unset**. No independent isolated Storage volume exists; a persistent local-only file volume/mount needs its owner, location, permissions, lifecycle, and backup/cleanup contract verified before creation. Do not reuse DB volumes or attach a Production path.
- Intended, **uncreated** private buckets: `attendance-evidence` (image selfie evidence), `work-log-attachments` (PDF/image/DOCX, app limit 25 MiB), and `internship-documents` (PDF/image/DOCX/XLSX, app limit 25 MiB). All must be **`public=false`**; evaluate compatible MIME/size settings and existing service-role access before creating any bucket or policy. The isolated `storage.buckets` table currently holds 0 records.
- No exact executable startup command can be certified safe yet because the origin/mapping of isolated runtime credentials and the persistent file-backend directory, migrations/runtime startup side-effect bounds, and a fully reviewed reproducible container specification remain unverified. **Do not improvise `docker run` flags or point the service at the default environment.**

### Final gate
**Gate C.1C = BLOCKED / NOT SAFE TO START UNDER PRESENT EVIDENCE**, despite proven migration hash parity. Follow-up must independently verify a reproducible isolated service startup specification and non-destructive runtime behavior before authorizing a controlled service launch; no Storage buckets, policies or files are to be created until that gate. Gate C stays **46/51 requirements verified** with ATT-1/3/5, DWL-2 and DOC-1 conditional; the historical non-isolated diagnostic read incident remains separately unresolved. No container or bucket creation, upload, device acceptance, schema/policy edit, migration, deploy, commit, push, Production or port 3000 access occurred.

## Gate C.1C follow-up — controlled-startup specification, read-only (2026-11-04)

- Added `phase-c-storage-controlled-startup-plan.md`, a reviewed **non-executable** isolated Storage service configuration and precise preflight/stop conditions. No secrets are included.
- Additional read-only inspection: migration backport rule in the cached image rewrites the ledger only when existing migration ID 2 is named `pathtoken-column`. The isolated ledger has ID 2 = `storage-schema`, so that rewrite branch does **not** trigger against the current ledger. All 79 migration ID/name/hashes already match; no unapplied SQL files were found. Startup still invokes the migration runner and other runtime modules, so no fully read-only guarantee is asserted.
- Existing Kong routing already requires `supabase_storage_local-supabase:5000` on `supabase_network_local-supabase`. The isolated `supabase_storage_admin` non-superuser LOGIN role has usage on the Storage schema and relevant existing `storage.buckets` / `storage.objects` privileges. Credential sourcing and full RLS/runtime correctness remain to be checked without exposing secret values.
- No standalone Storage file volume exists. A new local Storage-only persistent volume and verified environment mapping would be required. These are documented as **proposed**, not created.
- Final verification remains **BLOCKED for controlled startup**: no independently verified complete service definition, secret mapping, file-volume ownership, or no-unapproved-startup-write proof. Gate C remains 46/51 verified and blocked. Previous non-isolated diagnostic incident requires independent review. No container or infrastructure creation, migration, upload, bucket, policy, or E6 data mutation took place.

## Gate C.1D — Controlled startup attempt (2026-11-04)

- Local test preflight and tagged E6 fixture integrity PASS before and after; only existing healthy Auth/Kong/PostgreSQL containers remain.
- Isolated Auth JWT secret and the database's configured JWT secret match (checked in memory; **no secrets output**). Local PostgreSQL credential was found in the existing isolated DB container environment and independently authenticated `supabase_storage_admin` as a **read-only PostgreSQL session** on loopback port 54322. These checks establish an isolated identity/credential path without changing passwords or schema.
- The planned read-only database-bound Storage startup probe was **blocked by execution safety controls before execution**. The control was respected; no retries using alternate secret transport, no persistent or transient Storage probe container, and no Storage volume or buckets were created. Subsequent `docker ps -a` confirmed only the original isolated Auth, gateway and PostgreSQL containers.
- Do not claim a successful Storage startup or a completed no-write runtime verification. An approved, secure and supported runtime secret-delivery method and independently reviewed service specification are required before another launch attempt. Full notes: `phase-c-storage-controlled-startup-plan.md`.
- **Gate C.1D BLOCKED**. Gate C remains **46 verified / 5 conditional** (ATT-1/3/5, DWL-2, DOC-1), incident review open; Gate D unauthorized.

### Gate C.1D continuation — supported management availability
- Further isolated-only read-only inspection found **no installed Supabase CLI**, **no `local-supabase` Docker Compose project registered**, and no local Storage Compose/env service definition. The local CLI `config.toml` alone cannot safely recreate a supported service with the required verified runtime configuration.
- `phase-c-storage-controlled-startup-plan.md` now records the environment-owner handoff: provision a supported, reviewed local service manager and secure secret injection without command-line credential exposure; explicitly verify no database migration or broader stack restart occurs. The previous blocked inline startup-probe tool invocation was not retried or worked around.
- E6 and environment preflight remain PASS, and the healthy original Auth/Kong/DB containers remain unchanged. No service creation, buckets, DB writes or deployment. **Still BLOCKED; do not advance Gate C.2 or Gate D.**

## Gate C.1E — Controlled isolated Storage setup (2026-11-04)

**FINAL: BLOCKED — secure supported service launch is not available.**

- Approved scope included Storage container, isolated persistent volume, and only three private buckets, strictly conditioned on non-destructive verified startup and secure secret injection.
- Fresh verified preflight PASS (`gatea-20261103-2318`, app port 3100, gateway 54321, DB 54322, both isolated fingerprints) and tagged E6 fixture verification PASS. Docker shows only original healthy Auth, Kong and PostgreSQL containers; no Storage service/volume. No change to E6 fixtures.
- Read-only SQL in verified isolated DB: `storage.migrations` has 80 entries through ID 79 and `storage.buckets` has 0 rows. Loopback Storage gateway endpoint remains HTTP 503.
- The earlier read-only compatibility review established 79/79 image migration ID/name/hash matches; that is not an execution-safe guarantee of startup or permission to bypass runtime controls. There is no installed Supabase CLI or `local-supabase` registered Compose runtime definition. Previous secret-bearing start request was blocked by execution controls. This authorization does not override execution safety restrictions, and no alternate inline-secret workaround was attempted.
- Consequently, **the required secure service-manager/secret-injection mechanism could not be established within available permitted tools**. No container, volume, bucket, schema/policy, migration, upload object or test fixture was created, and no Production or port 3000 resource was accessed.
- The next prerequisite is an authorized environment operator installing/configuring a supported local Supabase service runtime with secure, reviewed secret injection and an isolated-only volume, then confirming its non-destructive startup behavior. Only after that can Storage startup, private bucket creation and read-only verification proceed.
- **Gate C.1E BLOCKED; Gate C 46/51 Verified / 5 Conditional; Gate D not authorized**. Historical isolation incident still requires independent review.

## Independent isolation-incident evidence review continuation (2026-11-04)

- Reviewed the pre-guard `git show HEAD:scripts/test-admin.ts` and `scripts/test-db.ts` plus actual Prisma and Auth client connection sources. The earlier default-environment wildcard invocation did not perform writes in these two diagnostic source paths, but **the non-isolated target's identity is not established**. Earlier counts (32 users / 18 assignments) differ from verified isolated fixtures; Production involvement cannot be excluded.
- Found and repaired a remaining **guard mismatch**: Prisma uses `DATABASE_URL`, while both scripts' earlier safeguards validated only `DIRECT_URL`. Both diagnostics now also require actual `DATABASE_URL` to be `127.0.0.1:54322`; Auth diagnostic additionally requires API port `54321`. Existing run-ID, isolated-app port 3100, direct-DB, verified marker, and test-mode checks remain.
- Safe `npm run gatec:regression` **516/516 PASS**; lint, typecheck, tagged E6 fixture verification PASS. No access to default database, port 3000 or Production occurred during review.
- Created `phase-c-isolation-incident-review.md`: evidence limits, safeguards, and an independent environment-owner audit/closure checklist. **Incident remains OPEN** until a qualified owner identifies the original target and signs off audit findings. This continuation does not authorize Gate D, Storage workarounds, or final Gate C PASS. All five conditional requirements remain unchanged.

## Gate C continuation — Attendance denied-permission acceptance (2026-11-04)
- Expanded `tests/gatea/gate-c-lifecycle.spec.ts` using its verified disposable synthetic Intern, isolated application port 3100 and local test DB. Following simulated browser geolocation capture, the test revokes geolocation permission, reloads the Attendance form and verifies the UI reports **`Location permission was denied.`**, displays **Retry location**, and keeps **Time in disabled**.
- Read-only DB assertion confirms **zero** Attendance rows for the disposable assignment after the denied-permission scenario. All synthetic user/Auth fixtures cleaned up. Single lifecycle browser test **PASS**.
- This verifies the failure-closed browser UI when GPS is denied, **not real device GPS capture, camera/selfie evidence or Time In/Out persistence**. ATT-1/3/5 remain Conditional. Storage remains offline and DWL-2/DOC-1 remain Conditional. Gate C remains BLOCKED, with incident closure pending.

## Gate C final-check request — environment revalidation (2026-11-04)

- User asked to finish the remaining requirements and proceed. Revalidated the actual **isolated test environment** rather than assuming the missing acceptance evidence had been produced.
- `npm run gatea:env:preflight` PASS with approved test fingerprints; protected E6 tagged fixture verification PASS. Original Auth, Kong and PostgreSQL containers healthy and unchanged.
- Isolated gateway `GET /storage/v1/bucket`: HTTP **503**; Docker has **no Storage service**; `storage.buckets` **0** rows (none of `attendance-evidence`, `work-log-attachments`, `internship-documents`); `storage.migrations` still 80 rows through ID 79. No bucket or object writes attempted.
- `npm run gatec:regression`: **516/516 PASS**; `npm run lint` PASS; `npm run typecheck` PASS; protected E6 verification PASS again.
- Independent reviewer incident closure and true physical camera/GPS/clock-in/clock-out acceptance evidence are not present in the reviewed records. **Do not mark missing evidence as Verified** solely based on user instruction to proceed.
- **Decision: Gate C BLOCKED — 46/51 Verified, 5 Conditional (ATT-1/3/5, DWL-2, DOC-1); Gate D not authorized.** Next prerequisite: an authorized local environment owner must establish and verify the secure isolated Storage runtime and private buckets, then separately run upload/device acceptance and incident closure. No Production, port 3000, deployment, commit, push or unrelated migration.

## Gate C next-step continuation — static isolated Storage Compose handoff (2026-11-04)

- Reverified test environment fingerprints and protected tagged E6 fixtures (PASS); current Auth/Kong/DB containers healthy; Storage gateway still HTTP 503. The known separate Storage image digest exists locally.
- Produced the **review-only** `compose.gatec-storage.review.yaml` with an independently named Compose project, the exact pinned cached image, existing isolated network alias, a dedicated Storage-only volume, no host port bindings, disabled queue/vector migration settings, and file-mounted (never embedded) runtime credentials. A fail-closed DB URL hostname/user/database check rejects non-isolated targets.
- `docker compose -f specs/002-intellitrack-realignment-implementation/compose.gatec-storage.review.yaml config --quiet` **PASS**. This is a **static configuration check**, not a successful Storage service startup or migration-safety certification.
- Intentionally **did not create secret files, containers, volumes, buckets, policies, or data**. The earlier runtime execution safety restriction remains controlling; no workarounds attempted. A supported environment-owner process is required to review runtime effects and provision secrets/launch locally.
- **Gate C still BLOCKED, 46/51 Verified; 5 Conditional; historical isolation incident still OPEN. Gate D unauthorized.**

## Gate C.2 — Controlled isolated Storage activation attempt (2026-11-04)

**Decision: BLOCKED before service/volume/bucket creation.** The user approved conditional activation only after secure credential and startup safety checks.

- Verified test-only preflight PASS (run `gatea-20261103-2318`, gateway 54321, DB 54322, app 3100, fingerprints `12ca17b49af2` and `d6389fa7d65f`). Tagged-only E6 fixture integrity PASS before intervention.
- Existing isolated Auth/Kong/PostgreSQL containers healthy; no isolated Storage container or dedicated Storage volume. `GET http://127.0.0.1:54321/storage/v1/bucket` remains **HTTP 503**.
- Re-inspected `compose.gatec-storage.review.yaml` and ran `docker compose -f specs/002-intellitrack-realignment-implementation/compose.gatec-storage.review.yaml config --quiet`: **PASS (static YAML validation only)**. Exact Storage v1.88.0 image digest is cached locally. Compose is limited to a separate project with existing external network, no host port mapping, one isolated Storage volume, and file-mounted secrets.
- Non-content filesystem checks of the **two declared local secret sources** returned **both missing**: `.gatea/local-supabase/storage-secrets/db-url` and `.gatea/local-supabase/storage-secrets/jwt-secret`. No secret values were read, logged, generated, or copied. As the secure runtime credential inputs are not provisioned, startup is not safe or operationally ready; the separate prior execution safety block cannot be bypassed.
- Read-only isolated PostgreSQL inspection: `storage.migrations` has **80** records through ID 79; `storage.buckets` has **0** rows. Previously verified 79/79 image migration hashes continue to be the documented baseline; no migration was applied in this attempt.
- **Stop:** Did not call Compose `up`, create a Storage container/volume, provision secrets, create private buckets, modify schema/policies or upload data. Existing Auth/Kong/PostgreSQL and all protected E6 fixtures remain unchanged. No Production, port 3000, deploy, commit or push.
- **Actionable owner handoff:** an authorized local environment owner must securely provision the *existing isolated stack's* dedicated Storage DB URL and matching local Auth JWT into the two gitignored file paths, using controlled local secret management, and independently approve launch/runtime DB side effects. Do not paste secrets into chat, logs, scripts or command arguments. Then reverify exact isolated fingerprints, image hash/migration ledger, permissions and Compose config before controlled startup; only on successful health may the three private buckets `attendance-evidence`, `work-log-attachments`, `internship-documents` be created and verified. No upload mutation tests until separately authorized.
- **Gate C.2 BLOCKED; Gate C remains 46/51 Verified, 5 Conditional (ATT-1/3/5, DWL-2, DOC-1), isolation incident OPEN, Gate D unauthorized.**

## Gate C.3 — Approved secure credential provisioning (2026-11-04)

- Fresh isolated preflight PASS (run `gatea-20261103-2318`, gateway 54321, DB 54322, app 3100, approved fingerprints); tagged-only E6 fixture integrity PASS.
- Reviewed Compose static configuration `docker compose ... config --quiet` PASS and inventoried the two declared secret-file paths without reading any secret data: **both missing** (`.gatea/local-supabase/storage-secrets/db-url` and `jwt-secret`). Existing isolated Auth/Kong/PostgreSQL containers are healthy; no Storage container or volume.
- User approval alone does not establish a secure execution channel for secret provision. The earlier secret-bearing startup request was blocked by tool safety controls; no circumvention or alternate inline secret transport was attempted. **Did not provision secrets, start containers, create volumes/buckets, or change DB/policies.**
- Created `phase-c-storage-operator-handoff.md` with exact isolated-only file locations, identity checks, secure secret-delivery requirements, no-unapproved-write startup constraints, and post-start checks. This is an operator checklist, not a runnable secret-injection script or proof of service startup.
- **Gate C.3 BLOCKED** until the local authorized environment operator provisions and validates secure files, startup side effects are independently accepted, and execution controls permit launch. Gate C **46 Verified / 5 Conditional**, incident review open; Gate D unauthorized.

### Gate C.3 continuation — isolated credential provisioner (2026-11-04)

- With explicit user approval, inspected only env **key names** and isolated container labels, without displaying secret values; existing `supabase_auth_local-supabase` and `supabase_db_local-supabase` expose `GOTRUE_JWT_SECRET`, `JWT_SECRET`, and `POSTGRES_PASSWORD` as expected.
- Added `scripts/gatec-provision-storage-secrets.mjs`: a narrowly scoped, **operator-invoked** local-only provisioner. It verifies the approved run ID/fingerprints, exact local app/API/DB ports, isolated Docker labels/network, Auth/DB JWT equality, and a read-only `supabase_storage_admin` DB connection; then writes only the two required Git-ignored Compose secret files with exclusive creation and restrictive requested permissions, without printing values. No arbitrary credentials are generated.
- `node --check scripts/gatec-provision-storage-secrets.mjs` **PASS**; non-sensitive Gate A file marker and run identity checks PASS. **Provisioner was not executed**, because the available DevSpace shell tool permits tests/builds/inspection, not local credential file creation, and the earlier credential-bearing startup call was safety-blocked. No workaround or secret exposure occurred.
- See `phase-c-storage-operator-handoff.md` for the exact single local command, Windows ACL review, startup safety requirements and next verification procedure. **Status unchanged: Gate C.3 BLOCKED**, Storage offline and buckets absent, five conditional requirements, incident review open, no Gate D.

### Gate C.3 follow-up — credential files provisioned, broad inherited Windows ACLs found (2026-11-04)

- User ran the isolated secret provisioner locally and reported success. Verified both resulting gitignored secret files are nonempty regular files and not symlinks without reading contents. Isolated preflight and protected tagged E6 fixtures PASS; original Auth/Kong/DB services remain healthy, 80 Storage migration ledger rows, 0 buckets, and no Storage container/volume.
- **Security blocker:** read-only `icacls` inspection found inherited `BUILTIN\\Users:(RX)` and `NT AUTHORITY\\Authenticated Users:(M)` on both secret files. Those permissions are too broad for a JWT signing secret and database password. Do not launch Storage until corrected.
- Added `scripts/gatec-lock-storage-acls.ps1` to restrict the secrets directory and both files to the invoking Windows account, Administrators, and SYSTEM, then validate ACLs. Static PowerShell parser check PASS. The ACL-changing script was **not executed** through DevSpace's read-only/test command interface; exact authorized local-operator command in `phase-c-storage-operator-handoff.md`.
- Runtime startup/migration safety approval is still a separate prerequisite. No Storage infrastructure, uploads, DB schema/policies, Production or port 3000 accessed. **Gate C BLOCKED: 46 Verified / 5 Conditional; incident review OPEN; Gate D unauthorized.**

### Gate C.3 follow-up — secure Windows ACL verification (2026-11-04)

- User ran `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/gatec-lock-storage-acls.ps1` and reported success. Independent read-only `icacls.exe` confirms **only the Windows owner account, BUILTIN\\Administrators and NT AUTHORITY\\SYSTEM** have explicit full-control entries for each secret file and the containing directory. No broad Users/Authenticated Users entries remain.
- Fresh approved isolated preflight/fingerprints and tagged E6 fixtures PASS, Auth/Kong/DB containers healthy, migration ledger **80 rows ending at ID 79**, no Storage bucket rows. Compose static validation PASS.
- Offline cached Storage v1.88.0 startup source review confirms `runMigrationsOnTenant({databaseUrl,upToMigration:dbMigrationFreezeAt})` runs unconditionally before HTTP; `lifecycle-writer-coordination` maps to migration **79**, matching the existing isolated ledger upper bound. This establishes no **pending named migration** in the reviewed bundle, **not** a guarantee that runtime startup performs no database writes.
- Secret-file ACL blocker is **RESOLVED**. Remaining startup prerequisite is separate independent confirmation/approval of migration-management side effects and safe Docker Desktop file-secret mount access. The restricted project shell cannot perform container/volume creation. No Compose startup or bucket mutation performed.
- **Gate C still BLOCKED, 46/51 verified, 5 Conditional; incident review open; Gate D unauthorized.**

## Gate C.4 — Conditional Storage startup authorization and guarded operator implementation (2026-11-04)

- Reverified isolated preflight (gateway 54321, database 54322, app 3100; expected target fingerprints) and tagged E6 fixtures PASS. Auth/Kong/PostgreSQL healthy; Storage still absent, gateway Storage endpoint HTTP 503, zero private buckets, migration ledger 80 rows through ID 79.
- Independently checked the two secret-file ACLs using `icacls`; only the owning Windows account, Administrators and SYSTEM have full access. Compose static validation PASS, no inline credential exposure.
- Reviewed cached Storage image startup code: `runMigrationsOnTenant` is invoked before HTTP, with freeze name `lifecycle-writer-coordination` resolving to ID 79; prior 79/79 ID/name/hash compatibility and read-only ledger evidence show no pending *named* migration, but runtime writes cannot be ruled out in advance. This is an explicit operational risk of the authorized startup, not a claim of a guaranteed write-free service.
- Created `scripts/gatec-start-storage.ps1` with preflight, E6, ACL, exact expected Storage migration ledger MD5 `465b74571f5ae62d308a3ef885f86a34`, existing-service state checks, single-service `docker compose up -d --no-deps --no-build --pull never storage`, HTTP status check, post-start migration/E6 checks, and a stop-only-Storage response to health/ledger failure.
- Created `scripts/gatec-create-private-buckets.mjs` to target only the verified isolated API and create only the three approved **private** buckets after healthy startup: `attendance-evidence`, `work-log-attachments`, `internship-documents`. It does not upload objects and refuses pre-existing bucket collisions.
- PowerShell parser, Node syntax, Compose configuration validation and read-only migration ledger hash check PASS. **The operator scripts were not executed**; DevSpace's command tool permits read-only verification/tests but not container or volume creation. Thus bucket creation and service health were NOT observed, and no Gate C acceptance state changes are justified.
- Local authorized operator action (review startup/migration risk and Docker secret mount access first): from `C:\Coding\bos-intellitrack`, run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/gatec-start-storage.ps1` in the verified local environment. Stop and report any error; do not retry by broadening scope or touching default/Production endpoints. **This was the pre-execution verdict; superseded by the verified PASS below.**

## Gate C.4 — Operator startup executed; independent post-start PASS (2026-11-04)

**Gate C.4: PASS — isolated Storage service and all three private buckets operational.**

- The user executed the guarded local operator command `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/gatec-start-storage.ps1` and supplied the complete non-sensitive success output. The script reported isolated preflight PASS; tagged E6 fixture verification PASS before and twice after startup; one dedicated Storage volume created; one isolated Storage container started; HTTP health PASS; migration ledger unchanged; exactly three private buckets created and verified; no objects uploaded.
- Independently verified (read-only) after the user run: `supabase_storage_local-supabase` **Up**, alongside previously running Auth/Kong/PostgreSQL; dedicated volume `gatec_storage_files_local-supabase` exists; `GET http://127.0.0.1:54321/storage/v1/status` returns **HTTP 200**.
- Isolated DB `storage.migrations`: **80 rows, max ID 79, exact baseline ledger fingerprint `465b74571f5ae62d308a3ef885f86a34`**. No new migrations observed.
- Isolated DB `storage.buckets`: exactly three private buckets (`public=false`): `attendance-evidence` (10,000,000-byte limit), `work-log-attachments` (25,000,000 bytes), `internship-documents` (25,000,000 bytes). `storage.objects`: **0**.
- Fresh post-start isolated environment preflight PASS (test run `gatea-20261103-2318`, app 3100, gateway 54321, DB 54322, fingerprints `12ca17b49af2` and `d6389fa7d65f`) and protected tagged E6 fixture verification PASS. No direct access to default environment, Production, or port 3000; no deployments, commits, pushes, unrelated migrations, or upload mutations.
- **Storage infrastructure blocker RESOLVED; Gate C.4 PASS**. At the time of this infrastructure-only gate, the five remaining requirements were Conditional (46/51 Verified). **Later Gate C.5 evidence supersedes that count below.** The historical isolation diagnostic incident remains OPEN pending independent review; Gate D not authorized.

## Gate C.5 — Functional acceptance (2026-11-04)

**PARTIAL — 48/51 Verified, 3 Conditional (ATT-1, ATT-3, ATT-5).** Full detailed evidence: `phase-c5-functional-acceptance.md`.

- Live isolated Storage API acceptance using fresh disposable UUID paths: synthetic image upload to `attendance-evidence`, PDF uploads to both `work-log-attachments` and `internship-documents`. All three passed byte-for-byte authorized and signed download checks, anonymous private retrieval denial, duplicate upload refusal; invalid MIME rejected. All test objects explicitly deleted, final count zero.
- Expanded disposable Intern browser lifecycle: submitted actual Work Log with PDF attachment and actual internship Document with PDF file through authenticated IntelliTrack forms; corresponding DB rows/status/path and private downloads validated, and app-generated signed document link visible. Synthetic application records, private objects and two Auth test identities fully cleaned. Lifecycle test PASS.
- Role/responsive Evaluation matrix plus synthetic lifecycle: **21 PASS, 19 intentional SKIP, 0 FAIL**. Isolated regression **516/516 PASS**, lint/typecheck PASS, tagged E6 verifier PASS. Storage API HTTP 200, all three buckets private, `storage.objects=0`, original migration ledger fingerprint unchanged, no synthetic user/document residue.
- **DWL-2 and DOC-1 now Verified on real UI plus Storage mutations.** ATT-1/3/5 not promoted: simulated GPS denial and generic test PNG Storage acceptance do not demonstrate live physical GPS/camera, selfie-backed Time In/Out, double-clock rejection or associated real Attendance record acceptance.
- **Gate C still BLOCKED** pending physical-device/application Attendance acceptance and separate independent closure of prior non-isolated diagnostic incident. No Production, port 3000, migration, reset, deployment, commit, push, or Gate D.

## Gate C next-step acceleration — Attendance focus (2026-11-05)
- Consolidated the remaining work into one final Attendance acceptance session, **not a new Gate**. Reviewed live Attendance server actions, GPS/selfie capture UI and evidence Storage semantics.
- Ran focused Attendance domain/capture/UX/correction tests: **65/65 PASS**; lint/typecheck PASS, verified isolated environment and protected E6 integrity PASS. Storage API still operational.
- Added `phase-c-final-attendance-acceptance.md`: one physical-device end-to-end plan for ATT-1/3/5 using disposable test accounts, private evidence object assertions, duplicate Time In/Out denial, authorized review, and strict cleanup. Notes that a phone cannot use PC localhost directly and camera/GPS require a secure approved origin; no public exposure or port 3000.
- No physical phone camera, physical GPS, real selfie-backed Time In/Out, or independent isolation-incident closure performed at that point. The **48/51** count was superseded by the later Attendance server-action test below.

## Gate C Attendance server-action acceptance (2026-11-05)
- Added a synthetic-evidence subflow to the existing disposable Intern browser test. The test deliberately submits an in-memory PNG through the actual authenticated Attendance React server action, **without using or claiming a live camera or physical GPS**. Confirmed Time In and Time Out DB persistence, separate private Storage objects with matching bytes, stale-tab duplicate Time In and Time Out rejection, and short-shift `PENDING_REVIEW` with zero credited minutes. Synthetic DB/Auth/Storage records deleted. Lifecycle test PASS.
- Isolated `npm run gatec:regression`: **516/516 PASS**; lint/typecheck PASS; E6 protected fixtures PASS. Final isolated read-only inspection: `storage.objects=0`, no synthetic Attendances/users, original migration fingerprint `465b74571f5ae62d308a3ef885f86a34` unchanged.
- **ATT-1 upgraded to Verified** for actual server-action transaction behavior. **ATT-3, ATT-5 remain Conditional** for real hardware geolocation and live camera/face capture. Synthetic file submission demonstrates backend persistence, not selfie authenticity or device evidence; physical-device test remains essential.
- **Current status: 49/51 Verified, 2 Conditional; overall Gate C BLOCKED** pending device acceptance and independent prior isolation-incident closure; Gate D unauthorized.
