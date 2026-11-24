# Gate C — 51-Requirement Traceability (2026-11-04)

**Scope:** Phase A + Phase C; isolated test database and port 3100 only. This is a requirement-by-requirement **evidence classification**, not a claim that every mutation was exercised in a browser.

**Classification:** **Verified** = covered by unit/static tests plus applicable read-only browser route and role checks; **Conditional** = source/unit/route evidence exists but an end-to-end mutation or edge-case authorization case is not independently demonstrated. **No untested requirement is silently declared fully accepted.**

| Canonical requirement | Disposition | Evidence / remaining boundary |
|---|---|---|
| REQ-FR-URM-1 | Verified | `test-auth-foundation`, Gate A browser route sweeps, disposable Intern password login through the live isolated app in `gate-c-lifecycle.spec.ts` |
| REQ-FR-URM-2 | Verified | Live synthetic Intern session logout in Gate C browser; protected-route revisit redirected to login |
| REQ-FR-URM-3 | Verified | Auth foundation, authenticated role route matrix |
| REQ-FR-URM-4 | Verified | Role alignment and five-role Playwright matrix |
| REQ-FR-URM-5 | Verified | Role alignment + Evaluation-specific denial routes |
| REQ-FR-URM-6 | Verified | Server-side role authorization tests + live browser route denials, forged foreign Intern create rejection, tampered finalization/acknowledgment rejection |
| REQ-FR-PRO-1 | Verified | Live synthetic Intern profile first-name edit persisted in the isolated DB; original records untouched |
| REQ-FR-PRO-2 | Verified | Profile details tests and Intern route sweep |
| REQ-FR-PRO-3 | Verified | Attendance-derived progress assertions + dashboard browser sweep |
| REQ-FR-PRO-4 | Verified | Evaluation/Insights summary assertions + Intern Evaluation browser access |
| REQ-FR-PRO-5 | Verified | Onboarding/document source and browser route sweeps |
| REQ-FR-PRO-6 | Verified | Live synthetic Intern emergency contact name, number and relationship persisted; synthetic user removed afterwards |
| REQ-FR-PRO-7 | Verified | Dated skill evidence tests + Insights route sweep |
| REQ-FR-ATT-1 | Verified | Isolated disposable Intern authenticated Attendance server-action Time In and Time Out; private evidence uploads/downloads, one row per day, duplicate Time In/Out denial, short-shift PENDING_REVIEW with zero credit, full cleanup. Synthetic evidence only; hardware GPS/camera remains ATT-3/5. |
| REQ-FR-ATT-2 | Verified | Attendance foundation time calculations |
| REQ-FR-ATT-3 | Conditional | GPS input validation and source tests; physical device capture not retested |
| REQ-FR-ATT-4 | Verified | Geofence boundary and fallback tests |
| REQ-FR-ATT-5 | Conditional | **Re-scoped by DEC-2026-019 (2026-11-24):** Time In/Out selfies are matched server-side against the intern's face photo (CompreFace adapter + mock). **Amendment A:** the face photo is set up in Getting started after the password, saved automatically after a clear-face check; updates must match; the assigned Supervisor can reset it. Unit (31/31), rollback DB integration (12/12) and browser (20/20) checks pass with the mock provider; migration applied to the isolated DB. Pending: isolated Storage, real CompreFace run, physical Android camera test. **Liveness is not configured or claimed.** See `attendance-identity-verification.md` |
| REQ-FR-ATT-6 | Verified | Attendance history and Intern role route sweep |
| REQ-FR-ATT-7 | Verified | Supervisor review authorization tests |
| REQ-FR-ATT-8 | Verified | Attendance correction reviewer scope tests |
| REQ-FR-ATT-9 | Verified | Credited-minute canonical tests + protected E6 1350-minute invariant |
| REQ-FR-DWL-1 | Verified | Live synthetic Intern submitted dated Work Log and SUBMITTED state verified in isolated DB; removed after test |
| REQ-FR-DWL-2 | Verified | Gate C.5 disposable authenticated Intern Work Log file submission through app UI; persisted path, private object byte-for-byte retrieval, API signed retrieval and negative private/duplicate tests, full synthetic cleanup |
| REQ-FR-DWL-3 | Verified | Submitted-history tests and Intern route sweep |
| REQ-FR-DWL-4 | Verified | Supervisor read-only tests |
| REQ-FR-TSK-1 | Verified | Live scoped Supervisor Task assignment to disposable Intern, then isolated DB verification and cleanup |
| REQ-FR-TSK-2 | Verified | Task lifecycle/state and Intern route tests |
| REQ-FR-TSK-3 | Verified | Supervisor Task status/authority assertions and route sweep |
| REQ-FR-EVL-1 | Verified | Live Supervisor lifecycle and denial of forged cross-supervisor Intern create; other roles denied authoring routes; forged finalize and acknowledge IDs rejected |
| REQ-FR-EVL-2 | Verified | T134/T148 rolled-back uniqueness PASS plus live two-week creation, same-week duplicates rejected on create/edit, server canonicalization, edit/finalization/acknowledgment, and full synthetic cleanup |
| REQ-FR-EVL-3 | Verified | Finalized report/AI chronology tests, browser Evaluation view |
| REQ-FR-EVL-4 | Verified | Live synthetic peer-to-peer feedback between two distinct active overlapping Interns with the same Supervisor; persistence and cleanup verified |
| REQ-FR-EVL-5 | Verified | Intern finalized-only query and browser access checks |
| REQ-FR-AI-1 | Verified | Automatic Portfolio evidence rendered in the isolated browser using actual synthetic Evaluation, Task and submitted Work Log records; non-generative record assembly remains automatic |
| REQ-FR-AI-2 | Verified | Workmate evidence eligibility tests |
| REQ-FR-AI-3 | Verified | Finalized Evaluation selection tests, milestones preserved |
| REQ-FR-AI-4 | Verified | Live authenticated Portfolio PDF endpoint returned HTTP 200, application/pdf, valid %PDF header and nontrivial bytes |
| REQ-FR-AI-5 | Verified | Skill evidence source tests |
| REQ-FR-AI-6 | Verified | Insights activity source tests, no invented weekly rank |
| REQ-FR-AI-7 | Verified | Chronological skill evidence tests and Insights route |
| REQ-FR-DOC-1 | Verified | Gate C.5 disposable Intern document upload through live app UI; PENDING_REVIEW DB record, private object verified, application signed link, synthetic record/object cleanup |
| REQ-FR-DOC-2 | Verified | Document status tests + role route matrix |
| REQ-FR-DOC-3 | Verified | Representative reviewer guard tests |
| REQ-FR-ANN-1 | Verified | Announcement Representative scope tests |
| REQ-FR-ANN-2 | Verified | Intern announcement visibility and role navigation |
| REQ-FR-ANN-3 | Verified | ANN-3 recipient/dedupe/atomic tests + protected E6 3-recipient delivery invariant |
| REQ-FR-REP-1 | Verified | Supervisor report scope tests + route sweeps |
| REQ-FR-REP-2 | Verified | Coordinator school-scoped query/route tests |
| REQ-FR-REP-3 | Verified | Canonical Company report tests + Representative browser route |
| REQ-FR-REP-4 | Verified | Attendance-sourced report formulas + E6 invariants |

