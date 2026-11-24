# Product Decision Log

Use this file for decisions that intentionally interpret or change product behavior. Do not rewrite historical requirements silently.

## Format
### DEC-YYYY-NNN — Title
- **Date:** YYYY-MM-DD
- **Status:** Proposed | Approved | Rejected | Superseded
- **Context:** Why a decision is needed.
- **Decision:** What is being decided.
- **Requirement impact:** Requirement IDs affected, if any.
- **Roles affected:** Roles affected.
- **Consequences:** What becomes simpler, different, or newly constrained.

## Existing interpretation
### DEC-2026-001 — System Administrator is technical, not a normal business role
- **Date:** 2026-11-03
- **Status:** Approved
- **Context:** Core requirements define four business roles while the implementation contains an ADMIN role.
- **Decision:** Keep System Administrator as an internal bootstrap, recovery, and technical-maintenance role. Do not market or design it as a fifth normal internship-management persona.
- **Requirement impact:** REQ-FR-URM-4 through REQ-FR-URM-6 remain the business-role source.
- **Roles affected:** System Administrator, Company Representative.
- **Consequences:** Business operations should not drift into Admin merely because Admin has technical access.

## Approved realignment decisions — 001 audit closure

The following decisions were explicitly approved by the human product owner on **2026-11-03** after review of `specs/001-intellitrack-realignment/report.md`.

### DEC-2026-002 — Workmate feedback must be genuine peer/workmate feedback
- **Date:** 2026-11-03
- **Status:** Approved
- **Context:** `REQ-FR-EVL-4` requires workmate feedback, while the current Feedback workflow is Supervisor-authored.
- **Decision:** Add a minimal genuine peer/workmate feedback flow scoped to active internship relationships. Do not relabel Supervisor feedback as workmate feedback.
- **Requirement impact:** REQ-FR-EVL-4, REQ-FR-AI-2.
- **Roles affected:** Intern, Company Supervisor, eligible workmates/peers.
- **Consequences:** Feedback authorship and visibility must be explicit, least-privilege, and usable as grounded Portfolio/AI evidence.

### DEC-2026-003 — Company Representative owns routine document review
- **Date:** 2026-11-03
- **Status:** Approved
- **Context:** `REQ-FR-DOC-3` says authorized users review documents but does not name the routine reviewer.
- **Decision:** Company Representative is the routine reviewer for required company internship documents. Company Supervisor and School Coordinator may receive scoped read-only visibility where useful. System Administrator is emergency-only.
- **Requirement impact:** REQ-FR-DOC-1 through REQ-FR-DOC-3.
- **Roles affected:** Intern, Company Representative, Company Supervisor, School Coordinator, System Administrator.
- **Consequences:** Routine Admin document management must be removed from the normal business experience. Ordinary Representative uploads should not be silently treated as reviewed unless the workflow explicitly justifies it.

### DEC-2026-004 — School Coordinator is a focused read-only monitoring role
- **Date:** 2026-11-03
- **Status:** Approved
- **Context:** Current Coordinator navigation exposes Tasks, Feedback, Insights, Portfolio, Announcements, and Reports even though the core role is school-scoped monitoring.
- **Decision:** Focus the Coordinator experience on school-scoped students, attendance/rendered hours, finalized evaluations, reports, and approved/appropriate documents. Tasks, Feedback, Portfolio, and general Announcements are not primary Coordinator modules.
- **Requirement impact:** REQ-FR-URM-5, REQ-FR-URM-6, REQ-FR-REP-2.
- **Roles affected:** School Coordinator.
- **Consequences:** Coordinator navigation and server access must remain read-only and school-scoped.

### DEC-2026-005 — Attendance and correction decisions belong to Company Supervisors
- **Date:** 2026-11-03
- **Status:** Approved
- **Context:** Current Attendance review guards also allow Company Representative and System Administrator.
- **Decision:** Routine Attendance exception verification and correction approval/rejection belong to the directly assigned Company Supervisor. Company Representative may have operational visibility but not routine decision authority. System Administrator has no routine decision authority.
- **Requirement impact:** REQ-FR-ATT-7, REQ-FR-ATT-8, REQ-FR-URM-5, REQ-FR-URM-6.
- **Roles affected:** Company Supervisor, Company Representative, System Administrator.
- **Consequences:** Review guards, routes, dashboards, and navigation must be tightened to the Supervisor boundary.

