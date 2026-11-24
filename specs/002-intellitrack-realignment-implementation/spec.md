# IntelliTrack Realignment Implementation — Specification

**Spec ID:** 002-intellitrack-realignment-implementation  
**Status:** Gate A PASS; Gate B3 PASS on verified isolated test DB; Phase C implementation and core lifecycle tests complete; **Gate C final decision BLOCKED** (13 conditional requirements and one isolation exception); Gate D not approved  
**Created:** 2026-11-03  
**Source audit:** `specs/001-intellitrack-realignment/report.md`  
**Approved decisions:** `DEC-2026-002` through `DEC-2026-014`, with `DEC-2026-001` retained as the foundational Admin-role decision  
**Implementation authorized:** Phases A and C implementation and isolated verification approved; Gate B3 weekly migration applied to the isolated test database only. The completed Gate C acceptance process records a BLOCKED decision in `phase-c-gate-c-convergence.md` and `phase-c-51-requirement-traceability.md`; Production migration and deployment remain unauthorized.

## Goal

Realign IntelliTrack to the approved capstone requirements by reducing role/navigation clutter, restoring least-privilege authorization, completing missing core requirements, and keeping only the minimum workflows needed to satisfy the product scope.

The implementation must preserve working Attendance behavior and operational data while converging the product around four business roles:

- Intern
- Company Supervisor
- School Coordinator
- Company Representative

System Administrator remains a technical/bootstrap/emergency role and is not a normal business persona.

## Source precedence

1. `02_core_requirements.md` is the canonical functional requirement set.
2. Approved `DEC-2026-*` decisions in `docs/product/decisions.md` may interpret, constrain, or extend requirements. A DEC supersedes a REQ only when it explicitly identifies the affected requirement and records a human-approved change.
3. IntelliTrack constitution in `.specify/memory/constitution.md`.
4. `specs/001-intellitrack-realignment/report.md` as the approved audit evidence and gap analysis.
5. Supporting product/architecture documentation where it does not conflict with canonical REQs or approved DECs.
6. Existing code as implementation evidence only.

Approved DECs override older supporting documentation and existing code. Existing code never overrides canonical REQs or approved DECs.

## Approved product decisions applied

| Decision | Implementation meaning |
|---|---|
| DEC-2026-002 | Workmate feedback must be genuine peer/workmate feedback, not relabeled Supervisor feedback |
| DEC-2026-003 | Company Representative is the routine document reviewer; Supervisor/Coordinator are scoped read-only where appropriate; Admin emergency-only |
| DEC-2026-004 | Coordinator is a focused school-scoped read-only monitoring role |
| DEC-2026-005 | Routine Attendance exception/correction decisions belong to assigned Supervisors |
| DEC-2026-006 | Representative operations are limited to the minimum internship-operating set |
| DEC-2026-007 | Admin has no routine business workflow authority |
| DEC-2026-008 | Intern confirms required hours once; Representative may correct with reason; Supervisor/Coordinator monitor; Admin emergency-only |
| DEC-2026-009 | Calendar/holidays, school announcements, extra reminders, and nonessential AI surfaces are deferred from primary V1 scope |
| DEC-2026-010 | Company reporting uses one canonical minimal aggregate |
| DEC-2026-011 | Weekly progress evaluations must be repeatable |
| DEC-2026-012 | Attendance selfies are evidence, not biometric identity/liveness |
| DEC-2026-013 | Four business roles + technical Admin is authoritative |
| DEC-2026-014 | Visible workflow states should be the minimum required while preserving legacy compatibility |

## 51-requirement implementation preservation matrix

Every canonical requirement must survive the realignment. Status means:

- **UNCHANGED / REGRESSION-PROTECTED** — current required behavior must continue to work; implementation may move or simplify UI without weakening the requirement.
- **MODIFIED** — `002` intentionally changes authorization, workflow presentation, or ownership while preserving the requirement outcome.
- **COMPLETED BY 002** — the 001 audit found the requirement missing/partial/contradicted and `002` must close that gap.

