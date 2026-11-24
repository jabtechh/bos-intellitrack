# IntelliTrack Product and UX Realignment — Audit Report

**Spec:** `001-intellitrack-realignment`  
**Audit baseline:** 2026-11-03 19:06 MPST  
**Baseline commit:** `fe68e11ee388da803f246f0fc319f0bc0a0267f1`  
**Execution scope:** T000–T022 only  
**Implementation authorized:** No

## Executive summary

IntelliTrack contains the required foundation for most of the approved capstone scope, but the current product experience mixes four different layers in one navigation model:

1. core requirements from `02_core_requirements.md`;
2. later vision/design features that are not core requirements;
3. company-operations and technical administration tooling;
4. implementation-era workflow states and review queues that exceed the minimum requirement.

That mixture explains the current feeling of clutter more than visual styling alone.

The repository currently exposes **77 routed pages** and **23 action/route-handler files**. Desktop navigation exposes 13 Intern items, 13 Supervisor items, 10 Coordinator items, and 14 Representative/Admin items before contextual additions. Mobile is already substantially better because it promotes three role-specific destinations plus **More** (`src/components/mobile-navigation.tsx:9-19`).

The audit found three categories of product risk:

- **Requirement gaps:** emergency-contact management, weekly evaluation scoring, real workmate feedback, announcement notification delivery, company aggregate reporting/statistics, and parts of AI portfolio generation/export.
- **Authorization drift:** Representative/Admin attendance and Work Log review authority; Coordinator/Representative Task/Evaluation visibility; Admin announcement publishing/company operations; document review ownership; broad Portfolio/Report visibility.
- **Scope clutter:** calendar/holidays, broad company operations, school announcements, AI drafting on several non-core surfaces, extra workflow states, and business-module access for technical Admin.

No application code, schema, migration, script, environment, deployment setting, or production data was changed by this audit.

---

## 1. Baseline and environment

### Repository baseline

- HEAD: `fe68e11ee388da803f246f0fc319f0bc0a0267f1`
- Working tree was already dirty before this audit.
- Pre-existing unrelated changes included `.env.example`, `.gitignore`, `.vercelignore`, `next-env.d.ts`, `package.json`, agent/spec files, and evaluation-account setup work.
- Audit artifacts begin from the approval point in this conversation; pre-audit database/account setup is not treated as an audit write.

### Environment classification

| Layer | Classification | Audit treatment |
|---|---|---|
| Runtime | Local checkout | Static/source verification allowed |
| Supabase Auth | Production-backed project | No interactive evaluation-account testing |
| PostgreSQL | Production-backed project | No database-backed audit queries or writes |
| Branch schema | Documented migration exists but is **NOT APPLIED** | Code-present Branch capability is not assumed database-active |

Evidence: `docs/branch-restoration.md:13-16`.

Because Auth/database are Production-backed, the five evaluation accounts were **not used interactively**.

---

## 2. Verification log

### Non-mutating checks that passed

The following commands completed successfully before the first failing suite:

- `npm run typecheck`
- `npm run lint`
- `npm run navigation:test`
- `npm run roles:test`
- `npm run dashboard:test`
- `npm run attendance:test` — 39/39
- `npm run correction:test` — 28/28
- `npm run work-log:test` — 15/15
- `npm run task:test` — 30/30
- `npm run evaluation:test` — 27/27
- `npm run document:test` — 26/26
- `npm run portfolio:test` — 17/17
- `npm run announcement:test` — 77/77
- `npm run insights:test`
- `npm run profile:test`

Additional checks run after the first failure:

- `npm run intern-mobile:test` — 9/9
- `npm run ai:test` — 13/13

### Non-mutating checks with failures

1. **`npm run calendar:test`** failed because a source assertion expects `DashboardCalendar` to appear in the current dashboard source. The current dashboard no longer contains that integration. This is evidence of calendar/test drift, not authorization to restore the widget.
2. **`npm run notification:test`** passed 24/25 and failed one brittle source-regex assertion around the Intern mobile primary navigation string. The actual mobile configuration still contains `/dashboard`, `/attendance`, `/work-logs`, and More (`src/components/mobile-navigation.tsx:9-19`). This is test drift, not evidence that the mobile navigation is functionally absent.

Existing tests that encode Representative/Admin authority are treated as **current-behavior evidence**, not requirement correctness.

### Not verified

- Authenticated visual/E2E testing with evaluation accounts: blocked because the configured environment is Production-backed.
- Production database schema/table state: not queried.
- Notification table activation: migration exists, but activation in the connected Production database was not queried.
- Full live visual rendering at 390/768/1024/1440: not re-run during this audit. Static responsive code/tests were inspected; the limitation remains explicit.

---

## 3. Route and navigation inventory

### Routed surfaces