### DEC-2026-006 — Company Representative operations use the minimum necessary scope
- **Date:** 2026-11-03
- **Status:** Approved
- **Context:** Current Company Operations surfaces exceed the 51 core requirements.
- **Decision:** The Representative may perform the smallest operational set needed to run the internship: provision/deactivate normal business users, create/maintain internship assignments, associate Supervisors and Coordinators, maintain partner-school references required by assignments, and maintain attendance worksite configuration only when that worksite capability is separately active/approved.
- **Requirement impact:** REQ-FR-URM-5, REQ-FR-URM-6; supports operational delivery of the approved internship workflows.
- **Roles affected:** Company Representative, Intern, Company Supervisor, School Coordinator.
- **Consequences:** Generic platform/company administration that does not serve the internship workflow should not appear as ordinary Representative scope.

### DEC-2026-007 — System Administrator has no routine business workflow authority
- **Date:** 2026-11-03
- **Status:** Approved
- **Context:** The audit confirmed Admin business-navigation and review drift.
- **Decision:** Reaffirm `DEC-2026-001`: System Administrator remains technical/bootstrap/emergency. No routine Attendance, Work Log, Task, Evaluation, Document, Announcement, Portfolio, Report, or company-operations authority is granted by default.
- **Requirement impact:** REQ-FR-URM-4 through REQ-FR-URM-6.
- **Roles affected:** System Administrator.
- **Consequences:** Future implementation should separate Admin navigation and guards from normal business workflows. Any exceptional business intervention must be explicit and bounded.

### DEC-2026-008 — Required internship hours ownership is approved
- **Date:** 2026-11-03
- **Status:** Approved
- **Context:** Required hours are necessary for meaningful progress but ownership was interpretive rather than a numbered core requirement.
- **Decision:** Intern confirms required hours once during onboarding. Company Representative may correct them later with a required reason. Company Supervisor and School Coordinator monitor them. System Administrator may perform emergency correction only.
- **Requirement impact:** Supports REQ-FR-PRO-3, REQ-FR-ATT-9, REQ-FR-REP-1 through REQ-FR-REP-4.
- **Roles affected:** All roles.
- **Consequences:** Keep the honest unset state and avoid a broad onboarding workflow beyond what is needed.

### DEC-2026-009 — Defer non-core calendar, school-announcement, reminder, and extra AI surfaces
- **Date:** 2026-11-03
- **Status:** Approved
- **Context:** Calendar/holidays, school announcements, milestones/reminders, and several AI drafting surfaces increase scope and navigation density beyond the core requirements.
- **Decision:** Defer Calendar/holidays and school announcements from primary V1 navigation. Defer extra milestone/reminder workflows. Treat AI Evaluation/Report drafting as optional, non-headline assistance. Retain AI assistance where it directly satisfies the Portfolio requirements.
- **Requirement impact:** Protects focus on REQ-FR-* scope; AI-1 through AI-7 remain the AI source of truth.
- **Roles affected:** All business roles.
- **Consequences:** Existing code may remain for compatibility until an approved implementation plan decides whether to hide, remove, or retire it safely.

### DEC-2026-010 — Company reporting uses one minimal aggregate
- **Date:** 2026-11-03
- **Status:** Approved
- **Context:** REQ-FR-REP-3 and REQ-FR-REP-4 are only partially satisfied by individual Intern reports and dashboard metrics.
- **Decision:** Provide one focused Company report containing active Intern count, rendered versus required hours, Attendance exception count/rate, Evaluation completion, and internship completion status. Avoid redundant decorative dashboards/report variants.
- **Requirement impact:** REQ-FR-REP-3, REQ-FR-REP-4.
- **Roles affected:** Company Representative; supporting scoped views may be used by other roles only where already required.
- **Consequences:** Reporting should have one canonical source/calculation per metric.

