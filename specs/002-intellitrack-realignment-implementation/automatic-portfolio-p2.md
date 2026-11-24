# Automatic Portfolio — Gate P2 AI End-to-End Acceptance

**Date:** 2026-11-04  
**Depends on:** DEC-2026-018 / Automatic Portfolio Gate P1  
**Scope:** Real authenticated Gemini Portfolio workflow using a separate disposable synthetic Intern only.

## Goal

Prove the capstone AI workflow end to end without sending accepted Gate A Intern records or real student data to Gemini:

**Automatic verified Portfolio → real Gemini draft → Intern review → apply to editor → explicit save → reopen → PDF export**

## Isolation and fixture

- Environment: verified `.env.gatea.local` local Supabase/PostgreSQL only, base URL `http://127.0.0.1:3100`.
- Gemini credentials/model were loaded server-side from ignored `.env`; Gate A connection variables override normal app database/Auth settings.
- Created one disposable synthetic Auth user, app User, Intern profile and ACTIVE Main Office internship with only fictional evidence:
  - two approved Attendance records;
  - two synthetic submitted/approved Work Logs;
  - one completed synthetic Task;
  - one finalized synthetic progress Evaluation;
  - one synthetic Supervisor coaching record.
- The fixture started with **zero Portfolio rows**. It used a unique `p2_synthetic=true; gatea_run_id=...` marker and an exact cleanup manifest.
- Accepted E6 users/assignments were not modified. E6 post-verification passed immediately before P2 setup.

## Authenticated acceptance

Rendered production-mode browser acceptance: **11/11 PASS**.

1. Synthetic Intern authenticated through the actual login flow.
2. Automatic Portfolio rendered verified synthetic evidence while the Portfolio table still had zero rows.
3. Portfolio PDF exported before any AI generation or manual save.
4. The real authenticated `generatePortfolioDraft` Server Action invoked Google Gemini and returned a valid structured draft.
5. Generated UI text did not expose the synthetic Intern name/email or UUIDs.
6. Database verification after generation confirmed **no Portfolio write**.
7. “Apply reviewed draft to editor” stayed disabled until the Intern explicitly checked the review confirmation.
8. Applying the reviewed draft populated all editor sections while the database still contained **no Portfolio row**.
9. Clicking **Save Portfolio** was the persistence boundary: exactly one Portfolio row was created with the reviewed editor values.
10. Reopening the editor preserved the explicitly saved narrative; post-save PDF contained automatic verified evidence plus Intern-reviewed personal sections.
11. Desktop had no console/page errors or horizontal overflow; saved Portfolio remained usable at 390px and 768px.

## Evidence

- Browser result metadata: `.gatea/automatic-portfolio-p2-browser.local.json` (ignored).
- Screenshots: `artifacts/intern-completeness/gatea-20261103-2318/automatic-portfolio-p2/`:
  - automatic Portfolio before AI;
  - Gemini draft review;
  - reviewed draft applied before save;
  - saved Portfolio;
  - saved mobile Portfolio at 390 and 768.
- Synthetic fixture setup/cleanup scripts are ignored under `.gatea/`; credentials are never printed.

## AI claim that is now defensible

IntelliTrack uses two distinct mechanisms:

- **Automatic Portfolio compilation** is deterministic application logic over authorized verified internship records and works without AI.
- **Gemini AI assistance** is real cloud generative AI that receives minimized/redacted authorized evidence and drafts professional Portfolio wording. The generated result is review-only and cannot change authoritative internship records or persist a Portfolio until the Intern explicitly applies and saves it.

The test does **not** justify calling database compilation itself “AI,” does not authorize real student data to be sent to a free-tier provider, and does not certify Production privacy/compliance.

## Boundaries and follow-up

- No Production access and no port 3000 interaction.
- No Prisma schema/migration change, deployment or push.
- No accepted E6 fixture mutation.
- Provider error handling remains covered by AI foundation tests; P2 used one successful real Portfolio generation rather than intentionally consuming quota to provoke failures.
- Saved reviewed content is treated as Intern-owned narrative. The current save path does not rely on provider provenance metadata as an authoritative audit record; a stricter AI provenance/audit feature would require a separate product decision.

**Gate P2 acceptance:** PASS. Synthetic fixture cleanup restored Auth/app user counts to 8/8, removed the disposable assignment/Portfolio, final E6 post-verification passed unchanged, and isolated port 3100 was stopped.
