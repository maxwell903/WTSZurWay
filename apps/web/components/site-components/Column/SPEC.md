# Column

Vertical flex container, intended to live inside a `Row`. The `span`
controls how much horizontal space the column claims relative to its
siblings.

## Props

| Name         | Type                                        | Default     | Description                                                                                            |
| ------------ | ------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| `span`       | `number` (1–12)                             | `12`        | CSS `flex` value. The column also emits `data-column-span={span}` so Sprint 7's resize handles see it. |
| `gap`        | `number`                                    | `8`         | Inter-child gap in CSS pixels.                                                                          |
| `alignItems` | `"start" \| "center" \| "end" \| "stretch"` | `"stretch"` | Cross-axis alignment for column children.                                                              |

Invalid props fall back silently to the defaults.

## Style controls (PROJECT_SPEC.md §6.4)

- Background, padding, margin, border, border radius, shadow, width,
  height, text color.
- Visibility (always / desktop / mobile).
- Animation preset on enter and on hover.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `addComponent`, `removeComponent`, `moveComponent`.
- `setStyle`, `setAnimation`, `setVisibility`.
- `setProps` for `span`, `gap`, `alignItems`.
- `reorderChildren` — reorder children within this column.

## Data binding

None — Column is a structural container.

## Children policy

`many` — accepts any number of children of any type.
