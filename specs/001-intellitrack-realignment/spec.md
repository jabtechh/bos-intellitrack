# IntelliTrack Product and UX Realignment — Audit Specification

**Spec ID:** `001-intellitrack-realignment`  
**Status:** Audit / specification phase  
**Implementation authorized:** No  
**Audit date:** 2026-11-03

**Baseline:** Record `git rev-parse HEAD`, `git status --short`, the date, the **runtime environment**, the **Auth/Supabase environment**, and the **database environment** in the audit report before any verification. Do not include credentials, tokens, signed URLs, or private storage paths. Do not assume the working tree is clean.

**Current environment constraint (2026-11-03):** the application runtime is a local checkout, but its configured Supabase Auth and PostgreSQL endpoints point to the project's Production Supabase environment. Therefore interactive evaluation-account testing is **not authorized** under this audit. Use static inspection and genuinely non-mutating verification only unless a separate non-production Auth/database environment is configured and verified.

## Goal

Determine the smallest, clearest IntelliTrack product that satisfies the 51 approved functional requirements and the approved product decisions. The audit must identify scope drift, role confusion, duplicated workflows, unnecessary UI, missing required behavior, authorization risks, and unsupported features — and produce an approval-ready package.

This spec authorizes a **read-only audit**. It does not authorize implementation, page redesign, feature removal, role-authority changes, schema changes, migrations, deployment, or production changes.

The audit is successful when:

- every material capability is mapped to a `REQ-...` ID, an approved `DEC-...`, or a recorded `CLARIFICATION-NEEDED`;
- every business role and the technical System Administrator have an explicit, evidence-backed authorization baseline;
- every source conflict and unresolved ambiguity is recorded rather than silently reconciled;
- every proposed simplification, merge, removal, or authority change is held for human approval; and
- no application code, schema, migration, seed, or operational data is changed.

## Source requirements

### Source precedence

When sources conflict, record the conflict; do not silently reconcile it.

1. `../../02_core_requirements.md` — approved functional requirements and requirement IDs.
2. `../../docs/roles-and-required-hours.md` — current role interpretation and required-hours ownership.
3. `../../01_project_vision.md` — product purpose and intended outcomes.
4. `../../04_architecture/`, `../../07_database_design.md`, and current Prisma/schema compatibility rules — technical and data constraints.
5. `../../05_design_system.md` and `../../06_ui_ux_specification.md` — UX/design guidance. Treat conflicts or stale guidance as clarification items, not automatic truth.
6. Existing code — evidence of current implementation, not proof that behavior is required.

`../../docs/architecture/auth.md` is the authorization reference. `../../docs/product/role-matrix.md`, `../../docs/product/scope.md`, `../../docs/product/requirements.md`, and `../../docs/product/ux-principles.md` are supporting product guidance.

Additional governing references:

- `../../03_tech_stack.md` — technical constraints.
- `../../05_design_system.md` — design guidance only; conflicts are clarification items.
- `../../docs/architecture/business-rules.md` — business-rule reference.
- `../../docs/architecture/database.md` — database reference.
- `../../docs/branch-pre-migration-compatibility.md` — compatibility guidance for the unapplied Branch migration.

### Canonical requirement inventory — exactly 51 IDs

Do **not** create new requirement IDs. The traceability matrix must contain exactly these 51 IDs.

- **Authentication and RBAC (6):** `REQ-FR-URM-1`, `REQ-FR-URM-2`, `REQ-FR-URM-3`, `REQ-FR-URM-4`, `REQ-FR-URM-5`, `REQ-FR-URM-6`
- **Intern profile (7):** `REQ-FR-PRO-1`, `REQ-FR-PRO-2`, `REQ-FR-PRO-3`, `REQ-FR-PRO-4`, `REQ-FR-PRO-5`, `REQ-FR-PRO-6`, `REQ-FR-PRO-7`
- **Attendance (9):** `REQ-FR-ATT-1`, `REQ-FR-ATT-2`, `REQ-FR-ATT-3`, `REQ-FR-ATT-4`, `REQ-FR-ATT-5`, `REQ-FR-ATT-6`, `REQ-FR-ATT-7`, `REQ-FR-ATT-8`, `REQ-FR-ATT-9`
- **Daily work logs (4):** `REQ-FR-DWL-1`, `REQ-FR-DWL-2`, `REQ-FR-DWL-3`, `REQ-FR-DWL-4`
- **Tasks (3):** `REQ-FR-TSK-1`, `REQ-FR-TSK-2`, `REQ-FR-TSK-3`
- **Performance evaluation (5):** `REQ-FR-EVL-1`, `REQ-FR-EVL-2`, `REQ-FR-EVL-3`, `REQ-FR-EVL-4`, `REQ-FR-EVL-5`
- **AI portfolio (4):** `REQ-FR-AI-1`, `REQ-FR-AI-2`, `REQ-FR-AI-3`, `REQ-FR-AI-4`
- **AI skill and productivity analysis (3):** `REQ-FR-AI-5`, `REQ-FR-AI-6`, `REQ-FR-AI-7`
- **Documents (3):** `REQ-FR-DOC-1`, `REQ-FR-DOC-2`, `REQ-FR-DOC-3`
- **Announcements (3):** `REQ-FR-ANN-1`, `REQ-FR-ANN-2`, `REQ-FR-ANN-3`
- **Reporting (4):** `REQ-FR-REP-1`, `REQ-FR-REP-2`, `REQ-FR-REP-3`, `REQ-FR-REP-4`

**Total: 51.**

### Approved product decisions and interpretations

- **`DEC-2026-001`** is the only approved entry in `../../docs/product/decisions.md`. It keeps **System Administrator** as an internal bootstrap, recovery, and technical-maintenance role. It must not be marketed or designed as a fifth normal internship-management persona.
- `../../docs/roles-and-required-hours.md` is the source-of-truth interpretation for roles and required-hours ownership, but it is **not** a `DEC-...` entry. Required-hours onboarding and correction therefore remain `CLARIFICATION-NEEDED` until formalized in `decisions.md` (Q-07).
- No other `DEC-...` entries exist. Vision, design-system, UI, database-design, and code statements do not become approved product decisions merely because they exist.
- For this audit, `../../docs/roles-and-required-hours.md:12-16` is the **approved interpretation** for required-hours ownership and onboarding. Because it is not a `DEC-...` entry, it remains `CLARIFICATION-NEEDED (Q-07)` for implementation purposes; the audit must not treat it as sufficient authorization to keep or expand the feature without a decision.

### Traceability rules

Every material capability, route, workflow, action, dashboard block, or navigation item must carry exactly one of:

- `REQ-...` — one or more approved requirement IDs;
- `PRODUCT-DECISION (DEC-...)` — an approved decision from `../../docs/product/decisions.md`; or
- `CLARIFICATION-NEEDED (Q-...)` — an unresolved ambiguity recorded in this spec.

Additional rules:

- An `INTERPRETATION` from `docs/roles-and-required-hours.md` may be cited as a supporting source, but it cannot by itself justify `KEEP` for behavior that is not in `02_core_requirements.md`. Convert it to a `DEC-...` before implementation.
- A code path, existing test, or UI element is **evidence**, not a requirement.
- `KEEP` requires a `REQ-...` or `DEC-...`. A capability that is required but incorrectly scoped must be `SIMPLIFY` or marked `Contradicted`, not `KEEP` as-is.
- `REMOVE` requires no `REQ-...`/`DEC-...` support, a recorded data/operational dependency check, and human approval.
- If a requirement is missing implementation evidence, record `Missing` or `Unverifiable`; do not invent behavior.

