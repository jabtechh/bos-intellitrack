# Realignment Audit Plan

**Spec:** `specs/001-intellitrack-realignment/spec.md`  
**Status:** Audit planning; implementation not authorized.  
**Does this plan authorize T001?** No. Do not begin T001 until the spec and this plan are reviewed and approved.

**Baseline:** Record `git rev-parse HEAD`, `git status --short`, the date, the **runtime environment**, the **Auth/Supabase environment**, and the **database environment** without secrets before verification. Do not assume a clean working tree.

**Current environment constraint (2026-11-03):** runtime is local, while configured Supabase Auth and PostgreSQL point to the Production project. Interactive evaluation-account testing is therefore not authorized in this audit. Static inspection and genuinely non-mutating verification remain allowed.

**Artifacts:** `specs/001-intellitrack-realignment/report.md` with sections Inventory, Traceability, Conflicts, Role audits, Classification, IA proposal, Decisions, and Verification log. Supporting evidence may be kept in the same report or a linked read-only appendix.

## Spec

`specs/001-intellitrack-realignment/spec.md`

This is an **audit** plan. `001-intellitrack-realignment` remains the audit record. Any later implementation must use a new `specs/002-...` implementation spec that links to the approved decisions.

## Strategy

Perform a read-only audit. Do not change application code, routes, components, server actions, guards, Prisma schema, migrations, scripts, configuration, environment files, or deployment files. Do not remove or redesign features.

The audit will:

1. inventory routed surfaces, actions, guards, dashboards, and workflows;
2. build the 51-row requirement traceability matrix and the non-REQ capability table;
3. compare every role and capability to the authorization baseline;
4. record source conflicts and clarifications;
5. classify capabilities and propose a conceptual IA;
6. produce an evidence log and approval package; and
7. stop before implementation.

The IA proposal is conceptual only. It does not authorize page, route, or component changes.

## Files / modules likely affected

Documentation only:

- `specs/001-intellitrack-realignment/spec.md` — audit specification;
- `specs/001-intellitrack-realignment/plan.md` — this plan;
- `specs/001-intellitrack-realignment/tasks.md` — audit tasks;
- `specs/001-intellitrack-realignment/checklists/requirements.md` — audit checklist;
- `specs/001-intellitrack-realignment/report.md` — audit output;
- `docs/product/decisions.md` — only after human approval, and only for approved decisions.

No `src/`, `prisma/`, `scripts/`, configuration, environment, or deployment files are in scope for modification.

## Requirement traceability

- The matrix must contain exactly the 51 `REQ-FR-*` IDs listed in the spec.
- Required columns: `REQ ID | Requirement summary | Required role(s) | Current evidence | Status | Gap or conflict | Proposed classification | Decision`.
- Every status other than `Unverifiable` requires at least one evidence citation.
- Every `KEEP` requires a `REQ-...` or approved `DEC-...`.
- Non-REQ capabilities use the dedicated table with `DEC reference` or `CLARIFICATION-NEEDED (Q-...)`.
- Do not create new `REQ-...` IDs.
- Code and tests are evidence, not requirement proof.
- Record `Missing`, `Contradicted`, `Ambiguous`, and `Unverifiable` honestly; do not invent behavior.

## Authorization impact

The audit has **no application-behavior impact**. Findings may recommend authority changes, but recommendations require human approval before implementation.

- Use the authorization baseline matrix from the spec.
- Compare every route, server action, and guard to that baseline.
- Navigation visibility is not authorization evidence.
- Admin remains technical/emergency unless a `REQ-...` or `DEC-...` grants routine business access.
- A test that asserts current access is evidence of current behavior, not requirement correctness.
- Pre-seeded drift items must be verified, not normalized.
- No authority change is implemented under this plan.

## Data / migration impact

**None.** This audit is read-only.

- No schema change, migration, seed, backfill, or operational-data write is authorized.
- Do not run `prisma migrate`, `prisma db push`, seed scripts, or backfill scripts.
- The Branch migration is documented as **NOT APPLIED** in `docs/branch-restoration.md:14`. Record which capabilities are code-present but not database-active, and read `docs/branch-pre-migration-compatibility.md` before interpreting Branch-dependent code.
- If a read-only database check is used, verify the environment is non-production and record it. Do not mutate data.
- Any proposed removal must include a data-dependency check covering models, foreign keys, historical records, and operational workflows.
- No production configuration, deployment, or external service may be changed.

## Test plan

### Evidence standard

