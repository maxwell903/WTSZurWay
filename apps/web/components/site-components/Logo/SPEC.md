# Logo

Renders the brand's logo image. In Sprint 5 the renderer does not pass
`siteConfig` down, so `source: "primary"` and `source: "secondary"` render a
neutral grey rectangular placeholder. Sprint 6 (or 8) wires the real
`siteConfig.brand.primaryLogoUrl` / `secondaryLogoUrl` lookup.

## Props

| Name        | Type                                  | Default     | Description                                                                  |
| ----------- | ------------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| `source`    | `"primary" \| "secondary" \| "custom"` | `"primary"` | Which logo to render.                                                         |
| `customUrl` | `string \| undefined`                 | `undefined` | Required when `source === "custom"`.                                          |
| `alt`       | `string`                              | `"Logo"`   | Alt text for the rendered image (or aria-label for the placeholder).         |
| `height`    | `number`                              | `32`       | Logo height in CSS pixels. Width is `auto` for real images and `3 × height` for the placeholder. |

Invalid props fall back silently to the defaults. When `source === "custom"` and
`customUrl` is missing, the placeholder renders.

## Style controls (PROJECT_SPEC.md §6.4)

- Margin, padding, border, border radius, shadow.
- Visibility (always / desktop / mobile).
- Animation preset on enter and on hover.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `setProps` for `source`, `customUrl`, `alt`, `height`.
- `setStyle`, `setAnimation`, `setVisibility`.
- `removeComponent`, `moveComponent`.

## Data binding

None — `siteConfig.brand.*` lookup is deferred to Sprint 6 / 8.

## Children policy

`none`.