The 77 page routes fall into these families:

- public/auth/account: landing, login, inactive/not-provisioned/set-password/welcome;
- onboarding: onboarding and required-hours confirmation;
- dashboard;
- attendance: capture, history, detail, calendar, corrections, correction review, attendance review;
- Work Logs;
- Tasks and Task review;
- Evaluations and Evaluation review;
- Feedback;
- Insights;
- Documents and document management;
- Announcements and announcement management;
- Calendar/events/holidays;
- Portfolio;
- Reports/PDF;
- Profile;
- Notifications;
- More;
- admin/company operations: users, assignments, schools, companies, branches, office settings.

### Desktop navigation

Evidence: `src/components/app-shell.tsx:17-31`.

| Role | Current top-level items | Main issue |
|---|---:|---|
| Intern | 13 (+ onboarding when incomplete) | Calendar, Feedback, Insights, Portfolio, Reports, etc. are all peers of daily Attendance/Work Logs |
| Supervisor | 13 | Work Logs, Task review, Evaluations, Feedback, Insights, Documents, Portfolios, Announcements, Reports all compete at the same level |
| Coordinator | 10 | Tasks, Feedback, Insights, Portfolio are exposed despite unclear core requirement authority |
| Representative | 14 | Review queues and company operations are mixed with reporting/communications |
| Admin | 14 via operations nav, plus admin-specific 14-item sub-navigation | Technical Admin is exposed to ordinary business workflows |

A major authorization/product issue is explicit at `src/components/app-shell.tsx:31`: Representative **and Admin** receive the same `operationsNav` family.

### Mobile navigation

Evidence: `src/components/mobile-navigation.tsx:9-19`.

Mobile already uses a better pattern:

- Intern: Home / Attendance / Work Logs / More
- Supervisor: Home / Interns / Reviews / More
- Coordinator: Home / Students / Reports / More
- Representative: Home / Interns / Operations / More
- Admin: Home / Users / System / More

This pattern is a strong baseline for desktop simplification.

---

## 4. Authorization audit

### Baseline

- Intern: own data/actions.
- Supervisor: directly assigned Interns.
- Coordinator: school-scoped, read-only monitoring.
- Representative: explicit company business responsibilities; unresolved broader operations are Q-05.
- Admin: technical/bootstrap/emergency only under `DEC-2026-001`.

### Verified drift

| Capability | Required/approved baseline | Current behavior | Finding |
|---|---|---|---|
| Attendance review/corrections | Supervisor | Supervisor, Representative, Admin; Admin unscoped | **DRIFT** |
| Work Log read scope | Supervisor direct Interns; Coordinator/Rep scope requires justification | Work Log list/detail reuse broad Portfolio scope | **SCOPE DRIFT / CLARIFY** |
| Dedicated Work Log reviewer guard | Core requires Supervisor review | Unused guard grants Supervisor, Representative, Admin | **DEAD/DRIFTING AUTH CODE** |
| Tasks | Intern + Supervisor core | Coordinator school read, Representative company read, Admin all | **CLARIFY / DRIFT** |
| Evaluations | Intern + Supervisor core; Coordinator monitoring partly supported by vision | Coordinator/Representative/Admin read | **CLARIFY / ADMIN DRIFT** |
| Feedback | Workmate feedback required | Authoring is Supervisor-only | **REQUIREMENT MISMATCH** |
| Documents | Intern upload; “authorized users” review | Representative/Admin manage; Supervisor view-only; manager uploads auto-approve | **AMBIGUOUS + ADMIN DRIFT** |
| Announcements | Representative publishes | Representative + Admin publish | **ADMIN DRIFT** |
| Portfolio/Reports | Intern portfolio; role-specific reports | all roles use Portfolio viewer scope | **BROADER THAN CORE / CLARIFY** |
| Company operations | Representative scope unresolved; Admin technical | Representative + Admin share operations guard | **ADMIN DRIFT; Q-05** |

Key evidence:

- attendance reviewer: `src/lib/attendance/authorization.ts:6-17`;
- Work Log reviewer: `src/lib/work-logs/authorization.ts:6-17`; no application caller was found;
- Task viewer: `src/lib/tasks/authorization.ts:5-7`;
- Evaluation/Feedback viewer: `src/lib/evaluations/authorization.ts:6-10`;
- document manager: `src/lib/documents/authorization.ts:2-4`;
- announcement manager: `src/lib/announcements/authorization.ts:75-82`;
- Admin/Representative operations helper: `src/lib/auth/roles.ts:11-13`, `src/lib/auth/require-company-operations-manager.ts:7-15`.

### Important Work Log interpretation

`REQ-FR-DWL-4` says Supervisors must be able to **review submitted Work Logs**. It does **not** explicitly require an approve/reject state machine.

