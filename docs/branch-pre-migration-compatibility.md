# Branch pre-migration compatibility

The previous uncommitted implementation was present and retained. The resumed work reviewed it, finished the Attendance workplace binding, added an application-wide assignment projection audit and a read-only database verifier, and completed automated validation.

## Original failure

`src/app/(authenticated)/attendance/page.tsx` called `requireInternAssignment()` and then `prisma.internProfile.findUnique({ select: { assignments: { select: { branch: { select: { name: true } }, ... } } } })`. Resolving this relation requires `internship_assignments.branch_id`, which is absent before the Branch migration. The second profile/assignment query was redundant and is removed.

`src/app/attendance/actions.ts` also used `internshipAssignment.findFirst({ include: { company: true, branch: true } })`. Prisma includes all assignment scalars by default when using `include`, so even an include containing only `company` requests the newly generated `branchId` scalar. Nested assignment includes caused the same failure across Attendance history/corrections, Tasks, Documents, Evaluations, Feedback and administration.

## Compatibility approach

- `internshipAssignmentBaseSelect` explicitly enumerates existing assignment scalars, excluding `branchId` and `branch`. Previously broad reads and mutation return projections reuse it while preserving filters and related data.
- `requireInternAssignment()` remains ownership- and onboarding-scoped and supplies Attendance's existing schedules, company workplace and recent records. Attendance no longer reloads the profile.
- Branch capability uses read-only `information_schema` checks for both the assignment column and Branch table in the current schema. Optional reads execute only when both exist. Catalog/connection errors propagate. React caching is render-scoped, not a permanent migration flag.
- Authorized Branch management shows an uninitialized state before migration. Optional lists are empty and Branch writes are unavailable. Assignment creation without a Branch omits the missing column; submitted Branch IDs are rejected while uninitialized.
- Time In/Out and Attendance evidence details resolve an optional Branch only after establishing assignment ownership/reviewer scope. When absent, `resolveAttendanceLocation` retains existing company coordinates, radius and timezone; configured Branch geofences remain supported after migration.
- Dashboard and profile Branch reads are guarded. The old dashboard helper that caught every P2021/P2022 error was removed in favor of the catalog check.

## Validation

- 198 tests passed: Branch compatibility/management, Intern context/projection audit, dashboard, Attendance/capture/corrections, Work Logs, Tasks, authentication, role alignment and profile authorization.
- Typecheck, lint, production build and git diff --check passed.
- `scripts/verify-branch-compatibility.ts` ran against the current database in an explicit READ ONLY transaction. Branch schema availability was false, an active assignment loaded, and optional Branch resolution returned null. Attendance, Work Log and Task relation reads each returned a real row. Document, Evaluation and Feedback relation queries succeeded with zero rows for that selected assignment.
- The app-wide syntax audit found no root or nested assignment result query relying on implicit scalar selection. Count-only relation queries are intentionally excluded.
- Attendance page wiring still uses the existing EvidenceCapture with `clockIn` and `clockOut`; tests preserve service safeguards, geofence calculations, timestamps, storage/correction behavior, and exactly-one-face capture rules.
- Browser `/attendance`, real camera/MediaPipe, selfie preview/confirmation, and completed Time In/Time Out submissions were NOT runtime-verified in this continuation. The earlier server launch was rejected by automatic approval review due to a usage limit. No retry loop or workaround was used. No live Attendance records were created or changed.

## Manual browser check

Run from the repository:

```powershell
npm.cmd run start -- --port 3202
```

Open `http://localhost:3202/dashboard`, sign in as an Intern, and follow Time In to Attendance. Check location, live camera, exactly-one-face detection, preview and confirmation. Time Out should expose the same capture flow for an already timed-in test account. Completing submissions writes Attendance, so use an authorized test account/environment for that final check. Also open Attendance History, Work Logs, Tasks, onboarding, profile and the authorized Branch management page.

The read-only database check is repeatable with:

```powershell
node --env-file=.env --env-file=.env.local --import tsx scripts/verify-branch-compatibility.ts
```

No migrations, schema pushes, deployment, git push or E2E stash restoration occurred. Attendance rules, EvidenceCapture, MediaPipe and authorization implementations were not changed. Pre-existing project-vision edits and local artifacts remain outside the commit.

## Changed files

- `docs/branch-pre-migration-compatibility.md`
- `scripts/test-branch-compatibility.ts`
- `scripts/test-branches.ts`
- `scripts/test-intern-dashboard.ts`
- `scripts/verify-branch-compatibility.ts`
- `src/app/(authenticated)/attendance/[attendanceId]/page.tsx`
- `src/app/(authenticated)/attendance/corrections/[correctionId]/page.tsx`
- `src/app/(authenticated)/attendance/corrections/new/page.tsx`
- `src/app/(authenticated)/attendance/corrections/page.tsx`
- `src/app/(authenticated)/attendance/corrections/review/[correctionId]/page.tsx`
- `src/app/(authenticated)/attendance/corrections/review/page.tsx`
- `src/app/(authenticated)/attendance/history/page.tsx`
- `src/app/(authenticated)/attendance/page.tsx`
- `src/app/(authenticated)/attendance/review/[attendanceId]/page.tsx`
- `src/app/(authenticated)/attendance/review/page.tsx`
- `src/app/(authenticated)/documents/[documentId]/page.tsx`
- `src/app/(authenticated)/documents/manage/page.tsx`
- `src/app/(authenticated)/documents/new/page.tsx`
- `src/app/(authenticated)/documents/page.tsx`
- `src/app/(authenticated)/evaluations/[evaluationId]/edit/page.tsx`
- `src/app/(authenticated)/evaluations/[evaluationId]/page.tsx`
- `src/app/(authenticated)/evaluations/new/page.tsx`
- `src/app/(authenticated)/evaluations/page.tsx`
- `src/app/(authenticated)/evaluations/review/page.tsx`
- `src/app/(authenticated)/feedback/[feedbackId]/page.tsx`
- `src/app/(authenticated)/feedback/new/page.tsx`
- `src/app/(authenticated)/feedback/page.tsx`
- `src/app/(authenticated)/tasks/[taskId]/edit/page.tsx`
- `src/app/(authenticated)/tasks/[taskId]/page.tsx`
- `src/app/(authenticated)/tasks/new/page.tsx`
- `src/app/(authenticated)/tasks/page.tsx`
- `src/app/(authenticated)/tasks/review/[taskId]/page.tsx`
- `src/app/(authenticated)/tasks/review/page.tsx`
- `src/app/admin/assignments/actions.ts`
- `src/app/admin/branches/page.tsx`
- `src/app/admin/users/[userId]/page.tsx`
- `src/app/admin/users/actions.ts`
- `src/app/attendance/actions.ts`
- `src/app/attendance/corrections/actions.ts`
- `src/app/attendance/corrections/review/actions.ts`
- `src/components/intern-dashboard-data.tsx`
- `src/lib/assignments/projection.ts`
- `src/lib/branches/compatibility-reader.ts`
- `src/lib/branches/compatibility.ts`
- `src/lib/branches/service.ts`
- `src/lib/dashboard/intern-presentation.ts`
- `src/lib/profile/data.ts`
- `src/lib/required-hours/intern-context.ts`
