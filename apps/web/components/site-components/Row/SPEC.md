# Row

Horizontal flex container. Holds a sequence of `Column`s (or any other
children) laid out side-by-side. The standard "page band of columns".

## Props

| Name             | Type                                                | Default     | Description                                                                       |
| ---------------- | --------------------------------------------------- | ----------- | --------------------------------------------------------------------------------- |
| `gap`            | `number`                                            | `16`        | Inter-child gap in CSS pixels (renders as flex `gap`).                            |
| `alignItems`     | `"start" \| "center" \| "end" \| "stretch"`         | `"stretch"` | Cross-axis alignment.                                                              |
| `justifyContent` | `"start" \| "center" \| "end" \| "between" \| "around"` | `"start"`   | Main-axis distribution.                                                            |
| `wrap`           | `boolean`                                           | `false`     | If true, children wrap to subsequent rows when they overflow the container width. |

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

- `addComponent`, `removeComponent`, `moveComponent`.
- `setStyle`, `setAnimation`, `setVisibility`.
- `setProps` for `gap`, `alignItems`, `justifyContent`, `wrap`.
- `reorderChildren` — reorder columns within this row.

## Data binding

None — Row is a structural container.

## Children policy

`many` — accepts any number of children, typically `Column` nodes.