| Requirement | 002 status | Required outcome |
|---|---|---|
| REQ-FR-URM-1 | UNCHANGED / REGRESSION-PROTECTED | Secure credential login continues to work. |
| REQ-FR-URM-2 | UNCHANGED / REGRESSION-PROTECTED | Authorized logout continues to work. |
| REQ-FR-URM-3 | UNCHANGED / REGRESSION-PROTECTED | Authenticated-only application access remains enforced. |
| REQ-FR-URM-4 | MODIFIED | User-facing product converges to four business roles; technical Admin remains non-business under DEC-2026-001/013. |
| REQ-FR-URM-5 | MODIFIED | Role access is narrowed to the approved least-privilege model. |
| REQ-FR-URM-6 | MODIFIED | Unauthorized modules/data are denied server-side as well as hidden in UI. |
| REQ-FR-PRO-1 | UNCHANGED / REGRESSION-PROTECTED | Intern can maintain personal profile information. |
| REQ-FR-PRO-2 | COMPLETED BY 002 | Intern profile shows assigned company, department, supervisor, internship duration, rendered hours, and internship status. |
| REQ-FR-PRO-3 | UNCHANGED / REGRESSION-PROTECTED | Attendance summaries remain available without unnecessary duplication. |
| REQ-FR-PRO-4 | UNCHANGED / REGRESSION-PROTECTED | Internship performance summaries remain available to the Intern. |
| REQ-FR-PRO-5 | UNCHANGED / REGRESSION-PROTECTED | Required-document submission status remains visible. |
| REQ-FR-PRO-6 | COMPLETED BY 002 | Intern can view/update emergency contact name, number, and relationship. |
| REQ-FR-PRO-7 | UNCHANGED / REGRESSION-PROTECTED | Technical and soft skills remain visible using grounded evidence. |
| REQ-FR-ATT-1 | UNCHANGED / REGRESSION-PROTECTED | Intern Time In/Time Out remains available. |
| REQ-FR-ATT-2 | UNCHANGED / REGRESSION-PROTECTED | Attendance timestamps remain recorded. |
| REQ-FR-ATT-3 | UNCHANGED / REGRESSION-PROTECTED | Attendance GPS coordinates remain captured. |
| REQ-FR-ATT-4 | UNCHANGED / REGRESSION-PROTECTED | Geofence verification and current compatibility fallback remain intact. |
| REQ-FR-ATT-5 | UNCHANGED / REGRESSION-PROTECTED | Selfie evidence remains captured without identity/liveness claims. |
| REQ-FR-ATT-6 | UNCHANGED / REGRESSION-PROTECTED | Attendance history remains available. |
| REQ-FR-ATT-7 | MODIFIED | Only directly assigned Supervisors perform routine Attendance verification/review. |
| REQ-FR-ATT-8 | MODIFIED | Only directly assigned Supervisors decide Attendance correction requests. |
| REQ-FR-ATT-9 | UNCHANGED / REGRESSION-PROTECTED | Attendance analytics/summaries remain real and sourced from Attendance. |
| REQ-FR-DWL-1 | UNCHANGED / REGRESSION-PROTECTED | Intern submits daily Work Logs. |
| REQ-FR-DWL-2 | UNCHANGED / REGRESSION-PROTECTED | Work Log supporting evidence remains attachable. |
| REQ-FR-DWL-3 | UNCHANGED / REGRESSION-PROTECTED | Submitted Work Log history remains available. |
| REQ-FR-DWL-4 | MODIFIED | Direct Supervisor review is explicitly read-only; no approval queue is introduced. |
| REQ-FR-TSK-1 | MODIFIED | Supervisor assignment remains; visible state complexity may be reduced. |
| REQ-FR-TSK-2 | MODIFIED | Intern can view/act on own assigned Tasks with simplified visible states. |
| REQ-FR-TSK-3 | MODIFIED | Supervisor can monitor completion without unnecessary workflow states/authorities. |
| REQ-FR-EVL-1 | MODIFIED | Evaluation authoring/finalization is limited to directly assigned Supervisors. |
| REQ-FR-EVL-2 | COMPLETED BY 002 | Recurring weekly/progress Evaluation scores are supported for distinct weeks. |
| REQ-FR-EVL-3 | UNCHANGED / REGRESSION-PROTECTED | Overall performance summaries remain available from finalized Evaluations. |
| REQ-FR-EVL-4 | COMPLETED BY 002 | Genuine eligible workmate feedback is collected. |
| REQ-FR-EVL-5 | UNCHANGED / REGRESSION-PROTECTED | Intern views own completed/finalized Evaluations. |
| REQ-FR-AI-1 | COMPLETED BY 002 | System generates a reviewable Portfolio draft from verified internship records. |
| REQ-FR-AI-2 | COMPLETED BY 002 | Generated Portfolio can use authorized genuine workmate feedback. |
| REQ-FR-AI-3 | UNCHANGED / REGRESSION-PROTECTED | Generated Portfolio continues using authorized finalized performance information. |
| REQ-FR-AI-4 | COMPLETED BY 002 | Intern can view and export the generated Portfolio artifact. |
| REQ-FR-AI-5 | UNCHANGED / REGRESSION-PROTECTED | Skill identification remains grounded in internship evidence. |
| REQ-FR-AI-6 | UNCHANGED / REGRESSION-PROTECTED | Productivity insights remain grounded in internship activity. |
| REQ-FR-AI-7 | COMPLETED BY 002 | Growth view shows skill evidence/progress over time without fabricated proficiency scores. |
| REQ-FR-DOC-1 | MODIFIED | Normal required-document upload is Intern-owned. |
| REQ-FR-DOC-2 | UNCHANGED / REGRESSION-PROTECTED | Document submission/review status remains visible. |
| REQ-FR-DOC-3 | MODIFIED | Company Representative is routine company-document reviewer; other staff visibility is scoped/read-only. |
| REQ-FR-ANN-1 | MODIFIED | Company Representative alone performs routine Company announcement management/publishing. |
| REQ-FR-ANN-2 | UNCHANGED / REGRESSION-PROTECTED | Intern continues to view eligible Company announcements. |
| REQ-FR-ANN-3 | COMPLETED BY 002 | Publishing a Company announcement creates truthful, deduplicated in-app notifications for eligible recipients. |
| REQ-FR-REP-1 | UNCHANGED / REGRESSION-PROTECTED | Supervisor internship reports remain available for directly assigned Interns. |
| REQ-FR-REP-2 | UNCHANGED / REGRESSION-PROTECTED | Coordinator reports remain school-scoped. |
| REQ-FR-REP-3 | COMPLETED BY 002 | Representative receives one canonical Company internship report. |
| REQ-FR-REP-4 | COMPLETED BY 002 | Canonical internship statistics/summaries are provided from authoritative records. |

