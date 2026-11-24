# Implementation Plan

**Spec:** `specs/002-intellitrack-realignment-implementation/spec.md`  
**Source audit:** `specs/001-intellitrack-realignment/report.md`  
**Approved decisions:** `DEC-2026-001` through `DEC-2026-014`  
**Plan status:** Gate A verification planning — Phase A implemented; closure pending  
**Implementation authorized:** Phase A only; Gate A environment/setup execution requires separate approval  
**Migration creation/execution authorized:** No  
**Deployment / production change authorized:** No

## Spec

This plan implements the approved `002-intellitrack-realignment-implementation` specification without reopening the approved product decisions.

The canonical functional scope remains the 51 requirements in `02_core_requirements.md`. The 51-row preservation matrix in the spec is the regression contract for this plan.

This plan deliberately separates code-only realignment from schema-dependent work so that navigation, authorization, missing profile behavior, reporting, Portfolio/Growth behavior, and most feedback/notification work do not wait on the weekly-Evaluation migration.

## Baseline constraints

Before implementation begins, the implementation agent must record:

- `git rev-parse HEAD`;
- `git status --short`;
- the current runtime/Auth/database environment classification;
- whether a verified non-production database exists for schema-dependent verification.

Preserve all unrelated/uncommitted work.

Do not:

- modify or reset unrelated files;
- edit an applied migration;
- apply the existing Branch migration;
- assume the Notification migration is active merely because its SQL exists;
- run `migrate dev`, `migrate deploy`, `db push`, seeds, backfills, or production writes without a separate explicit approval;
- use the current Production-backed evaluation accounts for mutation testing;
- deploy or push.

## Strategy

### Guiding approach

Use the smallest safe change set that satisfies the approved REQs/DECs:

1. narrow authorization before relying on navigation;
2. simplify navigation without deleting operational data;
3. reuse existing models/fields whenever they already support the required behavior;
4. introduce new persistence only where the requirement cannot be satisfied safely without it;
5. keep Attendance behavior regression-protected;
6. preserve legacy routes/states where needed for data compatibility, but remove them from primary V1 UX when deferred;
7. verify each phase before starting the next.

### Phase A — code-only realignment

Implement and verify work that does not require a new database migration:

1. role/navigation and dashboard simplification;
2. authorization realignment;
3. profile internship details + emergency-contact management using existing fields;
4. genuine workmate feedback using the existing `Feedback` model if implementation inspection confirms no schema extension is required;
5. document upload/review ownership corrections;
6. Company aggregate report using existing authoritative records;
7. Portfolio generation, Growth/skill-progress presentation, and Portfolio export using existing Portfolio/report/AI infrastructure where possible;
8. Admin/Representative operational separation;
9. announcement audience restrictions and atomic notification code path, but environment-backed ANN-3 acceptance remains blocked until Notification schema activation is verified in non-production;
10. defer Calendar/holiday and nonessential AI surfaces from primary navigation without deleting their data.

Phase A must be independently testable and reviewable.

### Phase B — weekly-Evaluation schema/migration design

Prepare the exact forward-only schema change for recurring weekly evaluations.

This phase is **design only until separately approved**.

The implementation agent may produce a migration proposal/diff only after the human explicitly authorizes migration creation. No migration execution is permitted in this phase without a second explicit approval.

### Phase C — schema-dependent weekly-Evaluation implementation

Only after Phase B migration design is approved and applied/tested in a verified non-production database:

1. update Evaluation server actions/domain validation;
2. update Evaluation UI for canonical weekly periods;
3. update report/insight aggregation for repeated PROGRESS evaluations;
4. update tests;
5. run schema-dependent convergence.

Phase C must not begin if the target database is unverified or Production-backed.

---

## Phase A detailed design

### A1. Navigation and information architecture

#### General rule

Keep route URLs stable where practical to reduce regression risk. Primary navigation is simplified; deferred/secondary routes may remain directly reachable for compatibility until retirement is separately approved.

Do not expose every existing route as a primary navigation item.

#### Intern

Primary navigation:
- Home → `/dashboard`
- Attendance → `/attendance`
- Work Logs → `/work-logs`
- Tasks → `/tasks`

Secondary / More:
- Growth → use the existing Insights/Growth surface as the consolidation point; prefer reusing `/insights` with user-facing label **Growth** rather than introducing a second competing analytics route
- Documents → `/documents`
- Updates → `/announcements`
- Profile/account → existing account utilities

Within Growth:
- finalized Evaluations remain accessible as supporting evidence;
- skill evidence/progress is shown;
- Portfolio view/generation/export is reachable;
- do not expose Feedback, Evaluations, Insights, Portfolio, and Reports as five equal top-level items.

Keep `/evaluations`, `/portfolio`, `/reports`, and legacy/deferred routes for direct/deep-link compatibility where authorized.

#### Company Supervisor

Primary:
- Home → `/dashboard`
- Interns → introduce/reuse a directly-assigned-Intern list surface sourced from the Supervisor's active assignments; prefer a lightweight role-specific list rather than exposing Company Operations
- Reviews → one role landing surface linking/aggregating:
  - Attendance exceptions;
  - Attendance corrections;
  - submitted Work Log read-only review
- Tasks → existing Supervisor Task review surface
- Evaluations → existing Supervisor Evaluation review surface
- Reports → Supervisor-scoped report list/detail

Secondary:
- directly assigned Intern Documents, read-only;
- Updates/Profile only if supported without restoring clutter.

#### School Coordinator

Primary:
- Home → `/dashboard`
- Students → school-scoped student list
- Reports → school-scoped report list/detail

Secondary:
- appropriate school-scoped Documents, read-only;
- Profile/account.

Do not restore Tasks, Feedback, Portfolio, Insights, or general Announcements as primary Coordinator modules.

#### Company Representative

Primary:
- Home → role dashboard
- Interns / Operations → approved DEC-2026-006 operational surfaces
- Announcements → `/announcements`
- Reports → canonical Company report

Approved operations:
- provision/deactivate normal business users;
- create/maintain internship assignments;
- associate Supervisors/Coordinators;
- maintain partner-school references needed by assignments;
- worksite/Branch configuration only when the Branch schema is separately active/approved.

Do not expose Attendance Review or Correction Review as Representative actions.

#### System Administrator

Primary:
- Home
- Users
- System

Use technical/bootstrap/recovery language and guards.

Do not expose routine:
- Attendance;
- Work Logs;
- Tasks;
- Evaluations;
- Feedback;
- Documents;
- Announcements;
- Portfolio;
- business reports;
- Company Operations.

Admin user maintenance remains limited to technical/bootstrap/recovery concerns. Representative business-user provisioning remains a separate authorization path even if some UI components are shared.

### A2. Authorization refactor

Introduce explicit role-purpose guards instead of broad helpers that combine Representative and Admin.

#### Replace broad operational helpers

Current:
- `canManageCompanyOperations(REPRESENTATIVE|ADMIN)`
- `canApproveOperationalReviews(SUPERVISOR|REPRESENTATIVE|ADMIN)`
- broad all-role Portfolio/Evaluation viewers

