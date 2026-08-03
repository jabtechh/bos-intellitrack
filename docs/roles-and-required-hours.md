# IntelliTrack roles and required-hours ownership

IntelliTrack uses four normal business roles:

- **Intern** — records attendance, requests corrections, submits work logs, and views personal progress.
- **Company Supervisor** — reviews assigned Intern attendance exceptions, corrections, and work logs.
- **School Coordinator** — monitors students associated with their partner school and has no approval or management authority.
- **Company Representative** — manages Bo’s Coffee Main Office operations, users, partner schools, office settings, Intern records, and global review queues.

The internal **System Administrator** role exists for bootstrap, emergency recovery, and technical maintenance. It is not the normal Bo’s Coffee operational role and is created only through the dedicated bootstrap workflow.

## Required internship hours

The intended ownership is that an Intern enters required hours once during onboarding. A Company Representative may correct the value later; Company Supervisors and School Coordinators monitor it, and a System Administrator retains emergency correction access.

The current immutable database design cannot represent “not entered.” `required_hours` is non-null and constrained to a positive integer. Until a future approved schema change provides an explicit unset/onboarding state, provisioning must collect the real verified requirement. IntelliTrack must not store a fabricated placeholder value.
