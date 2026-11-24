# 002 Phase A Implementation Notes

## Baseline
- Date: 2026-11-03
- Git HEAD: `fe68e11ee388da803f246f0fc319f0bc0a0267f1`
- Phase authorized: Phase A only (T000–T107)
- Migration creation/execution: not authorized
- Deployment/push/production mutation: not authorized
- Current checkout has no pre-existing `src/` or Prisma working-tree modifications.
- Existing non-Phase-A working-tree baseline includes config/script/spec/reference files already present before implementation.
- Runtime/Auth/database classification remains Production-backed for data; interactive mutation testing against evaluation accounts is prohibited.
- Branch migration source exists at `prisma/migrations/20260913090000_restore_branches/migration.sql`; it is not part of Phase A and must not be applied.
- Notification migration source exists at `prisma/migrations/20260817120000_add_notification_foundation/migration.sql`; source presence does not prove activation in any database.
- Stitch references available:
  - `stitch-design/Operations-Dashboard/`
  - `stitch-design/User-Table/`
  These are visual references only and do not override REQs/DECs/business logic.

## Test disposition
Use the Plan classification:
- PRESERVE: auth foundation, Attendance UX/capture, internship progress, onboarding, required-hours, Admin bootstrap safety, Branch compatibility, generic UI/accessibility.
- REWRITE: navigation, role alignment/dashboard, Attendance reviewer-role assertions, Work Logs, Tasks, Evaluations, Documents, Announcements/Notifications, Profile, Portfolio/Reports, Insights, AI, Intern mobile, assignment helpers where authority changes.
- REMOVE STALE / RETIRE ASSERTIONS: Calendar as primary/dashboard requirement, Admin business Calendar authority, stale long-nav/role-switch assertions.
- ADD: PRO-2 details, emergency contacts, peer eligibility/visibility, document ownership/review, report formulas, announcement recipient/atomic behavior, Portfolio generation/export, skill evidence timeline, Admin business denial.

## Phase A gate
Stop after T107 and return for Gate A review. Do not start Phase B automatically.

## Phase A convergence — Gate A

- Scope completed: T010–T107 only. Phase B was not started.
- Visual reference used for UI-affecting Operations/User Directory work:
  - `stitch-design/Operations-Dashboard/code.html` / `screen.png`
  - `stitch-design/User-Table/code.html` / `screen.png`
  The implementation follows the warm ivory/espresso/terracotta visual language, persistent grouped navigation, restrained metrics, responsive table/card treatment, and avoids copying fake reference data or stale authority labels.
- Prisma/migration boundary: `git diff --name-only -- prisma prisma/schema.prisma` is empty. No migration was created or executed. No schema edit was made.
- Production boundary: no deploy, push, seed, backfill, migration, or Production data mutation was performed. The Production-backed Admin diagnostic was deliberately not run.
- ANN-3 environment-backed acceptance: **BLOCKED BY ENVIRONMENT**. Notification source migration presence is not treated as proof that the Notification table is active. Static/unit atomicity, recipient-scope, dedupe, zero-recipient, and fail-closed tests pass without querying Production.
- Weekly Evaluation requirement `REQ-FR-EVL-2`: intentionally remains schema-dependent and not implemented in Phase A. Legacy/current Evaluation behavior is preserved pending the separately gated Phase B/C work.
- 51-REQ preservation matrix rechecked: no Phase A regression was identified. Remaining gaps are the explicitly gated weekly-Evaluation schema work above and ANN-3 environment-backed integration verification.

### Verification results

Focused Phase A suites passed after correcting stale/broken assertions:
- role alignment, navigation/shell, role dashboard, Intern mobile
- Profile/emergency contact
- Task lifecycle/authorization
- Evaluation/workmate eligibility
- Documents
- Announcements + Notifications
- Portfolio/company report
- Growth/Insights + AI
- Work Logs

Preserved/core suites passed:
- auth foundation
- Attendance capture/UX and correction safety
- internship progress
- onboarding
- required-hours
- provisioning safety
- Branch compatibility
- Calendar compatibility/deferred-primary behavior
- assignment domain
- generic UI/accessibility (`ui-polish`, `ui-v11`)