**Coverage:** 51/51 canonical IDs classified. **Verified:** 49. **Conditional:** 2 (ATT-3, ATT-5). **Unknown/unaccounted:** 0. Gate C.5 live upload evidence is in `phase-c5-functional-acceptance.md`; subsequent synthetic Attendance server-action verification is in `phase-c-final-attendance-acceptance.md`. Overall Gate C still requires physical device acceptance and independent isolation-incident closure.

## Evidence registers
- Phase A suites: 342 static/unit assertions passed in the prior Gate C run, spanning role/auth, Attendance, corrections, Work Logs, Tasks, Evaluations, AI, Portfolio, Insights, Documents, Announcements and UI.
- Current targeted Phase C run: 73/73 assertions passed, including repeated weekly selection, canonical timezone, one-off identity, milestone AI evidence.
- T134/T148: isolated PostgreSQL uniqueness tests PASS using two rollback-only synthetic assignments; no records persisted.
- Gate A protected fixture verification: PASS with explicit `GATEA_VERIFY_TAGGED_ONLY=1`; strict untagged-total check remains intentionally different from baseline.
- Browser: prior 20/20 role/viewport route sweep PASS; additional 20/20 Evaluation access/form/overflow matrix PASS for 390, 768, 1024 and 1440 widths.
- Full repository ESLint and typecheck: PASS in current continuation, after ignoring generated build directories.
- Isolated production build: PASS in prior continuation using `.next-gatec`.
- Git diff whitespace check: previously FAIL for generated Prisma client files; not silently marked clean.

