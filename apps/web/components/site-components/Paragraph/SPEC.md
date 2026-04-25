# Paragraph

Long-form body text rendered as `<p>`.

## Props

| Name   | Type     | Default | Description                       |
| ------ | -------- | ------- | --------------------------------- |
| `text` | `string` | `""`    | The paragraph's text content.     |

Invalid props fall back silently to the defaults.

## Style controls (PROJECT_SPEC.md §6.4)

All shared style controls apply: background, padding, margin, border, border
radius, shadow, width/height, text color, visibility, and animation presets.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `removeComponent`.
- `moveComponent`.
- `setProp({ propPath: "text" })`.
- `setText` — convenience for the text prop.
- `setStyle`.
- `setAnimation`.
- `setVisibility`.
- `bindRMField({ propPath: "text" })`.
- `duplicateComponent` (Tier 2).

## Data binding

None at the Paragraph level. Text can be RM-bound via `bindRMField`.

## Children policy

`none`.