### Non-REQ capability traceability

Non-REQ capabilities must use this table. A capability may be `KEEP` only if the `DEC reference` column contains an approved `DEC-...`. Otherwise it is `CLARIFICATION-NEEDED` and may not be removed or implemented until a decision exists.

| Capability | Source (vision/roles/architecture/UI/code) | DEC reference | If no DEC: CLARIFICATION-NEEDED | Current behavior | Proposed classification |
|---|---|---|---|---|---|
| Required-hours onboarding and correction | `docs/roles-and-required-hours.md:12-16`; `src/app/onboarding/internship-hours/page.tsx`; `src/lib/required-hours/*` | None | `Q-07` | Intern confirms once; Representative/Admin can correct; Supervisor/Coordinator monitor | CLARIFICATION NEEDED |
| Branch management and office settings | `docs/branch-restoration.md`; `src/app/admin/branches/*`; `src/app/admin/settings/office/*` | None | `Q-05`, `Q-08` | Representative/Admin manage; Branch migration is not applied | CLARIFICATION NEEDED |
| Internship calendar and holidays | `src/app/(authenticated)/calendar/*`; calendar/holiday models | None | `Q-08` | Roles view calendar; Representative/Admin manage events/holidays | CLARIFICATION NEEDED |
| School announcements | `01_project_vision.md:93`; `src/lib/announcements/authorization.ts`; announcement audience model | None | `Q-08` | School-scoped audience is supported | CLARIFICATION NEEDED |
| AI drafting in evaluations, reports, and portfolio | `01_project_vision.md:49-50`; `src/app/(authenticated)/evaluations/[evaluationId]/edit/page.tsx`; `src/app/(authenticated)/reports/intern/[internId]/page.tsx`; `src/app/(authenticated)/portfolio/edit/page.tsx` | None | `Q-08` | AI draft assistant exists in these surfaces | CLARIFICATION NEEDED |
| AI-assisted work-log writing and internship milestones/reminders | `01_project_vision.md:49-50,52-56` | None | `Q-08` | No implementation evidence confirmed in the inspected work-log form | CLARIFICATION NEEDED |
| Role switching and five-role guidance | `06_ui_ux_specification.md:40-48,109` | `DEC-2026-001`; `REQ-FR-URM-4` | Resolved by source precedence: four business roles + technical Admin are authoritative | Guidance only; audit must verify no role-switch route is exposed | REMOVE |
| Extra workflow states and approvals | `06_ui_ux_specification.md:367-380`; `prisma/schema.prisma:85-211` | None | `Q-13` | Extra states exist in schema/UI | CLARIFICATION NEEDED |
| Company operations beyond core requirements (users, schools, assignments) | `docs/roles-and-required-hours.md:8`; `src/app/admin/*` | None | `Q-05` | Representative/Admin operations surfaces exist | CLARIFICATION NEEDED |

### Traceability status vocabulary

Each requirement row must have exactly one status:

- **Satisfied** — required behavior exists and is verified by cited evidence.
- **Partial** — some required behavior exists; the missing part is described.
- **Missing** — no implementation evidence exists.
- **Contradicted** — implementation behaves differently from the requirement.
- **Ambiguous** — sources disagree or the requirement is underspecified.
- **Unverifiable** — evidence could not be obtained; state why.

### Required traceability matrix columns

The 51-row matrix must use these columns:

| REQ ID | Requirement summary | Required role(s) | Current evidence (route/action/guard/schema/test) | Status | Gap or conflict | Proposed classification | Decision |
|---|---|---|---|---|---|---|---|

No row may be left as “reviewed” without a status. Every status other than `Unverifiable` requires at least one evidence citation. Every `KEEP` requires a `REQ-...` or approved `DEC-...`. Every non-REQ capability must use the non-REQ table above.

### Classification vocabulary

- **KEEP** — required by at least one `REQ-...` or approved `DEC-...`, and correctly scoped.
- **SIMPLIFY** — required, but the implementation adds steps, states, or duplication the requirement/decision does not require.
- **MERGE** — two or more capabilities satisfy the same requirement/decision; designate one source of truth.
- **REMOVE** — not traceable to any `REQ-...`/`DEC-...` and provides no necessary technical or operational function; requires approval and a data-dependency check.
- **DEFER** — explicitly labeled future in a source; no current requirement.
- **CLARIFICATION NEEDED** — sources are silent, conflicting, or insufficient; do not implement or remove until a product decision exists.

Classification does **not** authorize removal, redesign, or implementation.

## Users / roles affected

| Role | Type | Intended scope | Must not acquire | Source |
|---|---|---|---|---|
| Intern | Business | Own profile, attendance, work logs, tasks, evaluations, documents, portfolio, reports | Other interns' records, review queues, company operations | `REQ-FR-URM-4` through `-6`; `docs/roles-and-required-hours.md:5` |
| Company Supervisor | Business | Assigned interns: attendance verification/corrections, work-log review, task assignment/monitoring, performance evaluation, supervisor reports. Workmate-feedback authorship remains `Q-01`. | Company-wide operations or unassigned interns | `REQ-FR-ATT-7/8`, `REQ-FR-DWL-4`, `REQ-FR-TSK-1/3`, `REQ-FR-EVL-1`, `REQ-FR-REP-1`; `docs/roles-and-required-hours.md:6` |
| School Coordinator | Business | School-scoped monitoring of students, hours, evaluations, reports | Approval authority or company management | `REQ-FR-URM-4`; `REQ-FR-REP-2`; `docs/roles-and-required-hours.md:7` |
| Company Representative | Business | Publish company announcements and access company internship reports as explicitly required. Broader user/school/assignment/branch/office operations remain `Q-05`. | Unrequested school authority or emergency technical powers | `REQ-FR-ANN-1`, `REQ-FR-REP-3`; `CLARIFICATION-NEEDED (Q-05)` |
| System Administrator | Technical | Bootstrap, emergency recovery, technical maintenance | Routine business persona, routine approvals, routine publishing | `DEC-2026-001`; `docs/roles-and-required-hours.md:10` |

There are **four normal business roles** plus the technical System Administrator. Do not describe or design Admin as a fifth business persona.

## Authorization baseline

The baseline is `02_core_requirements.md` + `DEC-2026-001` + `docs/roles-and-required-hours.md` + `docs/product/role-matrix.md`. It is not derived from current code or navigation.

Legend: **A** = allowed by the baseline; **F** = forbidden; **E** = emergency/technical only; **Q-xx** = `CLARIFICATION-NEEDED`; **—** = no direct guard or not applicable.