## Gate C final execution evidence (2026-11-04)
- `tests/gatea/gate-c-lifecycle.spec.ts`: full browser Evaluation lifecycle **PASS**, using a distinct temporary Auth Intern, application user, profile, and active assignment. It validates two separate weeks, duplicate-week create/edit denial, canonical week identity despite forged hidden fields, draft edit, forged out-of-scope Intern create rejection, tampered finalize/acknowledgment IDs, finalization lock, finalized-only Intern/Coordinator visibility, and actual acknowledgment. All synthetic application rows were deleted, the temporary Auth user was deleted, and the protected E6 verifier passed afterward.
- `npm run gatea:e2e`: **41 PASS, 19 SKIP, 0 FAIL**. The 19 skips are intentional because the disposable lifecycle test runs only once on S-1440; 20-role/viewport General + 20 Evaluation browser cases still run for all five roles × four widths.
- Isolated-overlay `npx tsx --test scripts/test-*.ts`: **516 PASS, 0 FAIL**, after updating the stale `test-single-organization.ts` assertion to reflect the approved company-scoped Representative assignment list rather than a legacy redirect. This is a test contract update, not a business authority expansion.
- `npm run lint`, `npm run typecheck`, and isolated production build `GATEA_NEXT_DIST_DIR=.next-gatec`: **PASS**. `git diff --check`: **PASS** with a narrowly scoped `.gitattributes` rule only excluding generator-inserted trailing JSDoc whitespace in `src/generated/prisma/**`; handwritten files remain checked.
- Protected Gate A E6 fixture integrity: **PASS** in tagged-only mode; original untagged extra test account remains untouched. `restore_branches` migration remains unapplied.
- **Isolation exception requiring review:** Before the isolated-overlay 516-case rerun, a broad `npx tsx --test scripts/test-*.ts` command was launched without the test environment overlay. It inadvertently included `scripts/test-admin.ts` and `scripts/test-db.ts`, whose read-only diagnostics reported 32 Auth/application users and 18 assignments from the repository default configuration (not the verified 9-user/6-assignment isolated test DB). The command did **not** run migrations or write actions, but it read a non-isolated target. No guarantee can be made that this target was non-Production. This violates the strict isolation boundary and must be disclosed and reviewed. All subsequent environment-backed runs explicitly loaded `.env.gatea.local`.
- **13 requirements still conditional:** URM-2; PRO-1/6; ATT-1/3/5; DWL-1/2; TSK-1; EVL-4; AI-1/4; DOC-1. Their missing UI mutation, physical camera/GPS, or export validations are tracked individually above. No unexecuted end-to-end workflow is silently marked verified.

