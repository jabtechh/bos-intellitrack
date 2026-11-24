# Automatic Internship Portfolio — Gate P1

**Date:** 2026-11-04  
**Product decision:** DEC-2026-018  
**Scope:** Post–Gate A Intern Portfolio enhancement only; Phase B/C deferred.

## Goal and implementation

- The Intern's Portfolio is compiled **automatically on read** from the same authorized Main Office internship assignment used for the canonical report. No Gemini call, form submission, new database row, or background job is required to view factual evidence.
- Assignment selection prefers an ACTIVE assignment. When no ACTIVE assignment exists, it prefers the newest COMPLETED assignment with eligible recorded evidence or an existing saved Portfolio, then the newest remaining COMPLETED assignment. The chosen assignment ID is explicitly applied to the canonical report to prevent mixing Portfolio narratives and evidence across assignments.
- Factual sections: credited hours (APPROVED Attendance only), required/remaining hours, attended dates with credited minutes, completed Task entries, submitted/approved Work Log titles and recorded descriptions, explicitly recorded Work Log skills, finalized Evaluations and Supervisor-entered scores, visible Feedback count, and metadata from approved Portfolio-eligible Documents. Content never infers skills, performance levels or achievements.
- The Portfolio and its PDF include the automatic evidence before/without optional personal narrative. Counts represent all eligible source rows; the responsive UI shows the first eight entries per list and PDF the first 30 entries with an explicit truncation note.
- Existing saved titles, curated skills, highlights, selected work and reflection remain **separate** from compiled evidence; they are changed only by an explicit Intern form submission. The optional Gemini writing assistant remains review-only and now discloses the external data-sharing risk beside its action. No real student records were sent to Gemini in P1.
- The Intern-only Portfolio review route, editor, save action, Gemini Portfolio/reflection action and PDF export now select the same assignment source. Other-role authorization and unrelated report routes are unchanged.

## Tests and evidence

- Dedicated automatic Portfolio domain/source/static tests: **8/8 PASS**.
- Intern feature-completeness: **8/8 PASS**.
- Portfolio foundation: **7/7 PASS**.
- AI foundation: **13/13 PASS**.
- Navigation: **32/32 PASS**.
- TypeScript **PASS**; isolated Next.js optimized webpack production build **PASS**.
- Gate A isolated environment preflight **PASS**. The old `gatea:fixtures:verify` pre-E6 setup check is **not applicable after E6 terminal acceptance** and reports “Company A must have one ACTIVE visual assignment”; E6 intentionally marked that assignment COMPLETED. The read-only `.gatea/e6-post-verify.mjs` check confirms the terminal state remains correct, and no fixture reset was performed.
- Authenticated read-only browser verification at `127.0.0.1:3100` **18/18 PASS** across 390, 768, 1024, 1440, including actual credited evidence, real PDF bytes/MIME/sections, optional editor/AI control, no browser errors or overflow, and denial of Supervisor access to the private Portfolio/PDF. The Gate A Intern had **22.5 credited hours, two submitted Work Logs, one finalized Evaluation, eligible skills and one eligible Document**, consistent with the selected accepted fixture. A completed empty test assignment was not selected over a completed assignment with meaningful verified records.
- Evidence: `artifacts/intern-completeness/gatea-20261103-2318/automatic-portfolio-p1/` (eight screenshots); ignored browser metadata `.gatea/automatic-portfolio-p1-browser.local.json`.
- No save, provider call, database mutation, migration, deployment, push, Production or port 3000 access occurred during browser tests. This test fixture already had a saved personal Portfolio; the **no-saved-narrative** behavior is covered by unit/static tests and code branches, not by a rendered unsaved fixture.
- Synthetic Gemini Portfolio/Insights provider contract verification was completed separately (2/2 PASS) in the preceding AI readiness step. That does not mean actual authenticated Server Actions have been exercised with live student evidence.

## Follow-on

- Optional Gate P2: isolated synthetic-only authenticated Gemini Server Action/UI integration, explicit privacy consent review, and manual review/save/export acceptance on **separate disposable synthetic fixtures**, with new approval before any mutation.
- After P1/P2, proceed to Phase B1 weekly Evaluation schema design (T110–T115) for review. Do not create or apply migrations without subsequent approval.

**Gate P1 acceptance:** Read-only automatic Portfolio + PDF + UI isolation: PASS. Full authenticated Gemini action and manual save workflow remains a separate gate.