Convergence commands:
- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `git diff --check` — PASS (line-ending warnings only)
- `npm run build` — PASS
- responsive/IA assertions cover the required 390/768/1024/1440 breakpoint behavior through the navigation/shell/mobile/static UI test matrix; no Production-backed interactive mutation flow was used.

### Gate A status

**GATE A REACHED. STOP.**

Do not begin T110 or any Phase B work without explicit human approval for Phase B migration design. No migration file may be created at this gate.

## Phase B1 design — Gate B1

- Human gate: Phase B1 design-only authorized (T110–T115). Phase A PASS and P1/P2 PASS remain the baseline.
- Design package: `weekly-evaluation-b1-design.md`.
- Scope completed: T110–T115. No B2/C task started.
- Schema/migration boundary: `prisma/schema.prisma` unchanged; no migration directory created; no `prisma migrate`/`db push`/seed/backfill executed; no database write.
- Fixture boundary: Gate A fixtures not mutated. All local inspection was `SELECT`/catalog reads only.
- Environment: `npm run gatea:env:preflight` PASS against loopback non-production target (`gatea-20261103-2318`, DB `127.0.0.1:54322`, separate from current configured target).
- Read-only findings:
  - Local verified DB has 2 Evaluation rows (1 legacy `PROGRESS/SUBMITTED` with `period_start 2026-10-01`, 1 `FINAL/DRAFT`); no `period_key` column; old unique `evaluations_assignment_type_key` present.
  - Pending Prisma migration in that target: only `20260913090000_restore_branches`; `public.branches` absent. `prisma migrate deploy` there would implicitly apply the Branch migration and is therefore prohibited for B2/B3.
  - Pre-existing drift: `gatea:fixtures:verify` fails its stale "one ACTIVE" assertion because the accepted E6 clean run intentionally completed the primary fixture. B1 did not change this.
- Approval pending: Prisma schema edit and migration artifact creation (T120–T125), plus open decisions OD-1…OD-5 in the design package. Migration execution and production remain separately forbidden.

## Phase B2 migration artifact — Gate B2

- Human gate: Phase B2 authorized for T120–T125 artifact creation only. Migration execution/application was not approved; this phase stops at Gate B2.
- Package: `weekly-evaluation-b2-migration-package.md`.
- Scope completed: T120–T125. No Phase B3/C task started.
- Schema artifact: `prisma/schema.prisma` adds `periodKey String @map("period_key") @db.VarChar(20)` and replaces the old unique key with `[assignmentId, evaluationType, periodKey]` (`evaluations_assignment_type_period_key_key`).
- Migration artifact: `prisma/migrations/20261104120000_support_weekly_evaluations/migration.sql` (SHA-256 `76f524dc3e240cfdd259fd621114fea61609e92e7d0c40ff8c889cd1b875184f`). Forward-only sequence: nullable add → deterministic backfill → fail-closed duplicate guard → validated NOT NULL → type/Monday CHECK → drop old unique index → create new unique index.
- Domain/test support: pure helpers in `src/lib/evaluations/weekly-period.ts`; `scripts/test-weekly-evaluation-migration.ts`; `npm run evaluation:weekly:test` PASS (16/16).
- Schema validation: `npx prisma validate` PASS with `DIRECT_URL`/`DATABASE_URL` overlaid from the verified loopback environment; no database connection or write.
- Read-only preflight (verified loopback target `gatea-20261103-2318`): 0 duplicate groups, 0 unanchored rows, 2 Evaluation rows, content fingerprint `75b9e78103b317d863bed96a28308420`; legacy PROGRESS derives `2026-09-28`, FINAL derives `SINGLE`; `period_key` absent; 6 migrations applied; only `restore_branches` pending; `public.branches` absent.
- OD-5: `scripts/verify-gatea-fixtures.ts` refreshed to the accepted E6 terminal state (Company A COMPLETED:2/CANCELLED:1/TERMINATED:1, Company B ACTIVE:1; ANN-3 PUBLISHED with 3 COMPANY-audience notifications; branch schema absent). `npm run gatea:fixtures:verify` PASS, read-only. No fixture mutation.
- T123 decision: Prisma Client regeneration deferred to Phase C because the new required create input belongs to out-of-scope Phase C application changes; recorded as a Phase C prerequisite. No DB execution either way.
- Migration execution remains unauthorized. `prisma migrate deploy` is prohibited on this target because it would also apply `20260913090000_restore_branches`; Gate B3 must use the targeted single-artifact plan and `migrate resolve --applied` bookkeeping in the package.
- Known Phase C items unchanged: intern-report evaluation row key collision, AI evidence first-10 selection, VOIDED replacement semantics, weekly Evaluation UI/workflow, and strict boundary-week UX.
- Environment/fixture boundary: no Production access, no port 3000 usage, no deploy/push, no migration applied, no database write beyond read-only `SELECT`/catalog inspection.