## In scope

### 1. Role navigation and information architecture simplification

Implement role-focused navigation using the approved conceptual IA.

#### Intern

Primary:
- Home
- Attendance
- Work Logs
- Tasks

Secondary / More:
- Growth
- Documents
- Updates
- Profile/account

“Growth” should consolidate Evaluations, evidence-based Skills/Insights, and Portfolio access rather than exposing each as an equal top-level destination.

#### Company Supervisor

Primary:
- Home
- Interns
- Reviews
- Tasks
- Evaluations
- Reports

Secondary / More:
- scoped Documents
- Updates/Profile as needed

“Reviews” should consolidate Attendance exceptions, Attendance corrections, and read-only review of submitted Work Logs.

#### School Coordinator

Primary:
- Home
- Students
- Reports

Secondary / More:
- approved/appropriate Documents
- Profile/account

Student detail should surface school-scoped Attendance/rendered-hours progress and finalized Evaluations without creating separate management authority.

#### Company Representative

Primary:
- Home
- Interns / Operations
- Announcements
- Reports

Secondary / More:
- only the minimum operations approved by DEC-2026-006

Routine Attendance/Correction review must not appear as a Representative action.

#### System Administrator

Primary:
- Home
- Users
- System

Secondary:
- explicit technical recovery/maintenance functions only

No ordinary business workflow navigation.

### 2. Authorization realignment

Server-side authorization must be changed together with navigation. Hiding a link is not sufficient.

Required boundaries:

- Intern: own records/actions only, plus approved peer-feedback capability.
- Supervisor: directly assigned Interns only.
- Coordinator: school-scoped read-only monitoring only.
- Representative: company-scoped operations explicitly approved by DEC-2026-006 plus Announcements and Company reports.
- Admin: technical/bootstrap/emergency only; ordinary business actions forbidden.

