# Footer

Page footer with up to N columns of links and a single copyright line.
Reads from `node.props` only — see `NavBar/SPEC.md` for the rationale.

## Props

| Name        | Type                                                                            | Default | Description                                            |
| ----------- | ------------------------------------------------------------------------------- | ------- | ------------------------------------------------------ |
| `columns`   | `Array<{ title: string; links: Array<{ label: string; href: string }> }>` | `[]`    | One per displayed column.                                |
| `copyright` | `string`                                                                         | `""`   | Copyright text. Hidden when empty.                     |

Invalid props fall back silently to the defaults.

## Style controls (PROJECT_SPEC.md §6.4)

- Background, padding, margin, border, border radius, shadow.
- Width / height.
- Text color (overrides the default).
- Visibility (always / desktop / mobile).
- Animation preset on enter and on hover.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `setProps` for `columns`, `copyright`.
- `setStyle`, `setAnimation`, `setVisibility`.
- `removeComponent`, `moveComponent`.

## Data binding

None.

## Children policy

`none`.
