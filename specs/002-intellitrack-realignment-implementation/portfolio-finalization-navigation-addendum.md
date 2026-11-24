# Portfolio Finalization and Navigation Correctness Addendum

**Date:** 2026-11-24  
**Product decision:** DEC-2026-020  
**Status:** Implemented and verified on the isolated local environment (2026-11-24); see P160–P168 evidence in `tasks.md`. No migration needed.  
**Scope:** Intern Portfolio lifecycle, archive, mobile primary navigation, and role-aware navigation correctness.

## 1. Product outcome

Portfolio is a first-class Intern destination throughout the internship, not a resource that becomes visible only after completion. IntelliTrack continuously collects eligible evidence during an active assignment and automatically creates a saved evidence snapshot when that specific internship assignment transitions to COMPLETED.

Each internship assignment owns its own Portfolio. Completing a later internship must never overwrite an earlier Portfolio.

## 2. Navigation

### Intern desktop

Keep **Portfolio** as a direct, first-class sidebar destination at `/portfolio`. It must remain visible without opening a secondary menu.

### Intern mobile

Promote Portfolio into the bottom navigation as the fifth primary destination. The mobile destinations are:

- Home
- Attendance
- Work Logs
- Tasks
- Portfolio
- More

Make the bottom navigation responsive to the actual number of primary destinations plus More. All links must remain visible, tappable, and readable at 360, 390, 430, and 768 CSS-pixel viewport widths. Do not force items into a second row or clip labels. Other roles retain their existing primary destinations and role boundaries.

### Active route behavior

Centralize and test the route-to-navigation matching behavior for desktop sidebar, mobile bottom navigation, and the More sheet.

- Home is active only on its exact role landing route (`/dashboard`, `/admin`, or `/admin/system` as appropriate).
- Reports is active on `/reports` and its nested report routes for roles whose navigation includes Reports.
- If a Reports link is in mobile More, More is active while the current route belongs to a secondary destination; opening More must also show the Reports item as active.
- An Intern opening the contextual internship report from Insights must not cause Home to appear active. If the current navigation model supports it cleanly, keep Insights active for the Intern's contextual `/reports/intern/*` route; do not add a standalone Intern Reports item because DEC-2026-016 removed it.
- Exactly one applicable destination may receive `aria-current="page"`. Do not use broad prefix matching that makes Home active on unrelated routes.
- Clicking Reports must be traced end-to-end. If the browser ends up on `/dashboard`, inspect and correct the actual redirect/authorization/profile-resolution cause. Do not merely change active-link CSS or weaken authorization. If the role genuinely lacks a valid required profile, present a truthful access/setup state and do not show a misleading Reports link.

Preserve all role-specific route guards and server-side authorization.

## 3. Automatic completion Portfolio

### During an active internship

- Keep the existing automatically compiled evidence view current from authorized records.
- Evidence may include approved Attendance and credited minutes, submitted/approved Work Logs, completed Tasks, finalized Evaluations, authorized Feedback counts/content as currently permitted, and approved Portfolio-eligible Document metadata.
- Skills must remain explicitly sourced from eligible Work Logs. Never infer skill proficiency, achievements, or performance ratings.
- Optional personal writing remains Intern-owned and explicitly saved.
- Gemini remains optional, review-before-save, and must never be called automatically when an assignment is completed.

### When an assignment becomes COMPLETED

Within the existing server-side assignment completion transaction:

1. Validate the existing lifecycle transition and company/assignment ownership.
2. Change the assignment to COMPLETED and set completedAt.
3. Build a deterministic snapshot from the canonical authorized eligible evidence for that exact assignment.
4. Create or idempotently update the one Portfolio row associated with that assignment, using the existing unique assignmentId relation and existing sourceSnapshot field where sufficient.
5. Preserve any previously saved Intern-authored title, professional summary, curated skills, achievements, selected work, and reflection. The system must not replace personal narrative with generated text.
6. Mark the system-created state as GENERATED, not FINALIZED or APPROVED. Automatic generation is not human approval.
7. Commit the assignment transition and Portfolio snapshot atomically. If snapshot persistence fails, do not silently complete the assignment without a Portfolio; return a clear actionable error.
8. Do not create a second Portfolio row for repeated/retried completion requests.

Do not call Gemini, create fictional achievements, infer missing values, store raw attendance selfies/identity data, or copy private document contents into the Portfolio snapshot.

Inspect the existing Prisma Portfolio model first. Prefer its current `sourceSnapshot`, `status`, and `versionNumber` fields. Do not add a migration unless the existing model genuinely cannot support the approved behavior. Do not store PDF bytes merely to make export available.