## Gate C blocker-reduction continuation (2026-11-04 evening)
- Added persistent hard-fail guards to `scripts/test-admin.ts` and `scripts/test-db.ts`. Both require the verified test environment, run id, localhost 3100 and DB 54322 before their database diagnostic bodies execute. This mitigates recurrence of the inadvertent default-configuration read, but does **not** retrospectively clear or excuse the earlier incident.
- Added `npm run gatec:regression`: it runs `gatea:env:preflight` and then the 516-case test suite with the explicit `.env.gatea.local` overlay. **516/516 PASS**.
- Expanded disposable synthetic browser lifecycle in `tests/gatea/gate-c-lifecycle.spec.ts`: actual password sign-in, profile + emergency contact persistence, Supervisor Task creation, Intern Work Log submission, genuine workmate Feedback with a second temporary Intern account, automatic Portfolio evidence, PDF export, and logout session revocation. All passed along with prior Evaluation lifecycle and negative authorization scenarios. All synthetic DB rows and both Auth accounts removed.
- Read-only Storage preflight `scripts/gate-c-storage-preflight.ts` (verified isolated DB and local Supabase URL) **FAILED** at local `storage.listBuckets()`. No bucket creation, upload, or fallback to another environment was attempted. Work Log attachment and document upload acceptance **remain blocked**; a separate isolated Storage setup/verification gate is required.
- The five remaining conditional requirements are **ATT-1, ATT-3, ATT-5** (real clock-in/out, GPS and live camera/device evidence), **DWL-2** (Work Log attachment upload), and **DOC-1** (document upload). Do not represent these as passed without real device/storage evidence.
- The earlier default-configuration read was read-only per inspected diagnostics, but definitive target classification and independent isolation-incident closure have not been obtained. Thus Gate C **remains blocked** despite the strengthened safeguards.

## Latest Gate C blocker-resolution verification — 2026-11-04
- **Storage diagnosis:** read-only Docker inspection observed healthy local Supabase Auth, gateway and DB containers, **no running Storage container**. Local Auth health endpoint returned HTTP 200 while the Storage route and guarded SDK bucket enumeration returned **HTTP 503**. No infrastructure or Storage mutations. Work Log attachment (`DWL-2`) and Document upload (`DOC-1`) remain conditional.
- **Attendance UI geolocation:** disposable synthetic Intern used simulated Chromium geolocation (lat 14.5547, lon 121.0244, accuracy 18m) on isolated port 3100. Location UI captured the exact values, Time In remained disabled without confirmed live selfie, and the synthetic assignment had zero Attendance rows. This is *simulated browser evidence only*, not a physical-device GPS test, selfie camera capture, or successful Time In/Out. `ATT-1`, `ATT-3`, and `ATT-5` remain conditional.
- Regression 516/516 PASS; full browser acceptance 41 PASS / 19 deliberate SKIP; isolated production build PASS. E6 protected records unchanged. Verified target fingerprints and incident limits are recorded in `phase-c-gate-c-convergence.md`.
- Previous isolation incident source review confirmed read-only Auth/DB diagnostics, but their different counts prove a non-isolated target was accessed. It **may have been Production-backed**; only an independent environment-owner review can close the incident. Fail-closed diagnostics and isolated regression command remain in place.
- **51/51 requirements mapped; 46 verified, 5 conditional. Gate C BLOCKED.**

## Gate C.1 isolated Storage service decision
- Verified read-only local Docker state: no running or stopped Supabase Storage container under the isolated `local-supabase` project; Auth, Kong and DB healthy. Local Supabase configuration enables Storage, Storage API image exists, but there is no existing service to restart.
- Loopback gateway probes: Auth `/auth/v1/health` 200; Storage `/storage/v1/bucket` 503. Read-only SQL on verified isolated PostgreSQL found the `storage.buckets` table, but **0 buckets**. Therefore `work-log-attachments` and `internship-documents` buckets are absent, not merely hidden by a nonfunctional API.
- Creating a new service and private buckets could initialize DB metadata; not authorized for this gate. No container/image/data/Storage settings modified and no upload tests started. `DWL-2` and `DOC-1` remain **Conditional**. `ATT-1/3/5` remain **Conditional**. Scope of this check was diagnostic only, no device/camera acceptance.
- **Gate C.1 BLOCKED; Gate C BLOCKED; 46 Verified / 5 Conditional unchanged.** Required next action: separately approved, explicitly isolated Storage service and private-bucket setup with safeguards. Independent review of earlier read-only non-isolated diagnostic incident remains open.

