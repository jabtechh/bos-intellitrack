# Completion Certificate and Completed-Intern Experience Addendum

- **Date:** 2026-11-24
- **Product decision:** DEC-2026-021 (Proposed; the implementation plan was approved by the product owner in the 2026-11-24 session)
- **Status:** In implementation (tasks P170–P175)

## Rules
- Issued automatically and atomically with the COMPLETED transition and the Portfolio snapshot. Only COMPLETED internships receive one; one certificate per assignment (idempotent).
- Signatory: the completing Company Representative, with name and position saved at issuance. Only a typed electronic issuance line is shown.
- Hours: credited hours from APPROVED Attendance, taken from the completion snapshot. "Completed the required N hours" appears only when credited ≥ required; a shortfall needs explicit Representative confirmation.
- Access: Intern (own), assigned Supervisor, school Coordinator, Main Office Representative (who can revoke with a reason). Admin is denied. Client-supplied IDs are re-authorized server-side.
- PDFs are generated on demand (no stored bytes). Public verification/QR is deferred.

## Completed-intern experience
- The Intern dashboard shows an "Internship completed" view (completion date, final hours, final evaluation, Certificate/Portfolio/Report actions) when there is no active internship.
- Supervisor `/interns` and Coordinator `/students` list completed interns separately, with certificate links.
- The profile shows a Completed badge, the completion date and a certificate link for in-scope viewers.
- No new navigation items.

## Demo data
An isolated-only, tagged (`demo_completed_intern=true`) completed intern is created through the real completion code path for review. It never uses the protected Gate A marker and can be removed with the cleanup script.
