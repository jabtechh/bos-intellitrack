# IntelliTrack visual system

This document is the canonical visual specification for IntelliTrack. The approved direction is a clean, professional operational interface built on warm coffee brand colors, a warm-neutral canvas, and white working surfaces.

The former **Crimson & Crisp Slate** direction, including `#B91C1C` and `#991B1B` as brand colors, is deprecated. Historical Stitch inputs and implementation reports may retain those values as records, but production UI must use the semantic tokens defined in `src/app/globals.css`.

## Color system

### Brand

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Primary | `--brand-primary` | `#2C1810` | Primary actions, active navigation, selected tabs, progress, focus and strong brand accents |
| Primary hover | `--brand-primary-hover` | `#1F100B` | Hover/pressed treatment for primary surfaces |
| Secondary | `--brand-secondary` | `#C28E46` | Highlighted metrics, secondary accent icons, active indicators and decorative details |
| Tertiary | `--brand-tertiary` | `#9A3412` | Strong warm accent for selected metadata and non-destructive secondary emphasis |

Secondary and tertiary are accents, not replacements for semantic warning or error colors. Do not fill every card with gold or brown.

### Surfaces and neutrals

| Role | Token | Value |
| --- | --- | --- |
| Application canvas | `--app-canvas` | `#FAF8F5` |
| Card surface | `--surface-card` | `#FFFFFF` |
| Muted surface | `--surface-muted` | `#F5F0EB` |
| Default border | `--border` | `#E7DED6` |
| Strong border | `--border-strong` | `#D1C2B7` |
| Primary text | `--text-primary` | `#2C1810` |
| Secondary text | `--text-secondary` | `#65564E` |
| Muted text | `--text-muted` | `#7D6D64` |

Cards remain white. Warm neutrals belong primarily to the application background, inset regions, borders, and restrained hover states.

### Derived interaction tokens

- `--brand-primary-subtle`: quiet primary tint for badges and selected regions.
- `--brand-secondary-subtle`: gold-tinted accent surface.
- `--brand-tertiary-subtle`: warm accent surface.
- `--active-navigation-background`: selected navigation surface paired with primary text and icons.
- `--focus-ring`: visible translucent coffee focus boundary.

Existing aliases such as `--primary`, `--primary-soft`, `--canvas`, and `--surface` remain supported so established components inherit the canonical palette. New code should prefer semantic intent and must not scatter raw brand hex values through components.

### Semantic states

Status meaning is independent from branding:

- Success and verified: green.
- Warning and pending attention: amber.
- Error, urgent, rejected, or destructive: red/rose.
- Informational: neutral blue/slate where helpful.

Every status includes text or an icon so color is not the only signal. Never use the tertiary brand orange as an error color.

## Typography

Plus Jakarta Sans remains the product interface typeface for the current Stitch-integrated Intern shell, dashboard, Attendance experience, and public presentation. Preserve the existing type scale, weights, line heights, and truncation behavior. Typography changes are outside a palette migration unless separately approved.

## Spacing and layout

Keep the established responsive composition:

- Mobile-first stacking and existing navigation behavior.
- Current dashboard and Attendance grids at their existing breakpoints.
- Existing page widths, section spacing, card padding, table density, and context rails.
- Touch targets of at least 44px for important mobile controls.

Use the existing spacing rhythm and component APIs. A theme change must not introduce new panels, reorder content, or change workflows.

## Components

### Buttons and controls

- Primary: coffee primary background, white text, darker coffee hover.
- Secondary: white or muted surface, warm border, primary or primary-text foreground.
- Destructive: semantic red, never a brand color.
- Inputs: white surface, warm-neutral border, coffee focus border/ring.
- Checkboxes, radios, and native progress controls: primary accent unless their state is semantic.

### Navigation and tabs

Active navigation uses the subtle primary background with primary text/icons and the existing active indicator. Hover treatments use muted warm surfaces. Preserve desktop sidebar and mobile bottom-navigation structure.

### Cards, tables, and progress

Cards and tables use white surfaces with warm-neutral borders. Inset panels may use the application canvas or muted surface. Default branded progress bars use primary; success, warning, and error progress must retain their semantic color.

### Badges

`StatusBadge` remains semantic. Brand badges may use subtle brand backgrounds only when they describe selection or product identity rather than record state.

## Shape and elevation

Preserve the current Stitch-integrated radii and density. Borders provide most surface separation; shadows remain soft and low-contrast. Do not add heavy shadows, glass effects, or decorative gradients beyond existing approved treatments.

## Accessibility

- Target WCAG AA: 4.5:1 for normal text and 3:1 for large text and meaningful UI boundaries.
- Keep focus states visible on every keyboard-operable control.
- Do not place small white text on the secondary gold without a verified contrast-safe treatment.
- Do not communicate status by color alone.
- Preserve semantic markup, labels, reduced-motion support, and responsive zoom behavior.

## Review checklist

- The canvas is `#FAF8F5`; cards remain white.
- Primary actions, selected tabs, active navigation, and default progress use `#2C1810`.
- Secondary and tertiary accents are restrained and non-semantic.
- Verified states are green, warnings amber, and errors red/rose.
- No production component uses the deprecated crimson values for branding.
- Public landing, onboarding, shell/navigation, dashboard, Attendance, tables, forms, and mobile states inherit shared tokens.
- Layout, workflow, authorization, attendance evidence, and responsive behavior are unchanged.
