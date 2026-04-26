# MapEmbed

Embeds a Google Maps view via the unauthenticated `output=embed` URL. No
API key is required for this surface.

## Props

| Name      | Type     | Default            | Description                          |
| --------- | -------- | ------------------ | ------------------------------------ |
| `address` | `string` | `"Cincinnati, OH"` | The location to center on. Empty strings fall back to the default to keep the iframe URL valid. |
| `zoom`    | `number` (1–20) | `14`        | Zoom level passed to Google Maps.    |
| `height`  | `string` | `"320px"`          | Any CSS length.                       |

Invalid props fall back silently to the defaults.

## Style controls (PROJECT_SPEC.md §6.4)

- Margin, border, border radius, shadow.
- Width / height (height also has a dedicated prop above).
- Visibility (always / desktop / mobile).
- Animation preset on enter and on hover.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `setProps` for `address`, `zoom`, `height`.
- `setStyle`, `setAnimation`, `setVisibility`.
- `removeComponent`, `moveComponent`.

## Data binding

None.

## Children policy

`none`.