Target:
- Representative business-operations guard;
- Supervisor Attendance/correction-review guard;
- Supervisor Task/Evaluation mutation guard;
- Representative document-review guard;
- technical Admin guard;
- narrow role-specific report/Portfolio/Insights scopes.

Do not use Admin as a convenience bypass.

#### Attendance

`requireAttendanceReviewer` and correction review must resolve only a valid SupervisorProfile and enforce direct `supervisorProfileId` assignment scope.

Representative/Admin review routes/actions must redirect/deny.

Preserve:
- normal auto-approval;
- exception status rules;
- correction recalculation;
- credited-minute semantics;
- evidence/location behavior.

#### Work Logs

Intern:
- own Draft/Submitted CRUD rules remain.

Supervisor:
- directly assigned submitted Work Logs are read-only.

Representative/Admin:
- no routine review workflow.

Coordinator:
- no Work Log management; any reporting-level data must be consumed through specifically scoped reports, not the general Work Log workspace.

Remove/retire unused broad reviewer helpers where safe after call-site verification.

#### Tasks

Supervisor:
- create/update/monitor directly assigned Intern Tasks.

Intern:
- own assigned Task visibility and permitted transitions.

Coordinator/Representative/Admin:
- no routine Task workspace mutation.
- aggregate reporting may query Task outcomes only when required, without granting Task workspace authority.

Approved V1 visible lifecycle:
- `TODO` → user-facing **Assigned**;
- `TODO → IN_PROGRESS`;
- `IN_PROGRESS → SUBMITTED`;
- `SUBMITTED → COMPLETED`.

Supervisor-only administrative exception:
- `TODO → CANCELLED`;
- `IN_PROGRESS → CANCELLED`.

Legacy-readable only:
- `BLOCKED`;
- `REVISION_REQUESTED`.

V1 must not create new transitions into `BLOCKED` or `REVISION_REQUESTED`. Existing rows using those statuses must remain readable and safely renderable. Do not delete TaskStatus enum values or migrate/rewrite existing Task rows in Phase A.

Intern cannot directly mark a submitted Task completed; Supervisor confirmation remains the completion-monitoring step required by `REQ-FR-TSK-3`.

#### Evaluations

Supervisor:
- author/edit/finalize directly assigned Intern evaluations.

Intern:
- own finalized records.

Coordinator:
- school-scoped finalized read-only records.

Representative/Admin:
- no routine Evaluation workspace.

Company aggregate reporting may query finalized Evaluation completion counts without granting Representative a record-level Evaluation workspace.

#### Documents

Intern:
- normal required-document upload and replacement.

Representative:
- company-scoped review/approve/reject/archive as the routine reviewer.

Supervisor:
- directly assigned Intern read-only visibility.

Coordinator:
- school-scoped read-only visibility only for non-sensitive/appropriate categories.

Admin:
- no routine Document workflow.

Representative upload is removed from the normal required-document flow; do not auto-approve a Representative upload as a shortcut.

#### Announcements

Only Company Representative may create/update/publish/archive routine Company announcements.

Admin management must be denied.

Legacy/deferred audience records remain readable where compatible but cannot be newly authored through V1 UI/actions.

#### Portfolio / Growth / Reports

Split the existing broad Portfolio authorization responsibilities:

- Intern Portfolio: own assignment only;
- Supervisor report access: directly assigned Interns only;
- Coordinator report access: school-scoped only;
- Representative Company report: aggregate company scope;
- Admin: no routine Portfolio/report access.

Avoid using one broad `requirePortfolioViewer` for unrelated business purposes after the refactor.

### A3. Intern profile and emergency contacts

Reuse existing data:

- `InternshipAssignment.company`
- `InternshipAssignment.department`
- `InternshipAssignment.supervisorProfile`
- `startDate` / `endDate`
- `status`
- approved Attendance `creditedMinutes`
- existing `InternProfile.emergencyContactName`
- `emergencyContactNumber`
- `emergencyContactRelationship`

Profile display must show all PRO-2 details:
- assigned company;
- department;
- Supervisor;
- duration;
- rendered hours;
- internship status.

Rendered hours are recomputed from APPROVED Attendance credited minutes rather than trusting `InternshipAssignment.renderedHours` as a second source of truth.

Extend Intern profile editing with a strictly validated emergency-contact payload.

Recommended implementation shape:
- keep ordinary User profile fields in `profileInputSchema`;
- add a dedicated Intern emergency-contact schema/action or a clearly separated nested Intern payload;
- server checks actor role === INTERN and updates only actor's InternProfile;
- no client-supplied target user ID.

### A4. Workmate feedback using existing Feedback model

No schema extension is planned unless implementation inspection proves the existing model cannot enforce the spec.

Use the existing `Feedback` row as:
- `assignmentId` = recipient Intern's active InternshipAssignment;
- `authorId` = workmate Intern User ID;
- `recipientId` = recipient Intern User ID;
- `visibility` = server-controlled, preferably `INTERN_AND_STAFF`;
- `feedbackType` = an existing appropriate value; do not create a new enum solely to label peer feedback unless required.

Server eligibility query:

1. resolve actor's active InternProfile + active InternshipAssignment;
2. resolve recipient's active InternshipAssignment server-side;
3. actor and recipient must be different users;
4. both assignments must be `ACTIVE`;
5. `supervisorProfileId` must match;
6. internship date ranges must overlap;
7. recipient ID from the client is treated only as a candidate; the relationship is revalidated server-side.

Do not depend on `branchId`.

Visibility:
- recipient Intern can read workmate feedback intended for them;
- recipient's directly assigned Supervisor may read it for evaluation/coaching context;
- Coordinator/Representative/Admin do not receive a routine Feedback workspace from this capability.

Supervisor-authored coaching, if retained, must be visually/data-query distinguishable by author role and must not be presented as workmate feedback.

### A5. Company aggregate report — canonical formulas

Create one Company report service/module. Do not duplicate formulas across dashboard cards and report pages.

#### Scope

Base company scope is the authenticated Representative's `companyId`.

All calculations use persisted assignment/attendance/evaluation state; no inferred trend metrics.

#### Metric 1 — Active Intern count

`activeInternCount` =
- distinct Intern profiles with an InternshipAssignment where:
  - `companyId` = Representative company;
  - assignment `status = ACTIVE`;
  - Intern User `isActive = true`.

If data integrity permits multiple active assignments for one Intern, count the Intern once.

#### Metric 2 — Rendered vs required internship hours

Report population for hours =
- company assignments with status `ACTIVE` or `COMPLETED`.

Rendered minutes =
- sum of `Attendance.creditedMinutes`;
- only where `Attendance.status = APPROVED`;
- only within report-population assignments.

Required minutes =
- sum of `requiredHours * 60` for report-population assignments where `requiredHours IS NOT NULL`.

Truthfulness rule:
- also return `missingRequiredHoursCount`;
- do not display an aggregate completion percentage when any included assignment lacks required hours;
- raw rendered hours may still be shown, with the incomplete denominator disclosed.

#### Metric 3 — Attendance exception count/rate

Eligible Attendance denominator =
- all non-`VOIDED` Attendance records belonging to report-population assignments.

