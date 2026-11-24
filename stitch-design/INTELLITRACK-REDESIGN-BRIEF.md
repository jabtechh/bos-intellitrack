# IntelliTrack — Google Stitch Redesign Brief

**Purpose:** Visual design exploration only. Create a distinctive, consistent, multi-role UI system from real IntelliTrack requirements. This file is not authorization to change the application, database, or deployment.

## Verified project sources

Read in this order. Later approved decisions override older general UI guidelines:
1. `C:\Coding\bos-intellitrack\01_project_vision.md` — audience, purpose, objectives.
2. `C:\Coding\bos-intellitrack\02_core_requirements.md` — **51 canonical functional requirements**.
3. `C:\Coding\bos-intellitrack\docs\product\decisions.md` — approved decisions (role ownership, simplified navigation, deferred scope).
4. `C:\Coding\bos-intellitrack\specs\002-intellitrack-realignment-implementation\spec.md` — implementation-aligned feature descriptions and role-level navigation.
5. `C:\Coding\bos-intellitrack\specs\002-intellitrack-realignment-implementation\phase-c-51-requirement-traceability.md` — actual acceptance status, not a design spec.
6. `C:\Coding\bos-intellitrack\06_ui_ux_specification.md` and `05_design_system.md` — older UI inspiration; do **not** restore features the approved decisions deferred.
7. `C:\Coding\bos-intellitrack\design\DESIGN.md` — current implementation-aligned visual design guidance, where compatible.

Existing Stitch visual references:
- `stitch-design\Operations-Dashboard\screen.png` and `code.html`
- `stitch-design\User-Table\screen.png` and `code.html`