| Capability | Intern | Supervisor | Coordinator | Representative | Admin | Source | Current server guard | Drift? |
|---|---|---|---|---|---|---|---|---|
| Sign in / own account | A | A | A | A | E | `REQ-FR-URM-1`–`-3` | `requireCurrentUser` | No |
| Attendance capture/history (own) | A | F | F | F | E | `REQ-FR-ATT-1`–`-6` | Attendance actions + `requireCurrentUser` | No |
| Attendance review/corrections | F | A | F | Q-04 | E | `REQ-FR-ATT-7/8` | `requireAttendanceReviewer` | **Yes** — Representative/Admin |
| Work-log authoring | A | F | F | F | E | `REQ-FR-DWL-1`–`-3` | Work-log actions + intern context | No |
| Work-log review | F | A | F | Q-04 | E | `REQ-FR-DWL-4` | `requireWorkLogReviewer`; list uses `requirePortfolioViewer` | **Yes** — Representative/Admin and list scope |
| Tasks | A (assigned view/update) | A (assign/monitor) | Q-03 | Q-05 | E | `REQ-FR-TSK-1`–`-3` | `requireTaskViewer`; `requireSupervisorTaskContext` | **Yes** — Coordinator/Representative read |
| Evaluations | A (view completed) | A (evaluate) | Q-03 | Q-05 | E | `REQ-FR-EVL-1`–`-3`, `-5` | `requireEvaluationViewer` | **Yes** — Coordinator/Representative read |
| Workmate feedback | Q-01 | Q-01 | Q-01 | Q-01 | E | `REQ-FR-EVL-4` | `requireSupervisorEvaluationContext` | **Yes** — missing peer/workmate authoring |
| Documents | A (upload own) | Q-02 | Q-02 | Q-02 | E | `REQ-FR-DOC-1`–`-3` | `requireDocumentViewer`; `canManageDocuments` | **Yes** — Representative/Admin auto-approve; Supervisor view-only |
| Announcements | A (view) | A (view) | A (view) | A (publish) | E | `REQ-FR-ANN-1/2`; `DEC-2026-001` | `requireAnnouncementViewer`; `canManageAnnouncements` | **Yes** — Admin publish exceeds the technical/emergency baseline |
| Portfolio/reports | A (own portfolio/export) | Q-03 | Q-03 | Q-05 | E | `REQ-FR-AI-4`, `REQ-FR-REP-1`–`-3` | `requirePortfolioViewer` | **Yes** — all roles view scoped reports/portfolios |
| Company operations | F | F | F | Q-05 | E | `DEC-2026-001`; roles doc | `requireCompanyOperationsManager` | **Yes** — Admin operations |
| Required hours | A (once) | A (monitor) | A (monitor) | A (correct; Q-07) | E | `docs/roles-and-required-hours.md:12-16` | Onboarding/required-hours context | **Yes** — no DEC; Q-07 |

Rules:

- Navigation visibility is **not** authorization evidence.
- Every server action and guard must be cited.
- Admin access is emergency/technical unless a `REQ-...` or `DEC-...` explicitly grants routine business access.
- A test that asserts current access is evidence of current behavior, not requirement correctness.
- A cell marked `Q-xx` must not be converted to `A`, `F`, or `E` without a product decision.

## Current-state findings

> **Preliminary evidence.** These findings come from static inspection on 2026-11-03. They must be confirmed by the audit tasks. Code is evidence of current behavior, not proof that the behavior is required. No application code or schema was changed during this inspection.

### Routed surface observed

The repository contains routed surfaces under:

- public/landing: `/`
- authentication: `/login`
- account states: `/account/welcome`, `/account/not-provisioned`, `/account/inactive`, `/account/set-password`
- onboarding: `/onboarding`, `/onboarding/internship-hours`
- authenticated business: dashboard, calendar, attendance, corrections, work logs, tasks, evaluations, feedback, insights, documents, portfolio, announcements, notifications, reports, profile, more
- administration: `/admin`, users, schools, companies, branches, assignments, office settings

The audit must inventory **all routed surfaces**, including public/auth/account states, but classify only surfaces that carry internship business authority as business capabilities. Route existence is not requirement evidence.

### Capability map

| Capability | Observed evidence | Source mapping | Preliminary status |
|---|---|---|---|
| Login, logout, account states, provisioning | `src/app/(auth)/login/page.tsx`; `src/app/account/*`; `docs/architecture/auth.md:10` records access as provisioned, with no public signup | `REQ-FR-URM-1` through `-3` | Partial — public signup is absent; account-state coverage must be verified |
| Role model and navigation | `src/lib/auth/roles.ts:3-13`; `src/components/app-shell.tsx:17-31`; Admin uses the operations navigation | `REQ-FR-URM-4` through `-6`; `DEC-2026-001` | Contradicted/Partial — four business roles exist, but Admin and non-REQ navigation drift is present |
| Intern profile and dashboard | `src/app/(authenticated)/profile/page.tsx`; `src/app/(authenticated)/dashboard/page.tsx:20`; `src/lib/insights/*` | `REQ-FR-PRO-1` through `-7` | Partial — field-level coverage to verify |
| Attendance capture and history | `src/app/(authenticated)/attendance/page.tsx`; `src/app/attendance/actions.ts`; `src/app/(authenticated)/attendance/history/page.tsx`; `src/app/(authenticated)/attendance/review/page.tsx:3` states normal attendance is approved automatically | `REQ-FR-ATT-1` through `-6`, `-9` | Satisfied/Partial — verify timestamps, GPS, geofence, selfie, history, analytics |
| Attendance review and corrections | `src/lib/attendance/authorization.ts:6-17` allows Supervisor, Representative, and Admin; Admin scope is `{}`; correction review uses the same reviewer model | `REQ-FR-ATT-7/8`; `CLARIFICATION-NEEDED (Q-04)` | Contradicted — core requirements grant verification/correction approval to supervisors; Representative/Admin drift is observed |
| Daily work logs | `src/app/(authenticated)/work-logs/page.tsx:9-12` uses `requirePortfolioViewer`; `src/app/work-logs/actions.ts` uses `requireCurrentUser` and intern context; `src/lib/work-logs/authorization.ts:6-17` allows Supervisor, Representative, and Admin for reviews | `REQ-FR-DWL-1` through `-4` | Contradicted — list visibility is broader than review authority; Admin is unscoped |
| Tasks | `src/lib/tasks/authorization.ts:5-7` gives Coordinator and Representative read scope; `requireSupervisorTaskContext` gates authoring; schema contains `SUBMITTED`/`REVISION_REQUESTED` states | `REQ-FR-TSK-1` through `-3`; `CLARIFICATION-NEEDED (Q-03, Q-05, Q-13)` | Partial/Contradicted — extra read access and states need decisions |
| Evaluations | `src/lib/evaluations/authorization.ts:6-10`; `src/app/(authenticated)/evaluations/page.tsx`; `prisma/schema.prisma:719` unique `[assignmentId, evaluationType]` | `REQ-FR-EVL-1` through `-3`, `-5`; `CLARIFICATION-NEEDED (Q-10)` | Partial — weekly scoring evidence is missing |
| Workmate feedback | `src/app/(authenticated)/feedback/new/page.tsx:2` requires `requireSupervisorEvaluationContext`; `prisma/schema.prisma:134-143` has no peer/workmate feedback type; `07_database_design.md:3780-3790` says peer/upward feedback may be allowed | `REQ-FR-EVL-4`; `CLARIFICATION-NEEDED (Q-01)` | Missing/Contradicted — feedback authoring is supervisor-only |
| AI portfolio | `src/app/(authenticated)/portfolio/*`; `src/app/(authenticated)/portfolio/edit/page.tsx:2` uses an AI draft assistant; `src/lib/ai/*` | `REQ-FR-AI-1` through `-4`; `CLARIFICATION-NEEDED (Q-01)` for `AI-2` | Partial — workmate-feedback input is absent if `EVL-4` is absent; export must be verified |
| AI skill and productivity analysis | `src/app/(authenticated)/insights/*`; `src/lib/insights/*`; dashboard summaries | `REQ-FR-AI-5` through `-7` | Partial — grounding, labeling, and progress coverage to verify |
| Documents | `src/lib/documents/authorization.ts:2-4`; `src/app/documents/actions.ts:4-6` lets Representative/Admin upload and auto-approve; Supervisor is view-only; Coordinator is school-scoped and excludes identification/medical documents | `REQ-FR-DOC-1` through `-3`; `CLARIFICATION-NEEDED (Q-02)` | Partial/Ambiguous — “authorized users” is undefined; review authority is not least-privilege |
| Announcements | `src/lib/announcements/authorization.ts:75-77` lets Representative and Admin manage; `src/app/(authenticated)/announcements/page.tsx`; audiences include school and company | `REQ-FR-ANN-1/2`; `DEC-2026-001`; `CLARIFICATION-NEEDED (Q-08)` | Partial/Contradicted — Admin publishing conflicts with the technical/emergency Admin baseline; school announcements are not in the core requirements |
| Notifications | `src/lib/notifications/domain.ts:3-9` defines `announcement.published`; `src/lib/notifications/service.ts:10` defines `createNotification`; no call site outside the service was found in `src/` | `REQ-FR-ANN-3` | Missing — the type and service exist, but announcement publication does not emit a notification |
| Reports | `src/app/(authenticated)/reports/page.tsx:2` uses `requirePortfolioViewer`; lists individual intern reports; dashboard metrics summarize counts | `REQ-FR-REP-1` through `-4`; `CLARIFICATION-NEEDED (Q-09)` | Partial/Ambiguous — no company aggregate report; supervisor/coordinator distinctions need verification |
| Internship calendar | `src/app/(authenticated)/calendar/page.tsx`; `src/app/(authenticated)/calendar/manage/page.tsx`; `src/app/(authenticated)/calendar/manage/holidays/page.tsx`; calendar event and holiday models | `CLARIFICATION-NEEDED (Q-08)` | Unsupported/undocumented — no core requirement found |
| Required-hours onboarding | `src/app/onboarding/internship-hours/page.tsx`; `src/app/onboarding/*`; `docs/roles-and-required-hours.md:12-18` | `INTERPRETATION (roles doc)`; `CLARIFICATION-NEEDED (Q-07)` | Unsupported/undocumented — no `REQ-...` or `DEC-...` found |
| Company operations, branches, office settings | `src/app/admin/*`; `src/lib/auth/require-company-operations-manager.ts:7-14`; `docs/branch-restoration.md:14` records the Branch migration as **NOT APPLIED** | `DEC-2026-001`; `CLARIFICATION-NEEDED (Q-05, Q-08)` | Partial/Contradicted — Representative operational scope remains unresolved; Admin routine operations conflict with the technical/emergency baseline |
| AI drafting in evaluations, reports, and portfolio | `src/app/(authenticated)/evaluations/[evaluationId]/edit/page.tsx:2`; `src/app/(authenticated)/reports/intern/[internId]/page.tsx:4`; `src/app/(authenticated)/portfolio/edit/page.tsx:2`; `src/lib/ai/runtime.ts` | `CLARIFICATION-NEEDED (Q-08)` | Unsupported/undocumented — `02` requires AI portfolio/insight generation, not general AI writing assistance |
| Extra workflow states and approvals | `prisma/schema.prisma:85-211` includes `WorkLogStatus.REVISION_REQUIRED/REJECTED`, `TaskStatus.SUBMITTED/REVISION_REQUESTED`, `DocumentStatus.REPLACED/ARCHIVED`, `AnnouncementStatus.SCHEDULED/EXPIRED/CANCELLED`, and evaluation statuses | `CLARIFICATION-NEEDED (Q-13)` | Audit candidate — `02` does not define these states; determine whether each supports a required workflow |

