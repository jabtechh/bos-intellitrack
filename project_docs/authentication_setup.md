# IntelliTrack Authentication Foundation

## Responsibility boundaries

Supabase Auth is IntelliTrack's identity provider and manages sign-in, sessions,
and token refresh. Prisma remains the only application data-access layer for the
`users` table and all other business tables. Supabase Storage may be added later
for approved file workflows.

A valid Supabase Auth identity does not grant IntelliTrack application access by
itself. The identity's verified subject claim must match `users.auth_id`. That
application user row supplies the controlled IntelliTrack role and active state.
The application never assigns a role from user input or Supabase Auth metadata.

Public sign-up is not exposed. Users must be provisioned through a controlled
administrator workflow before they can enter the application.

## Required environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`

Only the Supabase publishable key is used by browser and SSR auth clients. A
service-role key must not be exposed to this application foundation.

## Request and account flow

The Next.js Proxy refreshes authentication cookies and calls `getClaims()` to
validate identity. Server helpers also use `getClaims()` rather than trusting
`getSession()` for authorization.

- `/login` signs in an existing Supabase Auth identity with email and password.
- `/dashboard` requires a verified, provisioned, active IntelliTrack user.
- `/account/not-provisioned` explains that a verified identity has no matching
  IntelliTrack user record.
- `/account/inactive` explains that the matching IntelliTrack user cannot
  currently access the application.
- Logout ends the Supabase session and returns the user to `/login`.

No flow automatically creates a business user, assigns a role, changes account
metadata, reactivates an account, or modifies another database record.
