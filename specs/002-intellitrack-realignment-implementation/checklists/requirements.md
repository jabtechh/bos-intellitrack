# 002 Specification Quality Checklist

## Scope
- [x] Links to the completed 001 audit and approved DEC records.
- [x] Uses the 51 core requirements as the canonical functional baseline.
- [x] Source precedence matches `AGENTS.md`: approved DECs interpret/constrain/extend REQs and supersede a REQ only when the approved DEC explicitly identifies the affected requirement.
- [x] Contains an exactly 51-row preservation matrix classifying every REQ as `UNCHANGED / REGRESSION-PROTECTED`, `MODIFIED`, or `COMPLETED BY 002`.
- [x] Does not treat existing code as authoritative when it conflicts with requirements/decisions.
- [x] Separates four business roles from technical Admin.
- [x] Defines deferred/non-core surfaces without authorizing destructive deletion.

## Decisions
- [x] Applies approved D-01 through D-13 as DEC-2026-002 through DEC-2026-014.
- [x] Keeps DEC-2026-001 as the foundational Admin-role decision.
- [x] Does not reopen approved product decisions as implementation assumptions.
- [x] Leaves only technical planning questions for the Plan stage.

## Authorization
- [x] Attendance/correction decisions are Supervisor-only.
- [x] Coordinator is school-scoped read-only.
- [x] Representative operations are minimal and company-scoped.
- [x] Representative owns routine document review and announcement publishing.
- [x] Normal required-document upload is Intern-owned; Representative upload is not a normal auto-approved V1 path.
- [x] Admin has no routine business workflow authority.
- [x] Workmate feedback is limited to distinct active Interns sharing the same directly assigned Supervisor during an overlapping active internship period.
- [x] Workmate recipient/relationship scope is server-resolved and does not depend on Branch migration.

## Requirements gaps
- [x] Complete REQ-FR-PRO-2 internship details are explicitly included.
- [x] Emergency-contact management is explicitly included.
- [x] Genuine workmate feedback is explicitly included.
- [x] Weekly repeatable evaluation scoring is explicitly included with Monday–Sunday company/internship-timezone semantics.
- [x] Announcement notification delivery is explicitly included with supported V1 audiences and truthful atomic failure behavior.
- [x] Company aggregate reporting/statistics is explicitly included.
- [x] REQ-FR-AI-1 requires actual grounded Portfolio generation rather than optional assistance only.
- [x] REQ-FR-AI-4 requires view/export of the generated Portfolio artifact.
- [x] REQ-FR-AI-7 requires dated skill evidence/progress without fabricated proficiency scores.
- [x] AI-5 and AI-6 remain regression-protected.

## Safety
- [x] No public signup, role switching, facial identity, biometric matching, or liveness is introduced.
- [x] Attendance remains the sole credited-hours source.
- [x] AI remains grounded, labeled, redacted, review-required, and non-authoritative; generation does not auto-persist.
- [x] Announcement publication does not claim notification delivery when required persistence fails.
- [x] No migration creation/execution, production write, deployment, or implementation is authorized by this specification pass.
- [x] Branch migration remains separately gated.
- [x] Production-backed evaluation accounts remain blocked for interactive mutation testing.

## Planning readiness
- [x] Product choices needed for workmate eligibility, announcement audiences/failure semantics, document ownership, and weekly-period definition are no longer delegated to Plan.
- [x] Future implementation is explicitly phased into code-only realignment, separately approved schema/migration design, and schema-dependent implementation.
- [x] Future Plan must classify tests as `PRESERVE`, `REWRITE`, `REMOVE STALE`, or `ADD`.
- [x] Technical planning questions remain technical and do not reopen approved product decisions.

## Next gate
- [x] Specification requires Analyze → Plan → Tasks → human approval before implementation.
- [x] Migration creation/execution and deployment retain separate explicit approval gates.
- [x] No `plan.md` or `tasks.md` is created by this specify pass.