## Gate C.1B safety stop
- Offline cached Storage image startup inspection confirmed that its server **invokes `runMigrationsOnTenant` before serving HTTP**. Local DB Storage migration ledger spans 0–79; image file versions span 1–79, but hash/side-effect parity and startup wiring were not independently verified. No existing Storage service container to simply restart, and zero private buckets.
- Thus the approved stop-before-unverified-initialization rule applies: **Gate C.1B BLOCKED**, without service or bucket creation. ATT-1/3/5, DWL-2 and DOC-1 retain their conditional status. No mutation or device tests were run; historical isolation incident remains open.

## Gate C.1C: migration hash parity established, startup gate remains closed
- Offline comparison of the cached Storage v1.88.0 image with the isolated `storage.migrations` ledger used the actual SHA-1(filename + SQL) algorithm and found **79/79 matching IDs, names and hashes**; separate bootstrap migration ID 0 is recorded in the DB. These findings remove the hash-mismatch concern but **do not prove no startup writes**.
- Kong routes require the unprovisioned `supabase_storage_local-supabase:5000` service; the image requires a configured persistent file backend path, verified isolated DB/JWT settings and migration startup safeguards. Source still invokes migration machinery on startup. No file volume, Storage container, or buckets were created.
- **Gate C.1C = BLOCKED / not certified safe to start** pending independent verification of the exact isolated runtime config and all startup side effects. Five requirements remain conditional (ATT-1/3/5, DWL-2, DOC-1); historical isolation incident remains open. Full evidence: `phase-c-gate-c-convergence.md`.

## Gate C.1E: Storage infrastructure setup blocked at secure runtime prerequisite
- Verified isolated fingerprints and protected tagged E6 fixtures again; existing local Auth/Kong/DB containers healthy. Storage gateway HTTP 503; migration ledger 80 entries (0–79); `storage.buckets` empty.
- A supported isolated service manager and safe secret-injection implementation are not present. The earlier blocked inline-secret startup attempt was not retried or bypassed. No container, volume, private bucket or schema/policy change was made.
- **DWL-2 and DOC-1 remain Conditional** (no real upload service), and **ATT-1/3/5 remain Conditional** (no real device attendance acceptance). Gate C still **46 Verified / 5 Conditional; BLOCKED**. No approval for Gate D or Production. Evidence in `phase-c-gate-c-convergence.md`.

## Gate C Attendance denied-location acceptance continuation
- On the isolated `127.0.0.1:3100` browser, a disposable Intern's geolocation permission was cleared after an earlier positive simulated GPS capture. The actual Attendance UI displayed `Location permission was denied.`, exposed `Retry location`, and held `Time in` disabled. Direct isolated DB read found **zero attendance rows** for the synthetic assignment. Lifecycle test passed and all synthetic Auth/application fixtures were removed.
- This is additional negative-path evidence for the ATT-3 UI safety behavior, **not** proof of real physical device GPS capture or real Time In/Out. `ATT-1`, `ATT-3`, `ATT-5`, `DWL-2`, `DOC-1` remain **Conditional**; Gate C stays **BLOCKED**.

## Gate C.2 controlled Storage activation stop
- Isolated preflight and tagged E6 integrity PASS. Reviewed Compose spec static validation PASS; Storage service HTTP 503, `storage.migrations` count 80, `storage.buckets` count 0.
- Both approved isolated Compose secret source files (`.gatea/local-supabase/storage-secrets/db-url`, `jwt-secret`) are absent. Activation correctly stopped **before** service or bucket creation; no unsafe credential workaround was attempted. Environment-owner secure secret provisioning and startup safety approval remain prerequisites.
- **DWL-2, DOC-1, ATT-1/3/5 are still Conditional**; Gate C 46/51 Verified, Gate C.2 BLOCKED. Independent incident review still open; no Gate D approval.

## Gate C.4 guarded Storage startup handoff
- Isolated environment/E6 and Windows secret ACL verification PASS; cached image migration freeze point is ID 79 and isolated ledger contains 0–79 without known pending named migrations. Startup still invokes migration-management code, and its side effects have not been verified through an actual run.
- Created/validated guarded operator `scripts/gatec-start-storage.ps1` and exact-target three-private-bucket helper `scripts/gatec-create-private-buckets.mjs`. No runtime execution or bucket creation occurred because the available project command tool cannot perform persistent container/volume mutations.
- **Pre-execution status superseded by verified Gate C.4 PASS below.**

