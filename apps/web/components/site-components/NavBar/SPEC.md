# NavBar

Top navigation bar with a horizontal link list and an optional logo. In
Sprint 5 the NavBar reads from `node.props`, NOT from
`siteConfig.global.navBar`. The schema's global NavBar config exists
separately as a setup-form seed; Sprint 6's editor lifts it into a NavBar
node when the user adds one to a page.

## Props

| Name            | Type                                       | Default  | Description                                                            |
| --------------- | ------------------------------------------ | -------- | ---------------------------------------------------------------------- |
| `links`         | `Array<{ label: string; href: string }>`   | `[]`     | Navigation links rendered horizontally.                                 |
| `logoPlacement` | `"left" \| "center" \| "right"`            | `"left"` | Where the logo sits relative to the link list.                          |
| `sticky`        | `boolean`                                  | `false`  | When true, applies `position: sticky; top: 0; z-index: 10`.            |
| `logoSrc`       | `string \| undefined`                      | `undefined` | Optional logo override. If absent, no logo renders. Sprint 6+ wires to `siteConfig.brand.primaryLogoUrl`. |

Invalid props fall back silently to the defaults.

## Style controls (PROJECT_SPEC.md §6.4)

- Background, padding, margin, border, border radius, shadow.
- Width / height.
- Text color (overrides the link color).
- Visibility (always / desktop / mobile).
- Animation preset on enter and on hover.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `setProps` for `links`, `logoPlacement`, `sticky`, `logoSrc`.
- `setStyle`, `setAnimation`, `setVisibility`.
- `removeComponent`, `moveComponent`.

## Data binding

None — links are configured statically.

## Children policy

`none`.