## Phase B3 non-production application — Gate B3

- Human gate: explicit Gate B3 approval to apply only the reviewed weekly-Evaluation artifact to the verified isolated Gate A test database.
- Evidence: `weekly-evaluation-b3-verification.md`.
- Scope completed: T130–T133 and T135. T134 deferred: insert-based disposable uniqueness checks were not authorized in this gate and remain Phase C T148.
- Artifact: SHA-256 verified `76f524dc3e240cfdd259fd621114fea61609e92e7d0c40ff8c889cd1b875184f`; only `20261104120000_support_weekly_evaluations` applied via `psql --single-transaction`; Prisma ledger recorded with `migrate resolve --applied`.
- Target: `target_env=test`, run id `gatea-20261103-2318`, loopback `127.0.0.1:54322`, `network_connections=none`.
- Before/after: 6 → 7 applied migrations; only `20260913090000_restore_branches` remains pending; `public.branches` absent; `period_key` added as `varchar(20) NOT NULL`; Evaluation rows 2 → 2; content fingerprint `75b9e78103b317d863bed96a28308420` unchanged; PROGRESS key `2026-09-28`; FINAL key `SINGLE`; stored dates, periods, scores, narrative, status, and evaluator unchanged.
- Schema: old unique index absent; new `evaluations_assignment_type_period_key_key` present; `evaluations_period_key_matches_type` CHECK present and validated; no duplicate identities.
- Fixture/E6: `gatea:fixtures:verify` PASS; Company A `COMPLETED:2 CANCELLED:1 TERMINATED:1`; Company B `ACTIVE:1`; ANN-3 published; 3 notifications.
- Validation: `npx prisma validate` PASS; weekly 16/16; evaluation 8/8; insights 5/5; portfolio 7/7; AI 13/13; typecheck PASS; `npx eslint src` PASS; `git diff --check` PASS.
- Rollback: not executed; rollback SQL/caveats remain in the B2 package §6. Current state is rollback-safe while only one PROGRESS row exists.
- Prisma Client regeneration and Phase C application/UI remain unstarted. No Production access, no port 3000 usage, no deploy/push, and `restore_branches` was not applied.

## Phase C final acceptance — 2026-11-04