### DEC-2026-011 — Weekly progress evaluations must be repeatable
- **Date:** 2026-11-03
- **Status:** Approved
- **Context:** `REQ-FR-EVL-2` requires weekly evaluation scores, but the current unique assignment/evaluation-type constraint permits only one PROGRESS evaluation.
- **Decision:** Future Evaluation data design must support repeated weekly progress evaluations identified by week/date/period rather than a single unique PROGRESS row per assignment.
- **Requirement impact:** REQ-FR-EVL-2, REQ-FR-EVL-3.
- **Roles affected:** Company Supervisor, Intern, School Coordinator.
- **Consequences:** A forward-only schema/migration change will be required. Migration creation/execution remains separately gated and is not authorized by this decision alone.

### DEC-2026-012 — Attendance selfies are evidence, not biometric identity
- **Date:** 2026-11-03
- **Status:** Superseded by DEC-2026-019 (2026-11-24)
- **Context:** Attendance requires selfie evidence but does not require facial identity recognition or liveness.
- **Decision:** Selfie capture verifies that attendance evidence was captured with acceptable framing/face presence. Do not claim identity matching, biometric recognition, anti-spoofing, or liveness.
- **Requirement impact:** REQ-FR-ATT-5.
- **Roles affected:** Intern, Company Supervisor.
- **Consequences:** Preserve evidence-only copy, storage, and review semantics.

### DEC-2026-013 — Four business roles plus technical Admin is authoritative
- **Date:** 2026-11-03
- **Status:** Approved
- **Context:** Older design guidance describes a fifth business persona and role switching.
- **Decision:** Intern, Company Supervisor, School Coordinator, and Company Representative are the four normal business roles. System Administrator is technical only. Role-switch and five-business-role guidance is stale.
- **Requirement impact:** REQ-FR-URM-4 through REQ-FR-URM-6.
- **Roles affected:** All roles.
- **Consequences:** Future IA, terminology, navigation, and authorization must follow this model.

### DEC-2026-014 — Visible workflow states should be the minimum required
- **Date:** 2026-11-03
- **Status:** Approved
- **Context:** Several schemas retain more workflow states than the approved product behavior needs.
- **Decision:** Simplify visible workflows while preserving legacy data compatibility: Work Logs use active DRAFT/SUBMITTED behavior; Tasks retain only states proven necessary for assignment/completion monitoring; Announcements default to a simple DRAFT/PUBLISHED/ARCHIVED experience unless scheduling is separately justified; Documents keep review/replacement/archive states needed for safe document handling.
- **Requirement impact:** REQ-FR-DWL-1 through DWL-4, REQ-FR-TSK-1 through TSK-3, REQ-FR-DOC-1 through DOC-3, REQ-FR-ANN-1 through ANN-3.
- **Roles affected:** Intern, Company Supervisor, Company Representative.
- **Consequences:** Legacy enum values may remain until a separately approved compatibility/migration plan safely retires them.

### DEC-2026-015 — Restore discoverable Intern essentials and AI-assisted Portfolio/Progress
- **Date:** 2026-11-04
- **Status:** Approved
- **Context:** The product owner compared the Phase A Intern UX with the existing live Intern UX and approved an Intern feature-completeness pass before Phase B. Portfolio and AI assistance were present but hard to find, and the Intern Calendar had been removed from primary navigation.
- **Decision:** Use **Progress** for Intern navigation and **Internship Progress** for the page title; expose **Portfolio**, Evaluations, Feedback, Attendance Corrections and Reports clearly. Restore the existing **Internship Calendar** for Interns as a read-only view of already-authorized schedules, Attendance, task deadlines and milestones. Surface the existing grounded **AI Portfolio draft** and **AI Progress Summary** actions, with honest unavailable messaging when Gemini configuration is incomplete. Drafts require explicit Intern review and save; no auto-persistence or fabricated achievements.
- **Requirement impact:** REQ-FR-URM-5/6, REQ-FR-ATT-6/8/9, REQ-FR-EVL-4/5, REQ-FR-AI-1 through AI-7, REQ-FR-DOC-2, REQ-FR-REP-1/4. This **partially supersedes DEC-2026-009 solely for Intern read-only Calendar navigation**. Calendar event/holiday management, school announcements, reminders, other-role Calendar navigation and optional AI drafting remain deferred.
- **Roles affected:** Intern only; no change to other-role authorization.
- **Consequences:** Preserve existing routes/database/schema/migrations, do not change Production configuration or call AI providers during UI verification. Gemini must be explicitly configured server-side and live generation verified before declaring the feature operational. Phase B/C weekly Evaluation gates remain unchanged.

