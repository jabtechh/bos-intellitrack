---
name: intellitrack-ui
description: Audits, improves, and verifies IntelliTrack user experience, responsive layouts, navigation, tables, forms, and role-specific dashboards using the approved Bo's Coffee design system and Stitch references. Use for UI redesign, visual polish, mobile usability, or inconsistent screens.
---

# IntelliTrack UI/UX workflow

1. Read `05_design_system.md`, `06_ui_ux_specification.md`, relevant requirements/decisions, and applicable `stitch-design/` references before proposing visual changes.
2. Inspect the current screen and its components, shared UI primitives, styles, navigation, and responsive behavior. Reuse existing tokens and components where appropriate.
3. Preserve role-specific information architecture and server-side authorization. Hiding a UI control is never a substitute for authorization.
4. Prefer clear hierarchy, strong but restrained visual identity, consistent tables, readable typography, useful empty/loading/error states, and mobile-first layouts.
5. Avoid introducing a new visual system, arbitrary colors, duplicate components, or unnecessary dependencies.
6. Identify exact screens/components and show the proposed design direction before a major redesign. Major information-architecture or workflow changes require human approval.
7. Implement only the approved UI scope. Preserve keyboard access, semantic controls, focus visibility, touch target usability, and safe-area behavior.
8. Verify at minimum the relevant mobile width and desktop width; use the project's required 390/768/1024/1440 responsive matrix when the active spec calls for it.
9. Report changed screens/components, responsive checks, role checks, test results, and known visual gaps.
