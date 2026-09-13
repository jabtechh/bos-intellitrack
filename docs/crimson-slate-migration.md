# Crimson & Crisp Slate theme migration

Color-only migration; existing component structure, layout, typography, responsive rules, workflows, authorization, and database behavior are preserved.

## Design source

The requested `design/DESIGN.md` is absent in this checkout. The canonical document is present at `stitch-design/DESIGN.md`; its functional palette matches the explicit task palette and was used for this migration. Typography, spacing, and component redesign guidance were intentionally outside this task.

## Theme conventions

`src/app/globals.css` owns the palette and exposes Tailwind v4 utilities through `@theme inline`:

- `background` / `canvas`, `surface` / `card`, `surface-muted`, and `border` provide cool slate surfaces and white cards.
- `foreground` is primary slate text. `primary` now means crimson branding, rather than the previous text-color meaning. Existing `secondary` and `muted` text utilities remain available; `muted-foreground` is also exposed.
- `primary-hover` and `primary-soft` cover hover and restrained active navigation treatments.
- `success`, `warning`, and `destructive` retain distinct semantic meanings. CSS also defines their soft backgrounds and borders.
- Shared controls, focus rings, progress indicators, mobile navigation, onboarding, operational pages, and dashboard styles consume the same tokens. The homepage's local aliases now reference this palette.

## Cleanup

No espresso, brown, caramel, stone utilities, or old brown brand hex values remain in application source or public UI assets. Old design/history documents and supplied design references remain untouched. No old brown UI colors were intentionally retained.

Amber remains for pending/warning states. Emerald remains for success and attendance geofence indicators. Blue remains for informational states. The camera preview retains its neutral dark backdrop; existing dark decorative panels use slate. These are semantic or structural colors, not legacy branding.

## Validation

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed, including production TypeScript validation and route generation.
- `git diff --check`: passed.
- Parsed CSS comparison: layout and typography declarations unchanged in both global and homepage stylesheets.
- TypeScript AST comparison: all 47 edited TSX files preserve component structure and non-string code.
- Desktop (1440px) and mobile (390px) homepage: browser inspected; crimson/slate palette and no horizontal overflow confirmed.
- Login primary action: browser assertions confirmed `#B91C1C` default and `#991B1B` hover.
- Authenticated browser inspection blocked: existing Intern, Supervisor, Coordinator, and Representative demo credentials were rejected by the login form. Additional available Intern, Supervisor, and Coordinator demo-data credentials were also rejected. Their dashboards, Attendance, onboarding, and authenticated mobile navigation were reviewed through their shared CSS/component source, but could not be visually inspected while authenticated. No authentication bypass or credential changes were made.

Local browser artifacts are under `artifacts/theme/` and are not included in the commit.