Specific corrections:
- Attendance exception review: Supervisor only.
- Attendance correction decision: Supervisor only.
- Work Log review: Supervisor read-only for directly assigned Interns; no routine Representative/Admin review workflow.
- Tasks: creation/update/review authority remains Supervisor; Intern can act on own assigned Tasks; Coordinator/Representative/Admin should not receive routine Task workflow authority unless a requirement explicitly needs read-only reporting data.
- Evaluations: Supervisor authors/finalizes; Intern views own finalized records; Coordinator may read finalized school-scoped results; Representative/Admin have no routine Evaluation workspace authority unless required for aggregate reporting without exposing unnecessary record detail.
- Documents: Representative is routine reviewer; Supervisor/Coordinator read-only only where approved and scoped; Admin emergency-only.
- Announcements: Representative publishes; Admin does not routinely publish.
- Portfolio/Reports/Insights: scope to the minimum role requirement rather than reusing one broad authorization helper for every role.

### 3. Intern profile completion and emergency contact management

Complete `REQ-FR-PRO-2` and `REQ-FR-PRO-6`.

The Intern profile must display all required internship details in one coherent profile/progress context:
- assigned company;
- department;
- directly assigned Supervisor;
- internship duration/start and end dates;
- rendered hours from approved Attendance credited minutes;
- internship status.

The Intern must also be able to view and update:
- emergency contact name;
- emergency contact number;
- emergency contact relationship.

Use the existing InternshipAssignment/InternProfile fields where available. Do not create duplicate emergency-contact or internship-detail storage unless planning proves it necessary.

Emergency-contact data must not be shown in public/profile surfaces or broader staff views where it is not required.

### 4. Workmate feedback

Complete `REQ-FR-EVL-4` and enable `REQ-FR-AI-2`.

Requirements:
- Feedback must come from an eligible peer/workmate relationship rather than being mislabeled Supervisor feedback.
- No fifth normal business role may be added.
- An eligible workmate is **another active Intern who shares the same directly assigned Company Supervisor during an overlapping active internship period**.
- Workmate eligibility and recipient identity must be resolved server-side from active assignment relationships; client input cannot select an unrelated Intern.
- Self-feedback is forbidden.
- Workmate eligibility must not depend on the Branch migration.
- Workmate feedback is not public or anonymous.
- The recipient Intern may view feedback intended for them; the recipient's directly assigned Supervisor may view it only where needed for internship evaluation/coaching. Coordinator, Representative, and Admin do not receive a routine Feedback workspace from this capability.
- AI/Portfolio evidence may use only feedback authorized and visible to the subject Intern.
- Supervisor-authored coaching/performance guidance, if retained, must remain clearly distinct from workmate feedback.

### 5. Weekly progress evaluations

Complete `REQ-FR-EVL-2`.

Required behavior:
- A Supervisor can record recurring weekly/progress evaluations for a directly assigned active Intern.
- More than one weekly/progress evaluation must be possible for the same assignment.
- A weekly period is **Monday 00:00 through Sunday 23:59:59** in the internship/company timezone; use `Asia/Manila` when no more specific configured timezone applies.
- Each weekly record must have one canonical period identity derived from that timezone-aware week.
- Duplicate weekly/progress records for the same assignment and canonical week/period must be prevented.
- Existing INITIAL/MIDTERM/FINAL records must remain valid.
- Finalized records remain immutable/read-only except through an explicitly approved correction mechanism if one is later required.
- Coordinator access remains finalized + school-scoped.
- Intern access remains own finalized records.

This will require a forward-only schema/migration design. Migration creation/execution is **not authorized** by this spec.

### 6. Announcement notification delivery

Complete `REQ-FR-ANN-3`.

V1 Company announcement audiences are:
- `ALL_USERS`;
- `INTERNS`;
- `SUPERVISORS`;
- `REPRESENTATIVES`;
- `COMPANY`.

`SCHOOL`, `COORDINATORS`, and `ADMINISTRATORS` are not V1 authoring targets. Existing legacy records using those audience values must remain readable where safely compatible, but new routine V1 publishing must not expose them as normal authoring choices.