### Truthfulness and safety checks

The audit must explicitly answer:

- Does any screen or copy claim identity recognition, biometric matching, or liveness? (`AGENTS.md:46`)
- Is AI output grounded in cited records and labeled with limitations? (Constitution V)
- Are metrics, notifications, approvals, and verification states real and traceable? (`AGENTS.md:40`)
- Are PII, signed URLs, and private storage paths excluded from reports and logs? (`AGENTS.md:51`)
- Is normal attendance auto-approved, and are work logs kept out of the hours calculation? (`AGENTS.md:43-45`)

### Preliminary requirement gaps

| Requirement | Observed gap | Evidence | Preliminary status |
|---|---|---|---|
| `REQ-FR-EVL-2` — weekly evaluation scores | No explicit weekly scoring model; unique `[assignmentId, evaluationType]` permits only one `PROGRESS` evaluation per assignment. Verify whether `criteriaScores` can represent weekly scores. | `prisma/schema.prisma:694-726`; `src/lib/evaluations/*` | Partial/Ambiguous |
| `REQ-FR-EVL-4` — collect workmate feedback | Feedback creation requires supervisor context; no peer/workmate authoring path; no peer feedback type | `src/app/(authenticated)/feedback/new/page.tsx:2`; `prisma/schema.prisma:134-143` | Missing/Contradicted |
| `REQ-FR-AI-2` — use workmate feedback in portfolio | Workmate feedback is absent if `EVL-4` is missing; portfolio evidence scope must be verified | `src/app/(authenticated)/portfolio/*`; `REQ-FR-EVL-4` evidence above | Partial/Unverifiable |
| `REQ-FR-ANN-3` — notify users when announcements are published | `announcement.published` exists, but no `createNotification` call site was found outside the service | `src/lib/notifications/domain.ts:3-9`; `src/lib/notifications/service.ts:10`; grep of `src/` | Missing |
| `REQ-FR-REP-3` — company internship reports | Reports page lists individual intern reports; no company-level aggregate report found | `src/app/(authenticated)/reports/page.tsx:2` | Partial/Ambiguous |
| `REQ-FR-REP-4` — internship statistics and summaries | Dashboard metrics exist; no dedicated report statistics/summary found | `src/app/(authenticated)/dashboard/page.tsx`; `src/app/(authenticated)/reports/page.tsx` | Partial |
| `REQ-FR-DOC-3` — authorized users review documents | Representative/Admin can review; Supervisor is view-only; Coordinator is school-scoped and category-limited; “authorized” is undefined | `src/lib/documents/authorization.ts:2-4`; `src/app/documents/actions.ts:4-6` | Ambiguous |

### Known authority-drift items to verify

These are pre-seeded from the analysis. They are **verify** items, not approved corrections. Tasks T004, T004a, and T013a must compare each one to the authorization baseline and record the result.

