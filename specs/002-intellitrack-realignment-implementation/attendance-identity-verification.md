# Attendance identity verification (REQ-FR-ATT-5, DEC-2026-019)

**Status (2026-11-24, updated for DEC-2026-019 Amendment A):** Implemented. Migration applied to the isolated DB only. Unit, rollback-integration (DB) and browser checks pass. **ATT-5 stays Conditional.** The isolated database/Storage steps, a real CompreFace run and physical Android testing are still outstanding (see *Blockers*).
**Decision:** DEC-2026-019 supersedes DEC-2026-012. Product-owner approvals given in this session: supersede DEC-012; CompreFace as the provider; **no liveness**; forward-only migration applied to the isolated local environment only. **Amendment A** (same day): no Supervisor approval — the face photo is saved automatically after a clear-face check, inside the existing Getting started page; updates must match the current photo; the assigned Supervisor can reset it; the password is always set first.

## Scope

| # | Behaviour | Where |
|---|---|---|
| 0 | Invited users set their password first. `/onboarding` and both identity actions refuse until `password_change_required` is cleared | `src/app/onboarding/page.tsx`, `src/app/identity/actions.ts` |
| 1 | Intern consents and captures a live front-camera selfie inside a server-issued, single-use, 180 s capture session (no file picker). This happens **inside Getting started**, in the "Face photo" section and Account step; `/identity/enroll` only redirects there | `/onboarding#face-photo`, `src/app/identity/enroll/identity-enrollment.tsx` |
| 2 | **First photo:** the server checks for exactly one clearly detected face (CompreFace detection confidence ≥ 0.90). If it passes, the photo is encrypted with AES-256-GCM (storage path bound as AAD), stored in the **private** `identity-references` bucket and saved as `APPROVED` with no human approver (`decided_by_id` null, remarks "Automatic: ..."). Unclear photos are not saved | `src/lib/identity/service.ts` `enrollReference` |
| 3 | **Update:** the new selfie must pass the same clear-face check **and** match the current photo (attendance threshold). A match replaces the photo atomically (old one `SUPERSEDED`, image deleted). A different person is refused and told to ask the Supervisor | same; `activateReference` in `repository.ts` |
| 4 | **Reset:** only the intern's **directly assigned Company Supervisor** can reset the photo, with remarks, from the attendance review page. The photo becomes `REJECTED` and its image is deleted; the intern must enroll again. There is no approval queue. Audit rows are kept | `resetReference`, `src/app/identity/review/reset-form.tsx` |
| 5 | Time In **and** Time Out each compare a fresh live selfie with the same approved reference, server-side, before the attendance transaction | `src/lib/attendance/transactions.ts` |
| 6 | GPS/geofence rules, duplicate protection, classification and credited-minutes rules are unchanged | same module (logic moved verbatim from the server actions) |

## Enrollment outcomes (Amendment A)

| Situation | Result |
|---|---|
| First photo, one clear face | Saved, active immediately |
| No face, several faces, low detection confidence | Not saved; retake (attempt recorded as `INCONCLUSIVE`, purpose `ENROLLMENT`) |
| Update matches the current photo | Replaces it (attempt `VERIFIED`) |
| Update does not match / inconclusive | Not saved; current photo stays (attempt `FACE_MISMATCH` / `INCONCLUSIVE`) |
| Provider unconfigured, unreachable or timed out; current photo unreadable | Not saved (fail closed) |

## Attendance outcome handling (matches the existing attendance review convention)

| Situation | Outcome | Attendance effect |
|---|---|---|
| Match ≥ threshold | `VERIFIED` | Normal rules. Approved and credited when there are no other exceptions |
| Match < threshold | `FACE_MISMATCH` | Recorded, `CLOCK_*_IDENTITY_UNVERIFIED` exception → `PENDING_REVIEW`, **0 credited minutes** until the Supervisor approves |
| Liveness failed / inconclusive, no face, several faces | `LIVENESS_FAILED` / `INCONCLUSIVE` | Same as mismatch (flagged for review) |
| No face photo | `NO_APPROVED_REFERENCE` | **Blocked.** No row; the page shows a "Set up face photo" link to `/onboarding#face-photo` |
| Provider unconfigured, unreachable, timed out, or reference undecryptable | `PROVIDER_UNAVAILABLE` | **Blocked (fail closed)** |
| Expired, replayed, wrong-purpose, forged or another user's capture token; claim of another intern's reference; non-JPEG image | `SESSION_REJECTED` | **Blocked** |
| Camera denied, missing or busy | Client message with recovery steps | Nothing submitted |

Every attempt is stored in `identity_verification_attempts` and linked to the attendance row when one exists. Interns see plain-language messages only. Similarity scores appear only on the Supervisor's attendance review page.

## Data and migration

`prisma/migrations/20261124120000_add_attendance_identity_verification` is additive only:
- 6 enums and 4 tables (`identity_references`, `identity_reference_events`, `identity_capture_sessions`, `identity_verification_attempts`).
- Two **nullable** columns on `attendance`. `NULL` means the row predates this feature, so no exception is raised and existing statuses and credit are untouched.
- Partial unique indexes allow one `APPROVED` and one `PENDING` reference per intern.
- CHECK constraints: decided rows need `decided_at`; capture sessions last at most 15 minutes.
- Row-level security is enabled with no policies, so the Supabase Data API cannot read the tables.

No image bytes or face templates are stored in the database. It must be applied only after `20261104120000_support_weekly_evaluations` has been applied and verified on the same target.

