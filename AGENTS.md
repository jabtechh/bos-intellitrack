# IntelliTrack Agent Operating Guide

## Mission
Develop IntelliTrack as a focused, requirement-driven capstone system for Bo's Coffee. Optimize for correctness, traceability, role clarity, and simplicity rather than feature count.

## Source-of-truth order
When sources conflict, do not silently reconcile them. Surface the conflict in the active spec and ask for a product decision before changing behavior.

1. `02_core_requirements.md` — the canonical functional requirement set and requirement IDs.
2. Approved `DEC-...` entries in `docs/product/decisions.md` — may interpret, constrain, or extend requirements. A DEC supersedes a REQ only when it explicitly identifies the affected requirement and records a human-approved change.
3. `docs/roles-and-required-hours.md` — current role interpretation and required-hours ownership where it does not conflict with the canonical REQs or approved DECs.
4. `01_project_vision.md` — product purpose and intended outcomes where it does not conflict with the canonical REQs or approved DECs.
5. `04_architecture/`, `07_database_design.md`, and current Prisma/schema compatibility rules — technical/data constraints.
6. `05_design_system.md` and `06_ui_ux_specification.md` — UX/design guidance. Treat conflicts or stale guidance as clarification items, not automatic truth.
7. Existing code — implementation evidence only. Existing code never overrides canonical REQs or approved DECs.

## Roles
The approved business requirements define four normal business roles:
- Intern
- Company Supervisor
- Company Representative
- School Coordinator

The implementation also contains an internal System Administrator role for bootstrap, emergency recovery, and technical maintenance. Do not broaden Admin into a normal business persona unless a requirement explicitly changes.

## Required agent loop
For any material product change:
1. Inspect the repo and current Git diff first.
2. Read the relevant requirements and active spec.
3. Audit current behavior before proposing a solution.
4. Map every material change to requirement IDs or an explicit approved product decision.
5. Prefer KEEP / SIMPLIFY / MERGE / REMOVE / DEFER decisions over adding features.
6. Produce or update the spec and plan before implementation.
7. Stop at the human approval gate for scope, authorization, destructive data, migration, or major UX changes.
8. Implement only approved tasks.
9. Run relevant tests/typecheck/build.
10. Verify affected roles and responsive behavior.
11. Converge: compare implementation against the spec and report remaining gaps.

## Non-negotiable constraints
- Do not invent product requirements, metrics, notifications, approvals, AI claims, verification claims, or operational data.
- No public signup.
- Preserve least-privilege authorization.
- Attendance is the authoritative source of rendered internship time.
- Normal attendance should not require supervisor approval merely because it is normal.
- Work Logs are internship journals; do not turn them into a second attendance system.
- Do not introduce facial identity recognition, biometric identity matching, or liveness claims without explicit approved requirements. (Approved exception: DEC-2026-019 — attendance identity matching against the intern's onboarding face photo, saved automatically after a clear-face check (Amendment A). Liveness is still not approved or claimed.)
- Preserve existing operational data.
- Never edit an applied migration. Use forward-only migrations when explicitly approved.
- Do not run migrations against an unverified or production database.
- Do not deploy, push, or modify production unless explicitly requested.
- Never commit `.env*`, local credential manifests, tokens, passwords, signed URLs, or private storage paths.
- Do not restore unrelated stashes or overwrite unrelated uncommitted work.
- Do not modify `next-env.d.ts` unless the task actually requires it.

## Product change approval gates
Human approval is required before:
- adding/removing a requirement;
- changing a role's authority or data scope;
- removing a workflow required by `02_core_requirements.md`;
- changing the database schema or applying a migration;
- introducing a new external service;
- changing production configuration;
- deploying or pushing;
- implementing a major information-architecture redesign after an audit.

## Definition of done
A task is not done because code compiles. Done means:
- acceptance criteria are met;
- requirement traceability is recorded;
- authorization is preserved;
- affected role flows are verified;
- mobile/desktop behavior is checked when UI is affected;
- relevant tests pass;
- remaining gaps are documented honestly.

## Active workflow
`specs/001-intellitrack-realignment/` is the closed audit record. The active workflow is `specs/002-intellitrack-realignment-implementation/`. Do not implement from `002` until Analyze → Plan → Tasks are complete and the human explicitly approves implementation. Migration creation/execution and deployment remain separately gated.