The Stitch references have ivory (#F7F4F0), espresso (#332018), terracotta (#B85F38), sage/status accents, and Plus Jakarta Sans. Use them as a starting point, **not a template to clone**; propose a more recognizable design identity.

## Product

IntelliTrack is an AI-assisted internship management system designed for Bo's Coffee. It connects Interns, Company Supervisors, School Coordinators, and Company Representatives. A System Administrator exists separately for technical recovery only.

### Business workflows and role boundaries

- **Intern:** Personal Home dashboard; Time In/Out with GPS/geofence and selfie evidence; Attendance history and correction requests; Daily Work Log with optional private attachment; Tasks; Growth (finalized Evaluations, skill evidence/Insights, Portfolio and PDF export); genuine peer/workmate Feedback; required-document uploads and status; company Updates; Profile and emergency contacts.
- **Supervisor:** Home; directly assigned Intern roster; consolidated Reviews (Attendance exceptions/corrections, read-only submitted Work Logs); assign and monitor Tasks; initial, midterm, final, and **repeatable weekly** progress Evaluations; scoped Reports; appropriately scoped document visibility. Supervisor is the routine Attendance exception/correction decision-maker.
- **School Coordinator:** Home; own-school Students; school-scoped attendance and hours monitoring, finalized Evaluations, Reports; authorized read-only documents. No company operations or routine review edits.
- **Company Representative:** Operations Home; intern/account and assignment provisioning within approved company scope; required-company document review; Company Announcements; one focused Company Report (active Interns, hours, attendance exceptions, evaluation completion, internship completion); relevant partner-school references.
- **System Administrator:** Technical system/user recovery surfaces only. Do not place routine internship workflow actions in Admin.

### Critical behavior for honest UI concepts

- Credit for required internship hours originates in approved Attendance records, **not** Work Log entries.
- Work Logs have **Draft / Submitted** and Supervisor read-only visibility. Do not invent a Work Log approval process.
- Evaluations support one-time Initial/Midterm/Final plus recurring weekly Progress; Intern and Coordinator see authorized **finalized** records only.
- Attendance uses GPS, geofence, and selfie **evidence**; don't claim biometric identity recognition or anti-spoofing/liveness certification.
- AI Portfolio/Skills/Insights must be grounded in real internship evidence. Avoid fabricated ranks and 'AI knows your personality' claims.
- Calendar/holidays, school announcements, generic reminders, extra AI drafting, and gratuitous operations are **deferred from primary V1 navigation**.
- Do not invent enabled search, real-time chat, analytics, actions, settings, or permission boundaries not in the requirements. Design-only placeholders may be clearly labeled as concepts.

### Required screen concepts

**Design these first, in a coherent shared system:**

| Priority | Design screen | Existing route(s) | Signature UX idea |
|---|---|---|---|
| 01 | Intern Home dashboard | `/dashboard` | Strong 'internship journey' composition; verified hours progress, today's attendance, work log, tasks, next milestone, contextual insight |
| 02 | Intern Attendance | `/attendance`, `/attendance/history` | Mobile-native Time In/Out camera+GPS capture flow, permission/error states, evidence preview, calm progress cues |
| 03 | Intern Work Logs | `/work-logs`, `/work-logs/new` | Editorial journal interface, attachment affordance, meaningful day summaries |
| 04 | Supervisor Intern roster | `/interns` | Premium data-dense table, clear statuses, role-scoped action menu, search/filter concept only if appropriate |
| 05 | Supervisor Reviews | `/reviews`, `/attendance/review` | Triage-style exception queue; priority and evidence clarity |
| 06 | Supervisor Evaluations | `/evaluations`, `/evaluations/new` | Weekly evaluation timeline and transparent multi-step form |
| 07 | Intern Growth & Portfolio | `/insights`, `/portfolio` | Evidence-backed skill growth map and visual portfolio narrative |
| 08 | Intern Documents | `/documents`, `/documents/new` | Required-file checklist, progress and review states |
| 09 | Representative Operations | `/admin`, `/admin/users`, `/admin/assignments` | Operational command surface with refined data tables |
| 10 | Coordinator Students / Reports | `/students`, `/reports` | School-scoped monitoring with concise progress and report summaries |

Additional secondary screens: Tasks, Workmate Feedback, Notifications/Announcements, Profile, Report details, and technical-only Admin. Don't make each one a separate disconnected visual system.

## Art direction — find IntelliTrack's X factor

Develop a **premium editorial operations dashboard** that feels designed by a strong product team, not a generic SaaS template.

- Brand anchor: **deep espresso / warm ivory / copper-terracotta**, accented by confident moss/sage for progress, amber for review, and crimson only for true danger.
- Increase the perceived quality through **strong typography, numbers with presence, expressive but disciplined grid composition, rare asymmetric hero modules, and contextual visual storytelling** rather than gratuitous gradients, blobs, or giant empty cards.
- Distinctive concept: an **Internship Journey Spine** — a restrained vertical/segmented progression line connecting onboarding, verified attendance, weekly Evaluations, skill evidence, and Portfolio. It must use actual evidence and not invent milestones or scores.
- A quiet dark-espresso sidebar or utility rail is an option to explore against a light editorial canvas, but maintain readability and trustworthy operational density.
- Tables should look purpose-built: meaningful column hierarchy, row rhythm, compact status markers, row actions, responsive card conversion, and polished empty/loading/error states.
- Use subtle custom line motifs inspired by **coffee rings, progress marks or journal margins** only as secondary micro-brand elements; never cover data or reduce accessibility.
- Modern, tactile, precise. **Not** pale/washed out; **not** corporate dashboard boilerplate; **not** cyan/purple AI gradients; **not** excessive cards and random visual effects; **not** a copy of the references.
- Responsive behavior matters: desktop 1440 px and Android mobile ~390 px. Mobile Intern Attendance is a first-class workflow.
- Accessibility: high contrast, recognizable states beyond color, legible numbers, touch targets, keyboard-friendly forms.

## Ready-to-paste Google Stitch master prompt

Redesign **IntelliTrack**, an AI-assisted internship management platform for Bo's Coffee, as a cohesive multi-role premium web product. The current UI feels too plain, overly generic, and inconsistently designed. I want a **visually memorable X factor** without compromising real workflow functionality.

Use the attached requirements/feature brief and the two existing references (Operations Dashboard and User Table) for structure and brand context, **but do not copy the references**. Explore a bolder, confident **espresso / ivory / terracotta editorial product identity** with dark navigational contrast, expressive typography and metric design, sophisticated visual density, purposeful whitespace, and one unique visual signature: an evidence-backed **Internship Journey Spine**.

Start by designing **four connected screens** with a reusable global visual language:
1. **Intern Home** — credited vs required internship hours, Time In/Out state, today's Work Log, assigned Tasks, Growth/Evaluations preview and company announcements.
2. **Supervisor Intern roster** — dense polished table with intern, assignment, hours progress, current status, next action, and refined filters/action affordances.
3. **Intern Attendance on Android mobile** — precise GPS permission + live selfie evidence capture + confirmation + Time In/Out states, with realistic failure/retry screens.
4. **Intern Growth/Portfolio** — verified evidence progression, skills over time, finalized evaluations, reviewable Portfolio and PDF export.

The Intern, Supervisor, Coordinator and Company Representative must have **different authorized navigation** while sharing one consistent design system. System Admin is a separate technical-only persona. Do not fabricate dashboards, AI scores, approval rights, biometric identity/liveness, or calendar/reminders not in scope.

Deliver desktop and mobile concepts, navigation/sidebar, headers, tables, forms, status treatments, typography/color tokens, and a few high-fidelity empty/error states. Present **two substantially different design directions** before polishing one. Make it emotionally distinctive, professional, readable, and implementation-aware rather than 'vibe-coded'.