Current Work Logs intentionally use Draft → Submitted only, and Supervisor-scoped read-only visibility exists. `scripts/test-work-log-foundation.ts:5-15` explicitly verifies that review transitions/routes were removed while staff visibility remains scoped.

**Audit conclusion:** keep the simplified journal model. “Review” can be satisfied as authorized read-only review unless the capstone panel/source material explicitly requires approval. Do not restore Approve/Reject merely because legacy schema fields exist.

---

## 5. 51-requirement traceability matrix

Status vocabulary: **Satisfied / Partial / Missing / Contradicted / Ambiguous / Unverifiable**.

| REQ ID | Summary | Required role(s) | Current evidence | Status | Gap/conflict | Classification / decision |
|---|---|---|---|---|---|---|
| REQ-FR-URM-1 | Secure login | All | `src/app/(auth)/login/actions.ts:22-38` | Satisfied | Supabase password auth present | KEEP |
| REQ-FR-URM-2 | Logout | All | `src/app/(auth)/actions.ts:7-10` | Satisfied | — | KEEP |
| REQ-FR-URM-3 | Authenticated-only access | All | `src/lib/auth/require-current-user.ts:7-19` | Satisfied | — | KEEP |
| REQ-FR-URM-4 | Four business roles | Four business roles | four roles exist; Admin also exists under DEC-2026-001 | Partial | Login/shell still expose Admin alongside normal personas | SIMPLIFY |
| REQ-FR-URM-5 | Role-based feature access | All | role guards/nav exist | Contradicted | several guards are broader than approved baseline | SIMPLIFY + authority decisions |
| REQ-FR-URM-6 | Prevent unauthorized modules/info | All | server guards present | Contradicted | Admin/Representative/Coordinator drift remains | SIMPLIFY + authority decisions |
| REQ-FR-PRO-1 | Intern maintains profile | Intern | `profile/edit`, `src/app/profile/actions.ts` | Satisfied | — | KEEP |
| REQ-FR-PRO-2 | Internship details | Intern | `src/components/profile-view.tsx:41-46` | Partial | no explicit Intern department; company/status presentation is fragmented | SIMPLIFY |
| REQ-FR-PRO-3 | Attendance summaries | Intern | profile hours, dashboard weekly attendance, Attendance history | Satisfied | duplicated across surfaces | MERGE/SIMPLIFY presentation |
| REQ-FR-PRO-4 | Performance summaries | Intern | latest finalized Evaluation at `profile-view.tsx:46` | Satisfied | — | KEEP |
| REQ-FR-PRO-5 | Document submission status | Intern | Documents status badges + onboarding checklist | Satisfied | duplicated status surfaces | MERGE/SIMPLIFY |
| REQ-FR-PRO-6 | Manage emergency contact | Intern | schema fields exist; only read by onboarding data | Missing | no Intern UI/action found to edit emergency contact fields | IMPLEMENT in later spec |
| REQ-FR-PRO-7 | Display technical/soft skills | Intern | `profile-view.tsx:17,45`; insights recorded skills | Satisfied | skills are explicit user evidence, not inferred labels | KEEP |
| REQ-FR-ATT-1 | Time In/Time Out | Intern | `src/app/attendance/actions.ts` | Satisfied | — | KEEP |
| REQ-FR-ATT-2 | Timestamps | Intern | Attendance actions/schema | Satisfied | — | KEEP |
| REQ-FR-ATT-3 | GPS coordinates | Intern | Attendance actions store coordinates | Satisfied | — | KEEP |
| REQ-FR-ATT-4 | Geofencing | Intern | attendance domain + assignment location | Satisfied | Branch DB migration remains unapplied; fallback exists | KEEP compatibility |
| REQ-FR-ATT-5 | Selfie capture | Intern | evidence capture + Attendance actions | Satisfied | no identity/liveness claim should be made | KEEP |
| REQ-FR-ATT-6 | Attendance history | Intern | `/attendance/history` | Satisfied | — | KEEP |
| REQ-FR-ATT-7 | Supervisor verifies attendance | Supervisor | reviewer flow exists | Contradicted | Representative/Admin also review | KEEP feature; tighten authority |
| REQ-FR-ATT-8 | Supervisor approves corrections | Supervisor | correction review exists | Contradicted | same over-broad reviewer authority | KEEP feature; tighten authority |
| REQ-FR-ATT-9 | Attendance analytics/summaries | Scoped users | dashboard/history/insights | Satisfied | repeated cards/summary views | SIMPLIFY |
| REQ-FR-DWL-1 | Submit daily Work Logs | Intern | `src/app/work-logs/actions.ts` | Satisfied | — | KEEP |
| REQ-FR-DWL-2 | Attach evidence | Intern | Work Log attachment storage/action | Satisfied | — | KEEP |
| REQ-FR-DWL-3 | Work Log history | Intern | `/work-logs` journal history | Satisfied | — | KEEP |
| REQ-FR-DWL-4 | Supervisor reviews submitted Work Logs | Supervisor | Supervisor-scoped read access; test confirms read-only journal | Satisfied | “review” is read-only; no approval requirement in 02 | KEEP simplified journal |
| REQ-FR-TSK-1 | Supervisor assigns tasks | Supervisor | `src/app/tasks/actions.ts:13` | Satisfied | extra submission/revision states exceed requirement | KEEP / SIMPLIFY states |
| REQ-FR-TSK-2 | Intern views tasks | Intern | `requireTaskViewer`, Tasks UI | Satisfied | — | KEEP |
| REQ-FR-TSK-3 | Supervisor monitors completion | Supervisor | review/transition/progress flows | Satisfied | approval/revision may be more than required | SIMPLIFY if panel does not require approval |
| REQ-FR-EVL-1 | Supervisor evaluates Intern | Supervisor | `src/app/evaluations/actions.ts:6-9` | Satisfied | — | KEEP |
| REQ-FR-EVL-2 | Weekly evaluation scores | Supervisor | EvaluationType INITIAL/MIDTERM/PROGRESS/FINAL; unique assignment+type | Contradicted | only one PROGRESS row per assignment; not recurring weekly scoring | REDESIGN later |
| REQ-FR-EVL-3 | Overall performance summaries | Intern/staff | profile latest score, insights/evaluation summaries | Satisfied | — | KEEP |
| REQ-FR-EVL-4 | Collect workmate feedback | Workmates/Intern ecosystem | current feedback creation is Supervisor-only | Missing | no peer/workmate authorship model | Q-01 decision required |
| REQ-FR-EVL-5 | Intern views completed evaluations | Intern | finalized scope in Evaluation authorization | Satisfied | — | KEEP |
| REQ-FR-AI-1 | Generate portfolio from verified records | Intern | user-written Portfolio + verified report + AI reflection draft | Partial | no full generated portfolio assembled from verified records | SIMPLIFY/REWORK |
| REQ-FR-AI-2 | Use workmate feedback in portfolio | Intern | AI evidence can include feedback | Missing | genuine workmate feedback is absent, so required input is unavailable | depends on EVL-4 |
| REQ-FR-AI-3 | Use performance info in portfolio | Intern | `src/lib/ai/evidence.ts:4` includes finalized Evaluations | Satisfied | applies to AI drafts/report evidence | KEEP |
| REQ-FR-AI-4 | View/export generated portfolio | Intern | Portfolio view exists; PDF export is an internship report | Partial | portfolio itself is not the generated/exported PDF artifact | REWORK export semantics |
| REQ-FR-AI-5 | Identify technical/soft skills | Intern | recorded Work Log/Portfolio skills + Insights | Satisfied | currently evidence-based, not speculative AI | KEEP |
| REQ-FR-AI-6 | Productivity insights | Intern | factual Attendance/Task/Work Log Insights | Satisfied | deterministic analytics satisfy behavior without invented AI | KEEP / simplify presentation |
| REQ-FR-AI-7 | Skill progress throughout internship | Intern | current skills list exists | Partial | no clear time-based skill-growth/progress representation | SIMPLIFY/ADD minimal progression |
| REQ-FR-DOC-1 | Upload internship documents | Intern | `src/app/documents/actions.ts:4` | Satisfied | managers can also upload, which is extra | KEEP |
| REQ-FR-DOC-2 | Display document status | Intern | Documents list/detail/onboarding | Satisfied | — | KEEP |
| REQ-FR-DOC-3 | Authorized users review documents | Authorized staff | manager review exists | Ambiguous | “authorized users” undefined; current Representative/Admin manager model conflicts with technical Admin baseline | Q-02 decision required |
| REQ-FR-ANN-1 | Representative publishes announcements | Representative | `src/app/announcements/actions.ts:97-118` | Satisfied | Admin can also publish; authority drift | KEEP + tighten Admin |
| REQ-FR-ANN-2 | Intern views announcements | Intern | announcement reader scope | Satisfied | — | KEEP |
| REQ-FR-ANN-3 | Notify on new announcements | Recipients | notification type/service exist | Missing | publish action never calls `createNotification` | IMPLEMENT later |
| REQ-FR-REP-1 | Supervisor internship reports | Supervisor | `/reports` uses Supervisor assignment scope | Satisfied | report viewer shared with Portfolio scope | KEEP |
| REQ-FR-REP-2 | Coordinator internship reports | Coordinator | school-scoped report list | Satisfied | — | KEEP |
| REQ-FR-REP-3 | Company reports for Representative | Representative | company-scoped list of individual Intern reports | Partial | no explicit company aggregate report | DEFINE Q-09 |
| REQ-FR-REP-4 | Internship statistics/summaries | Scoped roles | dashboard/insight metrics | Partial | statistics are fragmented; no canonical report summary | DEFINE Q-09 |

