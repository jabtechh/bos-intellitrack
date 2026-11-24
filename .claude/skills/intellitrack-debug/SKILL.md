---
name: intellitrack-debug
description: Investigates and fixes IntelliTrack errors, failing tests, broken workflows, and regressions using evidence and minimal changes. Use when the user shares an error, screenshot, stack trace, failed command, or reports that a feature is not working.
---

# IntelliTrack debugging workflow

1. Capture the exact error, reproduction steps, environment, and affected role/device. Do not guess from a screenshot alone.
2. Inspect Git status and relevant diffs first. Preserve all unrelated changes.
3. Trace the failure from UI to server action/domain logic/data access and authorization as applicable.
4. Reproduce with the narrowest safe command or test. Do not access production data or expose secrets.
5. Identify root cause before editing. Explain the cause and proposed minimal fix.
6. Add a regression test that fails before the fix when practical.
7. Fix only the root cause; avoid broad refactors and dependency upgrades.
8. Run the regression test and adjacent focused tests, then typecheck/lint where appropriate.
9. Report root cause, files changed, reproduction/verification commands, results, and remaining uncertainty.
10. Never use destructive Git commands, database mutation, migrations, seeds, deployment, or push without explicit approval.
