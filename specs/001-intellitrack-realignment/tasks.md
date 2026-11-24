# Realignment Audit Tasks

**Audit only.** These tasks produce evidence and a decision package. They do not authorize implementation, page redesign, feature removal, role-authority changes, schema changes, migrations, seeds, backfills, production writes, deployment, or pushing.

**Gate:** Audit execution and the D-01 through D-13 decision package were explicitly approved on 2026-11-03. T000–T023 are complete. Implementation remains blocked behind the 002 specification workflow.

**Read-only rules:** Do not modify `src/`, `prisma/`, `scripts/`, configuration, environment, or deployment files. Do not run migrations, `db push`, seeds, backfills, or production writes. Do not submit attendance, work logs, tasks, documents, evaluations, feedback, announcements, or corrections. Record exact commands/results and what was not verified.

## Baseline and inventory

- [x] T000 Record `git rev-parse HEAD`, `git status --short`, date, runtime environment, Auth/Supabase environment, and database environment in the audit report; do not include secrets. Record that the current local runtime is Production-backed and interactive evaluation-account testing is not authorized. — `AC-F-10`, `AC-F-11`
- [x] T000a Record repository/schema state read-only; note capabilities that are code-present but not database-active; read `docs/branch-pre-migration-compatibility.md`. — `AC-F-11`, `AC-S-07`
- [x] T001 Inventory all routed surfaces, including public, auth, account, onboarding, authenticated, and admin routes under `src/app/**/page.tsx`; inventory route actions and guards separately. — `AC-F-02`
- [x] T002 Inventory role navigation on desktop and mobile for Intern, Supervisor, Coordinator, Representative, and technical Admin; record every nav item and its source. — `AC-U-01`, `AC-U-02`
- [x] T003 Inventory dashboards and their data/actions; identify metrics, blocks, and links that lack a real source. — `AC-U-05`
- [x] T004 Inventory server-side authorization guards and data scopes; cite file/line and distinguish UI visibility from server enforcement. — `AC-A-03`, `AC-A-04`
- [x] T004a Build the authorization baseline matrix from `02_core_requirements.md` + `DEC-2026-001` + `docs/roles-and-required-hours.md` + `docs/product/role-matrix.md`; compare every route, server action, and guard. — `AC-A-01`, `AC-A-02`, `AC-A-11`
- [x] T005 Inventory major workflows: authentication/account states, onboarding (including required hours), dashboard, profile, attendance (including calendar/corrections), work logs, tasks (including submission/review), evaluations/feedback, documents, announcements/notifications, portfolio, AI drafting, insights, reports, internship calendar, company operations (users/schools/branches/office settings). — `AC-F-02`, `AC-F-03`
- [x] T005a Inventory states/transitions for each workflow and compare to the minimum states required by `02`; list extra approvals/states. — `AC-F-07`, `AC-U-03`
- [x] T005b Inventory non-REQ capabilities and cite vision/roles/architecture/UI/code sources; use the non-REQ traceability table. — `AC-F-03`, `AC-F-14`

## Requirement traceability

- [x] T006 Build the 51-row matrix with the required columns and exactly the 51 IDs; verify the count and diff against `02_core_requirements.md`. — `AC-F-01`, `AC-F-04`, `AC-F-15`
- [x] T007 Map each current major capability to `REQ-...`, `DEC-...`, or `CLARIFICATION-NEEDED (Q-...)`; do not leave blank rows. — `AC-F-03`, `AC-F-14`
- [x] T008 Identify requirements with missing, partial, contradicted, ambiguous, or unverifiable implementation; record evidence or the reason evidence was unavailable. — `AC-F-04`, `AC-F-05`
- [x] T008a Inspect Prisma models/enums read-only for capability mismatches (weekly evaluations, workmate feedback, announcement notifications, company reports, required hours). — `AC-F-05`, `AC-F-11`
- [x] T008b Verify the known gaps: `EVL-2`, `EVL-4`, `AI-2`, `ANN-3`, `REP-3`, `REP-4`, `DOC-3`; record confirmed status and evidence. — `AC-F-05`

## Role audits