When a Company Representative publishes a Company announcement:
- eligible **active** recipients matching the selected supported audience must receive an in-app notification;
- `ALL_USERS` may include any active business-role user entitled to read Company announcements, but it must not create routine business authority for technical Admin;
- notification recipient scope must be resolved server-side;
- notification creation must be server-side and deduplicated;
- publication and notification persistence must be treated as one truthful operation: if required notification persistence is unavailable or fails, the announcement must remain unpublished and the user receives a controlled error;
- if there are genuinely zero eligible recipients, publication may succeed with zero notifications and must not claim recipients were notified;
- notification UI must never claim delivery for records that were not persisted.

The implementation plan must first verify whether the Notification table migration is active in an explicitly verified non-production environment. Do not query or mutate the current Production-backed database merely to satisfy this planning step.

### 7. Company aggregate reporting

Complete `REQ-FR-REP-3` and `REQ-FR-REP-4` with one canonical Company report.

Minimum metrics:
- active Intern count;
- rendered vs required internship hours;
- Attendance exception count/rate;
- Evaluation completion;
- internship completion status.

Rules:
- metrics must come from authoritative stored records;
- rendered hours come only from approved Attendance credited minutes;
- no fake trends or inferred percentages;
- every metric definition must have one canonical calculation;
- Company Representative sees company scope only;
- other roles receive only their already-required scoped reports.

### 8. Portfolio, skills progression, and AI alignment

Complete `REQ-FR-AI-1` through `REQ-FR-AI-7` without making AI the center of the product.

Required:
- Intern can maintain/view a Portfolio.
- The system must **generate a reviewable grounded Portfolio draft from verified internship records**; generation is not optional once the Intern invokes the generation workflow.
- Generated content must not be silently persisted. The Intern must review and explicitly accept/save generated Portfolio content before it becomes persisted Portfolio content.
- Verified system records must remain distinguishable from Intern-written or AI-generated narrative.
- Genuine workmate feedback may be used only after DEC-2026-002 behavior exists and only when authorized/visible to the subject Intern.
- Performance/evaluation evidence may be included only from authorized finalized records.
- AI output must be clearly labeled as generated, expose source limitations, and require review before persistence.
- No AI output may automatically approve, evaluate, discipline, rank, hire, terminate, or change workflow state.
- The Intern must be able to view and export the resulting generated Portfolio artifact. A generic internship report must not be mislabeled as the generated Portfolio.
- Technical/soft-skill identification and productivity insights must remain grounded in dated internship evidence.
- The Growth experience must display **skill evidence/progress over time** using dated evidence (for example, when a skill appears across submitted Work Logs, completed Tasks, approved/visible feedback, or finalized Evaluations). It must not fabricate proficiency scores, growth percentages, or unsupported skill rankings.
- Existing grounded/redacted AI safety behavior should be preserved.

AI Evaluation/Report drafting that does not directly satisfy the core Portfolio requirements is optional/deferred and should not occupy primary navigation.

### 9. Workflow-state simplification

Apply DEC-2026-014 without destructive data loss.

#### Work Logs
- active UX: DRAFT → SUBMITTED;
- submitted logs are read-only;
- Supervisor can review/read submitted logs;
- no approval/reject/revision queue unless a future approved decision adds it;
- credited hours never come from Work Logs.

#### Tasks
Retain only visible states necessary to:
- assign work;
- show active/progress state;
- let Intern indicate completion/submission when needed;
- let Supervisor monitor/confirm completion when required.

Planning must identify which existing states can become hidden/legacy without breaking stored data.

#### Announcements
Prefer visible DRAFT / PUBLISHED / ARCHIVED behavior unless scheduling is proven necessary for V1. Existing scheduled/cancelled/expired data must remain readable/compatible.

#### Documents
- Normal required-document upload is Intern-owned.
- Company Representative performs routine company-scoped review.
- Supervisor receives directly assigned Intern read-only visibility where useful.
- Coordinator receives school-scoped read-only visibility only for appropriate non-sensitive document categories.
- Admin has no routine Document workflow.
- Representative uploads are not part of the normal V1 required-document flow and must not be auto-approved merely because the uploader is a Representative.
- Retain PENDING_REVIEW / APPROVED / REJECTED plus safe technical replacement/archive lifecycle as needed.

No enum/data deletion is authorized at specification stage.

### 10. Deferred/non-core surfaces

