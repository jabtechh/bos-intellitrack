# Public landing page implementation

## Reference and scope
Inspected all four Stitch files (screen.png, code.html, DESIGN.md, README.md) in the actual repository location, stitch-design/landingpage/. Replaced the previous warm, long-form public root page with the reference's split hero, application preview, four feature cards, four lifecycle cards, crimson CTA, and dark footer.

Components: LandingHeader, HeroSection, ProductPreview, FeatureGrid, LifecycleSection, LandingCTA, LandingFooter. All are Server Components with no new runtime dependencies or private data queries.

Visual tokens are scoped in landing.module.css: crimson #B91C1C, hover #991B1B, canvas #F8FAFC, white surfaces, border #E2E8F0, charcoal #0F172A, secondary text #475569. Emerald and amber indicate sample record states. Retained the existing sans-serif stack; the repository has no Next.js font-loading setup. Global typography and authenticated styles are unchanged.

## Content audit
- Retained the existing IT brand mark, IntelliTrack, and Internship Management for Bo’s Coffee.
- Attendance copy uses Time In, Time Out, Timed in, hours rendered, location/selfie evidence, and server-recorded timestamps.
- Daily Work Logs are journals moving from Draft to Submitted; attendance supplies credited time.
- Roles reflect Intern, Company Supervisor, School Coordinator, and Company Representative.
- AI copy is qualified by availability and human review; progress summaries, Portfolio reflections, and Evaluation remarks correspond to existing AI actions.
- Removed fabricated partners, rollout counts, metrics, identities, URLs, emails, legal resources, biometric claims, approval workflows, hiring guarantees, and automatic certifications.
- Preview records are explicitly illustrative; sample hours are not production statistics or a universal internship requirement.
- All sign-in links use the existing shared /login route. Other links target actual public sections.

## Validation
- Five landing tests passed using node --test scripts/test-landing-page.ts.
- npm.cmd run landing:test was attempted but tsx failed on this machine with uv_os_get_passwd ENOMEM; direct Node execution passed the same test file.
- npm.cmd run lint: passed.
- npm.cmd run typecheck: passed.
- npm.cmd run build: passed; / is statically prerendered.
- git diff --check: passed (only line-ending conversion notices).
- Playwright Chromium checked 360, 390, 430, 768, 1024, 1280, and 1440 pixels against the local production build: no horizontal overflow or broken anchors, one main landmark and one h1.
- Visually inspected mobile, tablet, and desktop screenshots. Mobile cards stack, tablet cards use two columns, desktop uses four; the attendance preview recomposes on mobile.
- Keyboard skip link transfers focus to main; the header CTA reaches the rendered login form. No login was submitted.
- Focus indicators, descriptive navigation labels, decorative hidden SVGs, explicit sample labels, and text-backed semantic states are present. The page introduces no animations and was also exercised with reduced motion.
- Crimson/white contrast is approximately 6.5:1; secondary slate text on white is approximately 7.6:1. This was a targeted accessibility check, not a full assistive-technology audit.
- Browser console had no uncaught page errors.
- Local screenshots and browser results: artifacts/landing/ (not included in commit).

## Files in this change
- src/app/page.tsx
- src/components/landing/sections.tsx
- src/components/landing/product-preview.tsx
- src/components/landing/landing.module.css
- scripts/test-landing-page.ts
- docs/landing-stitch-implementation.md

Authenticated UI, authorization, and business rules were not changed. No database data was modified, no migration was run, the pending Notification migration was untouched, and the Playwright E2E stash was not restored. No push or deployment occurred. Pre-existing project-vision edits and untracked Stitch references are excluded from the commit.