- Phase C T140–T148 and final convergence T150–T155 are marked complete as **work performed/evidence produced**, not as unconditional sign-off. Final Gate C **BLOCKED**; see `phase-c-gate-c-convergence.md` for authoritative verdict and isolation incident disclosure.
- Verified isolated environment: run `gatea-20261103-2318`, localhost app port 3100 and PostgreSQL 54322, `restore_branches` pending. No Production migrations or deployment attempted.
- Prisma Client regenerated with isolated environment override; weekly Evaluation application code / canonical Monday–Sunday domain / server duplicate prevention / one-off semantics / report row IDs / AI milestone selection verified.
- New `tests/gatea/gate-c-lifecycle.spec.ts` creates an isolated synthetic Intern Auth/application identity and assignment, exercises two weekly records, duplicate create/update refusal, canonical period tampering, draft edit, unauthorized foreign-Intern selection refusal, forged finalize/acknowledge refusal, actual finalize/acknowledge, Intern/Coordinator finalized visibility, and draft privacy. Automatic cleanup removes all temporary rows and Auth account; tagged E6 invariant verification passes afterward.
- `scripts/test-gate-c-uniqueness.ts` verifies database uniqueness within rolled-back transaction. No synthetic residue.
- Full isolated overlay suite: 516/516 passing. Browser role/viewport and Evaluation matrices + synthetic lifecycle: 41 passing, 19 deliberately skipped per-project repetitions. Full lint, TypeScript, isolated production build, and Git diff whitespace check all pass.
- Retired the stale multi-office redirect assertion in `scripts/test-single-organization.ts` to reflect the existing approved Representative company-scoped assignment list; no runtime scope expansion.
- Scoped `.gitattributes` treats only Prisma-generator comment trailing spaces as generated output; does not weaken handwritten code whitespace checks.
- Requirement evidence: 51/51 IDs mapped, 38 Verified and 13 Conditional requiring additional interaction/device/export checks.
- **Isolation deviation:** An initial unqualified test wildcard inadvertently executed default-environment Auth/DB diagnostics showing 32 users rather than the verified test target's 9. These diagnostics use read-only queries but could have touched Production-backed data; no write behavior was observed. This was disclosed in the final Gate C report and is a hard blocker until independently reviewed. Subsequent commands ran with test env explicitly loaded. No claim is made that every read in this final phase respected the isolation-only boundary.
- Deployment/push/commit not executed; port 3000 not accessed. Gate D remains a separate human approval.

## Gate C blocker-reduction acceptance — 2026-11-04 evening

- Extended the existing protected synthetic lifecycle test with successful browser sign-out and subsequent protected-route denial; Intern name and all emergency-contact fields persist in the isolated test database.
- The Supervisor Task-creation action, Intern Work Log submission, eligible workmate-to-workmate Feedback, automatic Portfolio evidence rendering and authenticated PDF download all passed using only two synthetic Intern Auth/application accounts under separate active assignments, all transactionally/scoped for cleanup.
- Explicit post-test cleanup verified zero synthetic users/profiles/assignments/Evaluations/Tasks/Work Logs/Feedback records, and deleted both disposable Auth identities. Protected E6 verification remained untouched and is rechecked separately.
- Added fail-closed target checks to the existing Auth and DB diagnostic programs and `npm run gatec:regression` to prevent repeat unqualified/default environment read-through. 516/516 test assertions passed through this safe, explicit isolated runner.
- Guarded read-only isolated Supabase Storage preflight returned HTTP 503. No buckets or objects were changed; Work Log attachment and document upload cannot yet be claimed verified.
- **51 requirements mapped; 46 verified, 5 conditional:** ATT-1/3/5 live attendance/GPS/camera; DWL-2 and DOC-1 Storage uploads. Previous default-environment read-only diagnostic incident still requires independent review; safeguards prevent recurrence but do not erase it.
- **Gate C stays BLOCKED, Gate D not authorized.** Authoritative updated report: `phase-c-gate-c-convergence.md`.

## Gate C approved blocker-resolution continuation — 2026-11-04

- Read-only Docker inspection confirms local Supabase Auth, Kong gateway and PostgreSQL containers healthy, **Supabase Storage container absent**. Isolated Auth HTTP 200, Storage HTTP 503 from loopback gateway; guarded Storage SDK call also fails 503. Infrastructure modification not authorized and not attempted, so attachment/document end-to-end acceptance cannot proceed.
- Disposable Intern browser checked simulated geolocation (lat 14.5547, lon 121.0244, accuracy 18m) captured by Attendance UI and prevented Time In without a live selfie. Zero synthetic Attendance rows were written. This does **not** prove real Time In/Out, physical GPS or camera.
- `npm run gatec:regression` 516/516 PASS; `npm run gatea:e2e` 41 PASS/19 intentional SKIP; isolated Next build PASS. Source/canonical role authorization, responsive and E6 integrity remain protected.
- Incident review reaffirmed that the prior default-env diagnostic read was outside the approved isolated target; the scripts are read-only per source, but Production-backed classification has **not** been ruled out. Existing fail-closed safeguards remain effective; incident needs independent closure.
- 51/51 traced, 46 verified, **5 conditional** (ATT-1/3/5; DWL-2; DOC-1). Gate C **BLOCKED**, Gate D **not authorized**. No migrations, port 3000 access, Production mutations, container changes, commit, deploy or push.