| Capability | Required by | Observed behavior | Evidence | Preliminary finding |
|---|---|---|---|---|
| Attendance verification/approval | `REQ-FR-ATT-7/8` — Supervisor | Supervisor, Representative, and Admin can review; Admin has no company scope | `src/lib/attendance/authorization.ts:6-17`; `src/app/(authenticated)/dashboard/page.tsx:63-71` | Drift |
| Attendance corrections | `REQ-FR-ATT-8` — Supervisor | Same reviewer model; Representative/Admin can decide | `src/lib/attendance/authorization.ts`; correction review routes | Drift |
| Work-log review | `REQ-FR-DWL-4` — Supervisor | Supervisor, Representative, and Admin can review; Admin unscoped | `src/lib/work-logs/authorization.ts:6-17` | Drift |
| Work-log viewing | `REQ-FR-DWL-3` — intern history; supervisor review | Page uses `requirePortfolioViewer`, so Coordinator/Representative and Admin can view broader scopes | `src/app/(authenticated)/work-logs/page.tsx:9-12` | Scope inconsistency |
| Announcement publishing | `REQ-FR-ANN-1` — Company Representative | Representative and Admin can manage/publish | `src/lib/announcements/authorization.ts:75-77` | Drift |
| Portfolio/report viewing | `REQ-FR-AI-4` — Intern view/export; reports per role | All roles can view scoped portfolios/reports, including Coordinator and Representative | `src/lib/portfolio/authorization.ts:7-22`; `src/app/(authenticated)/reports/page.tsx:2` | Unclear/Drift |
| Task/evaluation reading | `REQ-FR-TSK-*`, `REQ-FR-EVL-*` — supervisor/intern | Coordinator and Representative have read access | `src/lib/tasks/authorization.ts:5-7`; `src/lib/evaluations/authorization.ts:6-9` | Undefined access |
| Document upload/approval | `REQ-FR-DOC-1` — Intern upload; `REQ-FR-DOC-3` — authorized review | Representative/Admin can upload and auto-approve; Supervisor cannot review | `src/app/documents/actions.ts:4-6`; `src/lib/documents/authorization.ts:3-4` | Ambiguous/Drift |
| Admin business access | `DEC-2026-001` — technical/emergency | Admin appears in review, publishing, portfolio, reporting, and operations paths | `src/lib/auth/roles.ts:12-13`; `src/components/app-shell.tsx:27`; `src/lib/announcements/authorization.ts:75-77` | Drift risk |

`canApproveOperationalReviews` in `src/lib/auth/roles.ts:13` declares Representative/Admin approval authority but is used only by a test; application code does not use it as the operative guard. That is evidence of authority drift, not a requirement.

### Source conflicts and ambiguity

Every conflict must be recorded, not reconciled silently. The global precedence is defined in “Source precedence” above. In the table below, `Handling` records the precedence/status, and the owner is the human product approver. A row marked `CLARIFICATION-NEEDED` may not be resolved by code inspection alone.

| ID | Sources | Conflict | Handling |
|---|---|---|---|
| C-01 | `02` `REQ-FR-EVL-4`, `REQ-FR-AI-2`; `01_project_vision.md:63-66`; `07_database_design.md:3780-3790`; `src/app/(authenticated)/feedback/new/page.tsx:2` | “Workmate feedback” vs anonymous peer evaluations vs supervisor-authored feedback | `CLARIFICATION-NEEDED (Q-01)` |
| C-02 | `02` `REQ-FR-URM-4`; `docs/roles-and-required-hours.md:7`; `05_design_system.md:622-643` | School Coordinator monitors with no approval authority vs “School Administrator” overseeing all partner companies | `CLARIFICATION-NEEDED (Q-03)` |
| C-03 | `02` `REQ-FR-URM-4`; `DEC-2026-001`; `06_ui_ux_specification.md:32,40-48,109` | Four business roles + technical Admin, mobile-responsive vs five roles including Administrator, role switch, desktop-first | **Resolved by source precedence and `DEC-2026-001`:** four business roles + technical Admin are authoritative; five-business-role and role-switch guidance is stale. Current Admin drift is still audited against the technical/emergency baseline. |
| C-04 | `02` `REQ-FR-ATT-7/8`, `REQ-FR-DWL-4`; `docs/roles-and-required-hours.md:8`; `src/lib/attendance/authorization.ts`; `src/lib/work-logs/authorization.ts` | Core requirements give Review to Supervisors; roles doc describes Representative “global review queues”; code lets Representative/Admin decide | `CLARIFICATION-NEEDED (Q-04)` |
| C-05 | `02`; `01_project_vision.md:25`; `docs/roles-and-required-hours.md:8` | Representative registers interns, assigns supervisors, and maintains company information; `02` does not define these capabilities | `CLARIFICATION-NEEDED (Q-05)` |
| C-06 | `docs/roles-and-required-hours.md:12-18`; `02`; `docs/product/decisions.md` | Required-hours onboarding/correction is an approved interpretation but has no `REQ-...` or `DEC-...` | `CLARIFICATION-NEEDED (Q-07)` |
| C-07 | `01_project_vision.md:49-50,91-95`; `02`; `06_ui_ux_specification.md` | AI-assisted writing, milestones, school announcements, internship calendar, and reminders are vision/guidance features with no core requirement | `CLARIFICATION-NEEDED (Q-08)` |
| C-08 | `02` `REQ-FR-REP-3/4`; `src/app/(authenticated)/reports/page.tsx`; `src/app/(authenticated)/dashboard/page.tsx` | Company reports/statistics vs individual intern reports and dashboard metrics | `CLARIFICATION-NEEDED (Q-09)` |
| C-09 | `02` `REQ-FR-EVL-2`; `prisma/schema.prisma:694-726` | Weekly evaluation scores vs one evaluation per type per assignment | `CLARIFICATION-NEEDED (Q-10)` |
| C-10 | `02` `REQ-FR-ATT-5`; `AGENTS.md:46`; attendance capture copy | Selfie during attendance verification vs no biometric identity matching or liveness claims | `CLARIFICATION-NEEDED (Q-11)` — audit must verify copy and behavior |
| C-11 | `02` `REQ-FR-DOC-3`; `src/lib/documents/authorization.ts`; `src/app/documents/actions.ts` | “Authorized users” is undefined; Supervisor is view-only; Representative/Admin review and auto-approve | `CLARIFICATION-NEEDED (Q-02)` |
| C-12 | `02`; `prisma/schema.prisma:85-211`; `06_ui_ux_specification.md:367-380` | Extra workflow states and approvals are not defined in `02` | `CLARIFICATION-NEEDED (Q-13)` |

### Test and evidence limitations

- Several existing tests are source-text assertions, not behavioral proofs. Examples: `scripts/test-role-alignment.ts:4-5` and `scripts/test-single-office-ui.ts:5`.
- Some tests currently assert the observed authority drift. `scripts/test-role-alignment.ts:4` treats Representative and Admin as operational reviewers; `scripts/test-single-office-ui.ts:5` asserts Representative attendance review. These tests are evidence of current behavior, not requirement correctness.
- `scripts/test-role-alignment.ts:5` is titled “Work Logs” but reads `src/lib/portfolio/authorization.ts`. Do not treat the test name as proof of work-log scoping.
- A passing test suite does not satisfy this audit. Every authorization finding must cite the route, server action, or guard that enforces it, and distinguish UI visibility from server-side enforcement.
- Record exact commands and results in the audit report. Record what was not run. Do not fabricate test results.

### Data and schema state

- The Branch migration is documented as **NOT APPLIED** in `docs/branch-restoration.md:14`. Code may reference Branch concepts that are not active in the connected database.
- The audit must distinguish **code-present** capabilities from **database-active** capabilities. Do not assume a Prisma model or route is operational.
- The schema contains extra states and constraints that are not described in `02_core_requirements.md`, including the unique evaluation constraint, document replacement/archive states, task submission/revision states, announcement scheduling/expiry states, and work-log revision/rejection states.
- No schema change, migration, seed, backfill, or operational-data write is authorized by this spec.

## In scope

