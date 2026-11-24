# Realignment Audit Checklist

## Scope and read-only gate

- [x] The spec and plan were approved before T001 or any evidence-collection task began.
- [x] `001-intellitrack-realignment` remains an audit record; no implementation is authorized under it.
- [x] No `src/`, `prisma/`, `scripts/`, configuration, environment, or deployment file was changed.
- [x] No migration, `db push`, seed, backfill, production write, deployment, or push occurred.
- [x] No attendance, work log, task, document, evaluation, feedback, announcement, or correction was submitted.
- [x] The Branch migration status was recorded as documented; code-present vs database-active capabilities are distinguished.

## Requirements and traceability

- [x] All 51 requirement IDs appear in the traceability matrix.
- [x] Every REQ has a status and evidence citation, not just an ID.
- [x] Every status other than `Unverifiable` cites evidence; `Unverifiable` states why.
- [x] Every `KEEP` maps to a `REQ-...` or approved `DEC-...`.
- [x] Every non-REQ feature cites an approved `DEC-...` or is `CLARIFICATION-NEEDED`.
- [x] The non-REQ capability table uses the required `DEC reference` / `CLARIFICATION-NEEDED` columns.
- [x] Missing requirements are not silently invented.
- [x] Missing or partial implementation is recorded honestly.
- [x] Open ambiguities are explicit in the Clarifications section.

## Conflicts and decisions

- [x] Every source conflict is in the conflict register.
- [x] Document-vs-document conflicts are recorded, not just document-vs-code conflicts.
- [x] Conflicts are not silently reconciled by choosing code or guidance as truth.
- [x] Every `Q-...` item is either resolved by an existing approved decision/source precedence, resolved by a newly approved product decision, or left explicitly `CLARIFICATION-NEEDED`.
- [x] Proposed `DEC-...` entries are held for human approval; `docs/product/decisions.md` is not changed without approval.
- [x] The IA proposal remains conceptual and is not implemented.

## Roles and authorization

- [x] All four business roles are audited.
- [x] System Administrator is audited separately as technical/emergency.
- [x] The authorization baseline matrix covers every role-capability pair.
- [x] Every role-capability pair is `Allowed`, `Forbidden`, `Emergency-only`, or `CLARIFICATION-NEEDED`.
- [x] Server-side authorization is checked for every action, not just navigation.
- [x] UI visibility is not treated as authorization evidence.
- [x] Known authority-drift items are verified, not normalized.
- [x] Admin does not acquire routine business authority without a `REQ-...` or `DEC-...`.
- [x] Tests that assert current access are treated as evidence of current behavior, not requirement correctness.

## UX and navigation

- [x] Current routes/navigation are inventoried, including public/auth/account states.
- [x] Major workflows and state machines are inventoried.
- [x] Every navigation item and dashboard block has a requirement/decision mapping or `CLARIFICATION-NEEDED`.
- [x] Each major feature has a classification, including `CLARIFICATION NEEDED` where applicable.
- [x] Duplicate workflows/screens and dashboard clutter are identified.
- [x] Mobile and desktop navigation differences are included.
- [x] Responsive checks at 390/768/1024/1440 are recorded, or the limitation is documented.
- [x] Stale five-role, “School Administrator,” “Company Admin,” role-switch, and desktop-first guidance is flagged.
- [x] Unsupported features are not automatically deleted.
- [x] Proposed removals cite requirement impact and a data/operational dependency check.
- [x] Proposed role changes are held for human approval.

## Safety and truthfulness

- [x] No public signup, facial identity matching, biometric identity, or liveness claim was introduced or endorsed.
- [x] Normal attendance is auto-approved; work logs are not used as hours.
- [x] No AI output, metric, notification, approval, or verification claim is presented as fact without grounding/labeling.
- [x] AI output is grounded in cited records and labeled with limitations.
- [x] No invented operational data, metrics, notifications, approvals, or verification states were added.
- [x] No credential, token, signed URL, private storage path, or unnecessary PII appears in the report or evidence log.
- [x] No database/seed/backfill/write action was run; runtime, Auth/Supabase, and database environments were classified separately before verification.
- [x] Because the current local runtime is Production-backed, no interactive evaluation-account login/navigation was performed; such checks remain blocked until a separate non-production Auth/database environment is verified.

## Evidence and approval

- [x] The evidence log cites file/line and records exact non-mutating commands/results.
- [x] The audit report includes Inventory, Traceability, Conflicts, Role audits, Classification, IA proposal, Decisions, and Verification log.
- [x] The report states what was not verified and why.
- [x] The decision package lists proposed `DEC-...` entries, open `Q-...` items, and required approvals.
- [x] The audit stops before implementation.
- [x] Any later implementation uses a new `specs/002-...` spec; `001` is not converted into an implementation authorization.