An Attendance record counts as an exception when:
- `reviewRequired = true`; OR
- `status` is one of `PENDING_REVIEW`, `REJECTED`, `INCOMPLETE`, `ABSENT`.

Late/early classification by itself is **not** an exception.

`attendanceExceptionRate` =
- `exceptionCount / eligibleAttendanceCount * 100`;
- return `null` when denominator = 0;
- round only for presentation, not in underlying counts.

#### Metric 4 — Evaluation completion

Use a clearly named UI label: **Final evaluation completion**.

Denominator =
- Company assignments with `status = COMPLETED`.

Numerator =
- those completed assignments having at least one `FINAL` Evaluation whose status is `SUBMITTED` or `ACKNOWLEDGED`.

Rate =
- numerator / denominator * 100;
- `null` when no completed assignments exist.

This avoids pretending active Interns are late on a final evaluation that may not yet be due.

Weekly PROGRESS evaluation coverage is not included in this aggregate until Phase C defines a separate approved metric.

#### Metric 5 — Internship completion status

Use the persisted `InternshipStatus` values as the source of truth.

Return company-scoped counts grouped by:
- PENDING
- ACTIVE
- COMPLETED
- CANCELLED
- TERMINATED

Do not invent an "on track" or completion prediction status for this report.

### A6. Announcement audience → recipient matrix

Only the following audiences may be authored in V1.

| Audience | Eligible recipients | Excluded |
|---|---|---|
| `INTERNS` | active Intern users with an ACTIVE assignment in the announcement company | other companies, inactive users, all non-Intern roles |
| `SUPERVISORS` | active Supervisor users whose SupervisorProfile belongs to the announcement company | other companies, inactive users |
| `REPRESENTATIVES` | active Representative users whose RepresentativeProfile belongs to the announcement company | other companies, inactive users |
| `COMPANY` | the union of eligible Interns + Supervisors + Representatives in the announcement company | Coordinators, Admin, other companies, inactive users |
| `ALL_USERS` | eligible Interns + Supervisors + Representatives above, plus active Coordinators who are linked through at least one ACTIVE assignment in the announcement company | Admin, unrelated Coordinators, other companies, inactive users |

Required V1 user-facing labels:
- `COMPANY` → **Company interns and staff**;
- `ALL_USERS` → **All internship participants**.

Do not keep the current misleading `COMPANY` label **Office staff**, because the approved recipient scope includes Interns.

Deferred authoring values:
- `SCHOOL`
- `COORDINATORS`
- `ADMINISTRATORS`

Existing legacy announcements with deferred values remain readable under compatibility rules; no new V1 authoring choice is exposed.

#### Atomic publication

Use a single Prisma database transaction for:
1. conditional `DRAFT/SCHEDULED → PUBLISHED` announcement update;
2. server-side recipient resolution;
3. notification inserts.

Recommended dedupe key:
- `announcement:<announcementId>:published`

The Notification unique index is `(recipient_id, dedupe_key)`, so the same dedupe key can be reused for all recipients.

Use transaction-aware notification insertion (for example a service accepting `Prisma.TransactionClient` and `createMany(..., skipDuplicates: true)`) rather than calling the current global-client `createNotification` repeatedly outside the transaction.

If notification persistence fails, the transaction rolls back and the announcement remains unpublished.

If recipient count is legitimately zero, publication may succeed with zero notifications and no "delivered to users" claim.

#### Notification migration gate

Source contains `20260817120000_add_notification_foundation`, but source presence does not prove the connected database has the table.

Phase A may implement and unit/source-test the atomic code path.

Environment-backed ANN-3 acceptance remains **BLOCKED** until:
- a non-production database is explicitly verified; and
- Notification schema activation is confirmed there.

Do not inspect Production DB state merely to unblock the plan.

### A7. Portfolio generation and export

Reuse existing:
- Portfolio model;
- existing AI evidence redaction/grounding pipeline;
- existing Gemini server-only provider;
- report evidence query;
- PDF-generation primitives where useful.

Do not treat the current reflection-only AI helper as satisfying AI-1.

#### Generate Portfolio draft

Add a Portfolio-specific AI generation action that:
1. requires Intern ownership;
2. loads verified/authorized report evidence;
3. includes only finalized/approved/eligible records;
4. includes authorized workmate feedback after A4 exists;
5. asks for structured Portfolio sections matching the existing Portfolio fields;
6. returns a labeled reviewable draft to the client;
7. performs **no Prisma write**.

The Intern explicitly applies/accepts draft fields into the edit form and then uses the normal save action.

Saving generated content may set existing AI provenance fields if the server can prove the accepted draft came from the current generation response; do not mark manually written content as AI-generated.

No automatic Portfolio approval/status transition.

#### Portfolio export

Create a Portfolio-specific PDF composition using existing in-memory PDF infrastructure where practical.

Export must include:
- Portfolio title/narrative/skills/achievements/selected work/reflection;
- clearly separated verified evidence summary;
- source/AI labeling where applicable.

Do not redirect the Intern to a generic internship report and call it a generated Portfolio.

Avoid persistent exported-PDF storage unless a later requirement needs it; in-memory generation/download is the smallest safe implementation.

#### Approved follow-on amendment — DEC-2026-020 (2026-11-24)

The original A7 plan and DEC-2026-018 remain the historical implementation baseline. DEC-2026-020 now adds the following completed-internship behavior:

- Keep Portfolio as a direct Intern desktop destination and make it the fifth primary Intern mobile destination (Home, Attendance, Work Logs, Tasks, Portfolio), with More retained as the final navigation action.
- When a specific internship assignment transitions to COMPLETED, create/update that assignment's one Portfolio row in the same transaction. Persist deterministic eligible evidence in the existing `Portfolio.sourceSnapshot` field when the current schema supports it. Preserve Intern-authored narrative; set status to GENERATED, not FINALIZED/APPROVED. Do not invoke Gemini.
- Present an archive containing the active assignment and every completed assignment separately. Assignment ID must be re-authorized server-side for every detail, edit, and PDF request. A Portfolio must never mix evidence or narrative from different assignments.
- Completed assignments with an existing snapshot use that saved snapshot for stable PDF export. Legacy completed assignments without one remain available via a clearly labeled live-evidence fallback; any backfill is idempotent and separately tested.
- PDFs remain generated on demand; no PDF blob persistence or schema migration is planned unless code inspection proves the existing schema insufficient.
- Fix route-derived active navigation state across desktop and mobile. Home is exact-route-only; Reports and nested Reports routes highlight Reports for authorized roles; mobile More indicates an active secondary route; Intern contextual report routes must not falsely highlight Home. Trace actual redirects/role-profile failures instead of masking them with CSS or broadening guards.
- Acceptance requires unit/integration tests for transaction atomicity, idempotency, narrative preservation, evidence eligibility, multi-assignment archive isolation, legacy fallback, assignment-level authorization, selected-snapshot PDF output, route clicks/redirects, aria-current, More state, and 360/390/430/768 mobile layouts.

See `portfolio-finalization-navigation-addendum.md` for full requirements, acceptance cases, and safety boundaries.