The following must not remain primary V1 navigation unless a later approved decision changes scope:
- Internship Calendar / holiday management;
- school announcement workflows;
- generic milestone/reminder systems;
- nonessential AI drafting surfaces;
- broad Admin business operations;
- stale role-switch/five-business-role UI.

Existing code/data may be hidden, retired, or preserved behind compatibility paths according to the later implementation plan. Do not delete operational data casually.

### 11. Responsive and product UX convergence

The simplified IA must work at:
- 390 px
- 768 px
- 1024 px
- 1440 px

Requirements:
- mobile keeps role-specific primary destinations plus More;
- desktop should not expand into a long list of every available feature;
- dashboards prioritize the role’s next actions and key progress rather than duplicating every module;
- no fake metrics or decorative trend claims;
- terminology stays consistent with approved role names and Attendance language.

## Out of scope

- public signup;
- role switching;
- a fifth normal business role;
- facial identity recognition, biometric matching, or liveness detection;
- deployment;
- production database changes;
- migration execution;
- Branch migration execution;
- destructive cleanup of legacy records;
- rewriting applied migrations;
- generic HR, payroll, recruitment, or LMS features;
- new calendar/holiday expansion;
- school-wide announcement platform;
- new reminder/milestone framework;
- redesigning `01_project_vision.md`.

## User scenarios

### S-01 — Intern daily use
An Intern signs in and can reach Attendance, Work Logs, Tasks, Growth, Documents, Updates, and Profile without navigating through unrelated company/admin modules. The Intern can manage emergency contacts and only their own internship records.

### S-02 — Supervisor review
A Supervisor sees directly assigned Interns, Attendance exceptions/corrections, submitted Work Logs, Tasks, Evaluations, and Reports. The Supervisor cannot review another Supervisor’s Interns and has no Company Operations access.

### S-03 — Coordinator monitoring
A Coordinator sees school-scoped students, rendered hours/Attendance progress, finalized Evaluations, Reports, and approved Documents where allowed. The Coordinator cannot approve, publish, assign, review, or manage company workflows.

### S-04 — Representative operations
A Representative can run the approved minimum internship operations, publish Company announcements, review internship Documents, and view the canonical Company report. Attendance/Correction decision actions are absent.

### S-05 — Technical Admin
An Admin can perform technical user/system maintenance but does not appear as an operational internship manager and cannot routinely execute business review/publishing workflows.

### S-06 — Weekly evaluation
A Supervisor can create multiple weekly/progress Evaluation records for the same Intern across different weeks without conflicting with prior weekly records.

### S-07 — Workmate feedback
An active Intern can submit workmate feedback only for another active Intern who shares the same directly assigned Company Supervisor during an overlapping active internship period. Self-feedback and client-selected unrelated recipients are rejected. The subject Intern/AI can consume only feedback authorized for that Intern.

### S-08 — Announcement notification
A Company Representative publishes to a supported V1 Company audience. Eligible active recipients receive deduplicated in-app notifications as part of the same truthful publish operation. If required notification persistence is unavailable, the announcement remains unpublished and a controlled error is shown.

## Functional acceptance criteria

- **AC-F-01:** Intern can view/update all emergency-contact fields required by PRO-6.
- **AC-F-02:** Submitted Work Logs remain read-only journals and are available for direct Supervisor review without introducing an approval queue.
- **AC-F-03:** Tasks continue to satisfy assignment, Intern visibility/progress, and Supervisor completion monitoring with fewer visible states where safe.
- **AC-F-04:** Weekly/progress Evaluations can repeat for different canonical Monday–Sunday periods in the internship/company timezone while duplicate records for the same assignment/week are prevented.
- **AC-F-05:** Genuine workmate feedback exists and is distinct from Supervisor feedback/coaching.
- **AC-F-06:** Announcement publishing invokes real notification delivery for eligible recipients with deduplication and truthful atomic failure handling.
- **AC-F-07:** One canonical Company aggregate report implements the DEC-2026-010 metrics.
- **AC-F-08:** Portfolio/AI evidence uses only authorized grounded records and may incorporate authorized genuine workmate feedback and finalized performance information.
- **AC-F-09:** Required-hours ownership remains consistent with DEC-2026-008.
- **AC-F-10:** Deferred non-core features are removed from primary navigation without destructive data deletion.
- **AC-F-11:** Intern profile displays every REQ-FR-PRO-2 detail: assigned company, department, Supervisor, internship duration, rendered hours, and internship status.
- **AC-F-12:** Invoking Portfolio generation produces a reviewable AI-generated Portfolio draft from verified internship records; generated text is labeled and is not persisted until the Intern explicitly accepts/saves it.
- **AC-F-13:** Intern can view and export the generated Portfolio artifact; export content/labeling must represent a Portfolio rather than silently reusing a differently scoped generic report.
- **AC-F-14:** Growth displays dated skill evidence/progress throughout the internship without fabricated proficiency scores, growth percentages, or unsupported rankings.
- **AC-F-15:** Normal required-document upload is Intern-owned; Company Representative performs routine company-scoped review; Representative uploads are not silently auto-approved as the normal V1 flow.
- **AC-F-16:** New V1 announcement authoring exposes only ALL_USERS, INTERNS, SUPERVISORS, REPRESENTATIVES, and COMPANY audiences; SCHOOL, COORDINATORS, and ADMINISTRATORS remain legacy/deferred authoring values.

