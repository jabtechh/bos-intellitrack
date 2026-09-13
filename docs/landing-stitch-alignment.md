# Public landing page rebuilt from Stitch

## Source and scope

Visual target: `stitch-design/landingpage/screen.png`. Layout reference: the adjacent `code.html`. Canonical functional palette and typography: the adjacent `DESIGN.md`. The requested `design/stitch/landing-page/` path is absent in this checkout.

The public section markup, product preview, and CSS module were replaced outright. The role strip was removed. The route retains static rendering and the existing login destination. Authenticated screens, global CSS, business logic, authorization, and database behavior were not changed.

## Color investigation before rebuilding

A real shared `.button.button-primary` element was rendered in the production browser before implementation. Computed colors were `#B91C1C` / `#FFFFFF`, with `#991B1B` on hover. The existing hero primary action also passed. The reported white/washed-out state could not be reproduced, so no speculative global defect is claimed.

The new public presentation resolves the global functional palette centrally through `--lp-*` aliases with canonical fallbacks. Its common primary-action class supplies crimson and white to all primary links; the CTA supplies a solid crimson base plus a 135-degree crimson-to-dark-crimson gradient. Missing inherited brand variables were tested explicitly: primary surfaces stayed crimson.

## Visual comparison

The screenshot target guided the compact header, equal desktop hero columns, four-line desktop headline, substantial desktop frame, overlapping dark evidence card, four feature cards, slate lifecycle section, large crimson invitation panel, and dense dark footer. Unverified partner/metric strips and unsupported claims from the generated reference were omitted.

At 1440px the rebuilt header is 72px high, the hero is approximately 712px high, and the preview occupies a 586px column within the 1216px content container. At 1024px it remains two columns. At 768px the preview follows the copy; at 390px actions stack and the evidence panel stays within the viewport. Full screenshots at all four widths were visually inspected against the reference.

Plus Jakarta Sans is now actually served through `next/font/local`, scoped to this page. The original variable font and SIL Open Font License are included under `src/components/landing/fonts/`, sourced from Google Fonts' `ofl/plusjakartasans` directory. Builds and visitors require no external font requests.

## Validation

- `npm.cmd run lint`: passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed, including production TypeScript and static route generation.
- `node --test scripts/test-landing-page.ts`: all five existing tests passed.
- `git diff --check`: passed.
- Production browser checks at 390, 768, 1024, and 1440px: no horizontal overflow, no broken section anchors, and no browser JavaScript errors.
- Explicit primary/default/hover, CTA gradient, inverse-button contrast, and missing-brand-token fallback assertions: passed.
- Keyboard skip link and navigation to the existing login form: passed.
- Local Jakarta font loaded and role strip absent at every checked width.

Uncommitted local evidence: `artifacts/landing-rebuild/theme-proof.png`, `landing-{width}.png`, and `verification.json`.
