# Heading

A configurable HTML heading (`h1`–`h6`).

## Props

| Name    | Type                            | Default | Description                                |
| ------- | ------------------------------- | ------- | ------------------------------------------ |
| `text`  | `string`                        | `""`    | The text content of the heading.           |
| `level` | `1 \| 2 \| 3 \| 4 \| 5 \| 6`    | `2`     | The heading level (renders `<h{level}>`).  |

Invalid props fall back silently to the defaults.

## Style controls (PROJECT_SPEC.md §6.4)

- Background color, gradient.
- Padding (top/right/bottom/left).
- Margin (top/right/bottom/left).
- Border (width, style, color), border radius.
- Box shadow preset.
- Width / height.
- Text color.
- Visibility (always / desktop / mobile).
- Animation preset on enter and on hover.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `removeComponent`.
- `moveComponent`.
- `setProp({ propPath: "text" | "level" })`.
- `setText` — convenience for the text prop.
- `setStyle`.
- `setAnimation`.
- `setVisibility`.
- `bindRMField({ propPath: "text" })` — bind text to an RM field.
- `duplicateComponent` (Tier 2).

## Data binding

None at the Heading level. Text can be RM-bound via `bindRMField` (Sprint 9
implements RM token resolution).

## Children policy

`none`.