## Authorization acceptance criteria

- **AC-A-01:** Every business action has a server-side role/scope guard.
- **AC-A-02:** Attendance exception/correction decisions accept only the directly assigned Supervisor.
- **AC-A-03:** Representative and Admin cannot execute routine Attendance/Correction review actions.
- **AC-A-04:** Work Log review access is directly assigned Supervisor read-only; Intern ownership remains isolated.
- **AC-A-05:** Task mutation/review authority is Supervisor/own-Intern only as appropriate; Coordinator/Representative/Admin cannot mutate routine Task workflows.
- **AC-A-06:** Evaluation mutation is Supervisor-only for directly assigned Interns; Coordinator is finalized school-scoped read-only.
- **AC-A-07:** Document review is Representative company-scoped; Admin is not a routine reviewer.
- **AC-A-08:** Announcement management/publishing is Representative company-scoped; Admin routine publishing is denied.
- **AC-A-09:** Coordinator cannot approve/manage company workflows.
- **AC-A-10:** Admin ordinary business routes/actions are forbidden or absent from normal navigation.
- **AC-A-11:** Portfolio/Insights/Reports use the narrowest role-specific scope instead of a broad shared all-role viewer where that would grant unnecessary access.
- **AC-A-12:** Workmate-feedback eligibility is enforced server-side and cannot be client-selected to escape the active internship relationship.
- **AC-A-13:** Workmate feedback is allowed only between distinct active Interns sharing the same directly assigned Supervisor during an overlapping active internship period; self-feedback and unrelated recipients are denied.
- **AC-A-14:** Workmate-feedback routine visibility is limited to the subject Intern and the subject Intern's directly assigned Supervisor where needed; Coordinator, Representative, and Admin do not gain a routine Feedback workspace from this capability.
- **AC-A-15:** Announcement publishing accepts only a Company Representative in company scope and resolves eligible active recipients server-side; unsupported/deferred audience choices cannot be newly authored.

## UX acceptance criteria

- **AC-U-01:** Desktop navigation follows the approved role-focused IA and does not expose every feature as a peer.
- **AC-U-02:** Mobile retains role-specific primary destinations plus More.
- **AC-U-03:** Coordinator primary navigation is Home / Students / Reports, with approved Documents secondary.
- **AC-U-04:** Representative primary navigation does not include Attendance Review or Correction Review.
- **AC-U-05:** Admin primary navigation is technical (Home / Users / System), not business-operational.
- **AC-U-06:** Intern Growth consolidates Evaluations/Skills/Insights/Portfolio instead of multiplying top-level destinations.
- **AC-U-07:** Dashboards show real next actions and key progress without duplicated module summaries.
- **AC-U-08:** 390/768/1024/1440 responsive checks pass with no horizontal overflow or hidden primary actions.
- **AC-U-09:** Stale five-role, role-switch, “School Administrator,” and equivalent conflicting terminology is absent from active user-facing UI.

## Safety and truthfulness acceptance criteria