### Requirement-gap summary

**Missing:** PRO-6, EVL-4, AI-2, ANN-3.  
**Contradicted:** URM-5/6, ATT-7/8, EVL-2.  
**Partial:** URM-4, PRO-2, AI-1, AI-4, AI-7, REP-3/4.  
**Ambiguous:** DOC-3.

---

## 6. Workflow/state audit

### Attendance

**KEEP.** This is one of the strongest modules.

- normal valid evidence auto-approves;
- late/early classification is separate from exception review;
- exceptions become `PENDING_REVIEW`;
- approved Attendance is the only credited-hours source.

Evidence: `src/lib/attendance/domain.ts:65-75`, `src/lib/internship-progress/domain.ts:4-11`.

Main correction needed later: reviewer authority, not the core attendance workflow.

### Work Logs

**KEEP and simplify legacy state semantics.**

Active UX intentionally uses `DRAFT → SUBMITTED`. Legacy schema still contains `REVISION_REQUIRED/APPROVED/REJECTED` and reviewer fields (`prisma/schema.prisma:85-92,622-650`).

Recommendation: preserve submitted journal + Supervisor read-only review. Do not reintroduce an approval queue unless a stakeholder explicitly interprets DWL-4 that way.

### Tasks

**KEEP, but likely SIMPLIFY.**

