# Authentication and Authorization Reference

## Canonical sources
- Functional auth/RBAC requirements: `../../02_core_requirements.md`
- Current role interpretation: `../roles-and-required-hours.md`
- Implementation: `../../src/lib/auth/`, relevant route/server-action guards, Supabase Auth integration.

## Principles
- Auth identity and application user/profile must remain consistent.
- Access is provisioned; public signup is out of scope.
- Authorization is role- and scope-based, not UI-only.
- Intern access is self-service.
- Supervisor access is limited to assigned interns.
- School Coordinator access is school-scoped and should not acquire company management authority by convenience.
- Company Representative owns normal company operations.
- System Administrator is technical/emergency.

## Change rule
Any change to role authority requires an explicit product decision and authorization regression tests.