- Record exact commands and results.
- Cite file and line for every route/action/guard finding.
- Record what was not verified and why.
- Do not fabricate test results.
- Treat source-grep tests as evidence of current source text, not behavioral proof.

### Read-only limits

- Do not run seed, backfill, migrate, or `db push`.
- Do not submit attendance, work logs, tasks, documents, evaluations, feedback, announcements, or corrections.
- Do not create, update, delete, archive, publish, approve, or otherwise mutate operational data.
- Do not change account state or role assignments.
- Do **not** use evaluation accounts interactively in the current Production-backed environment, even for ordinary role navigation.
- Evaluation-account login/read-only navigation may be used only after a separate non-production Auth/database environment is configured and verified.
- Never include credentials from `.evaluation-credentials.local.json` or `.demo-user-credentials` in the report.
- Record any unavoidable exception and stop if a write would be required.

### Audit checks

- Extract and diff all 51 requirement IDs.
- Inspect every routed surface under `src/app/**/page.tsx`, plus route actions and guards.
- Inspect every server action and authorization guard relevant to the roles.
- Inspect Prisma models/enums read-only for capability mismatches.
- Compare implementation to the authorization baseline and requirement matrix.
- Run only non-mutating test suites; list exact commands and results.
- Record source conflicts, clarifications, unsupported capabilities, and authority drift.
- Verify normal attendance auto-approval and that work logs are not used as hours.
- Verify no public signup, facial identity recognition, biometric identity matching, or liveness claim is introduced or endorsed.
- Verify AI output is grounded and labeled; no fabricated metrics, notifications, approvals, or verification states.
- Verify audit artifacts contain no credentials, tokens, signed URLs, private storage paths, or unnecessary PII.

## Responsive / UX verification

- Check role navigation and key dashboards at 390, 768, 1024, and 1440 where feasible.
- Record desktop/mobile differences and any limitations.
- Do not fix responsive issues during the audit; record them.
- Do not include secrets or private storage paths in screenshots or notes.

## Risks and rollback

| Risk | Control |
|---|---|
| Misclassifying required behavior | Require `REQ-...`/`DEC-...` mapping and evidence for every `KEEP` |
| Ratifying authority drift | Use the authorization baseline; verify every pre-seeded drift item |
| False assurance from source-grep tests | Require route/action/guard evidence and exact test commands |
| Treating code-present features as database-active | Record migration status; distinguish code vs database |
| Removing unsupported features without a decision | `REMOVE` requires a dependency check, requirement-impact statement, and approval |
| Silently reconciling conflicting documents | Maintain the conflict register; require a product decision |
| Scope creep into redesign | Keep the IA proposal conceptual; no page/route/component changes |

Rollback is documentation-only: revert the audit commit. No operational data is changed by this plan.

## Phase 4.5 — Clarify

Resolve the **open** clarification items among `Q-01` through `Q-13` with a product decision or leave them `CLARIFICATION-NEEDED`. `Q-06` and `Q-12` are already resolved by `DEC-2026-001` and source precedence; audit current code against those resolved baselines. Do not implement.

- `Q-01` workmate feedback authorship;
- `Q-02` document-review authority;
- `Q-03` Coordinator data scope;
- `Q-04` Representative review authority;
- `Q-05` Representative operational scope;
- `Q-06` Admin routine access — **resolved baseline:** technical/emergency only; any broader routine authority requires a new DEC;
- `Q-07` required-hours onboarding;
- `Q-08` calendar, school announcements, AI drafting, and related vision features;
- `Q-09` company reports/statistics;
- `Q-10` weekly evaluation scores;
- `Q-11` attendance selfie/identity-language review;
- `Q-12` authoritative role model and stale five-role guidance — **resolved:** four business roles + technical Admin; conflicting five-role/role-switch guidance is stale;
- `Q-13` workflow states and approvals.

## Human approval required before implementation

Human approval is required before:

- accepting the audit scope and acceptance criteria;
- resolving any **open** `Q-...` item or approving a proposed `DEC-...`;
- adding or removing a requirement;
- changing a role’s authority or data scope;
- removing a workflow required by `02_core_requirements.md`;
- merging or removing a capability in a way that affects required behavior;
- changing the database schema or applying a migration;
- introducing a new external service;
- changing production configuration;
- deploying or pushing;
- implementing the proposed information architecture or any page/route/component change; and
- creating a separate `specs/002-...` implementation spec.

The audit stops at this gate. Do not begin T001 until the spec and this plan are approved. Do not modify `001-intellitrack-realignment` into an implementation authorization.
