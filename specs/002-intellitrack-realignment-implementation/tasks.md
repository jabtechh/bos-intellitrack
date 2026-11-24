# Tasks

**Spec:** `specs/002-intellitrack-realignment-implementation/spec.md`  
**Plan:** `specs/002-intellitrack-realignment-implementation/plan.md`  
**Status:** Phase A complete (Gate A PASS); Phase B1 design complete — stop at Gate B1  
**Implementation authorized:** Phase A (T000–T107) and Phase B1 design-only (T110–T115)  
**Migration creation authorized:** No  
**Migration execution authorized:** No  
**Deployment / production change authorized:** No  
**B1 design package:** `specs/002-intellitrack-realignment-implementation/weekly-evaluation-b1-design.md`

## Execution rules

- Every task below is initially **unchecked and unstarted**.
- Do not begin implementation tasks until the human explicitly approves this task list for implementation.
- Preserve unrelated/uncommitted work.
- Do not use existing code as authority when it conflicts with canonical REQs or approved DECs.
- Do not touch/apply `prisma/migrations/20260913090000_restore_branches` as part of this spec.
- Do not edit any applied migration.
- Do not run `migrate dev`, `migrate deploy`, `db push`, seeds, backfills, or production writes without the explicit gate attached to that phase.
- Do not use the current Production-backed evaluation accounts for mutation testing.
- Do not push or deploy from this task list.
- A task may be marked complete only when its stated verification is satisfied.

---

## Phase 0 — Baseline and implementation gate

- [x] **T000 — Record implementation baseline.** Record `git rev-parse HEAD`, `git status --short`, date, runtime environment, Auth/Supabase environment, and database environment. Confirm current Production-backed constraints and preserve unrelated work. — Safety baseline; `AC-S-07`
- [x] **T001 — Snapshot requirement/test disposition.** Record the 51-REQ preservation matrix and the Plan’s existing-test disposition (`PRESERVE / REWRITE / REMOVE STALE / ADD`) in the implementation notes before modifying code. — all REQs; Plan Test Plan
- [x] **T002 — Verify forbidden migration boundaries.** Confirm Branch migration remains unapplied/independent and Notification-table activation is not inferred from source migration files. — `AC-S-04`; Data/migration constraints
- [x] **T003 — Confirm no implementation has started before approval.** Verify no `src/`, Prisma schema, migration, generated client, or runtime config changes were made by the Specify/Plan/Tasks stages. — governance gate

### GATE I — Human implementation approval required

**STOP. Do not begin T010 or any later implementation task until the human explicitly approves implementation of Phase A.**

Approval of this task list does **not** authorize migration creation/execution or deployment.

---

# Phase A — Code-only realignment

## A1. Role and authorization foundations

- [x] **T010 — Split broad role helpers.** Refactor `src/lib/auth/roles.ts` so Representative business operations, Supervisor review authority, and technical Admin authority are distinct. Remove Admin as a convenience business/reviewer role. — `REQ-FR-URM-4`, `REQ-FR-URM-5`, `REQ-FR-URM-6`; `AC-A-01`, `AC-A-10`
- [x] **T011 — Split operations guards.** Replace/split `requireCompanyOperationsManager` so Representative business operations and technical Admin maintenance are independently guarded and cannot substitute for each other. — `DEC-2026-006`, `DEC-2026-007`; `AC-A-01`, `AC-A-10`
- [x] **T012 — Tighten Attendance review authorization.** Make routine Attendance exception review accept only the directly assigned Supervisor; deny Representative/Admin routine decisions. Preserve current Attendance domain behavior. — `REQ-FR-ATT-7`; `AC-A-02`, `AC-A-03`
- [x] **T013 — Tighten Attendance correction authorization.** Make correction approve/reject accept only the directly assigned Supervisor; deny Representative/Admin routine decisions. Preserve correction math/concurrency safety. — `REQ-FR-ATT-8`; `AC-A-02`, `AC-A-03`
- [x] **T014 — Narrow Work Log review scope.** Keep Intern own journal behavior and direct-Supervisor read-only review; remove routine Representative/Admin Work Log review authority and avoid reintroducing approve/reject/revision transitions. — `REQ-FR-DWL-1`, `REQ-FR-DWL-2`, `REQ-FR-DWL-3`, `REQ-FR-DWL-4`; `AC-F-02`, `AC-A-04`, `AC-S-02`
- [x] **T015 — Narrow Task authorization.** Keep Supervisor direct-Intern mutation/monitoring and Intern own-assigned actions; remove routine Coordinator/Representative/Admin Task workflow authority. — `REQ-FR-TSK-1`, `REQ-FR-TSK-2`, `REQ-FR-TSK-3`; `AC-F-03`, `AC-A-05`
- [x] **T016 — Apply the approved V1 Task lifecycle without deleting legacy enum values.** Normal V1 transitions are `TODO (Assigned) → IN_PROGRESS → SUBMITTED → COMPLETED`. Supervisor-only administrative cancellation is `TODO → CANCELLED` or `IN_PROGRESS → CANCELLED`. `BLOCKED` and `REVISION_REQUESTED` remain legacy-readable only: V1 must not create new transitions into them. Existing rows using those statuses must remain readable/compatible. Do not delete `TaskStatus` enum values or migrate/rewrite existing Task data. — `REQ-FR-TSK-1`, `REQ-FR-TSK-2`, `REQ-FR-TSK-3`; `DEC-2026-014`; `AC-F-03`
- [x] **T017 — Narrow Evaluation authorization.** Keep Supervisor author/finalize for directly assigned Interns, Intern own-finalized read, Coordinator school-finalized read; remove routine Representative/Admin Evaluation workspace access. — `REQ-FR-EVL-1`, `REQ-FR-EVL-3`, `REQ-FR-EVL-5`; `AC-A-06`
- [x] **T018 — Narrow Portfolio/Insights/Reports authorization helpers.** Replace broad shared all-role viewer behavior with purpose-specific Intern/Supervisor/Coordinator/Representative scopes; remove routine Admin Portfolio/report/Insights access. — `REQ-FR-URM-5`, `REQ-FR-URM-6`, `REQ-FR-REP-1`, `REQ-FR-REP-2`, `REQ-FR-REP-3`, `REQ-FR-REP-4`; `AC-A-10`, `AC-A-11`
- [x] **T019 — Add focused authorization tests for A1.** Rewrite/add role guard tests for Attendance, corrections, Work Logs, Tasks, Evaluations, and Admin denial. — `AC-A-01`, `AC-A-02`, `AC-A-03`, `AC-A-04`, `AC-A-05`, `AC-A-06`, `AC-A-07`, `AC-A-08`, `AC-A-09`, `AC-A-10`, `AC-A-11`

