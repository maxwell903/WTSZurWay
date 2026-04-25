# Spacer

Pure vertical whitespace. A primitive — has no shared §6.4 style chrome
(padding, border, shadow, etc.) at the edit-panel level beyond its own height.

## Props

| Name     | Type     | Default | Description                            |
| -------- | -------- | ------- | -------------------------------------- |
| `height` | `number` | `40`    | The spacer's height in CSS pixels.     |

Invalid props fall back silently to the defaults.

## Style controls (PROJECT_SPEC.md §6.4)

§6.4 explicitly excludes Spacer from the shared style chrome ("Every
component (except primitives like Spacer) supports …"). Spacer exposes only:

- Height (its own prop, not in `StyleConfig`).
- Visibility (always / desktop / mobile).

`StyleConfig` fields supplied on a Spacer node are still serialized through
the renderer's `useMemo(styleConfigToCss)` pipeline, but the edit panel
intentionally hides them to keep the primitive simple.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `removeComponent`.
- `moveComponent`.
- `setProp({ propPath: "height" })`.
- `setVisibility`.

## Data binding

None.

## Children policy

`none`.
