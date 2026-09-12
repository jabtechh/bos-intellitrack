Branch restoration — development implementation, 13 September 2026

1. Historical implementation: Git history contains `Company.branchName`, company coordinates, radius and timezone, rather than a separate `Branch` table. Inspected schema history, the original database foundation, and `c48e1f6` (the Main Office simplification) and its parent before implementation.
2. Reused concepts: UUID identifiers, mapped SQL names, Decimal(10,7) coordinates, company-owned geofence settings, existing operations guards, profile scopes and canonical cards/forms. Historical Company and workplace values remain intact.
3. Model: Branch belongs to Company and contains name, address, optional paired coordinates, optional radius, timezone, active status and timestamps. Timezone inherits the existing company's configured timezone at creation; no new hard-coded timezone default was introduced. Names are unique within Company, with an additional normalized SQL uniqueness index. SQL constrains coordinate/radius ranges and enforces assignment/Branch company consistency.
4. Assignments: nullable `branchId` and a restrictive foreign key preserve existing assignments and historical Branch references. Supervisor remains an independent assignment relationship. No one-supervisor/one-Branch constraint exists.
5. Internal API: `src/lib/branches/service.ts` exposes authorized list (including active-only), get, save/create/update and deactivate operations. `operations.ts` provides the testable storage layer. Server actions validate input, resolve the company through the existing manager guard, and revalidate affected pages. There is no hard-delete operation or public Branch directory.
6. Management: Company Operations → Branches (`/admin/branches`) provides responsive cards, active status, address, attendance configuration status, active assignment counts, add/edit forms and deactivation/reactivation. Existing design-system components and navigation are reused. Manual coordinates require no map provider.
7. Provisioning: active company Branches appear in internship setup. Selection is required when at least one active Branch exists. The server rejects inactive/foreign Branches and revalidates within the provisioning transaction before storing the relationship. The legacy assignment action also validates Branch selection. Existing assignments with no Branch retain their lifecycle behavior.
8. Attendance: both Time In and Time Out resolve geofence coordinates from the authenticated intern's active assignment. Client-supplied Branch identifiers cannot select another location. Configured Branch coordinates take priority; a missing Branch radius uses the existing company radius. Retiring a Branch does not remove attendance access from existing assigned interns.
9. Compatibility: absent or unconfigured Branch coordinates fall back to the current company attendance configuration. Company timezone/date handling, selfie capture, MediaPipe, correction rules and attendance transitions remain unchanged. Profiles and operations summaries show Assigned Branch with the legacy workplace fallback. Evidence views add human-readable Branch context without exposing raw coordinates. Their map uses current configuration; this change does not add immutable location snapshots to historical attendance, and stored distances/results are preserved.
10. Backfill: `npm run branch:backfill` is dry-run by default. `--associate-assignments` explicitly opts into associating assignments with null Branch belonging to the existing `BO_MAIN_OFFICE` company. `--apply` is additionally required for writes. It resolves the company uniquely by its existing code, reuses Main Office case-insensitively, uses an upsert when creating, preserves existing Branch relationships, and performs application in a transaction. Summaries do not log credentials. Before future association, review the dry-run count to confirm all null-Branch assignments under that legacy company represent Main Office internships. No backfill command was executed in this task.
11. New migration: `prisma/migrations/20260913090000_restore_branches/migration.sql`. It adds Branch, indexes/checks, restrictive foreign keys, company-consistency enforcement, nullable assignment `branch_id`, and RLS for the new table. Access follows the existing server-side Prisma architecture.
12. Migration status: NOT APPLIED. No `migrate dev`, `migrate deploy`, `db push`, production database mutation or external directory integration was performed. Prisma Client generation was local only. Running the new database-backed routes requires the separately authorized migration phase.
13. Authorization tests: manager operations allow Representative/Admin and reject Supervisor/Coordinator/Intern; store calls remain company-scoped. Existing auth, role and profile tests pass. Supervisor profile assignment selection additionally stays limited to directly supervised active assignments. Coordinator/Intern Branch access remains read-only through authorized profile context.
14. Attendance regression tests: all 39 attendance tests pass; all 28 correction/single-office regression tests pass. Focused Branch tests cover location preference/fallback, assignment validation, rejection of foreign/inactive choices, nullable legacy assignments, service mutations, duplicate error propagation and SQL constraints. No database-backed test was run against the configured database.
15. Validation: Branch 8, provisioning 11, attendance 39, auth 6, assignment 14, roles 8, profile 37, navigation 29, corrections 28 — 180 passing tests. Typecheck, lint, production build and `git diff --check` pass. Windows sandbox user lookup prevented the first test attempt; the suites passed when rerun outside that sandbox. An old fixed-Main-Office map assertion was updated to verify the dynamic label and legacy default.
16. Responsive verification: Chromium rendered the actual Branch page/form and MobileNavigation components with fixture data and compiled application CSS at 390, 768, 1024 and 1440. Expanded forms, long names and addresses fit with no horizontal overflow. Bottom navigation remains visible below 1024 and hidden at desktop widths. This was isolated fixture rendering, not authenticated database-backed E2E. Temporary screenshots and fixture files are under `.next/branch-review` and are not committed.
17. Local commit: `feat(branches): restore internship branch management`; the final response supplies its hash. The existing vision-document change and development-generated `next-env.d.ts` are excluded.
18. No push or deployment occurred.
19. `0_init` and all pre-existing migrations, including `20260817120000_add_notification_foundation`, remain untouched.
20. The `wip: authenticated Playwright E2E coverage` stash remains untouched; it was neither restored nor modified.