### DEC-2026-016 — Simplify Intern navigation: Attendance corrections and Reports as contextual actions
- **Date:** 2026-11-04
- **Status:** Approved
- **Context:** After reviewing the Intern completeness update, the product owner approved a more focused sidebar. Attendance Corrections belong to Attendance, Intern Reports are a downloadable output rather than a separate primary module, and “Progress” should be labeled “Insights”.
- **Decision:** Keep **Dashboard**, **Internship Calendar**, **Attendance**, **Work Logs**, **Tasks**, **Insights**, **Evaluations**, **Feedback**, **Documents**, **Portfolio**, and **Updates** as Intern navigation entries. Group Insights/Evaluations/Feedback under **Development** for Interns only. Remove Corrections and Reports from Intern primary navigation and mobile More; expose correction requests from Attendance and Attendance History, and provide View Internship Report / Download Report PDF from Internship Insights, preserving the selected date range. Rename the Intern page to **Internship Insights** and the profile shortcut to **Insights**. Keep Intern mobile bottom-navigation priorities unchanged.
- **Requirement impact:** REQ-FR-ATT-6/8/9, REQ-FR-REP-1/2, REQ-FR-AI-1 through AI-7, REQ-FR-URM-5/6. Refines DEC-2026-015 navigation and terminology only; does not remove underlying report/correction workflows or alter requirements.
- **Roles affected:** Intern presentation/navigation only. Other role navigation, permission checks and data scope remain unchanged.
- **Consequences:** Preserve existing route URLs, domain actions, server guards and PDF export; no schema/migration changes, fixture mutations or external AI provider calls. Phase B/C remain separately gated.
 
### DEC-2026-017 — Intern Evaluations & Feedback share one destination
- **Date:** 2026-11-04
- **Status:** Approved
- **Context:** The Intern's Development section had two closely related navigation items, while formal Supervisor evaluations and written coaching/workmate feedback were already separately stored, scoped, and audited.
- **Decision:** Show **Evaluations & Feedback** as a single Intern sidebar/mobile More destination. The page contains **Evaluations** and **Feedback** accessible tabs with separately rendered records. Evaluations show finalized Supervisor assessments; Feedback shows Intern-visible authorized coaching/workmate messages and retains the eligible workmate-feedback action. Preserve direct evaluation/feedback detail routes, including acknowledgement/read interactions. Legacy Intern `/feedback` lists resolve to the combined Feedback tab. Non-Intern Evaluation/Feedback views and permissions remain unchanged.
- **Requirement impact:** REQ-FR-URM-5/6, REQ-FR-EVL-1 through EVL-5, REQ-FR-AI-5 through AI-7. Refines DEC-2026-016's Intern navigation presentation only. Repeatable weekly Evaluation storage remains Phase B/C.
- **Roles affected:** Intern-facing navigation and list presentation only; no role authorization expansion.
- **Consequences:** No Evaluation/Feedback table consolidation, Prisma schema/migrations, workflow changes, new AI behavior, Production access, or fixture mutation. Phase B/C remains separately gated.