1. **Route and surface inventory.** Inventory all routed surfaces under `src/app/**/page.tsx`, including public, auth, account, onboarding, authenticated, and admin routes. Inventory server actions and guards separately.
2. **Business capability inventory.** Map every material capability, dashboard block, navigation item, action, and workflow to `REQ-...`, `DEC-...`, or `CLARIFICATION-NEEDED`.
3. **Requirement traceability.** Produce a matrix containing exactly the 51 requirement IDs, each with status, evidence, gap/conflict, classification, and decision.
4. **Role audits.** Audit Intern, Company Supervisor, School Coordinator, Company Representative, and System Administrator separately. Admin is audited as technical/emergency, not as a business persona.
5. **Authorization audit.** Build a role-capability baseline from `02_core_requirements.md`, `DEC-2026-001`, `docs/roles-and-required-hours.md`, and `docs/product/role-matrix.md`. Compare every route, server action, and guard to it.
6. **Workflow and state audit.** Inventory major workflows and state machines; compare to the minimum behavior required by `02`; identify extra states, approvals, and dead ends.
7. **UX and information architecture audit.** Inventory desktop/mobile navigation, dashboards, duplicate workflows, terminology, and responsive behavior. Produce a conceptual per-role IA proposal; do not implement it.
8. **Conflict and clarification register.** Record every document-vs-document and document-vs-code conflict, plus every unresolved ambiguity, with a proposed decision or `CLARIFICATION-NEEDED`.
9. **Classification.** Classify each capability as `KEEP`, `SIMPLIFY`, `MERGE`, `REMOVE`, `DEFER`, or `CLARIFICATION NEEDED`, with rationale and requirement impact.
10. **Verification log.** Record static evidence, non-mutating test commands and results, and any login-only checks performed on a verified non-production environment. Record limitations honestly.
11. **Approval package.** Produce a concise report and a list of product decisions requiring human approval. Stop before implementation.

Public/auth/account surfaces are in scope for inventory and terminology, but are not classified as business capabilities unless they gate internship authority or data access.

## Out of scope

- Implementing any page, route, component, server action, guard, or style change.
- Redesigning navigation or information architecture. The IA proposal is a conceptual target, not an implementation authorization; no page, route, or component may be changed under this spec.
- Removing, merging, or simplifying features.
- Changing role authority, data scope, or approval rules.
- Adding, removing, or editing requirement IDs.
- Changing `prisma/schema.prisma`, creating migrations, applying migrations, seeding, backfilling, or writing operational data.
- Running `prisma migrate`, `prisma db push`, seed scripts, backfill scripts, or destructive data operations.
- Changing production configuration, deployment settings, environment files, or external services.
- Deploying, pushing, or modifying production.
- Restoring unrelated stashes or overwriting unrelated uncommitted work.
- Treating existing code or tests as proof of requirement correctness.
- A formal security penetration test, accessibility certification, or performance certification. This is an authorization and UX audit, not a certification.
- Fixing tests to match a proposed authority change before approval.

## Audit risks and controls

| Risk | Control |
|---|---|
| Treating current code as the requirement | Require `REQ-...`/`DEC-...` mapping for every `KEEP`; label code as evidence only |
| Ratifying existing authority drift | Build the authorization baseline from requirements/decisions before comparing code; record every drift item |
| False assurance from source-grep tests | Require route/action/guard evidence; treat test names as non-evidence; record exact commands |
| Confusing code-present features with database-active features | Record migration status; distinguish code-present vs database-active; no migration execution |
| Removing unsupported features without a decision | `REMOVE` requires no requirement support, a dependency check, and human approval |
| Silently reconciling conflicting documents | Maintain the conflict register; do not resolve without a product decision |
| Scope creep into redesign | The IA proposal is conceptual; no page/route/component changes are authorized |

## User scenarios

| ID | Role | Scenario | Source | What the audit must prove |
|---|---|---|---|---|
| S-01 | Intern | Sign in, view dashboard/profile, capture attendance, submit work logs, view tasks/evaluations, upload documents, view announcements, view/export portfolio, view reports | `REQ-FR-URM-3/5/6`, `PRO-*`, `ATT-1..6`, `DWL-1..3`, `TSK-2`, `EVL-5`, `AI-4`, `DOC-1/2`, `ANN-2` | Self-service works; other interns' records and review/admin functions are denied server-side |
| S-02 | Company Supervisor | Review assigned attendance/corrections, review assigned work logs, assign/monitor tasks, evaluate assigned interns, and view supervisor reports. Workmate-feedback authorship/collection remains `Q-01`. | `REQ-FR-ATT-7/8`, `DWL-4`, `TSK-1/3`, `EVL-1`, `REP-1`; `CLARIFICATION-NEEDED (Q-01)` | Every approved action is limited to assigned interns; no company-wide or school-wide access; feedback behavior is not assumed before Q-01 is resolved |
| S-03 | School Coordinator | Monitor school-scoped students, attendance/hours, evaluations, and reports | `REQ-FR-REP-2`; `docs/roles-and-required-hours.md:7`; `CLARIFICATION-NEEDED (Q-03)` | Read-only school scope; no approval or management authority; access beyond monitoring is a recorded decision point |
| S-04 | Company Representative | Publish company announcements and access company internship reports. Existing user/school/assignment/branch/office-management surfaces are audited under `Q-05`; attendance/work-log review remains `Q-04`. | `REQ-FR-ANN-1`, `REQ-FR-REP-3`; `CLARIFICATION-NEEDED (Q-04, Q-05, Q-09)` | Company scope is enforced; review authority and broader operational scope are explicitly decided, not inferred |
| S-05 | System Administrator | Bootstrap, recover, and maintain technical accounts/configuration | `DEC-2026-001` | Admin remains a technical/emergency role; any observed routine business access is authority drift unless a new approved decision grants it |
| S-06 | Cross-role | Attempt a forbidden route/action or view another role's data | `REQ-FR-URM-6`; `AGENTS.md:42` | Server-side denial is demonstrated or statically proven; navigation visibility alone is not sufficient |

## Functional acceptance criteria