- **AC-S-01:** Attendance selfie copy never claims identity, biometric matching, anti-spoofing, or liveness.
- **AC-S-02:** Rendered/credited hours derive only from approved Attendance.
- **AC-S-03:** AI output remains grounded, redacted, labeled, review-required, and non-authoritative.
- **AC-S-04:** Notification UI never claims delivery when persistence failed or the notification infrastructure is unavailable.
- **AC-S-05:** Reports/metrics use authoritative stored records and canonical calculations; no fake trends or placeholder operational data.
- **AC-S-06:** Emergency-contact and other sensitive profile fields are exposed only to authorized surfaces.
- **AC-S-07:** No public signup or role switching is introduced.

## Implementation planning constraints

The future Plan must separate work into independently verifiable phases rather than one large implementation batch.

### Phase A — code-only realignment

Plan code-only work first where no schema change is required, including:
- role/navigation and dashboard simplification;
- authorization corrections;
- emergency-contact profile UI/actions using existing fields;
- workmate feedback using the existing Feedback model if source inspection confirms it can satisfy this spec safely;
- document ownership/review corrections;
- Company aggregate reporting;
- Portfolio/Growth UX and grounded generation/export alignment where current schema permits;
- Admin separation;
- announcement notification wiring only if the notification schema is verified active in a non-production environment.

### Phase B — schema/migration design

Design, but do not execute, schema-dependent changes for recurring weekly Evaluations and any other persistence change proven unavoidable. Migration creation/execution requires a separate explicit human approval gate.

### Phase C — schema-dependent implementation

Only after migration design and non-production migration approval/testing may schema-dependent Evaluation behavior be implemented and converged.

### Test disposition

The Plan must classify existing relevant tests as one of:
- **PRESERVE** — still asserts approved behavior;
- **REWRITE** — currently asserts behavior superseded by approved REQs/DECs;
- **REMOVE STALE** — tests obsolete/deferred behavior with no approved requirement;
- **ADD** — new coverage required for missing/changed requirements.

Passing tests that encode current authority drift are not evidence that the drift should be preserved.

## Data and migration impact

### Expected schema/migration work

`DEC-2026-011` requires a forward-only Evaluation schema change so recurring weekly/progress records can coexist. The exact design must be produced in the Plan stage and reviewed before any migration file is created or executed.

Workmate feedback should reuse existing models if that can satisfy the approved behavior safely; planning must justify any schema extension.

### Existing migration constraints

- Applied migrations are immutable.
- Branch migration remains separately controlled and must not be bundled casually into this realignment.
- Notification migration presence in source does not prove database activation.
- Do not run `migrate dev`, `migrate deploy`, `db push`, seeds, backfills, or production writes without separate explicit approval.

## Verification requirements for later implementation

Before implementation is accepted:
- typecheck and lint must pass;
- role/authorization tests must be rewritten to assert the **approved** authority model rather than current drift;
- requirement-specific tests must cover missing requirements;
- existing Attendance behavior must regress cleanly;
- responsive checks must cover 390/768/1024/1440;
- schema-dependent tests must run against an explicitly verified non-production database before migration approval;
- Production-backed evaluation accounts must not be used for interactive mutation testing.

## Planning questions

These are technical planning questions, not reopened product decisions:

1. What forward-only Evaluation uniqueness/index structure best represents the already-defined Monday–Sunday canonical weekly period while preserving INITIAL/MIDTERM/FINAL history?
2. Is the Notification table active in an available explicitly verified non-production environment, or must notification activation be a separate migration phase?
3. Which current Task states can become hidden legacy states without losing operational history?
4. Which deferred Calendar/AI/operations routes should be hidden first versus fully retired after dependency analysis?
5. Can Portfolio export reuse the existing report PDF rendering infrastructure while still producing a separately composed and honestly labeled generated Portfolio artifact, or should export composition be separated?
6. Can the existing Feedback model satisfy the approved same-Supervisor overlapping-active-Intern rule without schema extension, and what indexes/tests are needed to keep the relationship check efficient and safe?

## Approval gate

This specification records the approved product direction but **does not authorize implementation**.

Next required stages:

1. `/speckit.analyze specs/002-intellitrack-realignment-implementation`
2. `/speckit.plan specs/002-intellitrack-realignment-implementation`
3. `/speckit.tasks specs/002-intellitrack-realignment-implementation`
4. Human approval of the implementation plan/tasks
5. Only then may code changes begin

Migration creation/execution and deployment remain separately approval-gated even after implementation approval.
