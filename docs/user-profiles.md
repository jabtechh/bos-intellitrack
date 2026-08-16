# User profiles

Every authenticated IntelliTrack user has a private role-aware profile at `/profile`. Authorized staff can open `/profile/[userId]` only when the existing internship scope permits it: Company Supervisors are limited to directly supervised Interns, School Coordinators to Interns from their school, Company Representatives to Main Office operational users, and System Administrators to operational accounts. Interns cannot browse other profiles.

Users may update their own name display fields, phone number, About text, profile photo, and cover photo. Role, account status, school and workplace relationships, internship dates, required or credited hours, authorization scope, and operational records remain server-managed. Form input is allow-listed and ownership is resolved from the authenticated session.

The existing `profilePhotoPath` field is reused. A forward-only migration adds nullable `bio` and `coverPhotoPath` fields because no existing field could safely store those values.

Profile media uses the private `profile-media` Supabase Storage bucket. JPEG, PNG, and WebP files up to 5 MB are accepted. Object paths are generated on the server beneath the authenticated user's namespace and are never rendered. Pages receive short-lived signed URLs. Replacement files are uploaded first; if the database update fails, the new objects are removed. Old objects are removed only after the database update succeeds.

Profiles show only authorized operational context and eligible records. Emails, Auth IDs, private paths, attendance evidence, restricted documents, private Feedback, draft Evaluations, credentials, and internal identifiers are excluded. This feature intentionally adds no friends, follows, reactions, public feeds, messaging, or other social-network behavior.
