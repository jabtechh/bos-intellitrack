# IntelliTrack — Claude Code Instructions

@AGENTS.md

## Working agreement
- Treat `02_core_requirements.md`, approved decisions in `docs/product/decisions.md`, and the active spec as the product contract.
- Start every session by checking `git status --short`, current branch, and latest commit. Preserve all existing modifications and untracked files.
- The active implementation record is `specs/002-intellitrack-realignment-implementation/`. Read its current status, task list, Gate C convergence report, and 51-requirement traceability before proposing work.
- Do not assume a task is unfinished or finished based only on old status headers. Reconcile task checkboxes, current source, test evidence, and the latest dated verification notes.
- Before editing, state the exact issue, files likely to change, acceptance criteria, and verification plan. For material scope, authorization, schema, migration, data, or major UX changes, stop for explicit human approval.
- Never run destructive Git commands, reset/clean/rebase, bulk formatting, broad generated-file rewrites, database mutations, migrations, seeds, backfills, production operations, pushes, or deployments without explicit authorization.
- Never inspect, print, quote, or expose secret values from `.env*`, credential files, tokens, or private URLs. It is acceptable to inspect variable names or whether required variables are present.
- Do not modify `next-env.d.ts` unless the task demonstrably requires it.
- Prefer the smallest requirement-traceable change. Avoid adding features merely because they seem useful.
- Run focused tests first, then broader checks when safe. Report exact commands and pass/fail results; never claim a check ran if it did not.
- Keep the user informed in concise checkpoints. The user wants to complete the project quickly, but correctness and data safety take priority over speed.

## Default session sequence
1. Read current Git state; do not alter it.
2. Read the active spec/task status and latest convergence evidence.
3. Identify the single highest-priority blocker to the user's goal.
4. Propose a minimal plan with acceptance criteria and tests.
5. Wait for approval when required by AGENTS.md.
6. Implement, verify, and report changed files, evidence, remaining blockers, and whether deployment is separately authorized.
