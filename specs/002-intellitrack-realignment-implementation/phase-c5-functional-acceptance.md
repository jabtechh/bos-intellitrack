# Gate C.5 — Functional acceptance evidence (2026-11-04)

**Outcome: PARTIAL.** Isolated Storage/Work Log/Document upload acceptance PASSED. Device-backed Attendance acceptance is NOT complete. Earlier environment-isolation incident remains OPEN. Overall Gate C not signed off; Gate D unauthorized.

## Isolation and baseline
- Verified test-only `local-supabase` preflight PASS: run `gatea-20261103-2318`, app `127.0.0.1:3100`, Supabase `127.0.0.1:54321`, DB `127.0.0.1:54322`, fingerprints `12ca17b49af2`/`d6389fa7d65f`.
- Storage `GET /storage/v1/status` **HTTP 200**; exactly three private buckets; initially 0 objects; migration ledger baseline fingerprint `465b74571f5ae62d308a3ef885f86a34`. Protected E6 fixtures PASS.
- No default-configuration environment, Production, port 3000, migration, reset, deployment, commit or push accessed.

## Storage API object acceptance: PASS
- Added `scripts/gatec5-storage-acceptance.ts`, with fail-closed isolated run/host/fingerprint checks and random UUID-disposable object paths.
- Real synthetic PNG selfie evidence uploaded to `attendance-evidence`; PDF to `work-log-attachments`; PDF to `internship-documents`. Verified upload success, content SHA-256 after authorized download, signed URL HTTP 200 with identical bytes, anonymous private-object download refusal, and duplicate-name upload refusal for each bucket.
- Invalid `text/plain` upload to restricted Work Log bucket refused.
- Removed only synthetic uploads; rechecked that the isolated `storage.objects` count returned to zero. **This is an API infrastructure/evidence operation, not physical camera capture or an Attendance transaction.**

## Application-level Intern upload acceptance: PASS
- Expanded `tests/gatea/gate-c-lifecycle.spec.ts`, using its existing separate random disposable Intern Auth identities and test-only active assignment:
  - Via actual authenticated Intern UI, submitted a Work Log carrying a PDF file; verified `SUBMITTED` database row and stored attachment path, authorized private download, and original bytes.
  - Via actual authenticated Intern UI, submitted a Document PDF; verified `PENDING_REVIEW` database row, a stored path, checksum presence, successful private download with same bytes, and an application-generated `Open secure document` link.
  - Original existing browser tests still exercise cross-Supervisor forged identity rejection, Evaluation/Task/Portfolio scope, session logout, and denied GPS no-write behavior.
- Lifecycle browser test **1 PASS**; synthetic DB rows, both disposable Auth accounts, and exact Work Log/Document Storage objects removed. No E6 modifications.
- These successful live form mutations and secure Storage retrieval establish **DWL-2 and DOC-1 Verified**. No Production uploads.

## Negative authorization and regression
- Direct anonymous private object retrieval refused; anonymous listings did not reveal synthetic names; duplicate upload refused; bucket MIME restriction refused unapproved content. Scope-specific role browser matrix PASS.
- `npm run gatec:regression`: **516 PASS / 0 FAIL**.
- `npm run lint` PASS; `npm run typecheck` PASS.
- Role and responsive Evaluation matrix plus single disposal lifecycle: **21 PASS, 19 intentional SKIP**, zero failures (19 lifecycle repeats excluded by test design).
- Final isolated preflight/E6 verifier PASS. Final read-only inspection `storage.objects=0`, `storage.buckets=3`, migration ledger fingerprint unchanged, no synthetic `gatec-%@example.invalid` application users or synthetic named document; Storage status HTTP 200.

## Unresolved acceptance: ATT-1, ATT-3, ATT-5
- Browser-simulated GPS capture/denial with no selfie still passed, and the generic Storage `attendance-evidence` bucket accepts a synthetic PNG privately.
- **Not performed**: true Time In/Time Out form transaction, live camera face detection/capture and selfie upload through Attendance server action, physical-device GPS reliability and geofence acceptance, final Attendance reviewer workflow with disposable actual records, and clock-out/duplicate checks. Consequently ATT-1/3/5 remain **Conditional**. An API-uploaded synthetic image is not a physical selfie.
- Physical mobile camera/GPS acceptance requires a controlled real device against isolated app on port 3100, with a disposable test account/assignment and cleanup plan. Do not use any default-configuration or port 3000 session.

## Disposition
**Gate C.5 PARTIAL: 48 Verified / 3 Conditional of 51 tracked requirements.** Infrastructure and both attachment requirements are now verified. Remaining ATT-1/3/5 and independent isolation incident review prevent final Gate C PASS. Gate D unauthorized.