Core requirements need assignment, Intern visibility, and Supervisor completion monitoring. Current state machine adds BLOCKED, SUBMITTED, REVISION_REQUESTED, reviewer fields, evidence, approval/revision behavior (`prisma/schema.prisma:104-113,655-691`).

Recommendation: determine whether “monitor completion” truly requires Supervisor acceptance/revision. If not, reduce visible state complexity.

### Evaluations

**KEEP, but weekly scoring needs redesign.**

Current `INITIAL/MIDTERM/PROGRESS/FINAL` model and `@@unique([assignmentId,evaluationType])` prevent repeated weekly PROGRESS records (`prisma/schema.prisma:116-131,694-725`).

### Feedback

**REWORK to satisfy requirement.**

Current Feedback is supervisor-authored through `requireSupervisorEvaluationContext` (`src/app/evaluations/actions.ts:10`). That is performance guidance, not clearly workmate feedback.

### Documents

**KEEP; clarify reviewer ownership.**

Current manager model is Representative/Admin; manager uploads auto-approve (`src/app/documents/actions.ts:3-7`). Supervisor can view but not review. Admin routine review conflicts with DEC-2026-001.

### Announcements

**KEEP; simplify extra states if unnecessary and add actual notification delivery.**

DRAFT/SCHEDULED/PUBLISHED/EXPIRED/ARCHIVED/CANCELLED exist (`prisma/schema.prisma:202-210`). Core requirements only require Representative publish, Intern view, and notification. Scheduling/expiry can be deferred if they add clutter.

### Notifications

**KEEP as supporting infrastructure for ANN-3.**

The service and notification type exist, but announcement publishing does not create notifications. Database activation was not queried because Production-backed DB access was avoided.

### Calendar / holidays

**CLARIFICATION NEEDED / recommended DEFER from primary navigation.**

Calendar is not in the 51 core requirements. It appears in vision/UI/code and has its own management/holiday workflow. The calendar source test currently disagrees with the current dashboard.

Recommendation: keep code/data intact until approved, but remove Calendar from primary role navigation unless the capstone panel explicitly requires it.

### Required-hours onboarding

**CLARIFICATION NEEDED but recommended APPROVE as a supporting product decision.**

Required hours are necessary to make internship progress meaningful and are already an intended ownership interpretation in `docs/roles-and-required-hours.md:12-18`.

### Branch / office settings / broad company operations

**CLARIFICATION NEEDED.**

They may be operationally necessary for attendance location and provisioning but are not core 51 requirements. Branch migration is not active in the connected DB according to project docs.

---

## 7. Role-by-role audit

### Intern

**Current:** 13 desktop destinations plus conditional onboarding.

Strong core:
- Dashboard
- Attendance/corrections/history
- Work Logs
- Tasks
- Evaluations
- Documents
- Portfolio
- Announcements

Clutter/duplication:
- Calendar is non-core;
- Feedback is a separate top-level page although workmate-feedback behavior is unresolved;
- Insights, Portfolio, Reports, and Profile repeat progress/skill/performance information;
- dashboard already contains progress, attendance, Work Log, Tasks, weekly attendance, calendar, supervisor, onboarding, announcements, and insights.