### A8. Skill progress / Growth

Use dated evidence already present in authorized records.

Recommended evidence sources:
- submitted Work Log `skillsApplied`;
- completed Task metadata only if an explicit skill field/source exists;
- authorized workmate Feedback text/metadata only when the skill is explicitly recorded rather than inferred speculatively;
- finalized Evaluation criteria/remarks where skill evidence is explicit;
- Intern-maintained Portfolio skill entries.

Do not fabricate proficiency values.

Presentation should show:
- skill label;
- first recorded evidence date;
- most recent evidence date;
- count/list of dated evidence occurrences;
- source categories.

Do not show fake "72% better" or proficiency rankings.

A simple chronological evidence timeline satisfies AI-7 more safely than an invented score.

### A9. Deferred surfaces

Calendar/holiday management, school-announcement authoring, generic reminders/milestones, and nonessential AI drafting are removed from **primary navigation**.

Do not delete Calendar/Holiday data or applied migrations.

Known stale calendar UI tests are handled under the Test Plan.

---

## Phase B — weekly Evaluation migration design

**B2 status (2026-11-04):** schema edit and forward-only migration artifact created; see `weekly-evaluation-b2-migration-package.md`. **B3 status:** the artifact was applied to the verified isolated Gate A test database and verified; see `weekly-evaluation-b3-verification.md`. Production remains unapplied and Phase C is not started. Prisma Client regeneration is deferred to Phase C because the new required input belongs to Phase C write paths.

### Proposed schema

Add to `Evaluation`:

`periodKey String @map("period_key") @db.VarChar(20)`

Purpose:
- non-PROGRESS one-off evaluations use `"SINGLE"`;
- PROGRESS evaluations use canonical week-start date `YYYY-MM-DD`.

Replace:

`@@unique([assignmentId, evaluationType], map: "evaluations_assignment_type_key")`

with:

`@@unique([assignmentId, evaluationType, periodKey], map: "evaluations_assignment_type_period_key_key")`

Keep existing `periodStart` and `periodEnd`.

### Application semantics

For `PROGRESS`:
- server computes canonical Monday in configured internship/company timezone;
- `periodStart` = Monday;
- `periodEnd` = Sunday;
- `periodKey` = `periodStart` formatted `YYYY-MM-DD`.

For `INITIAL`, `MIDTERM`, `FINAL`:
- `periodKey = "SINGLE"`;
- existing optional periodStart/periodEnd semantics remain;
- the composite unique key preserves one row per assignment/type.

Client must not supply `periodKey`.

### Forward-only migration proposal

**Migration-artifact safety rule:** creating the weekly-Evaluation migration artifact must not execute pending migration history against the current connected Production-backed database. The creation mechanism must never implicitly apply `20260913090000_restore_branches` or any other pending unrelated migration. If the tooling cannot guarantee artifact creation without database execution, stop at Gate B1 and use a manually reviewed migration-artifact workflow instead of connecting to Production.

When migration creation is separately approved:

1. add nullable `period_key VARCHAR(20)`;
2. backfill existing rows:
   - `PROGRESS`: canonical Monday derived from `COALESCE(period_start, evaluation_date)`; PostgreSQL `date_trunc('week', ...)` uses Monday week starts;
   - non-PROGRESS: `SINGLE`;
3. verify no duplicate `(assignment_id, evaluation_type, period_key)` groups;
4. set `period_key NOT NULL`;
5. drop the old `evaluations_assignment_type_key`;
6. create the new composite unique key;
7. regenerate Prisma Client locally;
8. do not apply to Production.

Existing rows are preserved; no Evaluation content is deleted or rewritten beyond the new derived key.

### Migration verification

Before applying in any environment:
- confirm the exact migration command will execute only the approved weekly-Evaluation migration in the verified non-production target and will not implicitly apply `20260913090000_restore_branches` or unrelated pending migrations;
- use a verified non-production database;
- run a dry inspection for duplicate groups before constraint swap;
- validate existing INITIAL/MIDTERM/FINAL rows remain queryable;
- validate existing PROGRESS row receives correct Monday key;
- validate a second different-week PROGRESS succeeds;
- validate same-week duplicate fails.

Rollback strategy before production:
- because migration is forward-only, rollback during non-production testing means restoring from the disposable test database / re-provisioning the non-production environment rather than editing the migration after application.
- Production execution requires a separate deployment/migration approval after successful non-production verification.

---

## Phase C — weekly Evaluation implementation

After the Phase B migration is approved/applied in non-production:

1. add canonical-week helpers to Evaluation domain;
2. normalize Supervisor PROGRESS input server-side;
3. update create/update uniqueness error handling;
4. keep INITIAL/MIDTERM/FINAL as one-per-assignment/type;
5. update Evaluation list/detail to label weekly periods clearly;
6. update Coordinator/Intern finalized read-only views;
7. update reports/Insights to handle multiple PROGRESS records chronologically;
8. add migration-backed tests in non-production.

Do not add weekly progress percentages or ranking metrics unless separately approved.

---

## Files / modules likely affected

This is a planning inventory, not permission to edit yet.

### Navigation / dashboards

Likely:
- `src/components/app-shell.tsx`
- `src/components/mobile-navigation.tsx`
- `src/components/shell-navigation.tsx`
- `src/app/(authenticated)/dashboard/page.tsx`
- `src/components/role-dashboard.tsx`
- `src/components/intern-dashboard*.tsx`
- role-specific list/landing pages if existing routes cannot cleanly represent Interns / Students / Reviews
- `src/app/admin/layout.tsx`

### Authorization / role helpers

Likely:
- `src/lib/auth/roles.ts`
- `src/lib/auth/require-company-operations-manager.ts` — replace/split responsibilities
- `src/lib/auth/require-admin.ts`
- `src/lib/auth/admin-guard.ts`
- `src/lib/attendance/authorization.ts`
- Attendance correction review guards/actions
- `src/lib/work-logs/authorization.ts`
- `src/lib/tasks/authorization.ts`
- `src/lib/evaluations/authorization.ts`
- `src/lib/documents/authorization.ts`
- `src/lib/announcements/authorization.ts`
- `src/lib/portfolio/authorization.ts`
- `src/lib/insights/authorization.ts`
- profile/report scope helpers

### Profile

Likely:
- `src/lib/profile/domain.ts`
- `src/lib/profile/data.ts`
- `src/app/profile/actions.ts`
- `src/components/profile-edit-form.tsx`
- `src/components/profile-view.tsx`

### Feedback / Evaluations

Likely Phase A:
- `src/app/evaluations/actions.ts` or a dedicated Feedback action module
- `src/lib/evaluations/authorization.ts` or dedicated Feedback authorization/domain helpers
- `src/app/(authenticated)/feedback/**`

Likely Phase B/C:
- `prisma/schema.prisma`
- **new forward-only migration only after separate approval**
- `src/lib/evaluations/domain.ts`
- `src/app/evaluations/actions.ts`
- Evaluation pages/forms

### Documents

Likely:
- `src/lib/documents/authorization.ts`
- `src/app/documents/actions.ts`
- document list/manage/new/detail pages

### Announcements / notifications

