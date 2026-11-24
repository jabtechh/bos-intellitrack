# Gate C — Environment-isolation diagnostic incident review

**Status: Open — independent environment-owner review required.**
**Review scope:** offline local repository source and already recorded test evidence, plus current isolated test preflight only. No connection to the previous default-configuration endpoint or Production.

## Incident summary
A previous unqualified wildcard test run `npx tsx --test scripts/test-*.ts` was launched without `.env.gatea.local`. It included `scripts/test-admin.ts` and `scripts/test-db.ts` and reported approximately **32 Auth/application users and 18 assignments**. The approved isolated test environment contains **9 Auth accounts, 8 tagged application users** and its own separate synthetic fixtures. The count discrepancy demonstrates that the earlier command contacted a **different, non-authorized target**, potentially Production-backed.

This is an **isolation boundary incident**, even though the inspected diagnostic source is read-only. No Production environment, default-environment database, or port 3000 was accessed during this follow-up review.

## Verified evidence and limits
- Original pre-guard source is available from `git show HEAD:scripts/test-admin.ts` and `git show HEAD:scripts/test-db.ts`. Both had `import 'dotenv/config'` and neither enforced a test-only target.
- The original Auth diagnostic calls `supabase.auth.admin.listUsers({ page: 1, perPage: 100 })`; it then uses Prisma `findMany` and `count` calls. The original DB diagnostic calls Prisma `user.count`, `school.count`, `company.count`, and `internshipAssignment.count`. **No writes appear in these two scripts' main diagnostic paths**.
- `src/lib/prisma.ts` creates Prisma's PostgreSQL adapter using **`process.env.DATABASE_URL`**, not `DIRECT_URL`. `src/lib/supabase/admin.ts` uses `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
- Existing fail-closed guards had checked `DIRECT_URL` but did not check actual Prisma `DATABASE_URL`. This gap was corrected during the continuation: both diagnostics now require `DATABASE_URL` at **127.0.0.1:54322**; Auth diagnostic also requires Supabase API exactly **127.0.0.1:54321**. All also require test mode, verified marker, approved run ID, app **127.0.0.1:3100**, and isolated direct DB.
- The safe `npm run gatec:regression` script runs isolated environment preflight then uses `tsx --env-file=.env.gatea.local --test scripts/test-*.ts`. After the guard fix, this suite **PASS 516/516**, lint and typecheck PASS, tagged E6 fixture integrity PASS.
- Current preflight run ID `gatea-20261103-2318`, isolated Supabase fingerprint `12ca17b49af2`, isolated DB/direct fingerprint `d6389fa7d65f`; the preflight reports separation from current/default targets.
- This review **does not establish the identity of the earlier non-isolated endpoint**, the exact network audit record, complete access logs, or whether other processes performed side effects. Do not assert the incident was harmless or cleared solely from the scripts' source.

## Independent environment-owner closure checklist
1. Locate the original command invocation time and full execution logs; retain evidence securely without copying connection strings or access tokens into the issue report.
2. From an authorized administrator's existing configuration inventory, identify the earlier default Auth and database target fingerprint **without directly querying the target from this task**. Classify Production/staging/test.
3. Review relevant connection and Auth API audit logs in the target's own approved administrative workflow. Confirm precise access window, account/role, query types, any write side effects, and any policy-based notifications.
4. Assess confidentiality/incident-reporting obligations if Production data was accessed, using the organization's policies.
5. Verify that current diagnostic guards cover the actual Prisma `DATABASE_URL` and Supabase API endpoint, and require all future database-backed test suites to use the isolated overlay.
6. Record the independent reviewer, evidence references, findings, and formal closure decision. Gate C may not be declared PASS before this decision and five outstanding product acceptance checks pass.

## Final status
**Open incident; safeguards improved and regression verified, but independent environment-owner review is incomplete.** Gate C stays **46/51 requirements Verified**, **5 Conditional** (ATT-1, ATT-3, ATT-5, DWL-2, DOC-1); Gate D remains unauthorized. Do not use the current user's selected port 3000 tab.