## Gate C.1 — Storage service review (2026-11-04)

- Approved scope: check verified isolated fingerprint and port 54321/54322/3100; restore missing local Storage only when guaranteed not to alter DB schema, policies or existing buckets. No bucket creation, upload mutations, migrations, Production or port 3000.
- Verified preflight and protected E6 baseline PASS. Existing isolated Docker project `local-supabase`: Auth/Kong/PostgreSQL healthy, but no Storage container (not even stopped); cached Storage API image alone is insufficient for a safe restart. Config enables Storage, but there is no existing container to restart.
- Read-only Auth health = HTTP 200; Storage API = HTTP 503. Isolated DB metadata (read-only transaction): storage schema and buckets table exist, but **storage.buckets is empty (0 rows)**. Thus neither Work Log nor Document bucket exists.
- No container or volume changes, no bucket creation, no policy/schema edits, and no upload/device acceptance tests. Container creation with unknown initialization side effects and private bucket provisioning require a separately approved isolated infrastructure gate.
- **Gate C.1 BLOCKED**; Gate C also BLOCKED. The prior non-isolated diagnostic read remains independently reviewable and unresolved. Source of truth: `phase-c-gate-c-convergence.md`.

## Gate C.1B authorization — independent Storage startup inspection
- Verified isolated test fingerprints, gateway 54321, DB 54322, app 3100 and tagged E6 invariants before and after inspection.
- Cached Storage image v1.88.0 inspected offline with transient `docker run --rm --network none --read-only --entrypoint sh`; default server starts `node dist/start/server.js` and calls `runMigrationsOnTenant` before HTTP. Isolated Storage migration ledger IDs 0–79 match the cached image migration file *number range* 1–79; that does not prove schema/hash or no-write safety.
- No existing Storage service/container configuration can be reused; local Storage buckets remain empty (0). Required proposed private bucket names: `attendance-evidence`, `work-log-attachments`, `internship-documents`. **No buckets or Storage infrastructure were created.**
- Without independently verified startup DB side effects and exact container environment, the approved stop condition prevents launch. **Gate C.1B BLOCKED**; broader Gate C remains 46/51 verified, 5 conditional, and the prior isolation incident remains open. See `phase-c-gate-c-convergence.md` for detail.

## Gate C.1C — Read-only Storage image/database compatibility
- Verified preflight/test fingerprints and E6 tagged-only invariants. Offline cached Storage v1.88.0 image and isolated DB migration ledger compared using the image library's SHA-1(filename + SQL) hash algorithm. **All 79 tenant migrations match in ID, name and hash**; ledger has separate bootstrap ID 0.
- Startup source still calls migration machinery before HTTP and contains conditional schema, hash-refresh, migration-position and SQL execution paths. Current ledger has no unapplied image migrations, but this does not certify zero startup writes. Inspected Kong's existing `supabase_storage_local-supabase:5000` route and missing Storage file-backend volume.
- Proposed only, **not applied**: isolate Storage service under existing Docker bridge with verified local DB URL, isolated Auth JWT, persistent file backend mount, explicit migration safeguards; private buckets `attendance-evidence`, `work-log-attachments`, `internship-documents`. Runtime credential sourcing, complete safe startup side effects and persistent volume configuration still require verified specifications.
- **Gate C.1C BLOCKED / NOT SAFE TO START** under the read-only, no-unverified-initialization mandate; no persistent containers, buckets, files, schema or policies created. Gate C remains 46 verified / 5 conditional; Gate D and previous incident closure remain pending. Full evidence in `phase-c-gate-c-convergence.md`.

## Gate C.1D — Isolated Storage launch preparation
- Verified the local Auth JWT and DB JWT identity match, and independently authenticated `supabase_storage_admin` to the verified local DB with `transaction_read_only=on`. Secret values never displayed.
- A temporary Storage startup probe request was blocked by execution safety checks before the command ran; no retry with alternate credential transport. Final Docker inventory confirmed no probe container; E6 verifier PASS.
- **Gate C.1D BLOCKED** pending a secure, approved runtime secret-delivery and startup process. No service, volume, bucket, policy, migration, application/fixture mutation or deployment. Gate C 46/51 verified, Gate D unauthorized. Details in `phase-c-storage-controlled-startup-plan.md`.