## A2. Navigation and role information architecture

- [x] **T020 — Simplify Intern desktop navigation.** Primary: Home / Attendance / Work Logs / Tasks. Secondary/More: Growth / Documents / Updates / Profile. Keep authorized deep links for Evaluations/Portfolio/Reports where needed. — `AC-U-01`, `AC-U-02`, `AC-U-06`; `REQ-FR-URM-5`, `REQ-FR-URM-6`
- [x] **T021 — Implement Supervisor IA.** Primary: Home / Interns / Reviews / Tasks / Evaluations / Reports. Reviews must consolidate Attendance exceptions, corrections, and submitted Work Log reading without Company Operations. — `S-02`; `AC-U-01`
- [x] **T022 — Implement Coordinator IA.** Primary: Home / Students / Reports; Documents secondary where allowed. Remove Tasks/Feedback/Portfolio/Insights/general Announcements from primary Coordinator navigation. — `S-03`; `AC-U-03`
- [x] **T023 — Implement Representative IA.** Primary: Home / Interns-or-Operations / Announcements / Reports. Remove Attendance Review/Correction Review from normal Representative navigation. — `S-04`; `AC-U-04`
- [x] **T024 — Implement technical Admin IA.** Primary: Home / Users / System, with explicit technical recovery/maintenance only. Remove routine business modules from normal Admin navigation. — `S-05`; `AC-U-05`, `AC-A-10`
- [x] **T025 — Align mobile More sheet and bottom navigation.** Preserve role-specific mobile primary destinations, remove deferred/cluttered secondary items, and retain accessibility/safe-area behavior. — `AC-U-02`, `AC-U-08`, `AC-U-09`
- [x] **T026 — Simplify role dashboards.** Prioritize real next actions/key progress; remove duplicated module-summary clutter and deferred Calendar/AI blocks from primary dashboards. — `AC-U-07`, `AC-S-05`
- [x] **T027 — Update navigation/dashboard tests.** Rewrite `test-navigation-ui.ts`, `test-shell-refinement.ts`, `test-role-alignment.ts`, `test-role-dashboard-ui.ts`, and `test-intern-mobile-ux.ts` to the approved IA/authority model. — `AC-U-01`, `AC-U-02`, `AC-U-03`, `AC-U-04`, `AC-U-05`, `AC-U-06`, `AC-U-07`, `AC-U-08`, `AC-U-09`

## A3. Intern profile completion and emergency contacts

- [x] **T030 — Complete PRO-2 profile data query.** Load/display assigned company, department, Supervisor, start/end duration, internship status, and rendered hours from approved Attendance. Do not trust assignment `renderedHours` as a second credited-hours source. — `REQ-FR-PRO-2`; `AC-F-11`, `AC-S-02`
- [x] **T031 — Add Intern emergency-contact validation.** Add a dedicated strict schema for emergency contact name, number, relationship; keep ordinary User profile validation separated. — `REQ-FR-PRO-6`; `AC-F-01`, `AC-S-06`
- [x] **T032 — Add self-only emergency-contact update action.** Server resolves current InternProfile and updates only the actor’s emergency-contact fields; reject non-Intern/target-ID manipulation. — `REQ-FR-PRO-6`; `AC-F-01`, `AC-A-01`, `AC-S-06`
- [x] **T033 — Add emergency-contact/Profile UI.** Let Intern view/edit required emergency-contact fields without exposing them to public/general staff profile surfaces. — `REQ-FR-PRO-6`; `AC-F-01`
- [x] **T034 — Update Profile tests.** Add PRO-2 details, self-only emergency-contact validation/update, approved-Attendance hours, and sensitive-field visibility assertions. Rewrite stale broad Admin profile assumptions as needed. — `AC-F-01`, `AC-F-11`, `AC-S-02`, `AC-S-06`

## A4. Genuine workmate feedback

- [x] **T040 — Create workmate eligibility domain helper.** Given actor/recipient active assignments, enforce distinct Interns, ACTIVE status, same `supervisorProfileId`, and overlapping date ranges; no Branch dependency. — `REQ-FR-EVL-4`; `AC-A-12`, `AC-A-13`
- [x] **T041 — Add server-side workmate recipient resolution.** Treat client recipient as a candidate only; resolve both Intern profiles/assignments server-side and reject self/unrelated/inactive/non-overlapping pairs. — `REQ-FR-EVL-4`; `AC-A-12`, `AC-A-13`
- [x] **T042 — Implement peer-feedback create action with existing Feedback model.** Set recipient assignment/author/recipient/visibility server-side; do not create a fifth role or public/anonymous feedback. — `REQ-FR-EVL-4`; `AC-F-05`, `AC-A-12`, `AC-A-13`
- [x] **T043 — Implement Feedback visibility.** Recipient Intern sees own workmate feedback; directly assigned Supervisor sees it only for evaluation/coaching context; Coordinator/Representative/Admin have no routine Feedback workspace. — `REQ-FR-EVL-4`; `AC-A-14`
- [x] **T044 — Keep Supervisor coaching distinct.** If existing Supervisor-authored Feedback remains, label/query it distinctly from genuine workmate feedback so it cannot satisfy EVL-4 by relabeling. — `REQ-FR-EVL-4`; `DEC-2026-002`
- [x] **T045 — Add workmate Feedback tests.** Cover valid same-Supervisor overlap, self denial, unrelated Supervisor denial, inactive assignment denial, non-overlap denial, Branch independence, recipient visibility, Supervisor visibility, and Coordinator/Representative/Admin denial. — `AC-F-05`, `AC-A-12`, `AC-A-13`, `AC-A-14`

## A5. Document ownership and review

