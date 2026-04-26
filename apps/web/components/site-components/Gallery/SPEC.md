# Gallery

CSS-grid gallery of images. Each cell is a plain `<img>` (matching the
Sprint 3 `Image` component's choice to skip `next/image` until Sprint 15
configures `remotePatterns`).

## Props

| Name      | Type                                       | Default | Description                                            |
| --------- | ------------------------------------------ | ------- | ------------------------------------------------------ |
| `images`  | `Array<{ src: string; alt?: string }>`     | `[]`    | One entry per image. Empty produces an empty wrapper.   |
| `columns` | `number` (1–6)                             | `3`     | Number of grid columns.                                 |
| `gap`     | `number`                                   | `8`     | Gap between cells in CSS pixels.                        |

Invalid props fall back silently to the defaults.

## Style controls (PROJECT_SPEC.md §6.4)

- Background, padding, margin, border, border radius, shadow.
- Width / height.
- Visibility (always / desktop / mobile).
- Animation preset on enter and on hover.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `setProps` for `images`, `columns`, `gap`.
- `setStyle`, `setAnimation`, `setVisibility`.
- `removeComponent`, `moveComponent`.

## Data binding

None — images are configured statically. (Sprint 9's `Repeater` is the
preferred path for "show one image per RM-API row".)

## Children policy

`none`.