| ID | Criterion | Verification |
|---|---|---|
| AC-F-01 | The traceability matrix contains exactly the 51 IDs listed above, with no duplicates, omissions, or new IDs. | Compare the matrix against `02_core_requirements.md`; record the count and diff. |
| AC-F-02 | Every routed surface, server action, dashboard block, and major workflow is inventoried and assigned to a role or marked shared/technical. | Inspect `src/app/**/page.tsx`, route actions, and guards; cite paths. |
| AC-F-03 | Every material capability has exactly one traceability mapping: `REQ-...`, `DEC-...`, or `CLARIFICATION-NEEDED (Q-...)`. | Row-by-row matrix check; no blank or “reviewed” rows. |
| AC-F-04 | Every requirement ID has exactly one status from the status vocabulary and at least one evidence citation unless `Unverifiable`. | Matrix validation; `Unverifiable` must state why evidence was unavailable. |
| AC-F-05 | The preliminary gaps in `EVL-2`, `EVL-4`, `AI-2`, `ANN-3`, `REP-3`, `REP-4`, and `DOC-3` are verified and recorded. | Inspect schema, routes, actions, and services; record confirmed status. |
| AC-F-06 | Every source conflict, including document-vs-document, is in the conflict register with a proposed decision or `CLARIFICATION-NEEDED`. | Compare the register against the sources; no silent reconciliation. |
| AC-F-07 | Every unsupported or undocumented capability is classified, and every `REMOVE` has a data/operational dependency check and a requirement-impact statement. | Classification table; dependency check; approval request. |
| AC-F-08 | A conceptual per-role IA proposal exists for Intern, Supervisor, Coordinator, Representative, and technical Admin, with every nav item mapped to a requirement/decision or marked `CLARIFICATION-NEEDED`. | IA table; no implementation. |
| AC-F-09 | Terminology inconsistencies are recorded, including stale five-role, “School Administrator,” “Company Admin,” role-switch, and desktop-first guidance. | Terminology inventory with source citations. |
| AC-F-10 | The audit report contains an evidence log with file/line citations and exact non-mutating test commands/results; no test result is fabricated. | Review evidence log; record what was not run. |
| AC-F-11 | The audit is read-only: no `src/`, `prisma/`, `scripts/`, configuration, or deployment files are changed; no migrations, seeds, backfills, or writes are run. | `git diff`/status; no migration commands; no operational writes. |
| AC-F-12 | Normal attendance remains automatically approved, and work logs are not treated as an hours source. | Verify attendance status/review logic and hours calculations; cite evidence. |
| AC-F-13 | A decision package lists every proposed `DEC-...`, each open `Q-...`, and every approval required before implementation. | Review package; no implementation until approved. |
| AC-F-14 | The non-REQ capability traceability table exists and every row has either an approved `DEC-...` or a `CLARIFICATION-NEEDED (Q-...)`; no non-REQ capability is marked `KEEP` without a decision. | Non-REQ table review. |
| AC-F-15 | The 51-row matrix uses the required columns: REQ ID, summary, roles, evidence, status, gap/conflict, proposed classification, decision. | Matrix validation. |

## Authorization acceptance criteria

| ID | Criterion | Verification |
|---|---|---|
| AC-A-01 | A role-capability baseline exists from `02_core_requirements.md`, `DEC-2026-001`, `docs/roles-and-required-hours.md`, and `docs/product/role-matrix.md`. | Baseline matrix with sources. |
| AC-A-02 | Every role-capability pair is classified `Allowed`, `Forbidden`, `Emergency-only`, or `CLARIFICATION-NEEDED`. | Matrix completeness check. |
| AC-A-03 | Every route, server action, and guard is compared to the baseline, with the enforcing file/line cited. | Route/action/guard inventory; citations. |
| AC-A-04 | UI visibility is distinguished from server-side enforcement; no navigation-only evidence is accepted as authorization proof. | Findings must cite server-side checks or record absence. |
| AC-A-05 | The observed drift candidates — attendance review, attendance corrections, work-log review/view, announcement publishing, portfolio/report viewing, task/evaluation reading, document upload/approval, and Admin business access — are verified. | Compare each candidate to the baseline and record status. |
| AC-A-06 | Admin access is classified as technical/emergency unless a `REQ-...` or `DEC-...` explicitly grants routine business access. | Admin row-by-row review against `DEC-2026-001`. |
| AC-A-07 | Data-scope rules are verified: Intern self; Supervisor assigned interns; Coordinator school-scoped; Representative company-scoped; Admin emergency/technical. | Query/guard inspection; no writes. |
| AC-A-08 | Tests that assert current drift are identified as evidence of current behavior, not requirement correctness. | Test review; cite `scripts/test-role-alignment.ts:4-5` and `scripts/test-single-office-ui.ts:5`. |
| AC-A-09 | No authority change is implemented. Every proposed change is presented for human approval. | No source changes; decision package. |
| AC-A-10 | No credentials, tokens, signed URLs, private storage paths, or unnecessary PII appear in audit artifacts. | Artifact review; redact where needed. |
| AC-A-11 | The authorization baseline matrix classifies every role-capability pair, and all pre-seeded drift items are verified against it. | Matrix completeness check; known-drift table review. |

## UX acceptance criteria

| ID | Criterion | Verification |
|---|---|---|
| AC-U-01 | Every navigation item, page, and dashboard block has a requirement/decision mapping or `CLARIFICATION-NEEDED`; no orphan link exists. | Nav and page inventory. |
| AC-U-02 | Each role has a conceptual primary/secondary/mobile navigation proposal; navigation depth and duplicate items are documented. | IA proposal; no implementation. |
| AC-U-03 | Duplicate workflows and screens are identified with a `MERGE`/`SIMPLIFY` proposal and requirement impact. | Duplicate inventory. |
| AC-U-04 | Mobile and desktop differences are documented; responsive checks at 390, 768, 1024, and 1440 are performed where feasible, or the limitation is recorded. | Verification log; screenshots optional and must not contain secrets. |
| AC-U-05 | Dashboard metrics and blocks are traceable to real records; decorative, fabricated, or unsupported metrics are flagged. | Dashboard inventory; data-source citations. |
| AC-U-06 | Terminology matches the four business roles plus technical Admin; stale guidance is flagged rather than copied. | Terminology inventory. |
| AC-U-07 | AI output is grounded and labeled; no identity recognition, biometric matching, or liveness claim is presented; notifications, approvals, and verification states are not fabricated. | Copy/UX review; AI evidence review; `AGENTS.md` non-negotiables. |
| AC-U-08 | Accessibility and responsive issues are recorded, not fixed. | Findings list; no source changes. |

## Safety and truthfulness acceptance criteria

| ID | Criterion | Verification |
|---|---|---|
| AC-S-01 | No public signup is introduced or endorsed; access remains provisioned. | Auth/account review; `docs/architecture/auth.md:10`. |
| AC-S-02 | Normal attendance is auto-approved; only exceptions/corrections enter review. | Attendance logic and review page evidence. |
| AC-S-03 | Work logs remain internship journals and are not used as a second attendance/hours source. | Hours calculation review. |
| AC-S-04 | No facial identity recognition, biometric identity matching, or liveness claim is introduced or endorsed. | UI copy, capture flow, and AI review. |
| AC-S-05 | AI output is grounded in cited records, labeled as assistance, and not presented as verified fact. | AI feature/route review; source citations. |
| AC-S-06 | Metrics, notifications, approvals, and verification states are real and traceable; no decorative operational data is added. | Dashboard/notification/service review. |
| AC-S-07 | Audit artifacts contain no credentials, tokens, signed URLs, private storage paths, or unnecessary PII. | Artifact review. |

## Data / migration impact

**None.** This audit is read-only.

- No schema change, migration, seed, backfill, or operational-data write is authorized.
- Do not run `prisma migrate`, `prisma db push`, seed scripts, or backfill scripts.
- The Branch migration is documented as **NOT APPLIED** in `docs/branch-restoration.md:14`. Record which capabilities are code-present but not database-active, and read `docs/branch-pre-migration-compatibility.md` before interpreting Branch-dependent code.
- If a read-only database check is used, verify the environment is non-production and record it. Do not mutate data.
- Any proposed removal must include a data-dependency check covering models, foreign keys, historical records, and operational workflows.
- No production configuration, deployment, or external service may be changed.

## Clarifications needed

Items marked **Open** are `CLARIFICATION-NEEDED` until a human product decision is recorded. `Q-06` and `Q-12` are already resolved by the approved source precedence and `DEC-2026-001`; their rows remain in this register so the audit can verify current implementation drift against those resolved baselines.