## Gate C.1E — Authorized isolated Storage setup
- Isolated environment/E6 preflight PASS again, existing Auth/Kong/DB healthy. Storage route 503, buckets 0, migration ledger 80 records ending ID 79.
- No supported isolated Supabase CLI / Compose service runtime or approved secure credential injection was available; prior secret-bearing service probe was denied by execution safety controls. No bypass attempted.
- **Gate C.1E BLOCKED** under required stop condition. No Storage container/volume/bucket creation, schema or policy changes, deployment, Production access or port 3000. Separate authorized environment-operator setup prerequisite. Gate C remains 46/51 and Gate D remains unauthorized.

## Incident-review continuation — diagnostic boundary hardening
- Inspected pre-guard diagnostics and original connection source. Neither original diagnostic path performs writes, but the observed non-isolated record counts prove the prior boundary was crossed. Definitive endpoint classification and audit require independent environment-owner review.
- Corrected `scripts/test-admin.ts` and `scripts/test-db.ts` to check **actual Prisma `DATABASE_URL`** local test host and port, not merely `DIRECT_URL`; Auth also verifies local Supabase API port. Safe full regression **516/516 PASS**, lint/typecheck and tagged E6 PASS.
- Added `phase-c-isolation-incident-review.md` with bounded evidence and formal closure checklist. Incident remains **OPEN**. Gate C still 46/51 Verified and BLOCKED; Gate D unauthorized.

## Gate C Attendance permission-denial browser continuation
- Added isolated disposable Intern browser check: after simulated geolocation success, revoke browser location permission, verify visible denied-permission notice and Retry location control, and ensure Time In remains disabled and zero Attendance rows are written. Synthetic lifecycle test PASS; synthetic Auth and DB rows cleaned.
- This adds negative-path acceptance only, not physical GPS/camera or actual Time In/Out. Five Conditional requirements and Gate C BLOCKED status unchanged. No Storage or Production changes.

## Gate C.2 — Controlled isolated Storage activation
- Revalidated isolated environment fingerprints, E6 tagged fixtures and healthy original Auth/Kong/DB containers. Storage gateway still HTTP 503, `storage.migrations` 80 records through ID 79, no buckets.
- Reviewed and statically validated `compose.gatec-storage.review.yaml` (PASS). Both referenced gitignored secret source files (`.gatea/local-supabase/storage-secrets/db-url` and `jwt-secret`) are **missing**. No secret values were accessed or disclosed.
- Per approved stop-before-unsafe-startup condition, **Gate C.2 BLOCKED**. No service, volume, secret, migration, policy, bucket or data was created/altered. Authorized environment-owner provisioning of isolated credentials via secure secret-file management and approved runtime startup checks is required. Gate C remains 46/51 verified; five conditional and prior isolation incident open; Gate D unauthorized.

## Gate C.3 — Secure credential provisioning approval
- Verified isolated preflight and E6 integrity PASS; Compose syntax validation PASS. Both required gitignored secret files are still absent. No supported secret-bearing startup execution path was available without violating earlier tool safety restrictions.
- Created `phase-c-storage-operator-handoff.md` specifying file locations, secure provisioning and verification, permitted isolated targets, launch safety conditions and post-start acceptance. Did not provision secrets or create service/volume/buckets.
- **Gate C.3 BLOCKED** pending authorized environment-owner action and execution clearance; all five conditional requirements and the earlier isolation-incident review remain open. Gate D unauthorized.
- After user approval, created `scripts/gatec-provision-storage-secrets.mjs`, a local-only operator-invoked script using the isolated Auth/DB existing secrets (no generation) and strict container/project/network/target/fingerprint checks plus a read-only dedicated Storage DB role test. It writes only the two Git-ignored files with no-overwrite and without printing secrets. `node --check` PASS. The user subsequently executed provisioning and the ACL lockdown successfully; both operations were independently verified. Exact invocations documented in `phase-c-storage-operator-handoff.md`.

