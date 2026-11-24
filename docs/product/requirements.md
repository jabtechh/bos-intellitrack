# Requirements Index

This file is an index, not a replacement for the approved requirements.

## Canonical functional requirements
Read `../../02_core_requirements.md` for the authoritative requirement IDs. It currently defines 51 functional requirements across:
- authentication and role-based access;
- intern profile management;
- attendance;
- daily work logs;
- task management;
- performance evaluation and workmate feedback;
- AI portfolio generation;
- AI skill and productivity analysis;
- document management;
- company announcements;
- reporting.

Do not create new requirement IDs in this index.

## Supporting product sources
- `../../01_project_vision.md` — product purpose and intended outcomes.
- `../roles-and-required-hours.md` — current business-role interpretation and required-hours ownership.
- `../../06_ui_ux_specification.md` — existing UX specification.
- `../../05_design_system.md` — visual design guidance.

## Requirement conflict rule
If current code, UX documents, or later notes conflict with an approved requirement, record the conflict in the active spec. Do not silently change either the requirement or implementation.

## Traceability rule
Every material feature decision in a spec should include one of:
- one or more `REQ-...` IDs;
- `PRODUCT-DECISION` with a reference to `decisions.md`;
- `CLARIFICATION-NEEDED` when the source material is insufficient.
