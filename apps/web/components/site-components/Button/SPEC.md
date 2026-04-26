# Button

Clickable affordance. Renders as an `<a>` when `href` is provided, otherwise as a
`<button>` with the configured `buttonType`.

## Props

| Name               | Type                                                          | Default     | Description                                                              |
| ------------------ | ------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| `label`            | `string`                                                      | `"Button"`  | Visible text on the button.                                              |
| `href`             | `string \| undefined`                                         | `undefined` | When set, renders `<a>` instead of `<button>`.                           |
| `variant`          | `"primary" \| "secondary" \| "outline" \| "ghost" \| "link"`  | `"primary"` | Visual treatment. Sprint 5 ships inline-style presets; Sprint 8 polishes. |
| `size`             | `"sm" \| "md" \| "lg"`                                        | `"md"`      | Font size + padding preset.                                              |
| `fullWidth`        | `boolean`                                                     | `false`     | When true, the button stretches to fill its container.                   |
| `buttonType`       | `"button" \| "submit" \| "reset"`                             | `"button"`  | Renamed from `type` to avoid colliding with React's `type` prop.         |
| `linkMode`         | `"static" \| "detail"`                                        | `"static"`  | Sprint 5b — when `"detail"`, marks this Button as a detail-page link. Sprint 9b computes the per-row href at render time. |
| `detailPageSlug`   | `string \| undefined`                                         | `undefined` | Sprint 5b — required when `linkMode === "detail"`. Names the detail page to link to (paired with the in-scope row's id at render time). |

Invalid props fall back silently to the defaults. The cross-field rule
"`detailPageSlug` is required when `linkMode === "detail"`" is enforced via
`superRefine`; a violation triggers the same silent fallback as any other
parse failure.

## Style controls (PROJECT_SPEC.md §6.4)

- Background, padding, margin, border, border radius, shadow, width,
  height, text color (overrides the variant preset).
- Visibility (always / desktop / mobile).
- Animation preset on enter and on hover.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `setProps` for every prop above.
- `setStyle`, `setAnimation`, `setVisibility`.
- `removeComponent`, `moveComponent`.
- `setLinkMode({ value: "static" | "detail" })` — Sprint 11 wires the vocabulary entry; the prop already exists here.
- `setDetailPageSlug({ value: string })` — Sprint 11 wires the vocabulary entry; applies when `linkMode === "detail"`.

## Data binding

None — the label is a static string. (Buttons inside a Form participate in
submission via Sprint 10's `submitButtonId` wiring.)

`href` strings may contain `{{ row.* }}` tokens that Sprint 9b's renderer
resolves at render time when the Button is inside a Repeater iteration or a
detail page (any scope that provides row context per PROJECT_SPEC.md §8.12).
Sprint 5b stores the token-bearing `href` verbatim; no resolution happens in
this file.

## Children policy

`none` — the label is the only "content".