## Gate C.4 — Controlled isolated Storage startup
- Isolated preflight and tagged E6 PASS; Auth/Kong/DB unchanged, Storage still absent, ledger 80 migrations through ID 79, zero buckets. Windows secret ACLs now restricted to owner, Administrators and SYSTEM.
- Startup image still runs migration-management code before HTTP; all known 79 migration hashes match and freeze point 79, but no-write behavior cannot be guaranteed statically.
- Created guarded operator startup script `scripts/gatec-start-storage.ps1` plus exact-target private bucket helper `scripts/gatec-create-private-buckets.mjs`. Syntax/config/ledger fingerprint checks PASS. Script conditionally creates only one Storage container and dedicated volume, checks Storage health and E6/ledger postconditions, then conditionally creates three private buckets; no upload objects.
- **Historical pre-execution note superseded:** project shell cannot create persistent containers, so the approved local operator executed the guarded startup script directly. See verified PASS below.

## Gate C.4 — Operator completion and independent verification
- User executed `scripts/gatec-start-storage.ps1` on the approved isolated machine and reported `Gate C.4 isolated Storage activation: PASS`. One isolated Storage container and volume were created, and three private buckets provisioned; no upload objects.
- Independently verified Storage container running, HTTP `/storage/v1/status` **200**, volume present, `storage.migrations` **80 rows/max ID 79** with original hash `465b74571f5ae62d308a3ef885f86a34`, exact three `public=false` buckets and `storage.objects` **0**. Original Auth/Kong/DB remain healthy.
- Post-start isolated preflight and protected E6 fixture integrity PASS. **Gate C.4 PASS — Storage infrastructure blocker resolved.** At the time of Gate C.4, 46/51 were Verified and five remained Conditional; this count is superseded by Gate C.5 results.

## Gate C.5 — Live Storage and app upload acceptance
- Created/executed `scripts/gatec5-storage-acceptance.ts`: real isolated synthetic uploads to all three private buckets, content hashing/authorized download, signed URLs, anonymous read refusal, duplicate prevention and MIME-policy rejection. Deleted all synthetic objects.
- Extended disposable `tests/gatea/gate-c-lifecycle.spec.ts` with authenticated Intern Work Log PDF attachment and Document PDF upload; checked actual database records and private downloaded file contents plus signed Document link; removed all temporary DB/Auth/Storage objects. Lifecycle PASS; role/viewport matrix 21 PASS, 19 intentional SKIP.
- Safe regression **516 PASS**, lint/typecheck PASS, isolated E6 PASS. After acceptance, Storage status HTTP 200, buckets 3/private, objects 0, migration fingerprint unchanged, no synthetic users/documents.
- **DWL-2 and DOC-1 promoted to Verified**, bringing this stage to **48/51 Verified / 3 Conditional (ATT-1/3/5)**. Count superseded below. Physical-device GPS/camera and real selfie-backed Time In/Out had not yet been tested, and the prior environment-isolation incident remains open. **Gate C.5 PARTIAL, overall Gate C BLOCKED, Gate D unauthorized.** Full evidence `phase-c5-functional-acceptance.md`.

## Gate C final Attendance server-action convergence
- Extended disposable Intern lifecycle with actual authenticated browser-form server-action Time In/Out using an injected synthetic PNG. Verified database timestamps/status, separate private evidence object downloads, refusal of duplicate Time In and Time Out from stale tabs, and correct PENDING_REVIEW/zero credit on an unusually short shift. Entirely disposable DB/Auth/Storage cleanup PASS.
- Lifecycle browser test PASS; isolated regression 516/516 PASS, lint/typecheck PASS; E6 invariants PASS. Zero synthetic Storage objects, Attendance or Intern rows; migration hash unchanged.
- **ATT-1 now Verified**, making **49/51 Verified, 2 Conditional (ATT-3 physical GPS and ATT-5 live camera/face capture)**. Synthetic file injection is explicitly NOT evidence of live-camera capture or selfie authenticity. Independent isolation-incident review remains open; **overall Gate C BLOCKED and Gate D unauthorized**.