| ID | Question | Sources | Proposed handling (not approved) | Status |
|---|---|---|---|---|
| Q-01 | Does `REQ-FR-EVL-4` require peer/workmate authorship, or may a supervisor collect and record workmate feedback? Does `REQ-FR-AI-2` require peer-authored feedback? | `02` `EVL-4`, `AI-2`; `01_project_vision.md:63-66`; `07_database_design.md:3780-3790`; `src/app/(authenticated)/feedback/new/page.tsx` | Define a single feedback model. If peers author, add an approved product decision and authorization rules; if supervisor-collected, document that interpretation and verify `AI-2`. | Open |
| Q-02 | Who are the “authorized users” who may review documents under `REQ-FR-DOC-3`? | `02` `DOC-3`; `src/lib/documents/authorization.ts`; `src/app/documents/actions.ts` | Decide whether Supervisor reviews assigned documents, Representative reviews company operations, Coordinator is read-only, and Admin is emergency-only. Remove auto-approval unless approved. | Open |
| Q-03 | Does the School Coordinator have read access to tasks, evaluations, feedback, portfolios, and announcements, or only attendance/hours/reports? | `02` `REQ-FR-URM-4`, `REP-2`; `docs/roles-and-required-hours.md:7`; `docs/product/role-matrix.md:10-19`; `05_design_system.md:622-643` | Keep school-scoped read-only monitoring; explicitly decide each module. Do not grant approval or company management authority by convenience. | Open |
| Q-04 | Does the Company Representative approve attendance/work logs, or only view operational queues? | `02` `ATT-7/8`, `DWL-4`; `docs/roles-and-required-hours.md:8`; `src/lib/attendance/authorization.ts`; `src/lib/work-logs/authorization.ts` | Prefer core requirements: Supervisor decides; Representative gets visibility unless a decision grants review authority. Record the decision and tests. | Open |
| Q-05 | Which operational capabilities belong to the Representative: register interns, assign supervisors, maintain company information, manage branches/office settings? | `01_project_vision.md:25`; `docs/roles-and-required-hours.md:8`; `02`; `src/app/admin/*`; `docs/branch-restoration.md:14` | Define the Representative’s company-operations scope explicitly. Distinguish required business operations from technical/admin support. | Open |
| Q-06 | What routine business access should the System Administrator have beyond bootstrap, recovery, and technical maintenance? | `DEC-2026-001`; `src/lib/auth/roles.ts:12-13`; `src/components/app-shell.tsx:27`; review/publish paths | **Resolved baseline:** none. `DEC-2026-001` keeps Admin technical/emergency. Any additional routine business authority requires a new approved `DEC-...`. Continue auditing current Admin drift against this baseline. | Resolved by `DEC-2026-001` |
| Q-07 | Is required-hours onboarding/correction an approved product behavior? | `docs/roles-and-required-hours.md:12-18`; `02`; `docs/product/decisions.md`; `src/app/onboarding/internship-hours/page.tsx` | Formalize as a `DEC-...` or defer. The roles doc is the current interpretation but is not a `DEC-...`. | Open |
| Q-08 | Are internship calendar, school announcements, internship reminders, milestones, and AI drafting in evaluations/reports/portfolio in scope? | `01_project_vision.md:49-50,91-95`; `02`; `06_ui_ux_specification.md`; `src/app/(authenticated)/calendar/*`; AI assistant routes | Mark `DEFER` unless a `DEC-...` promotes them. Do not remove or implement solely because code or guidance mentions them. | Open |
| Q-09 | What exactly must `REQ-FR-REP-3` company reports and `REQ-FR-REP-4` statistics/summaries contain? | `02` `REP-3/4`; `src/app/(authenticated)/reports/page.tsx`; `src/app/(authenticated)/dashboard/page.tsx` | Define company aggregate report contents and statistics sources. Distinguish from individual intern reports and dashboard metrics. | Open |
| Q-10 | How should `REQ-FR-EVL-2` weekly evaluation scores be represented: multiple `PROGRESS` evaluations, weekly rows, or another model? | `02` `EVL-2`; `prisma/schema.prisma:694-726`; `src/lib/evaluations/*` | Choose a model that supports weekly scores without losing evaluation history. A schema change requires separate approval. | Open |
| Q-11 | Does the attendance selfie UI/behavior claim identity verification, biometric matching, or liveness? | `02` `ATT-5`; `AGENTS.md:46`; `src/app/attendance/evidence-capture.tsx` | Keep selfie as attendance evidence only. Remove or reword identity/liveness claims; verify copy during the audit. | Open |
| Q-12 | Which role model and navigation guidance is authoritative: four business roles + technical Admin, or the five-role/role-switch/desktop-first guidance? | `02` `URM-4`; `DEC-2026-001`; `06_ui_ux_specification.md:32,40-48,109`; `05_design_system.md:622-643` | **Resolved by source precedence:** `02` + `DEC-2026-001` are authoritative. Flag conflicting `05`/`06` guidance as stale; do not implement role switching or a fifth business persona. | Resolved by precedence + `DEC-2026-001` |
| Q-13 | Which workflow states and approvals are required, and which are unnecessary complexity? | `02`; `prisma/schema.prisma:85-211`; `06_ui_ux_specification.md:367-380` | Keep only states needed to satisfy approved requirements. Classify extra states as `SIMPLIFY`/`REMOVE` candidates requiring approval and dependency checks. | Open |

## Required audit artifacts and stop condition

The audit must produce:

- `specs/001-intellitrack-realignment/report.md` containing:
  - inventory of routes, navigation, dashboards, actions, guards, and workflows;
  - the 51-row traceability matrix;
  - role-by-role authorization findings;
  - conflict and clarification registers;
  - classification and IA proposal;
  - decision package;
  - verification log and limitations.
- an evidence log with file/line citations and exact non-mutating commands/results;
- a list of proposed `DEC-...` entries, if needed; and
- a clear statement of remaining gaps.

**Stop condition:** Stop before implementation. Do not change application code, schema, migrations, scripts, configuration, environment files, or deployment files. Do not implement the IA proposal. Do not remove features. Do not change role authority. Request human approval for the audit results and decisions.

## Approval gate

This spec authorizes **audit work only**. It does not authorize implementation, redesign, removal, or database changes.

Human approval is required before:

- accepting the audit scope and acceptance criteria in this spec;
- resolving any **open** `Q-...` item or approving a proposed `DEC-...`;
- adding, removing, or changing a requirement;
- changing a role’s authority or data scope;
- removing a workflow required by `02_core_requirements.md`;
- merging or removing a capability in a way that affects required behavior;
- changing the database schema or applying a migration;
- introducing a new external service;
- changing production configuration;
- deploying or pushing;
- implementing the proposed information architecture or any page/route/component change; and
- creating a separate `specs/002-...` implementation spec.

Approval record:

| Item | Decision | Approver | Date | Status |
|---|---|---|---|---|
| Audit scope and acceptance criteria |  |  |  | Pending |
| Conflict register |  |  |  | Pending |
| `Q-01` through `Q-13` |  |  |  | Pending |
| Proposed `DEC-...` entries |  |  |  | Pending |
| Classification and IA proposal |  |  |  | Pending |
| Authorization changes (if any) |  |  |  | Pending |
| Schema/migration changes (if any) |  |  |  | Pending |
| Implementation spec authorization |  |  |  | Pending |

No implementation is authorized until the human approves the audit package and a separate `specs/002-...` implementation spec is created from the approved decisions. Keep `001-intellitrack-realignment` as the closed audit record; do not silently turn it into an implementation authorization.