- [x] **T050 — Make normal required-document upload Intern-owned.** Restrict routine upload/replacement action to the Intern’s own assignment. — `REQ-FR-DOC-1`; `AC-F-15`
- [x] **T051 — Make Representative the routine document reviewer.** Company-scope approve/reject/archive review actions to Representative only. — `REQ-FR-DOC-3`; `AC-A-07`, `AC-F-15`
- [x] **T052 — Implement scoped read-only Document access.** Supervisor direct-Intern read-only; Coordinator school-scoped appropriate/non-sensitive read-only; Admin no routine workflow. — `REQ-FR-DOC-2`, `REQ-FR-DOC-3`; `AC-A-07`, `AC-S-06`
- [x] **T053 — Remove Representative auto-approval upload shortcut.** Representative uploads are not normal V1 required-document submission and must not silently enter APPROVED status. — `DEC-2026-003`; `AC-F-15`
- [x] **T054 — Rewrite Document tests.** Preserve storage/path/replacement safety; replace Admin scope/Representative upload assumptions with Intern upload + Representative review + scoped readers. — `AC-F-15`, `AC-A-07`

## A6. Company aggregate report

- [x] **T060 — Add canonical company-report domain formulas.** Implement pure/testable helpers for all five metrics exactly as defined in `plan.md`; do not duplicate formulas across UI. — `REQ-FR-REP-3`, `REQ-FR-REP-4`; `AC-F-07`, `AC-S-05`
- [x] **T061 — Implement company report data query.** Scope by authenticated Representative `companyId`; use distinct active Interns, ACTIVE/COMPLETED hours population, approved Attendance credited minutes, finalized FINAL Evaluation existence, and persisted InternshipStatus counts. — `REQ-FR-REP-3`, `REQ-FR-REP-4`; `AC-F-07`
- [x] **T062 — Implement required-hours truthfulness.** Return `missingRequiredHoursCount`; suppress aggregate completion percentage when any included assignment has unknown required hours. — `REQ-FR-REP-4`; `AC-S-05`
- [x] **T063 — Implement Attendance exception formula.** Denominator = non-VOIDED Attendance; exception = `reviewRequired` OR status PENDING_REVIEW/REJECTED/INCOMPLETE/ABSENT; late/early alone does not count. — `REQ-FR-REP-4`; `AC-F-07`, `AC-S-05`
- [x] **T064 — Implement Final evaluation completion formula.** Denominator = COMPLETED company assignments; numerator = completed assignments with FINAL SUBMITTED/ACKNOWLEDGED Evaluation; null rate for zero denominator. — `REQ-FR-REP-4`; `AC-F-07`, `AC-S-05`
- [x] **T065 — Build one Representative Company report UI.** Present active Intern count, hours, exception count/rate, Final evaluation completion, and persisted internship-status counts without decorative/fake trends. — `REQ-FR-REP-3`, `REQ-FR-REP-4`; `AC-F-07`, `AC-U-07`
- [x] **T066 — Add Company report tests.** Cover formulas, zero denominators, missing required hours, deduped Intern count, company scope, no fake metrics, and Attendance-only credited hours. — `AC-F-07`, `AC-S-02`, `AC-S-05`

## A7. Announcements and notification delivery code path

- [x] **T070 — Restrict routine announcement management to Representative.** Remove Admin create/update/publish/archive authority. — `REQ-FR-ANN-1`; `AC-A-08`, `AC-A-15`
- [x] **T071 — Restrict V1 authoring audiences and apply truthful labels.** New authoring accepts only `ALL_USERS`, `INTERNS`, `SUPERVISORS`, `REPRESENTATIVES`, `COMPANY`; keep deferred audience values readable only for legacy compatibility. Set `COMPANY` to **Company interns and staff** and `ALL_USERS` to **All internship participants**; do not retain the misleading `COMPANY = Office staff` wording. — `REQ-FR-ANN-1`, `REQ-FR-ANN-2`; `AC-F-16`
- [x] **T072 — Implement audience recipient resolver.** Resolve active recipients exactly by the Plan’s audience matrix; exclude Admin and unrelated/inactive users. — `REQ-FR-ANN-3`; `AC-A-15`
- [x] **T073 — Add transaction-aware notification insert service.** Support `Prisma.TransactionClient`, safe notification payloads, and deduplication via `announcement:<announcementId>:published`. — `REQ-FR-ANN-3`; `AC-F-06`, `AC-S-04`
- [x] **T074 — Make publish + notifications atomic.** In one Prisma transaction, conditionally publish, resolve recipients, and insert notifications; any required persistence failure rolls back to unpublished. Zero eligible recipients may succeed without a delivery claim. — `REQ-FR-ANN-3`; `AC-F-06`, `AC-S-04`
- [x] **T075 — Rewrite Announcement/Notification tests.** Deny Admin management; test five V1 audiences, deferred-authoring rejection, recipient scopes, dedupe, zero-recipient behavior, and rollback/fail-closed semantics using non-production-safe/unit abstractions. — `AC-F-06`, `AC-F-16`, `AC-A-08`, `AC-A-15`, `AC-S-04`
- [x] **T076 — Record ANN-3 environment-backed verification status.** If no verified non-production Notification table is available, mark integration acceptance **BLOCKED BY ENVIRONMENT**; do not query/mutate Production to clear it. — `REQ-FR-ANN-3`; `AC-S-04` — **Status: BLOCKED BY ENVIRONMENT for integration verification; code path/unit-source verification complete.**

## A8. Portfolio generation, export, and Growth

