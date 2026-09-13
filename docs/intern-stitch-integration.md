# Intern dashboard: full Stitch visual integration

Functional baseline: `a8f8435` (`fix(branches): preserve pre-migration attendance compatibility`). That fix was already committed and remains intact. No functional fix was combined with this UI commit.

## Reference and visual result

Inspected `stitch-design/intern-dashboard/screen.png`, `code.html`, and `DESIGN.md`. The requested `design/stitch/intern-dashboard` and canonical `design/DESIGN.md` paths are absent in this worktree; the supplied reference files, existing global tokens and explicit task palette govern this implementation.

The real shared Intern shell now has a 240px white sidebar, compact top-aligned navigation, small section labels, restrained crimson active treatment, and a 64px solid white utility bar using existing account/notification controls. Plus Jakarta Sans applies to the Intern shell. Other roles retain their shell styling and navigation. No navigation entries or authorization rules changed.

The dashboard uses a fluid canvas up to 1600px, 24px desktop gutters, 16px card corners, 20-24px desktop card padding, and 12-16px mobile padding. Text now follows the reference's readable 12/14px body and 16px section-heading scale instead of the previous very small text. The summary combines program, greeting, workplace, dates, and existing actions; its slate progress inset contains actual credited/required hours, percentage, remaining hours and scheduled end with the shared accessible ProgressBar.

Attendance retains the evidence/metrics/action composition. Active records show signed selfie evidence when available, recorded Time In, a strong monospaced live timer, the actual scheduled end, and Time Out. No-record, completed, exception and incomplete presentations retain existing routes and state rules. Required evidence now uses a neutral clock icon rather than a checkmark. Evidence explanations remain contained on small screens.

The main desktop workspace uses a 7/5 split: Work Log, Tasks and weekly Attendance on the left; Calendar, Supervisor, incomplete onboarding and existing performance Insights on the right. Moving the existing Insights card into the rail removes the disconnected footer and large empty gap. Announcements remain below the workspace.

Work Logs retain no-log/draft/submitted summary and CTA behavior, with work/learning previews and genuine recorded skill tags. Tasks are compact checklist-like rows with existing priority ordering, due context, status badges and semantic icons. Weekly Attendance uses real Monday-Sunday records and compact daily cards, with no fabricated hours. Calendar uses the existing authorized query; Supervisor/workplace values and onboarding counts remain real. Complete onboarding stays hidden.

Below 1024px the rail stacks after the main work in the requested reading order. The existing mobile top bar and Home / Attendance / Work Logs / More navigation remain. Dashboard actions have a minimum height of 44px. No horizontal overflow was found at 360, 390, 430, 768, 1023, 1024, 1280, 1440 or 1600px.

The design reproduces the reference's shell proportions, compact summary/progress inset, Attendance workspace grouping, card hierarchy, checklist rows, daily cards and contextual rail. White surfaces, cool slate borders/canvas, crimson actions/progress and green/amber/rose states use existing global tokens. No gradients, glass panels, heavy shadows, material-symbol CDN, role switching, fake search, chat, terminal/Wi-Fi verification, breaks, biometric claims, competencies, reports or calendar sync were added.

## Validation

- 221 focused tests pass: dashboard states, Branch compatibility, Attendance/capture/corrections, Work Logs, Tasks, authorization, profiles, navigation and shell behavior. Obsolete navigation assertions were updated to target the actual dashboard components.
- Lint, typecheck, production build and git diff --check pass.
- Authenticated real-data dashboard inspected at all nine requested widths. Browser checks confirm the 240px desktop sidebar, mobile/desktop breakpoint and 44px Attendance actions.
- Six isolated rendered component fixtures checked across all nine widths (54 combinations): no record/log/tasks, active/draft, completed/submitted/100%, exception/missing Supervisor/workplace, incomplete, and partial progress/very long names. These fixtures never enter application routes or database data.
- Existing mobile More dialog open/Escape close and navigation labels pass.
- Desktop and mobile screenshots were visually compared with Stitch for density, typography, shell spacing, summary/progress, Attendance grouping, two-column composition, rail and card rhythm.
- Real dashboard Time In navigated to the existing `/attendance` EvidenceCapture form. With Chromium synthetic camera/geolocation, a 640x640 video stream and captured test location were observed. MediaPipe returned the expected no-face state and submission remained disabled. The form had no horizontal overflow at 390px.
- Physical-camera positive-face capture, preview/retake/confirmation and a completed Time In/Time Out submission were not performed. Existing tests cover capture and service safeguards; Time Out presentation/route was checked in isolated active-state fixtures. No Attendance data was submitted or modified.
- Diff against the functional-fix commit confirms no changes to Branch compatibility helpers, assignment projections, required-hours context, Attendance routes/actions/services, EvidenceCapture, MediaPipe, geofence, storage, authorization or Prisma files. Dashboard data queries are unchanged; only an existing Insights component is passed through for layout.

Local visual evidence and scripts: `artifacts/intern-stitch-integration/`. The test log is `artifacts/intern-stitch-tests.txt`. Screenshots include development-server indicators, which are not application UI.

## Files changed

- src/components/app-shell.tsx
- src/components/intern-shell.module.css
- src/components/intern-dashboard.module.css
- src/components/intern-dashboard.tsx
- src/components/dashboard-attendance-card.tsx
- src/components/intern-dashboard-data.tsx
- src/app/(authenticated)/dashboard/page.tsx
- scripts/test-navigation-ui.ts
- docs/intern-stitch-integration.md

No migration, database push, deployment, git push or stash restoration occurred. Pre-existing project-vision edits, supplied references and local browser artifacts are excluded from the UI commit.
