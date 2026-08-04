# Portfolio and reports

IntelliTrack provides one private, Intern-maintained portfolio per internship and dynamically generated internship reports. No report or exported PDF is persisted.

Interns can edit only their own portfolio. Company Supervisors are limited to directly supervised Interns, School Coordinators to their partner school, and Company Representatives/System Administrators to Bo's Coffee Main Office. Every page, mutation, and PDF handler reapplies this scope.

Portfolio text is explicitly labeled as Intern-written. Verified report sections are derived from stored attendance, approved Daily Work Logs, completed Tasks, submitted or acknowledged Evaluations, role-visible Feedback, and approved portfolio-eligible Documents. Drafts, rejected/archived documents, identification and medical categories, evidence, storage paths, signed URLs, and internal identifiers are excluded.

PDFs are generated in memory with private/no-store headers and safe filenames. Public sharing and saved exports are intentionally unavailable because the schema does not provide safe visibility controls.

## Gemini-assisted drafts

When the server-only `GEMINI_API_KEY` and `GEMINI_MODEL` settings are configured, authorized users may explicitly request an internship progress summary. Interns may also request a Portfolio reflection draft. Every result is labeled as an AI-generated draft and must be reviewed; nothing is saved, submitted, published, or emailed automatically.

Only redacted, eligible report evidence is sent: hour totals, approved attendance summaries, approved Work Logs, completed Tasks, finalized Evaluations, role-visible Feedback, and approved portfolio-eligible Document metadata. Names, contact information, identifiers, GPS and selfie evidence, document contents, restricted categories, Storage information, credentials, and draft or rejected records are excluded. Gemini unavailability, rate limits, safety blocks, malformed responses, or missing configuration produce a safe status while the rest of IntelliTrack remains usable.