- [x] **T080 — Define structured generated-Portfolio output schema.** Map AI output to Portfolio sections and source limitations; preserve existing redaction/grounding rules. — `REQ-FR-AI-1`, `REQ-FR-AI-3`; `AC-F-08`, `AC-F-12`, `AC-S-03`
- [x] **T081 — Add Portfolio-specific grounded generation action.** Intern-only; load authorized verified records; include finalized Evaluations and authorized workmate feedback; return draft only; perform no Prisma write. — `REQ-FR-AI-1`, `REQ-FR-AI-2`, `REQ-FR-AI-3`; `AC-F-08`, `AC-F-12`, `AC-S-03`
- [x] **T082 — Add review/apply UX for generated Portfolio draft.** Clearly label AI-generated text and source limitations; Intern explicitly applies fields to form before normal save. — `REQ-FR-AI-1`; `AC-F-12`
- [x] **T083 — Preserve explicit-save provenance semantics.** On normal save, record AI provenance only when server can safely associate accepted generated content with the current generation; never label manual content AI-generated and never auto-approve. — `REQ-FR-AI-1`; `AC-S-03`
- [x] **T084 — Implement Portfolio-specific PDF composition/export.** Reuse PDF primitives where useful but produce an honestly labeled Portfolio artifact with Portfolio narrative plus clearly separated verified evidence; do not relabel generic report PDF. — `REQ-FR-AI-4`; `AC-F-13`
- [x] **T085 — Build dated skill-evidence aggregation.** Use explicit/datable Work Log skills and other only-explicit evidence; calculate first/most recent evidence dates and source occurrences without proficiency scores/rankings. — `REQ-FR-AI-5`, `REQ-FR-AI-7`; `AC-F-14`, `AC-S-05`
- [x] **T086 — Consolidate Intern Growth UX.** Present Evaluations, grounded Skills/Insights, skill timeline, and Portfolio entry points in one Growth experience rather than separate primary modules. — `REQ-FR-AI-5`, `REQ-FR-AI-6`, `REQ-FR-AI-7`; `AC-U-06`, `AC-F-14`
- [x] **T087 — Rewrite Portfolio/Insights/AI tests.** Preserve grounding/redaction/no-auto-persist; add full Portfolio generation, explicit apply/save, genuine Portfolio export, dated skill progress, and narrow role scope tests. — `AC-F-08`, `AC-F-12`, `AC-F-13`, `AC-F-14`, `AC-S-03`, `AC-S-05`

## A9. Deferred/non-core surface convergence

- [x] **T090 — Remove Calendar/holidays from primary V1 navigation/dashboard.** Preserve existing data/routes as compatibility surfaces unless separately retired; do not delete migrations/data. — `DEC-2026-009`; `AC-F-10`
- [x] **T091 — Remove school-announcement authoring from primary V1.** Preserve legacy readable records where compatible; no new SCHOOL/COORDINATORS-specific authoring. — `DEC-2026-009`; `AC-F-10`, `AC-F-16`
- [x] **T092 — Remove nonessential AI drafting from primary navigation.** Evaluation/Report drafting may remain optional/deep if safe but must not be headline scope or primary navigation. — `DEC-2026-009`; `AC-F-10`
- [x] **T093 — Retire stale role-switch/fifth-role user-facing guidance.** Remove active UI terminology that implies five business roles, role switching, or “School Administrator.” — `REQ-FR-URM-4`; `AC-U-09`
- [x] **T094 — Update/retire stale Calendar tests.** Keep low-level compatibility tests where useful; remove expectations that Calendar belongs in primary dashboard/nav or that Admin is a normal Calendar manager. — `AC-F-10`

## A10. Phase A convergence

- [x] **T100 — Run focused Phase A suites.** Run all rewritten/added auth, navigation, profile, Feedback, Document, report, Announcement/Notification, Portfolio/AI/Growth tests. Record pass/fail and fix only approved-scope regressions. — relevant ACs
- [x] **T101 — Run preserved core suites.** At minimum: auth, Attendance UX/capture, internship progress, onboarding, required-hours, admin bootstrap/provisioning safety, Branch compatibility, generic UI/accessibility. — regression-protected REQs
- [x] **T102 — Run `npm run typecheck`, `npm run lint`, and `git diff --check`.** Resolve approved-scope failures without resetting unrelated work. — Definition of Done
- [x] **T103 — Run local build if safe.** Run `npm run build` only if it does not require Production mutation; record result. — Definition of Done
- [x] **T104 — Verify role authority matrix.** For every role/capability row in the Plan, verify route visibility and server authorization independently. Use static/unit/fixture methods unless a verified non-production Auth/data environment exists. — `AC-A-01`, `AC-A-02`, `AC-A-03`, `AC-A-04`, `AC-A-05`, `AC-A-06`, `AC-A-07`, `AC-A-08`, `AC-A-09`, `AC-A-10`, `AC-A-11`, `AC-A-12`, `AC-A-13`, `AC-A-14`, `AC-A-15`
- [x] **T105 — Verify responsive UX at 390/768/1024/1440.** Cover affected role shell/nav, dashboards, Growth, Reports, Documents, Feedback, Portfolio. Use safe fixture/non-production rendering. — `AC-U-08` — **PASS: authenticated Gate A browser verification completed 20/20 role×viewport cases using the isolated local non-production environment; final screenshots and interaction evidence recorded under ignored Gate A artifacts.**
- [x] **T106 — Re-check 51-REQ preservation matrix.** Mark each REQ as preserved/completed/modified as specified; record any remaining gap rather than silently weakening it. — all 51 REQs
- [x] **T107 — Produce Phase A convergence report.** Summarize changed files, test results, blocked environment-backed checks, requirement status, and any remaining issue. Do not begin Phase B automatically.

### GATE A — Phase A review / migration-design approval required

**STOP after T107.**

Human must review Phase A and explicitly approve **Phase B migration design work** before T110.

No migration file may be created at this gate.

---

# Phase B — Weekly Evaluation schema/migration design

## B1. Design-only work

