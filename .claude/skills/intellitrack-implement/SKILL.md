---
name: intellitrack-implement
description: Implements an explicitly approved IntelliTrack feature, bug fix, or task from the active specification with minimal requirement-traceable changes. Use when the user approves implementation or asks to execute a specific approved task.
---

# IntelliTrack approved implementation

1. Re-check Git status and inspect the relevant diff before editing. Never overwrite unrelated or pre-existing work.
2. Read the relevant canonical requirement IDs, approved DEC entries, active spec, task, architecture, authorization helpers, and existing tests.
3. State the task, expected files, acceptance criteria, and verification commands. Stop for approval if scope is ambiguous or an AGENTS.md approval gate applies.
4. Implement the smallest coherent change. Preserve role boundaries, server-side authorization, existing data compatibility, mobile behavior, and established design tokens.
5. Add or update focused tests for success, denial, edge cases, and relevant roles. Never weaken tests just to make them pass.
6. Do not change Prisma schema, create/apply migrations, seed/backfill data, or mutate a database unless separately and explicitly authorized. Never use production-backed accounts for mutation tests.
7. Do not deploy, push, or commit unless separately and explicitly authorized.
8. Run the narrowest relevant tests, then typecheck/lint/build as appropriate and safe.
9. Report files changed, requirement mapping, exact test results, known gaps, and any approval still needed.
