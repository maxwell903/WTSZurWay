# Image

A single image rendered as a plain `<img>`. Sprint 15 will migrate this to
`next/image` once `images.remotePatterns` is configured.

## Props

| Name  | Type                                                          | Default   | Description                          |
| ----- | ------------------------------------------------------------- | --------- | ------------------------------------ |
| `src` | `string`                                                      | `""`      | The image URL.                       |
| `alt` | `string`                                                      | `""`      | Alt text for accessibility.          |
| `fit` | `"contain" \| "cover" \| "fill" \| "none" \| "scale-down"`    | `"cover"` | The CSS `object-fit` value.          |

Invalid props fall back silently to the defaults.

## Style controls (PROJECT_SPEC.md §6.4)

All shared style controls apply: background, padding, margin, border, border
radius, shadow, width/height, text color, visibility, and animation presets.
The `fit` prop is a component-specific style control on top of the shared list.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `removeComponent`.
- `moveComponent`.
- `setProp({ propPath: "src" | "alt" | "fit" })`.
- `setStyle`.
- `setAnimation`.
- `setVisibility`.
- `bindRMField({ propPath: "src" | "alt" })` — bind to an RM image URL.
- `duplicateComponent` (Tier 2).

## Data binding

None at the Image level. `src` and `alt` can be RM-bound via `bindRMField`.

## Children policy

`none`.