Likely:
- `src/lib/announcements/domain.ts`
- `src/lib/announcements/authorization.ts`
- `src/app/announcements/actions.ts`
- announcement forms/pages
- `src/lib/notifications/service.ts`
- notification domain/tests

No notification migration modification is planned.

### Reporting

Likely:
- new or expanded canonical company-report data/domain module under `src/lib/reports/`
- `src/app/(authenticated)/reports/page.tsx`
- report presentation components
- existing Intern report files remain scoped and regression-protected

### Portfolio / AI / Growth

Likely:
- `src/app/portfolio/actions.ts`
- Portfolio pages/edit UI
- `src/app/ai/actions.ts`
- `src/lib/ai/evidence.ts`
- AI prompt/domain output schema
- `src/lib/portfolio/domain.ts`
- `src/lib/reports/pdf.ts` or a Portfolio-specific PDF composer using its primitives
- `src/lib/insights/data.ts`
- `src/lib/insights/domain.ts`
- Insights/Growth pages/components

### Representative/Admin operations

Likely:
- `src/app/admin/layout.tsx`
- `src/app/admin/users/**`
- `src/app/admin/assignments/**`
- `src/app/admin/schools/**`
- `src/app/admin/branches/**` only for compatibility/visibility gating; do not require Branch migration
- `src/app/admin/settings/office/**`
- operation guards/services

---

## Requirement traceability

The full 51-row preservation matrix remains in the spec. The plan focuses on the changed/completed requirements.

| Requirement group | Plan work |
|---|---|
| URM-4..6 | role/nav simplification + least-privilege server authorization |
| PRO-2 | complete internship details on Intern profile |
| PRO-6 | emergency-contact edit/view |
| ATT-7/8 | Supervisor-only review/correction authority |
| DWL-4 | Supervisor read-only submitted-log review |
| TSK-1..3 | keep core assignment/monitoring, simplify visible states/scopes |
| EVL-1 | Supervisor-only mutation |
| EVL-2 | Phase B/C recurring weekly Evaluation design |
| EVL-4 | genuine same-Supervisor workmate feedback |
| AI-1..4 | grounded generated Portfolio + workmate/performance evidence + export |
| AI-5..7 | preserve grounded skill/productivity behavior; add dated skill progression |
| DOC-1..3 | Intern upload + Representative review + scoped read-only staff |
| ANN-1..3 | Representative-only management + supported audiences + atomic notifications |
| REP-1/2 | preserve Supervisor/Coordinator reports with narrower scopes |
| REP-3/4 | canonical Company aggregate formulas |

All other requirements are regression-protected and must remain covered by existing or updated tests.

---

## Authorization impact

### Final intended authority matrix

| Capability | Intern | Supervisor | Coordinator | Representative | Admin |
|---|---|---|---|---|---|
| Own profile/emergency contact | Own | — | — | — | technical recovery only |
| Attendance capture | Own | — | — | — | — |
| Attendance exception/correction decision | request own correction | direct Interns | forbidden | forbidden | forbidden routine |
| Work Logs | own | direct Intern read-only review | no workspace | no routine review | forbidden routine |
| Tasks | own assigned | direct Intern manage/monitor | read only only if needed inside report, no workspace authority | aggregate only if needed | forbidden routine |
| Evaluations | own finalized | direct Intern author/finalize | school finalized read-only | aggregate only | forbidden routine |
| Workmate Feedback | eligible peer author / own recipient view | direct Intern coaching-context read | no routine workspace | no routine workspace | forbidden routine |
| Documents | own upload/replace | direct Intern read-only | school appropriate read-only | company review | forbidden routine |
| Announcements | read eligible | read eligible | only ALL_USERS compatibility when linked; no authoring | company publish/manage | no routine authoring |
| Portfolio/Growth | own | only explicitly required direct-Intern report context | no Portfolio workspace | no Portfolio workspace | forbidden routine |
| Reports | own where provided | direct Intern reports | school reports | Company aggregate | forbidden routine |
| Business operations | — | — | — | approved minimum | forbidden routine |
| Technical user/system maintenance | — | — | — | business provisioning only | technical/bootstrap/recovery |

Any implementation that broadens this matrix requires a new approved DEC.

---

## Data / migration impact

### Phase A

No schema change is expected for:
- emergency contacts;
- PRO-2 profile details;
- Workmate Feedback;
- navigation;
- authorization;
- documents;
- Company report;
- Portfolio generation/export;
- Growth evidence timeline.

Notification code can be changed without schema modification, but ANN-3 environment-backed acceptance depends on confirming the existing Notification migration in non-production.

### Phase B/C

Expected schema change:
- Evaluation `periodKey`;
- unique key replacement described above.

No Branch schema work is part of this plan.

No legacy enum deletion is planned.

No destructive data cleanup is planned.

---

## Test plan

### Global verification

After each implementation phase:
- `npm run typecheck`
- `npm run lint`
- `git diff --check`

Before implementation is considered complete:
- `npm run build` in a safe local/non-production context;
- all relevant source/unit suites below;
- responsive verification at 390 / 768 / 1024 / 1440;
- role authorization matrix checks.

Do not run DB-mutating scripts against the current Production-backed environment.

### Existing test disposition

A file marked **REWRITE** keeps valid low-level assertions but replaces assertions that encode superseded authority/navigation.

#### PRESERVE

- `scripts/test-auth-foundation.ts` — login/logout/guard fundamentals
- `scripts/test-attendance-ux.ts` — Attendance UX semantics
- `scripts/test-attendance-capture-details.ts` — selfie/location evidence behavior
- `scripts/test-single-office-ui.ts` — current compatible Attendance workplace behavior
- `scripts/test-internship-progress.ts` — credited-hours progress
- `scripts/test-onboarding-foundation.ts` — onboarding foundation
- `scripts/test-required-hours.ts` — required-hours ownership, except update only if guard names change
- `scripts/test-admin-provisioning.ts` — technical Admin bootstrap and no public Admin provisioning
- `scripts/test-branch-compatibility.ts` / `scripts/test-branches.ts` — preserve compatibility; do not make them migration prerequisites
- generic UI/accessibility tests in `test-ui-polish.ts` / `test-ui-system-v11.ts`

#### REWRITE

