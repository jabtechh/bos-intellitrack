# IntelliTrack roles and required-hours ownership

IntelliTrack uses four normal business roles:

- **Intern** — records attendance, requests corrections, submits work logs, and views personal progress.
- **Company Supervisor** — reviews assigned Intern attendance exceptions, corrections, and work logs.
- **School Coordinator** — monitors students associated with their partner school and has no approval or management authority.
- **Company Representative** — manages Bo’s Coffee Main Office operations, users, partner schools, office settings, Intern records, and global review queues.

The internal **System Administrator** role exists for bootstrap, emergency recovery, and technical maintenance. It is not the normal Bo’s Coffee operational role and is created only through the dedicated bootstrap workflow.

## Required internship hours

The intended ownership is that an Intern enters required hours once during onboarding. A Company Representative may correct the value later; Company Supervisors and School Coordinators monitor it, and a System Administrator retains emergency correction access.

The forward-only `support_required_hours_onboarding` migration provides an honest unset state while retaining the positive-value rule whenever a requirement exists. Normal provisioning leaves the value unset; the Intern confirms it once through onboarding. Company Representatives and System Administrators can later correct it with a required reason.

Version 1 stores only the latest correction actor and reason. It does not add a general onboarding table or persistent correction-history table.
