# Section

Full-width container that holds Rows (or any other children). The outermost
"page band" — a Page's `rootComponent` is typically a Section.

## Props

| Name             | Type                                            | Default     | Description                                                                                                                                                                                                                  |
| ---------------- | ----------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `as`             | `"section" \| "div" \| "main" \| "article"`     | `"section"` | The HTML tag rendered for this Section.                                                                                                                                                                                       |
| `fitToContents`  | `boolean`                                       | `false`     | When `true`, suppresses the auto-flex-row-wrap that normally kicks in once any child has `style.width`. Children stay in plain block flow, so resizing one child can't reflow its siblings. Toggle lives on the Content tab. |

Invalid props fall back silently to the defaults.

## Style controls (PROJECT_SPEC.md §6.4)

- Background color, gradient (image deferred to a later sprint).
- Padding (top/right/bottom/left).
- Margin (top/right/bottom/left).
- Border (width, style, color), border radius.
- Box shadow preset.
- Width / height.
- Text color.
- Visibility (always / desktop / mobile).
- Animation preset on enter and on hover.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `addComponent` — add child components.
- `removeComponent` — remove this Section.
- `moveComponent` — move this Section under a different parent.
- `setStyle` — any field in `StyleConfig`.
- `setAnimation` — entrance and hover preset.
- `setVisibility` — always / desktop / mobile.
- `duplicateComponent` (Tier 2).
- `wrapComponent`, `unwrapComponent` (Tier 2).
- `reorderChildren` — reorder child components within this Section.

## Data binding

None — Section is a structural container.

## Children policy

`many` — accepts any number of children of any type.