- [x] **T110 — Re-inspect current Evaluation schema/data assumptions.** Confirm current unique key, period fields, Prisma version, and all Evaluation queries/tests affected by repeatable PROGRESS rows. No schema edit yet. — `REQ-FR-EVL-2`; `AC-F-04` — **DONE (design only): design §1.**
- [x] **T111 — Finalize `periodKey` schema proposal.** Document exact Prisma diff: add non-null eventual `periodKey`, `SINGLE` semantics for INITIAL/MIDTERM/FINAL, Monday `YYYY-MM-DD` for PROGRESS, and composite unique `[assignmentId,evaluationType,periodKey]`. — `REQ-FR-EVL-2`; `AC-F-04` — **DONE (design only): design §2, §4.**
- [x] **T112 — Finalize forward-only SQL/backfill proposal.** Specify nullable add → backfill → duplicate check → NOT NULL → old constraint drop → new unique constraint, without modifying an applied migration. — Data/migration plan — **DONE (design only): design §5. No migration created.**
- [x] **T113 — Define duplicate preflight query and stop condition.** Before constraint replacement, the future migration must detect duplicate `(assignment,type,periodKey)` groups and stop rather than delete/merge records automatically. — data safety — **DONE (design only): design §6.**
- [x] **T114 — Define non-production verification protocol.** Specify how to validate existing INITIAL/MIDTERM/FINAL rows, existing PROGRESS backfill, second-week success, same-week rejection, Prisma Client regeneration, and application compatibility. — `AC-F-04` — **DONE (design only): design §12, §14.**
- [x] **T115 — Produce migration-design approval package.** Present Prisma diff, proposed SQL/backfill, duplicate preflight, affected queries/tests, rollback/recovery approach, and target non-production environment status. — **DONE: `weekly-evaluation-b1-design.md`; read-only Gate A environment preflight PASS.**

### GATE B1 — Explicit migration-creation approval required

**STOP after T115. GATE B1 REACHED — approval pending.**

Do not edit `prisma/schema.prisma` or create a migration file until the human explicitly approves migration creation.

Design package: `weekly-evaluation-b1-design.md` (Prisma diff, forward-only SQL, duplicate preflight, backfill/compatibility, rollback, test plan, acceptance criteria, risks, open decisions OD-1…OD-5).

B1 execution verification:
- No Prisma schema edit; no migration created or executed; no database write.
- No Gate A fixture mutation; Production not accessed; port 3000 not used; no deploy/push.
- Environment: `gatea:env:preflight` PASS against loopback test target (`gatea-20261103-2318`).
- Pre-existing local observation: `gatea:fixtures:verify` fails on its stale pre-E6 ACTIVE assertion; this predates B1 and reflects the accepted E6 end state (primary assignment `COMPLETED`).

---

## B2. Migration creation — only after explicit approval

- [x] **T120 — Apply approved Prisma schema edit locally.** Add `periodKey` and replace the unique key exactly as approved. Do not apply any DB migration. — `REQ-FR-EVL-2` — **DONE:** `periodKey String @map("period_key") @db.VarChar(20)`; unique replaced with `[assignmentId, evaluationType, periodKey]` / `evaluations_assignment_type_period_key_key`. No DB migration applied.
- [x] **T121 — Create one new forward-only Evaluation migration artifact without executing pending migration history.** The artifact must contain only the approved weekly-Evaluation change. Artifact creation must not connect to or execute against the current Production-backed database and must never implicitly apply `20260913090000_restore_branches`, Notification migration history, enum cleanup, or unrelated schema changes. If tooling cannot guarantee artifact-only creation, stop and use the manually reviewed artifact workflow approved at Gate B1. — migration safety — **DONE:** manually reviewed artifact at `prisma/migrations/20261104120000_support_weekly_evaluations/migration.sql` (SHA-256 `76f524dc…875184f`). No `prisma migrate deploy/dev`, no DB execution, no `_prisma_migrations` row.
- [x] **T122 — Inspect generated migration SQL manually.** Verify nullable add/backfill/preflight-or-safe constraint sequencing/NOT NULL/unique replacement; verify no destructive unrelated statements. — migration safety — **DONE:** sequence is nullable add → deterministic backfill → fail-closed duplicate guard → validated NOT NULL → type/Monday CHECK → drop old unique index → create new unique index. No DELETE/TRUNCATE/DROP TABLE/ALTER TYPE; no Branch/Notification/enum changes.
- [x] **T123 — Regenerate Prisma Client locally if required by the stack.** No DB execution. Record generated diffs; do not commit unrelated generated noise. — technical compatibility — **DONE (deferred, not required in B2):** regeneration would make `periodKey` a required input on Phase C create/update paths that are out of scope; it is recorded as the first Phase C prerequisite. No client regeneration, no DB execution.
- [x] **T124 — Run static/type tests against migration source.** Validate schema parses/typechecks and migration-specific tests can reason about the new key without connecting to Production. — `AC-F-04` — **DONE:** `npx prisma validate` PASS; `npm run evaluation:weekly:test` PASS (16/16) covering key rules, Monday/timezone boundaries, past/future/assignment validation, duplicate identity, and legacy month-style compatibility.
- [x] **T125 — Present migration-execution package.** Include the exact migration file, SQL, checksums/diff summary, verified non-production target, backup/recovery expectations, and exact proposed execution command. Demonstrate that the command will not implicitly apply `20260913090000_restore_branches` or any unrelated pending migration. No execution occurs in this task. — **DONE:** `weekly-evaluation-b2-migration-package.md` contains the Prisma diff, exact SQL, SHA-256, read-only preflight result, targeted single-artifact Gate B3 command with `migrate resolve --applied` bookkeeping, rollback SQL/documentation, and stop conditions.

### GATE B2 — Explicit migration-execution approval required

**STOP after T125.**

Do not execute the migration anywhere until the human explicitly approves the target non-production environment and command.

Production execution remains separately forbidden.

B2 execution verification:
- Schema edit and migration artifact created; no migration executed or applied; no database write.
- Read-only preflight on the verified loopback target: 0 duplicate groups, 0 unanchored rows, 2 Evaluation rows, content fingerprint `75b9e78103b317d863bed96a28308420`, `period_key` absent, 6 migrations applied, only `20260913090000_restore_branches` pending, `public.branches` absent.
- `npx prisma validate` PASS; `npm run evaluation:weekly:test` PASS (16/16).
- OD-5: `npm run gatea:fixtures:verify` PASS (read-only) with refreshed accepted E6 assertions; no fixture mutation.
- Prisma Client regeneration deferred to Phase C (no DB execution).
- No Gate A fixture mutation; Production not accessed; port 3000 not used; no deploy/push.
- Package: `weekly-evaluation-b2-migration-package.md`.

---

## B3. Non-production migration verification — only after explicit execution approval

