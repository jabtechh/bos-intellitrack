# Tasks

Tasks provide a scoped workflow for work assigned by a Company Supervisor to an active Intern under that supervisor.

## Lifecycle

`Assigned` → `In progress` → `Submitted` → `Completed`. An Intern may mark active work as `Blocked`, and resume it. A Company Supervisor may request revision from a submitted task; the Intern can resume and resubmit. A supervisor can cancel a task before submission.

Interns can see and update only their own tasks. Company Supervisors can assign and review only tasks for directly assigned Interns. School Coordinators have read-only school scope. Company Representatives have read-only Bo’s Coffee Main Office scope. System Administrators have read-only operational scope by default. Every Server Action repeats authorization and uses state-qualified updates.

## Completion evidence

One optional PDF, image, DOCX, or XLSX file up to 25 MB can accompany progress. Files use controlled, non-public paths in the private `task-evidence` bucket. A short-lived signed URL is created only after the application authorizes the Task record. Replacing evidence removes the previous object only after the database update succeeds.

Run `npm run storage:tasks:setup` to create or reconcile the private bucket. This command is idempotent.

## Intentional limits

Tasks do not create attendance, work-log, notification, scoring, analytics, or AI records. Task completion does not automatically change internship progress. A future workflow may link Tasks and Daily Work Logs if a separately reviewed forward-only migration adds that relationship.