### DEC-2026-018 — Portfolio is automatically compiled; generative AI remains optional
- **Date:** 2026-11-04
- **Status:** Approved
- **Context:** The product owner wants an Intern Portfolio already available from recorded internship activity without asking the Intern to generate or manually populate it. Gemini has been verified with synthetic evidence only, and AI should enhance the narrative rather than be required for Portfolio functionality.
- **Decision:** Compile a read-only Portfolio evidence section at request/export time from one authorized Main Office internship's approved Attendance, submitted/approved Work Logs, completed Tasks, finalized Evaluations, visible Feedback counts and approved Portfolio-eligible Document metadata. Extract skills only when explicitly recorded in eligible Work Logs. Prefer an ACTIVE assignment; if none, a COMPLETED assignment with eligible evidence or saved Portfolio content, then the newest completed assignment. Pin both the saved Portfolio and the canonical report to the **same assignment ID**. Make PDF export available even if the Intern has not saved a personal Portfolio. Keep personal summaries, selected highlights, skills, and reflections as **optional, explicitly saved, Intern-reviewed sections**. Gemini-generated professional wording remains an optional, review-before-save workflow and never changes authoritative records.
- **Requirement impact:** REQ-FR-AI-1 through AI-7, REQ-FR-REP-1/2, REQ-FR-ATT-9, REQ-FR-DWL-1/2, REQ-FR-TSK-2, REQ-FR-EVL-4/5, REQ-FR-URM-5/6.
- **Roles affected:** Intern Portfolio presentation, auto evidence, editor, AI drafting source and export. Existing other-role report/Evaluation permissions unchanged.
- **Consequences:** Automatic compilation is **not** generative AI. No background job or automatic persistence. Current authorized records are refreshed on read/export; saved narrative is preserved. No schema/migration, Production access, port-3000 mutation, or deployment. Synthetic provider verification does not replace explicit student-data privacy approval or full authenticated AI action verification. Phase B/C remain gated.