### Completed Portfolio archive

Change `/portfolio` into a Portfolio hub that shows:

- The active internship Portfolio, if one exists, as **In progress** with live verified evidence.
- Every completed internship as its own saved Portfolio/archive entry, including company/assignment title, dates, status, and verified evidence summary.
- A clear open/review action and PDF export for each assignment.
- Empty and missing-evidence states that do not fabricate a Portfolio or claim completion hours.

All assignment queries and actions must be scoped to the authenticated Intern's own profile and the approved Main Office company scope. A client-supplied assignment ID is only a candidate and must be re-authorized server-side.

Use the selected assignment consistently for its Portfolio narrative, evidence snapshot, editor, and PDF. Never mix one assignment's narrative with another assignment's evidence.

### Historical completed assignments

Existing completed assignments may predate the completion-triggered snapshot. Keep them discoverable in the archive. If no saved snapshot exists, render/export the eligible current evidence as a clearly identified legacy/on-demand Portfolio; do not claim that a persisted completion snapshot exists. Any backfill must be idempotent, scoped, and separately tested. Do not mutate protected E6 fixtures or Production.

### PDF export

Provide a separate downloadable Portfolio PDF for each archive entry. For completed assignments, use the saved completion snapshot so the exported Portfolio is stable and assignment-specific. For an active assignment, use current eligible evidence. Generate the PDF on demand using the existing PDF primitives unless a later approved requirement calls for persisted PDF files.

## 4. Acceptance tests

### Portfolio domain/unit tests

- Completion snapshot contains only eligible/authorized evidence.
- Only APPROVED Attendance contributes credited minutes.
- Pending/rejected/voided records are excluded according to current canonical report rules.
- Skills are explicit and deduplicated; no inferred proficiency or fabricated achievements.
- Completion creates one Portfolio row for the correct assignment.
- Repeated/retried completion is idempotent.
- Existing personal narrative is preserved.
- Automatic completion does not invoke Gemini and does not set FINALIZED/approvedBy/approvedAt.
- Snapshot failure rolls back the assignment completion transaction.
- Two completed assignments produce two separate Portfolio records and archive entries.
- Intern cannot view/edit/export another Intern's assignment by changing an assignment ID.
- PDF uses the selected assignment's snapshot and narrative only.
- Legacy completed assignments without snapshots remain honestly readable/exportable.

### Navigation tests

- Intern desktop sidebar exposes Portfolio directly.
- Intern mobile bottom navigation exposes Portfolio as a primary destination and More remains visible.
- Other role navigation remains unchanged.
- Bottom navigation has one row and no clipped/overlapping links at 360/390/430/768.
- Reports click resolves to the correct route for Supervisor, Coordinator, and Representative.
- Reports and nested report routes show the correct active item; Home is not active.
- Mobile More indicates an active secondary route and the More sheet highlights its current item.
- Intern contextual report navigation never falsely highlights Home; do not add Intern Reports to the primary menu.
- Unauthorized roles remain denied by server guards even if a URL is manually entered.

### Browser/E2E tests

Use the existing authenticated isolated local browser setup and role fixtures. Test actual clicks, final URL, rendered destination, active link aria-current, mobile More behavior, and responsive layout. Do not substitute source-string assertions for route-level/browser behavior where the current test setup can exercise it.

## 5. Safety and implementation boundaries

- Preserve existing uncommitted repository work. Do not reset, clean, overwrite, or revert unrelated files.
- Before and after substantive code changes, run `npm run gatea:env:preflight` and `GATEA_VERIFY_TAGGED_ONLY=1 npm run gatea:fixtures:verify`.
- Use only the isolated local Supabase environment for database/storage integration tests.
- Never access or mutate Production, deploy, push, commit, reset the database, or run unrelated migrations.
- Do not change Attendance identity verification, weekly Evaluation behavior, or unrelated role permissions.
- Keep the existing 51 canonical requirements intact; add traceability to the relevant Portfolio and role-navigation acceptance criteria without weakening any requirement.
- Report exact files, tests, results, blockers, and any migration decision. If no migration is needed, explicitly say so.

## 6. Definition of done

An Intern can reach Portfolio directly from desktop and mobile primary navigation; Reports navigation works and highlights the correct destination without redirecting authorized users home; every completed assignment automatically receives its own persisted, deterministic, evidence-based Portfolio snapshot; the archive lists every internship separately; and each Portfolio can be opened and exported without crossing assignment or role boundaries.