- `scripts/test-navigation-ui.ts` — simplified desktop/More navigation and deferred routes
- `scripts/test-shell-refinement.ts` — retain notification/accessibility assertions; rewrite role-nav structure
- `scripts/test-role-alignment.ts` — remove Admin business operations/reviewer assertions; encode DEC-2026-005/006/007
- `scripts/test-role-dashboard-ui.ts` — separate Representative vs Admin and simplified role dashboards
- `scripts/test-attendance-foundation.ts` — preserve Attendance domain; rewrite Representative reviewer assertions to deny
- `scripts/test-attendance-corrections.ts` — preserve correction math; rewrite Representative reviewer assertions to deny
- `scripts/test-work-log-foundation.ts` — retain journal/hours rules; rewrite broad staff visibility to approved scopes
- `scripts/test-task-foundation.ts` — remove Coordinator/Representative/Admin routine Task authority; update visible state expectations after state simplification
- `scripts/test-evaluation-foundation.ts` — remove Representative/Admin workspace assertions; replace old uniqueness assertion; add same-Supervisor workmate and weekly period rules
- `scripts/test-document-foundation.ts` — remove Admin routine scope and Representative auto-upload approval; assert Representative review + scoped readers
- `scripts/test-announcement-foundation.ts` — deny Admin management; supported V1 audience options; atomic notification expectations
- `scripts/test-notification-foundation.ts` — retain service safety; update brittle mobile-nav assertion and add announcement notification transaction/dedupe behavior
- `scripts/test-profile-foundation.ts` — add PRO-2/emergency-contact assertions; remove/bound Admin operational viewing where it conflicts with DEC-2026-007
- `scripts/test-portfolio-report-foundation.ts` — remove Admin Portfolio/report access, add generated Portfolio export semantics
- `scripts/test-insights-foundation.ts` — convert all-role Insights assumptions to Intern Growth evidence and narrow role access
- `scripts/test-ai-foundation.ts` — preserve grounding/redaction/no-auto-persist; add full Portfolio generation output contract
- `scripts/test-intern-mobile-ux.ts` — update More-sheet expectations to simplified IA
- `scripts/test-assignment-foundation.ts` — update authorization helper expectations if Representative/Admin guard split changes

#### REMOVE STALE / RETIRE ASSERTIONS

Do not necessarily delete the whole test file if low-level retained behavior still exists.

- `scripts/test-calendar-foundation.ts`
  - retire assertions requiring Calendar in the primary dashboard/navigation;
  - retire Admin business Calendar-management expectation;
  - preserve low-level Calendar domain/data compatibility tests only while code remains.
- stale tests requiring role-switch/five-business-role UI, if any are found during implementation.
- source-regex tests tied solely to old long navigation arrays should be replaced with behavior/role assertions.

#### ADD

Add focused tests for:

1. `PRO-2` complete profile details;
2. emergency-contact validation and self-only update;
3. same-Supervisor overlapping-active-Intern feedback eligibility;
4. self/unrelated workmate feedback denial;
5. Feedback visibility by Intern/Supervisor and denial for Coordinator/Representative/Admin;
6. Representative-only document review;
7. Intern-only normal required-document upload;
8. Representative/Admin Attendance-review denial;
9. Representative/Admin/Coordinator Task/Evaluation mutation denial;
10. Company report canonical formulas;
11. report missing-required-hours truthfulness;
12. announcement recipient matrix for all five supported audiences;
13. publication rollback when notification insert fails;
14. notification dedupe;
15. Portfolio structured generation, no auto-persistence, explicit save;
16. Portfolio-specific PDF export;
17. dated skill evidence/progress with no invented scores;
18. Admin normal business navigation/action denial;
19. weekly `periodKey` normalization and duplicate prevention after Phase B/C;
20. migration/backfill verification in non-production after migration approval.

### Environment-backed tests

Blocked until a verified non-production database exists:
- Notification table activation/integration;
- weekly Evaluation migration/backfill/constraint behavior;
- authenticated mutation E2E.

Until then, use pure/domain/source tests and mocked/isolated database abstractions only.

---

## Responsive / UX verification

For affected role shells, dashboards, Growth, Reports, Documents, Feedback, and Portfolio:

Verify at:
- 390 px
- 768 px
- 1024 px
- 1440 px

Check:
- no horizontal overflow;
- primary actions visible;
- mobile bottom navigation remains role-specific;
- More sheet contains only approved secondary destinations;
- desktop sidebar does not expand back into every module;
- long Intern/School names wrap safely;
- report metrics remain readable without fake truncation;
- Portfolio generation/error states fit mobile;
- document review and Feedback forms remain usable on narrow widths.

Because current Auth/database are Production-backed, interactive authenticated responsive verification must use isolated fixture rendering or a verified non-production environment until a safe environment exists.

---

## Gate A non-production verification setup and execution plan

This section is **design only**. It does not authorize package installation, service/container startup, database/project creation, fixture creation, migration execution, browser execution, or any Production access.

### Verification environment architecture

Use a dedicated disposable **Supabase non-production project** as the preferred Gate A target because the application already depends on Supabase Auth plus PostgreSQL. The test project must be separate from every Production project and must be safe to delete after verification.

A local Supabase/Docker stack is a fallback only if a remote disposable test project is not available. That fallback requires its own approval for CLI/tool installation and container startup; Docker presence alone is not proof that the engine or local Supabase stack is ready.

Use an isolated ignored environment file such as `.env.gatea.local`; do not overwrite or repurpose the current `.env` or `.env.local`. The Gate A environment must provide only test-project values for:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
- `SUPABASE_SECRET_KEY`;
- `DATABASE_URL`;
- `DIRECT_URL`;
- `INTELLITRACK_TARGET_ENV=test`;
- a future explicit Gate A confirmation token/run identifier.

No credential value may be printed to logs, screenshots, reports, or committed files.

### Mandatory isolation preflight

Before any write-capable command is approved, a future preflight must fail closed unless all of the following are true:

1. target environment label is exactly `test` or a separately approved disposable `demo` target;
2. Supabase project URL/project reference differs from the current Production-backed configuration;
3. PostgreSQL host/database identity differs from the current Production-backed configuration;
4. the target is explicitly marked disposable/non-production by the human;
5. the credential file is ignored by Git and local-only;
6. the test run has a unique run ID used to tag fixture Auth users and database records;
7. no command line or log output includes passwords, secret keys, connection strings, signed URLs, or tokens.

The comparison may use normalized host/project identifiers or non-reversible fingerprints; it must not echo secret values.

### Existing migration/schema readiness

A fresh Gate A database must not blindly execute the entire migration directory.

For Gate A only, the intended schema baseline is the already-existing migrations through the Notification foundation:

1. `0_init`;
2. `20260804130000_support_required_hours_onboarding`;
3. `20260804140000_support_task_submission_review`;
4. `20260816120000_add_user_profile_fields`;
5. `20260816180000_support_internship_calendar`;
6. `20260817120000_add_notification_foundation`.

The unrelated `20260913090000_restore_branches` migration remains **excluded** from this specification. Current application compatibility code is explicitly designed to tolerate an absent Branch schema and uses base assignment projections for legacy-compatible assignment flows.

Before any migration is run, a separate human gate must review the exact command and prove that it cannot implicitly apply `20260913090000_restore_branches`, any future migration, or any Phase B/C migration.

No `db push`, migration creation, migration editing, schema reset against Production, or inferred Production migration-state inspection is allowed.

### Disposable Auth accounts

Create a primary five-role fixture set only after the fixture-creation gate:

| Fixture | Role | Scope |
|---|---|---|
| GateA Intern A | Intern | Company A / School A active assignment |
| GateA Supervisor A | Company Supervisor | Direct supervisor of Intern A |
| GateA Coordinator A | School Coordinator | School A; linked to Intern A assignment |
| GateA Representative A | Company Representative | Company A operations |
| GateA Administrator | System Administrator | Technical-only account |