**Proposed IA**
- Home
- Attendance
- Work Logs
- Tasks
- Growth (Evaluations + Skills/Insights + Portfolio)
- Documents
- Updates (Announcements)
- More/Profile

Mobile can remain Home / Attendance / Work Logs / More.

### Company Supervisor

**Current:** 13 desktop destinations.

Core responsibilities:
- assigned Interns;
- attendance exceptions/corrections;
- submitted Work Log review/read;
- task assignment/monitoring;
- performance evaluation;
- reports.

Top-level Feedback/Insights/Documents/Portfolio/Announcements are mostly context, not primary actions.

**Proposed IA**
- Home
- Interns
- Reviews (Attendance + Corrections + submitted Work Logs)
- Tasks
- Evaluations
- Reports
- More

Do not expose Company Operations.

### School Coordinator

**Current:** 10 desktop destinations including Tasks, Feedback, Insights, Portfolio, Announcements.

Approved requirement/vision center:
- school-scoped student monitoring;
- attendance/rendered hours;
- finalized evaluations;
- reports;
- possibly authorized document visibility.

Tasks, Feedback, Portfolio, and Announcements are not clearly required as independent top-level workspaces.

**Proposed IA**
- Home
- Students
- Reports
- Documents (if Q-02 approves)
- More

Within a Student detail page, surface Attendance/Hours and finalized Evaluations instead of separate global modules.

### Company Representative

**Current:** 14 desktop destinations plus 14-item admin sub-navigation.

Explicit core:
- publish company announcements;
- company reports.

Vision/roles docs suggest provisioning/assignment/company operations, but Q-05 must formalize exact scope.

Current dashboard also makes Representative an attendance/correction reviewer, conflicting with core Supervisor authority.

**Proposed IA**
- Home
- Interns / Operations (only Q-05-approved functions)
- Announcements
- Reports
- More

Do not place Attendance Review or Correction Review in primary navigation unless Q-04 explicitly grants review authority.

### System Administrator

**Current:** technical dashboard, but also receives broad operations navigation and admin surfaces.

This is the clearest role drift.

**Proposed IA**
- Home
- Users
- System
- Audit/Recovery (if needed)
- More

No routine Attendance, Work Logs, Tasks, Evaluations, Documents, Announcements, Portfolio, or Reports in normal Admin navigation.

---

## 8. Capability classification

| Capability | Classification | Rationale |
|---|---|---|
| Authentication/RBAC | KEEP + SIMPLIFY authority | core requirement |
| Role dashboards | SIMPLIFY | real data, but too many secondary modules/cards compete |
| Profile | KEEP | core requirement |
| Emergency contacts | KEEP requirement / MISSING implementation | PRO-6 |
| Attendance | KEEP | core and well-implemented |
| Attendance corrections | KEEP | ATT-8 |
| Work Logs | KEEP simplified | core; read-only Supervisor review is sufficient unless clarified otherwise |
| Tasks | KEEP / SIMPLIFY states | core; workflow may be over-modeled |
| Evaluations | KEEP / REDESIGN weekly | core; EVL-2 mismatch |
| Feedback | REWORK | required workmate feedback missing |
| Documents | KEEP / CLARIFY review | core |
| Announcements | KEEP / SIMPLIFY | core; notification gap |
| Notification center | KEEP supporting ANN-3 | implementation activation/delivery incomplete |
| Portfolio | KEEP / REWORK | core AI portfolio behavior only partially matched |
| Insights | KEEP / SIMPLIFY | supports AI-5..7 but duplicates several dashboards |
| Reports | KEEP / EXPAND minimally | core; company aggregate/statistics incomplete |
| Calendar/holidays | CLARIFICATION NEEDED; recommend DEFER from primary IA | non-core |
| Required-hours onboarding | CLARIFICATION NEEDED; recommend APPROVE | supports meaningful progress |
| Branch management | CLARIFICATION NEEDED | operational support, unapplied DB migration |
| Company/user/school/assignment operations | CLARIFICATION NEEDED | Q-05 |
| AI drafting for Evaluation/Report | CLARIFICATION NEEDED; recommend DEFER from scope claim | not a core requirement |
| AI reflection assistance | KEEP only if used toward core portfolio generation | otherwise Q-08 |
| Technical Admin | KEEP narrowly | DEC-2026-001 |
| Admin business operations | REMOVE from routine persona / emergency-only | conflicts with DEC-2026-001 |
| Role switching/five-business-role guidance | REMOVE | stale against URM-4 + DEC-2026-001 |

---

## 9. Conflict register — verified