- [x] T009 Audit Intern: self-service scope, attendance, work logs, tasks, evaluations, documents, announcements, portfolio, reports; verify denial of other interns' records and review/admin functions. — `AC-A-07`, `S-01`
- [x] T010 Audit Company Supervisor: assigned-intern scope, attendance verification/corrections, work-log review, task assignment/monitoring, evaluations, and supervisor reports; audit workmate-feedback authorship/collection under `Q-01` rather than assuming it; verify no company-wide access. — `AC-A-07`, `S-02`
- [x] T011 Audit School Coordinator: school-scoped monitoring of students, hours, evaluations, reports; verify no approval or management authority. — `AC-A-07`, `S-03`
- [x] T012 Audit Company Representative: verify announcement publishing and company-report access required by `ANN-1`/`REP-3`; audit user/school/assignment/branch/office operations under `Q-05` and attendance/work-log review under `Q-04` rather than assuming them. — `AC-A-07`, `S-04`
- [x] T013 Audit System Administrator separately as technical/emergency: bootstrap, recovery, maintenance; verify no routine business persona. — `AC-A-06`, `S-05`
- [x] T013a Perform cross-role forbidden-action checks using static inspection or read-only navigation only; do not submit forms or mutate data; record server-side denial evidence or absence. — `AC-A-04`, `S-06`

## Conflicts and clarifications

- [x] T014 Record every document-vs-document and document-vs-code conflict in the conflict register; do not resolve without a decision. — `AC-F-06`
- [x] T014a Resolve the open clarification items among `Q-01` through `Q-13` with a product decision or leave them `CLARIFICATION-NEEDED`; treat `Q-06` and `Q-12` as already resolved by `DEC-2026-001`/source precedence and verify current drift against those baselines. Do not implement. — `AC-F-13`, `AC-A-09`
- [x] T014b Record proposed `DEC-...` entries for review; do not edit `docs/product/decisions.md` without approval. — `AC-F-13`
- [x] T014c Verify that every non-REQ capability has an approved `DEC-...` or `CLARIFICATION-NEEDED`; no non-REQ `KEEP` without a decision. — `AC-F-14`

## Classification and information architecture

- [x] T015 Classify each capability as `KEEP`, `SIMPLIFY`, `MERGE`, `REMOVE`, `DEFER`, or `CLARIFICATION NEEDED`, with rationale and requirement impact. — `AC-F-07`, `AC-U-03`
- [x] T016 Draft a conceptual per-role information architecture (primary/secondary/mobile), with every nav item mapped to `REQ-...`, `DEC-...`, or `CLARIFICATION-NEEDED`; do not implement. — `AC-F-08`, `AC-U-01`, `AC-U-02`
- [x] T017 Identify terminology and workflow inconsistencies, including stale five-role, “School Administrator,” “Company Admin,” role-switch, and desktop-first guidance. — `AC-F-09`, `AC-U-06`
- [x] T018 Identify dashboard clutter, duplicate information, duplicate workflows, and unsupported metrics; propose `MERGE`/`SIMPLIFY` only. — `AC-U-03`, `AC-U-05`

## Evidence and approval package

- [x] T019 Produce the evidence log with file/line citations, exact non-mutating commands/results, and a list of what was not verified. — `AC-F-10`, `AC-A-10`, `AC-S-07`
- [x] T020 Produce `specs/001-intellitrack-realignment/report.md` with Inventory, Traceability, Conflicts, Role audits, Classification, IA proposal, Decisions, and Verification log. — `AC-F-10`, `AC-F-13`
- [x] T021 Produce the decision/approval package: proposed `DEC-...` entries, open `Q-...` items, authorization findings, and removal/merge impacts. — `AC-F-13`, `AC-A-09`
- [x] T022 Stop before implementation; verify no `src/`, `prisma/`, `scripts/`, configuration, environment, or deployment file was changed. — `AC-F-11`, `AC-A-09`

## Post-approval only — not part of this audit

- [x] T023 After human approval of the audit package, create a new `specs/002-...` implementation spec linked to the approved decisions. Keep `001-intellitrack-realignment` as the closed audit record; do not convert it into an implementation authorization. — Approval gate
