# NavBar

Top navigation bar with a horizontal link list and an optional logo. In
Sprint 5 the NavBar reads from `node.props`, NOT from
`siteConfig.global.navBar`. The schema's global NavBar config exists
separately as a setup-form seed; Sprint 6's editor lifts it into a NavBar
node when the user adds one to a page.

## Props

| Name            | Type                                       | Default  | Description                                                            |
| --------------- | ------------------------------------------ | -------- | ---------------------------------------------------------------------- |
| `links`         | `Array<NavLink>`                           | `[]`     | Navigation links rendered horizontally. See `NavLink` shape below.      |
| `logoPlacement` | `"left" \| "center" \| "right"`            | `"left"` | Where the logo sits relative to the link list.                          |
| `sticky`        | `boolean`                                  | `false`  | When true, applies `position: sticky; top: 0; z-index: 10`.            |
| `logoSrc`       | `string \| undefined`                      | `undefined` | Optional logo override. If absent, no logo renders. Sprint 6+ wires to `siteConfig.brand.primaryLogoUrl`. |
| `linkGap`       | `number \| undefined`                      | `20`     | Pixel spacing between top-level links (`<ul>` `gap`).                   |
| `logoMarginX`   | `number \| undefined`                      | `0`      | Horizontal margin (px) applied as `marginInline` on the logo wrapper.   |
| `logoSize`      | `number \| undefined`                      | `32`     | Logo height in pixels.                                                  |

A `NavLink` is `{ label, kind?: "page" | "external", href?, pageSlug?, richLabel?, children? }` —
top-level links may carry an optional `children: NavLink[]` of submenu items.
Submenu items themselves cannot have `children` (depth fixed at 1, encoded in
the schema via a separate non-recursive child shape).

Invalid props fall back silently to the defaults.

## Dropdown menus

When a top-level link has a non-empty `children` array, it renders as a button
with a chevron rather than a navigable anchor — clicking it does not navigate
but toggles a submenu of `<a role="menuitem">` items beneath. The submenu
opens on hover (desktop) and on click/tap (touch + keyboard); a `mousedown`
listener on `document` closes it when the click lands outside the NavBar.

A consequence in editor canvas: the open submenu floats above the
`EditModeWrapper` outline (the outline only wraps the NavBar's own bounds).
That's intentional — the user can still hover-preview and edit the submenu
contents through the NavBar's edit panel.

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