Use generated strong passwords stored only in a local ignored manifest such as `.gatea-credentials.local.json`. Auth metadata should include a stable marker such as `gatea_fixture=true` and the unique run ID.

Assignment isolation additionally requires minimal auxiliary fixtures:

- Company B;
- GateA Representative B;
- GateA Supervisor B;
- GateA Intern B with an active Company B assignment.

School A may be reused for Intern B if that does not weaken the company-isolation scenario. Do not add extra accounts solely for visual decoration.

### Fixture data set

The fixture set must be deterministic, small, and sufficient to exercise the existing UI without fabricating product behavior.

**Company A / primary fixtures**
- one active Partner School A;
- one Representative A;
- one Supervisor A;
- one Coordinator A;
- one Intern A;
- one active assignment with approved Attendance totaling a known credited-minute value;
- one separate PENDING assignment fixture for legal activation/cancellation testing;
- one separate ACTIVE assignment fixture for completion/termination testing;
- a small set of Work Logs, Tasks, finalized/draft Evaluation-compatible records, Documents, Feedback, and Portfolio/Growth evidence needed to render approved pages;
- one DRAFT announcement reserved for ANN-3 publication testing.

**Company B / isolation fixtures**
- Company B;
- Representative B and Supervisor B;
- Intern B;
- one active Company B assignment.

All database rows must be tagged or deterministically identifiable by the Gate A run ID so they can be deleted without broad predicates.

Do not use existing demo/pilot/evaluation scripts unchanged merely because they already create similar data. In particular, any future Gate A fixture script must add an explicit non-production/isolation preflight before it can mutate Auth or PostgreSQL.

### Browser acceptance tooling

Preferred runner: **Playwright Test**.

It is not currently installed and therefore requires a separate package-install approval. Initial design should use the already-installed system Chrome channel through Playwright to avoid downloading a browser binary. If system-Chrome execution is unreliable, browser-binary installation requires another explicit approval.

The browser harness should:

- launch IntelliTrack with the isolated Gate A environment only;
- authenticate using disposable fixture accounts;
- create one storage state per role after successful login;
- use exact viewport widths `390`, `768`, `1024`, and `1440` with a stable desktop-height convention;
- disable animations/reduced-motion variability for screenshot stability without changing application behavior;
- record console/page errors;
- assert `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`;
- assert the correct mobile/desktop navigation surface for the viewport;
- exercise the mobile More sheet below 1024 and the desktop sidebar at/above 1024;
- capture full-page screenshots using fixture-only data;
- keep screenshots and traces outside committed source unless separately approved.

Suggested evidence path:
`artifacts/gatea/t105/<run-id>/<role>/<width>/<route-name>.png`.

### Exact T105 20-case role × viewport matrix

Each case is one authenticated browser context at the specified width. It must capture the role landing surface and sweep the listed role-authorized affected pages before the case is accepted.

| Case | Role | 390 | 768 | 1024 | 1440 | Required route sweep |
|---|---|---:|---:|---:|---:|---|
| T105-I | Intern | I-390 | I-768 | I-1024 | I-1440 | `/dashboard`, `/attendance`, `/work-logs`, `/tasks`, `/insights`, `/documents`, authorized Feedback/Portfolio/Report deep links |
| T105-S | Company Supervisor | S-390 | S-768 | S-1024 | S-1440 | `/dashboard`, `/interns`, `/reviews`, `/tasks`, `/evaluations`, `/reports`, `/documents` |
| T105-C | School Coordinator | C-390 | C-768 | C-1024 | C-1440 | `/dashboard`, `/students`, `/reports`, `/documents` |
| T105-R | Company Representative | R-390 | R-768 | R-1024 | R-1440 | `/admin`, `/admin/users`, `/admin/schools`, `/announcements`, `/documents`, `/reports`, authorized assignment detail |
| T105-A | System Administrator | A-390 | A-768 | A-1024 | A-1440 | `/admin/system`, `/admin/users` |

The matrix contains exactly **20 core role × viewport cases**. A case is not complete merely because the landing-page screenshot exists; its role-authorized route sweep must also pass at that width.

For every case verify:
- DM Sans/shared typography is rendered consistently;
- page title, primary action, cards, filters/forms, and status badges are legible;
- no unintended horizontal overflow or clipped controls;
- touch targets remain usable at 390/768;
- sidebar remains compact/top-aligned at 1024/1440;
- bottom navigation and More sheet remain role-correct below 1024;
- table screens use desktop table vs narrow card behavior as designed;
- long names/emails/context values wrap without breaking layout;
- no unauthorized role module appears because of shared styling changes.

### Users and Partner Schools browser checks

Representative route sweeps must explicitly exercise:

**Users**
- initial All Roles state;
- live search;
- Role filter;
- Active/Inactive/All status filter;
- ascending/descending sort;
- 10 rows default and 25/50 options where fixture count permits;
- numbered/Previous/Next pagination where fixture count permits;
- three real-data active-role summary cards;
- legacy direct URLs such as `/admin/users?role=INTERN` still initialize the correct filter even though they are absent from sidebar navigation.

**Partner Schools**
- search by name/code/location;
- Active/Inactive/All;
- sorting;
- 10/25/50 page-size control;
- pagination behavior when fixture volume permits;
- mobile cards and desktop table;
- no decorative KPI cards.

If the minimal integration fixture count is insufficient to exercise pagination, browser pagination can use a separately tagged fixture expansion approved at the fixture gate; do not pad the real product UI with fabricated production-like data.

### ANN-3 integration acceptance

After Notification schema readiness is approved and verified in the isolated database:

1. verify the `notifications` table and `notifications_recipient_dedupe_key` unique index exist in non-production;
2. sign in as Representative A;
3. publish the dedicated DRAFT announcement through the actual application action;
4. compute the expected eligible recipient set from fixture relationships;
5. confirm the announcement becomes `PUBLISHED`;
6. confirm each expected recipient has exactly one notification with dedupe key `announcement:<announcementId>:published`;
7. confirm excluded roles/users receive no notification for that announcement;
8. attempt the duplicate/repeat publication path and verify no duplicate notifications are created;
9. sign in as at least one recipient and verify unread-count/list/read behavior against the persisted notification.

The already-existing unit/source test for publication rollback on notification failure remains required. If database-level fault injection is desired, it must be a separate explicitly approved non-production test; do not alter Production permissions/schema or add a permanent application backdoor merely to simulate failure.

### Safe authenticated assignment-workflow acceptance

Use disposable assignment records only.

Verify:

1. Representative A can list Company A assignments;
2. Representative A can open Company A assignment detail;
3. direct navigation to Company B assignment is denied/not found;
4. Supervisor, Coordinator, Intern, and technical Admin cannot gain Representative assignment-management authority;
5. PENDING → ACTIVE succeeds on the dedicated pending fixture;
6. ACTIVE → COMPLETED succeeds on the dedicated completion fixture;
7. CANCELLED/TERMINATED paths are tested only on separate disposable records so one transition does not destroy another scenario;
8. an invalid lifecycle transition is rejected and leaves status unchanged;
9. Intern A detail shows credited hours from known `APPROVED Attendance.creditedMinutes`;
10. no assertion treats persisted assignment `renderedHours` as authoritative;
11. the known absence of a full independent post-provisioning create/edit/reassignment UI is recorded as a limitation rather than silently marked verified.