Future backfill examples (not executed):

```sh
npm run branch:backfill
npm run branch:backfill -- --associate-assignments
# Only after explicit environment verification and migration authorization:
npm run branch:backfill -- --apply --associate-assignments
```

Files changed are listed below, including the regenerated Prisma Client files required by this repository's tracked-client convention.

- `docs/branch-restoration.md`
- `package.json`
- `prisma/migrations/20260913090000_restore_branches/migration.sql`
- `prisma/schema.prisma`
- `scripts/backfill-main-office-branch.ts`
- `scripts/test-attendance-capture-details.ts`
- `scripts/test-branches.ts`
- `src/app/(authenticated)/attendance/[attendanceId]/page.tsx`
- `src/app/(authenticated)/attendance/page.tsx`
- `src/app/(authenticated)/attendance/review/[attendanceId]/page.tsx`
- `src/app/admin/assignments/actions.ts`
- `src/app/admin/branches/actions.ts`
- `src/app/admin/branches/branch-form.tsx`
- `src/app/admin/branches/page.tsx`
- `src/app/admin/layout.tsx`
- `src/app/admin/settings/office/page.tsx`
- `src/app/admin/users/[userId]/page.tsx`
- `src/app/admin/users/actions.ts`
- `src/app/admin/users/new/page.tsx`
- `src/app/admin/users/new/provision-user-form.tsx`
- `src/app/attendance/actions.ts`
- `src/components/branch-location-evidence.tsx`
- `src/components/location-evidence-map.tsx`
- `src/components/profile-view.tsx`
- `src/generated/prisma/browser.ts`
- `src/generated/prisma/client.ts`
- `src/generated/prisma/commonInputTypes.ts`
- `src/generated/prisma/internal/class.ts`
- `src/generated/prisma/internal/prismaNamespace.ts`
- `src/generated/prisma/internal/prismaNamespaceBrowser.ts`
- `src/generated/prisma/models.ts`
- `src/generated/prisma/models/Attendance.ts`
- `src/generated/prisma/models/Branch.ts`
- `src/generated/prisma/models/Company.ts`
- `src/generated/prisma/models/InternshipAssignment.ts`
- `src/lib/admin/provisioning.ts`
- `src/lib/assignments/validation.ts`
- `src/lib/branches/domain.ts`
- `src/lib/branches/operations.ts`
- `src/lib/branches/service.ts`
- `src/lib/profile/data.ts`