## Gate C.4: isolated Storage live and private buckets verified
- User executed the guarded operator startup. Independent isolated checks: Storage container running, HTTP 200 health, dedicated volume present; `storage.migrations` still 80 rows (max 79) with expected ledger fingerprint. All three required buckets exist with `public=false`; zero stored objects.
- Fresh test environment preflight and protected tagged E6 fixtures PASS; existing Auth/Kong/DB healthy. **Gate C.4 PASS** removes the infrastructure prerequisite for real file-upload acceptance. It does **not** establish functional upload or physical-device Attendance acceptance.
- `DWL-2`, `DOC-1`, `ATT-1/3/5` remain **Conditional** pending authorized, disposable synthetic upload/device testing; Gate C stays **46/51 Verified / 5 Conditional**. Independent prior isolation-incident review still OPEN; Gate D unauthorized.

## Gate C.5 — Isolated real attachment and document acceptance
- `scripts/gatec5-storage-acceptance.ts`: live isolated uploads to all three private buckets with authorized download/byte identity, signed links, anonymous refusal, duplicate refusal, invalid MIME rejection, exact object cleanup. No synthetic residual Storage objects.
- `tests/gatea/gate-c-lifecycle.spec.ts`: real disposable Intern Work Log PDF and Document PDF submissions through the authenticated UI, corresponding database states/paths, authorized Storage retrieval with identical file bytes, app signed document link, and complete cleanup. Lifecycle test PASS; role/viewport matrix 21 PASS / 19 intentional SKIP.
- Full regression **516 PASS**, lint/typecheck PASS, E6 PASS; Storage HTTP 200, migration ledger unchanged, all three buckets private, 0 objects, and no leftover synthetic users/documents.
- `REQ-FR-DWL-2` and `REQ-FR-DOC-1` upgraded to **Verified** on new direct live evidence. **ATT-1, ATT-3, ATT-5 remain Conditional**: no true Time In/Out with camera selfie or physical GPS acceptance. The earlier isolation incident is still OPEN.
- **Gate C.5 PARTIAL; 48/51 Verified and 3 Conditional.** Details in `phase-c5-functional-acceptance.md`. Gate D unauthorized.

## Gate C Attendance server-action acceptance — post-C.5 continuation
- Extended existing disposable Intern browser lifecycle using a synthetic PNG file submitted through the real authenticated Attendance React form action; no claim of live camera capture. Verified actual Time In and Time Out server persistence, stored private selfie-like evidence files with identical bytes, duplicate Time In and duplicate Time Out refusal using stale browser tabs, short-shift PENDING_REVIEW status with zero credited minutes, and full synthetic Auth/DB/object cleanup. Lifecycle browser **PASS**.
- Isolated regression **516/516 PASS**, lint/typecheck PASS, tagged E6 fixture integrity PASS. Final read-only DB audit: `storage.objects=0`, no disposable Attendance/Intern rows, migration ledger fingerprint unchanged.
- **ATT-1 now Verified** on actual server-action transaction evidence; **ATT-3 and ATT-5 remain Conditional** until physical GPS + live camera/face-detection test, with proper authorized secure device access to isolated app. Browser-simulated GPS and a forged synthetic image cannot certify physical device capture or anti-spoofing.
- **49/51 Verified, 2 Conditional; overall Gate C BLOCKED** until device acceptance and prior isolation incident independent closure. Gate D unauthorized.

## Gate C decision
**BLOCKED — NOT APPROVED FOR DEPLOYMENT.** All canonical requirements are mapped; 5 retain documented untested device or Storage interaction edges, and the unsafely broad default-environment diagnostic execution described below prevents unconditional isolation approval. E6 fixtures remain preserved. No deploy, Production migration, commit or push is authorized; Gate D requires a separate approval.