| ID | Conflict | Audit conclusion |
|---|---|---|
| C-01 | workmate feedback vs peer/anonymous vs supervisor-authored feedback | unresolved Q-01; current implementation does not clearly satisfy workmate feedback |
| C-02 | school monitoring vs “School Administrator” broad management | core/role docs win; Coordinator remains school-scoped read-only |
| C-03 | four business roles + technical Admin vs five-role/role-switch guidance | resolved: four business roles + technical Admin |
| C-04 | Supervisor review authority vs Representative/Admin review queues | real drift verified |
| C-05 | Representative operations in vision/roles docs but absent from core 51 | Q-05 required |
| C-06 | required-hours onboarding has interpretation but no DEC/REQ | Q-07; recommend formalize |
| C-07 | calendar/school announcements/AI drafting/milestones outside core | Q-08; recommend defer most from primary scope |
| C-08 | company reports/statistics vs individual reports/dashboard metrics | Q-09; define minimal aggregate |
| C-09 | weekly scores vs one-evaluation-per-type constraint | contradiction verified |
| C-10 | selfie evidence vs biometric/liveness wording | current tests/copy generally avoid identity/liveness; preserve this |
| C-11 | “authorized users” for document review undefined | Q-02 |
| C-12 | extra workflow states not required by 02 | verified in Work Log/Task/Document/Announcement schema |

---

## 10. Safety and truthfulness findings

### Attendance/selfie

Current Attendance tests explicitly verify no identity or liveness claim. Keep terminology such as **Selfie Evidence** and **Location Check**. Do not convert face-count/framing detection into identity claims.

### AI

AI assistance is comparatively disciplined:

- server-only key/model use;
- authorized report scope;
- redaction of email/UUID/URL/mobile/names;
- prompt requires grounding only in supplied records;
- UI says “AI-generated draft — review before use”;
- source period/categories/limitations are shown;
- insertion requires user review;
- output is not automatically persisted.

Evidence: `src/lib/ai/evidence.ts:1-5`, `src/lib/ai/gemini.ts:5-8`, `src/components/ai-draft-assistant.tsx:5-6`.

### Metrics

Role dashboards use real Prisma counts and approved Attendance credited minutes. No fake trend percentage was found in the audited role dashboards. The problem is primarily **quantity/repetition**, not fabrication.

---

## 11. Decision package for human approval

The following decisions should be approved/rejected before any `002` implementation spec is created.

### D-01 — Workmate feedback model (Q-01)

**Question:** Who actually provides “workmate feedback”?

**Recommendation:** implement a minimal genuine peer/workmate feedback flow rather than relabeling Supervisor feedback. Keep it narrow, scoped to active Internship relationships, and only expose the fields needed by EVL-4/AI-2.

**Why:** current Supervisor-only Feedback does not clearly satisfy “workmate feedback.”

### D-02 — Document review owner (Q-02)

**Recommendation:** Company Representative reviews required company internship documents; Supervisor/Coordinator receive scoped read-only visibility where useful; Admin is emergency-only.

Do not auto-approve ordinary Company Representative uploads unless there is a clear operational reason.

### D-03 — Coordinator module scope (Q-03)

**Recommendation:** school-scoped read-only access to student progress, Attendance/hours, finalized Evaluations, approved/appropriate Documents, and Reports. Remove Tasks, Feedback, Portfolio, and general Announcements as primary Coordinator modules unless separately approved.

### D-04 — Representative Attendance/Work Log review authority (Q-04)

**Recommendation:** **do not grant routine approval authority.** Supervisor owns attendance exception/correction decisions. Representative may receive operational visibility/aggregate status.

Work Logs remain readable for appropriate operations visibility, but no separate Company Representative approval workflow.

### D-05 — Representative operations scope (Q-05)

**Recommendation:** formally approve only the smallest operational set needed to run the internship:
- provision/deactivate normal business users;
- create/maintain internship assignments;
- associate Supervisors/Coordinators;
- maintain partner-school references required by those assignments;
- maintain attendance worksite configuration only if Branch support is approved.

Avoid exposing generic company/platform administration that does not serve the Bo’s Coffee internship workflow.

### D-06 — Admin routine access (Q-06)

Already resolved: **none** beyond technical/bootstrap/emergency by default.

Recommendation: remove ordinary business-module navigation from Admin in the future implementation spec while retaining emergency capability behind explicit technical paths if necessary.

### D-07 — Required-hours ownership/onboarding (Q-07)

**Recommendation: APPROVE** the current ownership model:
- Intern confirms required hours once;
- Representative may correct with reason;
- Supervisor/Coordinator monitor;
- Admin emergency correction only.

This supports progress and report requirements without a broad onboarding subsystem.

### D-08 — Calendar, school announcements, AI drafting, milestones/reminders (Q-08)

**Recommendation:**
- Calendar/holidays: **DEFER from primary V1 navigation** unless explicitly required by the capstone panel.
- School announcements: **DEFER**; core only requires Company announcements.
- AI Evaluation/Report drafting: **DEFER as optional assistance**, not a headline scope claim.
- AI Portfolio assistance: retain only where it directly helps satisfy AI-1..AI-4.
- Milestones/reminders beyond required notifications: defer.