## Privacy and security
- Biometric photos are sensitive personal information (RA 10173). The consent text (version `2026-11-24`) is stored with each reference. **Organisational sign-off and a retention rule are still required before real interns use this.**
- The bucket is private, server access goes through the service role only, and images are encrypted by the application at rest. Reference images reach users only through `/identity/references/[id]/image` (owner or assigned Supervisor, `Cache-Control: no-store`). No signed or public URLs are created.
- Nothing logs images or provider payloads. The CompreFace adapter maps responses to reason codes only.
- Clients cannot set outcomes. The server reads only `captureToken` and an optional `referenceId` claim, which is rejected unless it is the intern's own approved reference.
- Limitation: a single-use camera session proves the image came through the in-app capture flow, not that it is a live person. Liveness and anti-spoofing are **not** provided or claimed.
- Accepted risk (Amendment A): with no Supervisor approval, a wrong first photo is caught only when the Supervisor notices it on flagged attendance and resets it. Updates cannot swap in a different person.

## Provider configuration (CompreFace, self-hosted, Apache-2.0)
1. Run CompreFace with Docker using its release `docker-compose.yml`. Pin a release and review its compose file before running it. Open the admin UI, create an application and a **Verification** service, and copy its API key.
2. Server-only environment variables (see `.env.example`): `COMPREFACE_URL`, `COMPREFACE_VERIFICATION_API_KEY`, `IDENTITY_REFERENCE_ENCRYPTION_KEY` (base64 of 32 random bytes), and optionally `IDENTITY_MATCH_THRESHOLD` (default 0.90), `IDENTITY_CAPTURE_TTL_SECONDS` (180) and `IDENTITY_PROVIDER_TIMEOUT_MS` (10000).
3. Create the bucket: `npx tsx --env-file=.env.gatea.local scripts/setup-identity-storage.ts`.
4. **Calibrate the threshold** using real phones and real interns (consented) before relying on it. 0.90 is a starting value, not a validated one.
5. Vercel cannot host CompreFace. A deployed environment needs a separately hosted, TLS-protected instance, and that is a separate deployment decision.

## Tests

| Suite | Command | Result (2026-11-24) |
|---|---|---|
| Identity unit tests (31: automatic enrollment, update matching, reset authorization, password-first and no-queue source guards, plus attendance, adapter, encryption and config) | `npx tsx --test scripts/test-identity-verification.ts` | **31/31 pass** (Amendment A). A mutation check (accept a non-matching update) made the mismatch test fail |
| Rollback-only DB integration (all 12 required scenarios) and private-Storage check | `npx tsx --env-file=.env.gatea.local --test scripts/test-identity-integration.ts` | **Database workflow 12/12 subtests pass** on isolated `local-supabase` (Amendment A rerun, 2026-11-24): unclear photo not saved, automatic first enrollment, matching update, refused mismatch, Supervisor-only reset and re-enrollment. The rollback was verified: 0 synthetic users or identity rows remain, and the 5 pre-existing attendance rows are unchanged. **Storage check fails (blocked):** the isolated Storage service is not running (separately gated Gate C startup), so the `identity-references` bucket does not exist yet |
| Browser checks: non-mutating; 5 roles × 4 viewports | `npx playwright test tests/gatea/identity-verification.spec.ts` | **20/20 pass** on the isolated app (127.0.0.1:3100) after Amendment A: the intern sees the face photo step inside Getting started (also when no internship is configured), `/identity/enroll` redirects there, and the Supervisor has no approval queue. The fixture intern has no ACTIVE assignment, so the attendance identity gate is recorded as not covered there (the integration test covers it) |
| Regressions | `npm run gatec:regression` (all `scripts/test-*.ts` on the isolated environment) | **560/561 pass** (Amendment A rerun); the only failure is the Storage check above. Fixture verification passes before and after (credited minutes unchanged at 1350) |
| Typecheck / lint / build | `tsc --noEmit`, `eslint` (touched files), `next build` (separate distDir) | Pass |

Mock tests prove workflow and authorization rules, **not biometric accuracy**.

## Blockers
1. ~~Isolated DB + migration~~ — done 2026-11-24. The migration was applied alone in one transaction (psql `--single-transaction`) and recorded with `prisma migrate resolve --applied`. `20260913090000_restore_branches` remains **unapplied** on the isolated DB (not part of this approval).
1a. Isolated **Storage** service startup (separately gated Gate C procedure), then `scripts/setup-identity-storage.ts` and a rerun of the Storage check.
2. Install CompreFace and set the variables above in `.env.gatea.local` (owner action; secrets are not handled by the agent).
3. Get privacy sign-off from Bo's Coffee / the school.

## Remaining manual Android acceptance (required before ATT-5 can be Verified)
- [ ] Invite a new intern: set password first, then Getting started → Face photo: consent, front camera, capture/retake, **saved immediately**.
- [ ] Unclear photo (two people, covered face, dark room): refused with a retake message.
- [ ] Update with the same person: replaced. Update with a different person: refused.
- [ ] Supervisor resets the photo from a flagged attendance record: the intern sees the reset reason and must enroll again.
- [ ] Real Time In and Time Out by the same intern: both `VERIFIED`, credited normally.
- [ ] A different person on the intern's phone: flagged `FACE_MISMATCH`, 0 credit, visible in the Supervisor review with the reference photo.
- [ ] Camera permission denied, then re-allowed in Site settings: the recovery works.
- [ ] Wait more than 3 minutes before submitting: an expired-capture message, and a retake works.
- [ ] Stop CompreFace: Time In is blocked with the "temporarily unavailable" message.
- [ ] Poor lighting, glasses, masks: record false-reject rates and tune the threshold.
- [ ] Layout at 360–412 px with no horizontal scroll.