### DEC-2026-019 — Attendance selfies verify identity against an approved onboarding reference (supersedes DEC-2026-012)
- **Date:** 2026-11-24
- **Status:** Approved (product owner, 2026-11-24 session)
- **Supersedes:** DEC-2026-012 for REQ-FR-ATT-5.
- **Context:** The product owner requires that the same verified Intern performs Time In and Time Out. Evidence-only selfies do not establish this.
- **Decision:** Each Intern enrolls one identity reference selfie through a consented, camera-only, server-issued single-use capture session. The **assigned Company Supervisor** approves or rejects it (and any replacement); Interns cannot approve their own reference. Every Time In and Time Out selfie is compared server-side against the same approved reference through a provider abstraction. The selected provider is the free, self-hosted **CompreFace** verification service (with a deterministic mock for tests only). **Liveness is not configured**: the interface supports it, results record `NOT_CONFIGURED`, and the product must not claim liveness or anti-spoofing until a real liveness provider is approved. Verification is fail-closed: no approved reference, an unavailable provider, or an expired/replayed/foreign capture session blocks the attendance action. A face mismatch, failed liveness or inconclusive result records the attendance but flags it for the existing Supervisor attendance review with zero credited minutes until approved.
- **Requirement impact:** REQ-FR-ATT-5 (interpreted and extended); REQ-FR-ATT-1/2 transaction rules preserved.
- **Roles affected:** Intern (enrollment, verified attendance), Company Supervisor (reference approval for directly assigned Interns). No change for Company Representative, School Coordinator or Admin.
- **Consequences:** Adds a forward-only schema migration and a private `identity-references` bucket (isolated local environment only until separately approved). Biometric images are sensitive personal information (RA 10173); deployment with real Interns requires organizational privacy sign-off, retention rules and a hosted CompreFace instance. ATT-5 stays **Conditional** until a real provider run and physical Android camera testing succeed.
- **Amendment A (2026-11-24, product owner, same session) — automatic face photo enrollment:** Replaces the Supervisor approval step in the Decision above.
  - *First enrollment:* the Intern sets up the face photo inside **Getting started** (`/onboarding`, the existing onboarding page); there is no separate enrollment page. The server checks the live selfie for **exactly one clearly detected face** (CompreFace detection confidence ≥ 0.90). If the check passes, the photo is saved encrypted and is **active immediately** (status APPROVED with no human approver; audit events ENROLLED + automatic APPROVED). Unclear photos are not saved and the Intern retakes.
  - *Update:* the Intern can update the photo at any time, but the new selfie is saved only when it **matches the current face photo** (same threshold as attendance). A different person is refused, and the Intern must ask the assigned Company Supervisor to reset it.
  - *Supervisor:* the **assigned Company Supervisor** no longer approves photos. They see the face photo beside flagged attendance and can **reset** it with remarks; the photo is deleted, attendance is blocked, and the Intern enrolls again.
  - *Fail closed:* provider unconfigured, unreachable or timing out means nothing is saved.
  - *Order:* invited users must set their password before anything else, including face photo setup.
  - *Accepted risk:* without Supervisor approval, a wrong first photo (for example, someone else enrolling with the Intern's credentials) is caught only when the Supervisor notices it on flagged attendance and resets it. Liveness is still not provided or claimed.
  - *Data:* no schema or migration change.
  - *Roles affected:* Intern (automatic setup and update), Company Supervisor (reset replaces approval).
- **Amendment B (2026-11-24, product owner) — release switch:** Identity verification runs only when the server setting `IDENTITY_VERIFICATION_ENABLED` is exactly `true`; it is off by default and stays **off in Production** until a hosted CompreFace instance, the reference encryption key, the private `identity-references` bucket and organizational privacy sign-off are in place. While off, attendance behaves as before this decision (selfie and location evidence only, no face matching, no identity exception flags), the face photo step is hidden and the identity actions refuse. Turning it on requires no code change.
- **Amendment C (2026-11-25, product owner) — a different person's face is blocked:** When the selfie does not match the Intern's saved face photo (`FACE_MISMATCH`), Time In / Time Out is **refused and nothing is recorded**; the Intern is asked to retake the selfie with their own face, and the refused attempt is kept in the verification audit trail. Unclear captures (`INCONCLUSIVE`) and failed liveness remain recorded-but-flagged for Supervisor review with 0 credited minutes, so a genuine Intern is not locked out by lighting. Supersedes the earlier "mismatch is recorded and flagged" rule. The production instance is enabled for the capstone defense with CompreFace hosted on the project laptop behind a Cloudflare tunnel that exposes only the verification endpoint; turning `IDENTITY_VERIFICATION_ENABLED` off restores the prior behavior.

### DEC-2026-020 — Completed internships automatically receive a saved Portfolio; Portfolio is a primary Intern destination
- **Date:** 2026-11-24
- **Status:** Approved (product owner, 2026-11-24 session)
- **Supersedes:** DEC-2026-018 only for completed-assignment snapshot persistence, completed Portfolio history, and Intern mobile Portfolio visibility. Active-assignment live evidence and optional AI review-before-save behavior from DEC-2026-018 remain in force.
- **Context:** The product owner clarified that Portfolio is a key outcome of an internship and should be immediately available when an Intern finishes. A direct desktop Portfolio route already exists, but completed internships do not currently receive a persisted evidence snapshot, the page selects one assignment rather than presenting a full archive, and mobile hides Portfolio in More.
- **Decision:** Keep Portfolio as a first-class Intern desktop destination and promote it to the fifth primary mobile destination alongside Home, Attendance, Work Logs, and Tasks (More remains available). On the authorized transition of a specific assignment to COMPLETED, atomically create or update that assignment's one Portfolio record with a deterministic snapshot of eligible verified evidence. Reuse the existing unique assignmentId relation and sourceSnapshot field if sufficient; do not add a migration without a demonstrated need. Use GENERATED to describe system generation; do not claim FINALIZED or APPROVED without a human approval action. Preserve any Intern-authored narrative fields. Do not invoke Gemini automatically. Present all completed internships as separate entries in a Portfolio archive, and provide assignment-specific review and PDF export. Active internships continue to show live evidence. Legacy completed assignments without a snapshot remain available through an honestly labeled on-demand evidence fallback until a separately tested safe backfill is performed.
- **Navigation correctness:** Route-derived active state is authoritative. Home is active only on its exact role landing route. Reports and nested Reports routes must highlight Reports for roles that have that navigation item. Mobile More indicates an active secondary destination and the open More sheet highlights its current route. Clicking an authorized Reports link must not redirect to Dashboard; trace the actual route/guard/profile cause instead of masking it with CSS or weakening authorization. Intern contextual Reports opened from Insights must never falsely highlight Home, and DEC-2026-016 continues to exclude a standalone Intern Reports navigation item.
- **Evidence/privacy constraints:** Snapshot only eligible records under existing authorization and canonical report rules. Approved Attendance alone contributes credited minutes. Skills must be explicit in eligible Work Logs. Do not infer proficiency or achievements, store raw selfies/identity data, or copy private document contents. Generate PDFs on demand from the assignment-specific saved snapshot; do not persist PDF bytes unless separately approved.
- **Roles affected:** Intern Portfolio presentation and own-assignment archive; Company Representative assignment-completion transaction; all role shells only for route-correct active-state behavior. Existing report authorization remains unchanged.
- **Consequences:** Add focused Portfolio finalization/archive and navigation acceptance tests. Preserve the 51 canonical requirements and existing role boundaries. No Production access, deployment, push, fixture reset, or unrelated migration is authorized.

### DEC-2026-021 — Completed internships receive a system-issued Certificate of Completion
- **Date:** 2026-11-24
- **Status:** Approved (product owner, 2026-11-24 session), including Amendment A below.
- **Context:** Completing an internship already saves an evidence-based Portfolio snapshot (DEC-2026-020). Interns and their school need a formal completion record, and completed interns currently disappear from Supervisor/Coordinator rosters and see "No active internship". No canonical REQ covers a system-issued certificate (`07_database_design.md` only describes uploaded certificate documents), so this is a new requirement.
- **Decision:** When an authorized Company Representative completes a Main Office internship, issue one Certificate of Completion for that assignment in the same transaction as the COMPLETED transition and the Portfolio snapshot (any failure rolls all three back). Only COMPLETED internships receive certificates. The completing Representative is recorded as the electronic signatory (typed "Issued electronically by", no signature image). The certificate states the actual credited hours (APPROVED Attendance only) and says the required hours were completed only when credited ≥ required; completing with a shortfall requires explicit Representative confirmation. PDFs are generated on demand (no stored PDF bytes) with a unique certificate number; public verification/QR is deferred.
- **Visibility:** Intern — own certificates; Company Supervisor — interns they supervised on that assignment; School Coordinator — students of their school; Company Representative — all Main Office certificates, and may revoke with a required reason. System Administrator has no certificate access (DEC-2026-013). Revoked certificates are marked revoked and cannot be downloaded by the Intern.
- **Requirement impact:** New requirement (completion certificate); supports REQ-FR-REP-1/2/3 completion reporting and REQ-FR-EVL-5 visibility. The 51 canonical REQs are unchanged.
- **Roles affected:** Intern, Company Supervisor, School Coordinator, Company Representative (issuer/revoker).
- **Consequences:** Adds a forward-only `internship_certificates` table (isolated environment only until separately approved), the `pdf-lib` dependency, a completed-intern dashboard/roster/profile presentation, and an isolated-only tagged demo completed intern created through the real completion path. No Production access, deployment or push.
- **Amendment A (2026-11-24, product owner) — automatic issuance at three checks:** Replaces "issued when a Representative completes the internship" and the Representative signatory above.
  - *Checks (all required, shown to the Intern as a checklist):* (1) credited hours from APPROVED Attendance ≥ confirmed required hours; (2) every day with credited Attendance has a submitted or approved Work Log; (3) Getting started complete (profile plus the required onboarding documents). The face photo is not a certificate check.
  - *Before all checks pass:* the Intern sees a watermarked "Preview · Not yet issued" certificate with the checklist and exactly what is missing; it has no number and is never downloadable.
  - *When all checks pass:* the certificate is issued automatically (also while the internship is still active), with a unique number, viewable and downloadable. Issuance is idempotent and also runs inside the completion transaction when eligible; a completion that does not meet the checks issues no certificate.
  - *Signatory:* "Issued electronically by [company] · Issued electronically through IntelliTrack" — no person's name or signature image.
  - *Unchanged:* visibility scope, Admin denial, Representative revocation with a reason, on-demand PDFs, deferred public verification.
  - *Completed internships* use the same Intern dashboard in a read-only completed mode (no Time In or new Work Log), and Supervisor/Coordinator rosters list active and completed interns in one data table.