### D-09 — Company reports/statistics definition (Q-09)

**Recommendation:** define one minimal Company report:
- active Intern count;
- rendered vs required hours;
- attendance exception count/rate;
- evaluation completion;
- internship completion status.

Avoid decorative dashboards or multiple redundant report types.

### D-10 — Weekly evaluation representation (Q-10)

**Recommendation:** change the future data model so weekly progress evaluations can repeat by week/date. Do not use one unique `PROGRESS` record per assignment.

This requires a separately approved schema/migration change in a future implementation spec.

### D-11 — Attendance selfie language (Q-11)

**Recommendation:** APPROVE current evidence-only interpretation. Selfie capture verifies that evidence was captured, not identity or liveness.

### D-12 — Role model (Q-12)

Already resolved: four business roles plus technical Admin. Remove stale role-switch/fifth-business-role guidance from future user-facing design.

### D-13 — Extra workflow states (Q-13)

**Recommendation:** simplify visible workflows to the minimum required behavior while preserving legacy data compatibility.

- Work Logs: active UX DRAFT/SUBMITTED.
- Tasks: retain only states proven useful to assignment/completion monitoring; approval/revision can be removed if not required.
- Announcements: DRAFT/PUBLISHED/ARCHIVED is sufficient unless scheduling is explicitly approved.
- Documents: PENDING_REVIEW/APPROVED/REJECTED plus technical replacement/archive lifecycle as needed.
- Legacy enum values may remain for compatibility until a separately approved cleanup/migration.

---

## 12. Proposed target information architecture

This is conceptual only.

### Intern
**Primary:** Home · Attendance · Work Logs · Tasks  
**Secondary/More:** Growth · Documents · Updates · Profile

Growth combines Evaluations, Skills/Insights, and Portfolio rather than making each a top-level peer.

### Supervisor
**Primary:** Home · Interns · Reviews · Tasks · Evaluations · Reports  
**Secondary/More:** Documents · Announcements/Profile

Reviews combines Attendance exceptions, corrections, and submitted Work Log reading.

### Coordinator
**Primary:** Home · Students · Reports  
**Secondary/More:** Documents (if approved) · Profile

Student detail carries Attendance/hours + finalized Evaluations rather than exposing Tasks/Feedback/Portfolio as independent top-level workspaces.

### Representative
**Primary:** Home · Interns/Operations · Announcements · Reports  
**Secondary/More:** only Q-05-approved operational settings.

No routine Attendance/Correction review queue unless D-04 is rejected.

### System Administrator
**Primary:** Home · Users · System  
**Secondary:** explicit technical recovery/audit tools only.

No normal internship business navigation.

---

## 13. Recommended implementation order after decisions

No implementation is authorized by this report. If the decision package is approved, a later `002` spec should sequence work roughly as follows:

1. role/navigation simplification and Admin separation;
2. authorization corrections for Attendance/Corrections/Announcements/Docs/Task/Evaluation scopes;
3. missing core requirements: emergency contacts, announcement notification delivery, workmate feedback;
4. weekly Evaluation model/schema change (separate migration approval);
5. Portfolio generation/export alignment;
6. company aggregate report/statistics;
7. cleanup/defer of Calendar and other non-core primary navigation;
8. state-machine simplification with legacy-data compatibility.

---

## 14. Audit checklist conclusion

- All 51 requirement IDs were reviewed.
- All four business roles were audited.
- System Administrator was audited separately as technical/emergency.
- Current routes/navigation/workflows were inventoried.
- Authorization drift was compared to the approved baseline.
- Major non-REQ capabilities were classified or left for clarification.
- Responsive behavior was assessed statically and through non-mutating source tests; live authenticated breakpoint testing was not performed due Production-backed Auth/database.
- No application implementation, migration, deployment, production write, or interactive evaluation-account testing occurred.
- `001-intellitrack-realignment` remains an audit record.

## Stop condition

**T022 reached. Stop before implementation.**

Do not create or implement `specs/002-...` until the decision package above is explicitly approved by the human product owner.

---

## Decision package closure

**Approved by human product owner:** 2026-11-03

D-01 through D-13 were approved as recommended. They are now recorded in `docs/product/decisions.md` as `DEC-2026-002` through `DEC-2026-014`, with `DEC-2026-001` retained as the foundational System Administrator decision.

Post-audit T023 is complete: the next specification is `specs/002-intellitrack-realignment-implementation/spec.md`.

This approval closes the 001 audit decision gate. It does **not** authorize implementation, migration execution, deployment, or production-data changes; those remain gated by the 002 Analyze → Plan → Tasks → human approval workflow.