### Evidence and acceptance record

Each execution must produce a Gate A evidence bundle containing:

- run ID and date;
- non-secret environment fingerprint proving non-production separation;
- five primary role account identifiers without passwords;
- migration/schema readiness summary;
- 20-case T105 result matrix;
- screenshot paths;
- browser console/page-error summary;
- Users/Partner Schools interaction results;
- ANN-3 persisted-recipient/dedupe result;
- assignment lifecycle/isolation result;
- relevant source/unit test results;
- final GO / CONDITIONAL GO / NO-GO recommendation.

Never include secret keys, passwords, database URLs, auth tokens, cookies, or Production identifiers in the evidence bundle.

### Cleanup and rollback

Preferred cleanup is destruction/recreation of the entire disposable Supabase test project after evidence is retained.

If the project is kept temporarily for reruns, cleanup must:

1. identify records only by the Gate A run ID/deterministic fixture identifiers;
2. delete dependent fixture records in a transaction-safe order;
3. delete only Gate A Auth users marked with the run ID;
4. remove the local credential manifest after testing;
5. preserve screenshot/evidence artifacts only if they contain fixture-only data;
6. run a read-only verification that no Gate A fixture rows/accounts remain.

Do not implement reverse migrations. If schema verification corrupts or diverges in the disposable target, recreate the target. Production rollback is not part of Gate A.

### Separate human approval gates

**Gate E0 — Plan approval**
- approves this design only;
- no execution.

**Gate E1 — Browser tooling**
- separately approve adding Playwright dev tooling;
- separately approve browser-binary download only if system Chrome is insufficient.

**Gate E2 — Non-production environment creation/start**
- approve creating the disposable Supabase test project, or alternatively installing/starting a local Supabase/Docker stack;
- approve creation of `.env.gatea.local` and isolation preflight tooling;
- no migrations or fixtures yet.

**Gate E3 — Existing-schema activation in non-production**
- review exact target fingerprint and exact migration command;
- approve only the existing Gate A baseline migrations through Notification foundation;
- explicitly exclude `20260913090000_restore_branches`, Phase B/C migrations, `db push`, and Production.

**Gate E4 — Fixture creation**
- approve creation of disposable Auth accounts and tagged database fixtures;
- require successful isolation preflight first.

**Gate E5 — T105 browser execution**
- approve authenticated browser automation and screenshot/trace generation against the verified test target.

**Gate E6 — ANN-3 and assignment mutation verification**
- approve only the listed disposable announcement/assignment mutations in non-production;
- no Production data, deployment, push, or unrelated workflow testing.

**Gate A closure**
- only after E1–E6 evidence is reviewed;
- T105 rendered acceptance and ANN-3 integration must not be inferred from source tests.

None of these gates authorizes Phase B or Phase C.

---

## Risks and rollback

### Risk 1 — authorization regression

**Risk:** narrowing broad helpers may unintentionally block legitimate Supervisor/Coordinator/Representative reads.

**Control:**
- change server guards before/with navigation;
- add explicit allowed/forbidden tests per role;
- verify every mutation separately from list/detail read scope.

**Rollback:** revert the specific guard change, not the approved authority decision; do not restore Admin/Representative review authority as a convenience.

### Risk 2 — route/navigation simplification breaks deep links

**Control:**
- keep existing routes available where still authorized;
- change primary nav first;
- redirect only routes that are explicitly forbidden or retired.

**Rollback:** restore a compatibility link/redirect without restoring clutter to primary IA.

### Risk 3 — Feedback leaks peer relationships

**Control:**
- server-side relationship resolution;
- active assignment + same Supervisor + overlap check;
- no client-trusted assignment/supervisor IDs;
- narrow visibility queries.

**Rollback:** disable peer submission while preserving existing Feedback rows; do not expose broader scopes.

### Risk 4 — announcement publish without notifications

**Control:**
- one transaction;
- dedupe index;
- fail closed when Notification persistence is unavailable.

**Rollback:** keep announcement in Draft/Scheduled. Never mark it Published and claim delivery if required notification insertion failed.

### Risk 5 — aggregate metrics become misleading

**Control:**
- single canonical report module;
- formulas in this plan;
- no percentage when denominator is undefined/zero;
- disclose missing required-hours count.

**Rollback:** show raw counts only rather than inventing replacement percentages.

### Risk 6 — Portfolio AI overclaims

**Control:**
- existing redaction/grounding pipeline;
- structured output;
- no auto-write;
- explicit accept/save;
- source limitations shown.

**Rollback:** disable generation while keeping manual Portfolio editing and verified report evidence.

### Risk 7 — weekly Evaluation migration conflict

**Control:**
- migration is a separate gate;
- derived backfill key;
- duplicate inspection before unique constraint;
- non-production test first.

**Rollback:** recreate disposable non-production DB before production. Never edit an already-applied migration in place.

### Risk 8 — Branch migration accidentally coupled

**Control:**
- workmate rule explicitly ignores Branch;
- Branch remains compatibility-only;
- do not touch/apply `20260913090000_restore_branches` as part of 002.

---

## Gate A verification sequencing after approval

Phase A implementation and its task list already exist. Do **not** regenerate Phase A tasks or advance to Phase B merely because this verification plan is approved.

Execute only through the separate Gate E approvals defined above:

1. **E1** — approve browser-test tooling installation;
2. **E2** — approve creation/start of the isolated non-production environment and isolation preflight;
3. verify the non-secret environment fingerprint and stop if separation from Production is not proven;
4. **E3** — approve the exact existing-schema activation command for the disposable target, excluding Branch and all Phase B/C migrations;
5. **E4** — approve creation of disposable five-role plus minimal isolation fixtures;
6. **E5** — run the 20-case T105 browser matrix and role-authorized route sweeps;
7. **E6** — run ANN-3 persisted-notification and assignment lifecycle/isolation tests using fixture records only;
8. rerun relevant source/unit regression suites;
9. produce the final Gate A evidence bundle and GO / CONDITIONAL GO / NO-GO review;
10. **STOP at Gate A**.

Phase B weekly-Evaluation design remains a separately authorized future step only after Gate A is explicitly reviewed.

---

## Human approval required before Gate A verification execution

This plan does **not** authorize environment setup or test execution by itself.

Human approval is separately required for:

1. adding Playwright or any browser-test dependency;
2. downloading a browser binary if system Chrome is insufficient;
3. creating or starting a disposable Supabase/local test environment;
4. creating local Gate A environment/preflight configuration;
5. executing any existing migration in the non-production target;
6. creating disposable Auth accounts or fixture data;
7. running authenticated browser automation and screenshots;
8. running ANN-3 or assignment workflow mutations in non-production;
9. any change that broadens role authority or product scope;
10. any Phase B/C work, migration creation, deployment, push, or Production change.

The next workflow step after human approval should authorize **Gate E1 only**, unless the human explicitly combines multiple Gate E approvals.

All later gates must preserve the migration, Production, deployment, and Phase B/C boundaries above.
