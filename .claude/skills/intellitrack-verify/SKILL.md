---
name: intellitrack-verify
description: Verifies IntelliTrack changes and assesses whether the application is ready for acceptance or release. Use when asked to test, validate, run checks, verify a fix, close a phase, or determine production readiness.
---

# IntelliTrack verification

1. Read the active task acceptance criteria and identify affected requirements, roles, routes, and viewport sizes.
2. Inspect Git status and diffs. Do not clean generated files or alter unrelated changes.
3. Confirm the test target before any environment-backed test. Use only a verified isolated non-production environment. If uncertain, stop and report.
4. Start with focused unit/static tests, then authorization tests, then browser flows and responsive checks where applicable.
5. Run `npm run typecheck`, targeted ESLint, and an isolated build when safe. Avoid full-repo linting if generated build directories are included; inspect the lint configuration first.
6. Do not run migrations, `db push`, seeds, backfills, fixture repairs, or production writes as part of routine verification.
7. For UI changes, verify relevant business roles and mobile/desktop viewports. Distinguish route access checks from actual interactive workflow acceptance.
8. Classify every result accurately: PASS, FAIL, BLOCKED, NOT RUN, or NOT APPLICABLE. Include exact command and evidence.
9. Do not mark a requirement fully verified based only on source inspection or a successful build.
10. Produce a release-readiness summary with blockers, residual risks, device-dependent checks, and separate deployment approval requirements.
