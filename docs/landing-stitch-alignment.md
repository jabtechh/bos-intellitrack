# Public landing page: Stitch alignment

## Reference and scope

The supplied screenshot and HTML are available in this checkout at `stitch-design/landingpage/screen.png` and `stitch-design/landingpage/code.html`. The requested `design/stitch/landing-page/` directory is absent. `stitch-design/DESIGN.md` provides the canonical Crimson & Crisp Slate functional palette.

Only the public homepage and its CSS module/components were changed. Authenticated screens, global theme, authorization, and database behavior were not modified.

## Theme investigation

The reported white primary buttons and white CTA background were **not reproducible in the current production build** before this revision. Computed styles showed both header/hero primary actions at `rgb(185, 28, 28)` with white text, and the CTA surface at the same crimson. The existing global tokens and Tailwind v4 mapping were already correct following the preceding theme migration. There is no evidence here to attribute the reported screenshots to a new global-token or button-variant defect.

The landing page previously depended on global brand variables without fallbacks. Its shared, namespaced brand aliases now supply canonical defaults if those variables are absent. All primary actions and the CTA consume these aliases; individual buttons do not define their own palette. The CTA has both a solid crimson base and a crimson-to-dark-crimson gradient. Browser checks explicitly remove the inherited brand variables and confirm that primary surfaces remain crimson.

## Composition

- Compact white header with centered desktop navigation and prominent Sign In.
- Tighter two-column hero with a larger desktop frame and floating attendance evidence card.
- Factual role strip using real IntelliTrack roles, replacing the reference's unverified partner claims.
- Four balanced feature cards and compact connected lifecycle cards, with intentional mobile stacking.
- White-on-crimson CTA with a white button, followed by a balanced dark slate footer.
- Sans-serif heading scope for the public page; Plus Jakarta Sans is preferred when available, with local system fallbacks. No new external font request is required.

Preview records remain explicitly illustrative. No biometric claims, invented metrics, support details, or new destinations were added.

## Validation

- Lint, typecheck, production build, and `git diff --check`: passed.
- Five existing landing-page tests: passed using Node's native TypeScript support (`node --test scripts/test-landing-page.ts`). The initial tsx runner encountered a host `uv_os_get_passwd` memory error; the tests themselves passed.
- Production browser screenshots reviewed against Stitch at 390, 768, 1024, and 1440px.
- No horizontal overflow or broken section anchors at any checked width.
- Asserted primary crimson/white colors, dark crimson hover, crimson CTA gradient, and white/crimson CTA button.
- Missing-brand-variable fallback, keyboard skip link, and navigation to the existing login form passed; no browser JavaScript errors.

Local screenshots and browser verification results are in `artifacts/landing-redesign/` (not committed).
