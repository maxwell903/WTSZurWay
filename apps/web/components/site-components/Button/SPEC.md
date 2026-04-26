# Button

Clickable affordance. Renders as an `<a>` when `href` is provided, otherwise as a
`<button>` with the configured `buttonType`.

## Props

| Name         | Type                                                          | Default     | Description                                                              |
| ------------ | ------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| `label`      | `string`                                                      | `"Button"`  | Visible text on the button.                                              |
| `href`       | `string \| undefined`                                         | `undefined` | When set, renders `<a>` instead of `<button>`.                           |
| `variant`    | `"primary" \| "secondary" \| "outline" \| "ghost" \| "link"`  | `"primary"` | Visual treatment. Sprint 5 ships inline-style presets; Sprint 8 polishes. |
| `size`       | `"sm" \| "md" \| "lg"`                                        | `"md"`      | Font size + padding preset.                                              |
| `fullWidth`  | `boolean`                                                     | `false`     | When true, the button stretches to fill its container.                   |
| `buttonType` | `"button" \| "submit" \| "reset"`                             | `"button"`  | Renamed from `type` to avoid colliding with React's `type` prop.         |

Invalid props fall back silently to the defaults.

## Style controls (PROJECT_SPEC.md §6.4)

- Background, padding, margin, border, border radius, shadow, width,
  height, text color (overrides the variant preset).
- Visibility (always / desktop / mobile).
- Animation preset on enter and on hover.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `setProps` for every prop above.
- `setStyle`, `setAnimation`, `setVisibility`.
- `removeComponent`, `moveComponent`.

## Data binding

None — the label is a static string. (Buttons inside a Form participate in
submission via Sprint 10's `submitButtonId` wiring.)

## Children policy

`none` — the label is the only "content".