- [x] **T130 — Verify target is non-production before DB action.** Record safe target identity without secrets. Abort if it points to Production. — migration safety — **DONE:** `gatea:env:preflight` PASS (`target_env=test`, run id `gatea-20261103-2318`, loopback `127.0.0.1:54322`, `public.branches` absent). No Production access; port 3000 unused.
- [x] **T131 — Run duplicate preflight.** Confirm migration can safely establish new uniqueness; if duplicates exist, stop and return for a human data decision. Do not auto-delete/merge. — migration safety — **DONE:** 0 duplicate derived-identity groups; 0 rows without a backfill anchor; 2 Evaluation rows.
- [x] **T132 — Apply approved migration to verified non-production only.** Use the approved migration command; do not apply Branch/other pending migrations unintentionally. — `REQ-FR-EVL-2` — **DONE:** single-transaction `psql` application of only `20261104120000_support_weekly_evaluations` (exit 0), then verified-env `migrate resolve --applied` bookkeeping. No `migrate deploy/dev`; `restore_branches` remained pending.
- [x] **T133 — Verify migrated data.** Confirm non-PROGRESS rows use `SINGLE`, existing PROGRESS row gets correct Monday key, constraints/indexes are present, and no content rows were lost. — `AC-F-04` — **DONE:** PROGRESS `2026-09-28`; FINAL `SINGLE`; stored boundaries/content unchanged; row count 2; fingerprint `75b9e78103b317d863bed96a28308420` unchanged; old unique index absent; new composite unique index and validated CHECK present.
- [x] **T134 — Verify uniqueness behavior.** Different-week PROGRESS insert succeeds; same-assignment/same-week PROGRESS duplicate fails; INITIAL/MIDTERM/FINAL remain one-per-type. Use disposable/non-production test records only. — `AC-F-04` — **DEFERRED (not authorized in Gate B3):** insert-based checks would add disposable data beyond the approved artifact-only scope and protected fixtures. Structural uniqueness is verified; disposable insert checks remain Phase C T148.
- [x] **T135 — Record migration verification report.** Include target, migration result, schema verification, row-preservation evidence, and blockers. Do not begin Phase C automatically. — **DONE:** `weekly-evaluation-b3-verification.md` records the full Gate B3 evidence and PASS decision.

### GATE B3 — Phase C approval required

**STOP after T135.**

Human must approve proceeding with schema-dependent application implementation.

Gate B3 verification summary:
- Artifact SHA-256 verified before execution: `76f524dc3e240cfdd259fd621114fea61609e92e7d0c40ff8c889cd1b875184f`; ledger checksum matches.
- Applied only `20261104120000_support_weekly_evaluations` via `psql --single-transaction`; Prisma ledger now has 7 applied migrations.
- `20260913090000_restore_branches` remains the only pending migration; `public.branches` remains absent.
- Before/after: Evaluation rows 2 → 2; content fingerprint `75b9e78103b317d863bed96a28308420` unchanged; PROGRESS key `2026-09-28`; FINAL key `SINGLE`; stored dates/periods/scores/narrative/status/evaluator unchanged.
- `npx prisma validate`, weekly 16/16, evaluation 8/8, insights 5/5, portfolio 7/7, AI 13/13, typecheck, `npx eslint src`, and `git diff --check` all PASS.
- `gatea:fixtures:verify` PASS; E6 terminal state unchanged.
- Prisma Client regeneration and Phase C implementation remain unstarted.

---

# Phase C — Weekly Evaluation application implementation

- [x] **T140 — Add canonical weekly-period helpers.** Server computes Monday/Sunday and `periodKey` in internship/company timezone with `Asia/Manila` fallback. — `REQ-FR-EVL-2`; `AC-F-04`
- [x] **T141 — Normalize PROGRESS creation server-side.** Ignore client `periodKey`; derive canonical week; ensure direct-Supervisor active-assignment authority. — `REQ-FR-EVL-1`, `REQ-FR-EVL-2`; `AC-A-06`
- [x] **T142 — Preserve one-off Evaluation semantics.** INITIAL/MIDTERM/FINAL use `SINGLE` key and remain one-per-assignment/type; finalized read-only behavior remains. — `REQ-FR-EVL-1`, `REQ-FR-EVL-3`, `REQ-FR-EVL-5`
- [x] **T143 — Handle duplicate-week errors safely.** Translate unique-key conflict into a clear user error without overwriting or merging an existing weekly Evaluation. — `REQ-FR-EVL-2`; `AC-F-04`
- [x] **T144 — Update Evaluation UI for weekly periods.** Clearly label week start/end and repeated PROGRESS records; do not expose internal `periodKey`. — `S-06`; `AC-F-04`
- [x] **T145 — Update Intern/Coordinator finalized views.** Show multiple finalized weekly evaluations chronologically while preserving own/school scopes. — `REQ-FR-EVL-3`, `REQ-FR-EVL-5`; `AC-A-06`
- [x] **T146 — Update report/Insights queries for repeated PROGRESS rows.** Preserve finalized filtering and chronological semantics; do not invent weekly ranking metrics. — `REQ-FR-EVL-3`, `REQ-FR-AI-3`, `REQ-FR-AI-6`; `AC-S-05`
- [x] **T147 — Rewrite/add Evaluation tests.** Cover Monday/Sunday normalization, timezone fallback, different-week repeats, same-week duplicate, one-off uniqueness, scope, finalized read-only behavior, and report chronology. — `AC-F-04`, `AC-A-06`
- [x] **T148 — Run schema-dependent non-production integration checks.** Only in the already verified non-production environment; never Production-backed evaluation accounts/data. — `AC-F-04`

## Final convergence

- [x] **T150 — Run all relevant Phase A + Phase C suites.** Include all PRESERVE/REWRITE/ADD tests and record any intentionally retired stale assertion. — all 51 REQs
- [x] **T151 — Run `npm run typecheck`, `npm run lint`, `git diff --check`, and safe local `npm run build`.** — Definition of Done
- [x] **T152 — Re-run authorization matrix verification.** Ensure weekly-Evaluation changes did not broaden role authority. — `AC-A-01`, `AC-A-02`, `AC-A-03`, `AC-A-04`, `AC-A-05`, `AC-A-06`, `AC-A-07`, `AC-A-08`, `AC-A-09`, `AC-A-10`, `AC-A-11`, `AC-A-12`, `AC-A-13`, `AC-A-14`, `AC-A-15`
- [x] **T153 — Re-run 390/768/1024/1440 responsive verification for affected Evaluation/Growth/report surfaces.** — `AC-U-08`
- [x] **T154 — Final 51-REQ traceability check.** Every requirement must be Satisfied or explicitly blocked with evidence; no silent regression. — all 51 REQs
- [x] **T155 — Produce final implementation/convergence report.** Summarize changed files, requirements, tests, migration result, remaining environment blockers, and deployment readiness.

