# Divider

A horizontal rule used to separate sections. Like Spacer it is treated as a
primitive — §6.4 explicitly carves primitives out of the full shared style
chrome.

## Props

| Name        | Type     | Default      | Description                           |
| ----------- | -------- | ------------ | ------------------------------------- |
| `thickness` | `number` | `1`          | Top-border width in CSS pixels.       |
| `color`     | `string` | `"#e5e7eb"`  | Top-border color (any CSS color).     |

Invalid props fall back silently to the defaults.

## Style controls (PROJECT_SPEC.md §6.4)

§6.4 explicitly excludes Divider from the shared style chrome (it lists
"primitives like Spacer" — Divider is treated identically). Divider exposes
only:

- Thickness (component-specific prop).
- Color (component-specific prop).
- Margin (top/bottom — usable through the shared `StyleConfig` because it
  applies to the `<hr>` cleanly).
- Visibility (always / desktop / mobile).

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `removeComponent`.
- `moveComponent`.
- `setProp({ propPath: "thickness" | "color" })`.
- `setVisibility`.
- `setStyle({ stylePath: "margin.*" })`.

## Data binding

None.

## Children policy

`none`.