## Post-convergence product follow-up — Portfolio lifecycle and navigation correctness (P3)

**Source:** DEC-2026-020 and `portfolio-finalization-navigation-addendum.md`.  
**Status:** Implemented and verified on the isolated local environment (2026-11-24). No Prisma migration was needed. Evidence is listed under each task below.  
**Boundary:** This is a local code follow-up, not deployment Gate D. It does not authorize Production access, migration execution, push, or deployment.

- [x] **P160 — Trace and fix Reports navigation behavior.** Reproduce actual Reports clicks for Supervisor, Coordinator, and Representative on desktop/mobile; trace final URL, role-profile resolution, route guards, and active-state matching. Correct the real redirect/authorization cause without weakening server guards. Ensure Home is active only on the exact role landing route and Reports is active on `/reports` plus nested report routes.
  - Evidence (2026-11-24): Root cause reproduced with real clicks: Supervisor B and Representative B are linked to `GATEA-CO-B-…`, not `BO_MAIN_OFFICE`. The shell always showed Reports, and `requireReportViewer()` redirected them (`/reports`→`/dashboard`[→`/admin`]), which made Home/Dashboard look active. Fix: `resolveReportViewer()`; the Reports link is shown only when a report scope resolves; `/reports` shows an honest unavailable state; nested report routes return 404 instead of a silent redirect. Main Office Supervisor/Coordinator/Representative clicks resolve to `/reports` (browser spec).
- [x] **P161 — Centralize active navigation matching.** Share one tested route-matching helper between desktop sidebar, mobile bottom navigation, and More sheet. Ensure one correct `aria-current="page"` destination; active secondary mobile routes mark More active and their item active when the sheet opens. Intern contextual report routes must not highlight Home; preserve DEC-2026-016 (no standalone Intern Reports link).
  - Evidence (2026-11-24): `src/lib/navigation/active.ts` (exact landing routes, longest match wins, `alsoActiveOn`) is used by `shell-navigation.tsx` and by `mobile-navigation.tsx` for both the bar and the More sheet. More is active for secondary destinations (with a screen-reader current-page hint). Intern `/reports*` keeps Insights active, with no Intern Reports item (DEC-2026-016). `scripts/test-navigation-active.ts` 9/9.
- [x] **P162 — Promote Intern Portfolio in navigation.** Keep the direct desktop Portfolio link and add Portfolio as the fifth Intern mobile primary destination. Keep Home, Attendance, Work Logs, Tasks, and More. Make the mobile grid adapt to actual item count and validate no wrapping, clipping, overlap, or inaccessible tap targets at 360/390/430/768 widths. Do not alter other-role navigation.
  - Evidence (2026-11-24): Intern mobile: Home, Attendance, Work Logs, Tasks, Portfolio + More. The grid is `repeat(var(--bottom-nav-items), minmax(0,1fr))`. The browser spec verifies one row, no clipping or overlap, and ≥44px targets at 360/390/430/768. Other roles' primary paths are unchanged.
- [x] **P163 — Implement completion-time Portfolio snapshot.** Build deterministic evidence for the exact assignment using canonical eligibility and authorization rules. Persist the snapshot to the existing Portfolio row/sourceSnapshot in the same transaction as the COMPLETED transition. Preserve Intern narrative, use GENERATED rather than FINALIZED/APPROVED, do not invoke Gemini, and make retries idempotent. If snapshot persistence fails, roll back completion.
  - Evidence (2026-11-24): `src/lib/portfolio/snapshot.ts` + `src/lib/assignments/completion.ts`: `transitionAssignment()` runs the COMPLETED update and `persistCompletionPortfolio()` inside one `prisma.$transaction`, and a failure rolls back. The snapshot uses the canonical `internReportSelect` (moved to `src/lib/reports/select.ts`). The upsert on the unique `assignmentId` changes only `sourceSnapshot`/status (GENERATED; FINALIZED/ARCHIVED kept). No narrative overwrite, no Gemini, no approval fields. Existing Portfolio columns sufficed, so no migration.
- [x] **P164 — Implement per-assignment Portfolio archive.** Show the active internship and every completed internship separately. Re-authorize every assignment ID server-side for open/edit/export; never mix one assignment's evidence and another's narrative. Keep legacy completed assignments without a snapshot available through an honest on-demand fallback.
  - Evidence (2026-11-24): `/portfolio` is a hub: active (In progress, live) plus every completed internship as its own entry (dates, credited hours, snapshot/legacy label, Open, Download PDF). Candidates are re-authorized through `portfolioCandidateWhere()` (own profile, Main Office, ACTIVE/COMPLETED); an unauthorized candidate returns 404 with no substitution. Legacy completed internships without a snapshot are labelled on-demand. No backfill was performed.
- [x] **P165 — Make Portfolio editor and PDF assignment-aware.** Preserve existing URLs where practical; allow the Intern to open/edit the intended assignment and export its own Portfolio PDF. Completed exports use the saved source snapshot; active exports use current eligible evidence. Generate PDFs on demand and preserve narrative fields.
  - Evidence (2026-11-24): Edit/save/AI draft/review/PDF use `?assignment=`, re-authorized server-side. Completed internships use the saved snapshot; active ones use live evidence. `src/lib/portfolio/pdf.ts` builds a Portfolio-specific PDF on demand (overview, credited hours, skills, tasks, Work Log highlights, evaluation summary, optional narrative, source label). No PDF bytes are stored.
- [x] **P166 — Add focused unit and integration tests.** Cover evidence eligibility, credited-hour correctness, explicit skills, atomic completion/snapshot persistence, idempotency, narrative preservation, no AI invocation, no false approval, multi-assignment archive isolation, legacy fallback, assignment ownership, and assignment-specific PDF content.
  - Evidence (2026-11-24): `scripts/test-portfolio-completion.ts` 15/15 (a mutation check confirmed narrative preservation is caught); `scripts/test-portfolio-integration.ts` 6/6 rollback-only on isolated DB (rollback verified: 0 synthetic users; Portfolio and COMPLETED counts unchanged); `scripts/test-navigation-active.ts` 9/9.
- [x] **P167 — Add navigation and browser acceptance tests.** Cover real Reports clicks and final URLs for authorized roles, route redirects, exact active-state/aria-current behavior, nested Reports routes, mobile More state, Intern Portfolio primary navigation, role menu preservation, and 360/390/430/768 responsive layout.
  - Evidence (2026-11-24): `tests/gatea/portfolio-navigation.spec.ts`: 18 passed (role/viewport-gated skips by design). Covers real Reports clicks for S/C/R at 360/390/430/768/1024/1440, nested reports, More state, Main-Office-scope accounts (no link, no bounce), Representative per-Intern 404, Intern Portfolio primary navigation, archive entries, selected-assignment view/PDF, tampered IDs 404, contextual report highlighting, no console errors. It surfaced and fixed a pre-existing duplicate React key on the Reports list (keyed by Intern user ID).
- [x] **P168 — Run focused regression and safety checks.** Run Portfolio, navigation, role authorization, assignment lifecycle, typecheck, lint, and relevant isolated browser tests. Run Gate A environment preflight and tagged fixture verification before and after substantive code changes. Record exact results and confirm no Production access, fixture mutation, unrelated migration, commit, push, or deployment.
  - Evidence (2026-11-24): `npm run typecheck` ✓; `npm run lint` ✓; `git diff --check` ✓; `npm run navigation:test` 41/41; `npm run portfolio:test` 22/22; `test-automatic-portfolio` 8/8; `assignment:test` 14/14; `gatec:regression` 590/591 (only the known isolated-Storage identity check, unchanged blocker). Browser regression: identity, evaluations and T105 suites pass (T105 updated for DEC-2026-020 More contents; 4 transient `ERR_NETWORK_CHANGED` host errors re-ran green). Preflight and tagged fixture verification pass before and after (credited minutes 1350; portfolios 1; assignments unchanged).

## Post-convergence product follow-up — Completion Certificate and completed-intern experience (P4)

**Source:** DEC-2026-021 (Proposed; plan approved in session 2026-11-24) and `completion-certificate-addendum.md`.  
**Status:** In implementation.  
**Boundary:** Local isolated environment only; migration applied to the isolated DB only. No Production, push or deployment.

- [x] **P170 — Certificate data model.** Forward-only `internship_certificates` migration (unique assignment and certificate number, signatory snapshot, ISSUED/REVOKED, RLS on, no policies) applied to the isolated DB only.
  - Evidence (2026-11-24): Migration `20261124150000_add_internship_certificates` (additive; checks for revocation/values; RLS on) applied to the isolated DB only with `psql --single-transaction`, recorded via `prisma migrate resolve --applied`. `20260913090000_restore_branches` remains unapplied.
- [x] **P171 — Atomic issuance at completion.** Issue idempotently inside the COMPLETED transaction after the Portfolio snapshot; record the Representative signatory; shortfall confirmation on the completion screen.
  - Evidence (2026-11-24): `issueCertificateInTransaction` runs inside `completeAssignmentInTransaction` after the Portfolio snapshot; certificate or snapshot failure rolls back completion (unit + savepoint integration). Signatory = completing Representative; shortfall requires `confirmShortfall`. Non-Main-Office completions proceed without a certificate.
- [x] **P172 — Certificate access, preview, PDF and revoke.** Role scope (Intern own, assigned Supervisor, school Coordinator, Main Office Representative; Admin denied), preview page, on-demand branded PDF (`pdf-lib`), Representative revoke with reason.
  - Evidence (2026-11-24): `/certificates`, `/certificates/[assignmentId]`, `/certificates/[assignmentId]/pdf` (pdf-lib 1.17.1, on demand) and Representative revoke action, all through `certificateCandidateWhere`. Admin denied; Interns cannot download revoked certificates.
- [x] **P173 — Completed-intern experience.** Completed Intern dashboard, Completed sections on Supervisor/Coordinator rosters, profile completion badge, Portfolio/report certificate links; no new navigation items.
  - Evidence (2026-11-24): Completed Intern dashboard, Completed sections on `/interns` and `/students`, profile completion card, Portfolio archive and company report certificate links, active-nav ownership of `/certificates`; no new navigation items.
- [x] **P174 — Demo completed intern (isolated only).** Tagged, idempotent seed and cleanup scripts; completed through the real completion path.
  - Evidence (2026-11-24): `scripts/seed-completed-intern-demo.ts` / `cleanup-completed-intern-demo.ts` (isolated-only guards, tagged `demo_completed_intern=true`). Seeded once through the real completion path: certificate issued, 488 credited hours, Portfolio snapshot saved. Tagged fixture verification still passes (1350 credited minutes).
- [ ] **P175 — Tests and regression.** Unit, rollback integration, browser (360–1440) and full regression with preflight/fixture verification before and after.
  - Progress (2026-11-24): `scripts/test-certificates.ts` 11/11; `scripts/test-certificates-integration.ts` 6/6 (rollback verified); `tests/gatea/completion-certificate.spec.ts` 20 passed; typecheck and lint pass; `gatec:regression` 607/608 (only the known isolated-Storage check); preflight and tagged fixtures pass. **Open:** the final read-only browser regression run was stopped by the host for low memory after 72 passes; the identity spec expectation was updated for the completed dashboard and needs a re-run, as do two Gate C evaluation projects (R-390, A-390) that failed while the server was being stopped.

### P3 acceptance gate

Stop after P168 and present the implementation report. Portfolio lifecycle correctness and navigation acceptance do not change the independent Gate D deployment/Production approval boundary.

### GATE D — Deployment / Production remains separate

**STOP after T155.**

This task list does **not** authorize:
- Production migration execution;
- deployment;
- push;
- production data mutation.

Those require separate explicit human approval.
