# PropertyCard

Card that displays a single property — image, heading, short body, and a
CTA. Sprint 5 ships static-only; Sprint 9 will hydrate from
`lib/rm-api/getProperties` when bound.

## Props

| Name         | Type                  | Default                              | Description                                                          |
| ------------ | --------------------- | ------------------------------------ | -------------------------------------------------------------------- |
| `propertyId` | `number \| undefined` | `undefined`                          | **Stored but unused in Sprint 5.** Sprint 9 will hydrate from RM-API. |
| `heading`    | `string`              | `"Property Name"`                    | Card title.                                                           |
| `body`       | `string`              | `"Property description goes here."` | Description.                                                          |
| `imageSrc`   | `string`              | `""`                                 | Top image URL. Empty renders a grey placeholder.                     |
| `ctaLabel`   | `string`              | `"View Details"`                     | CTA text.                                                             |
| `ctaHref`    | `string`              | `"#"`                                | CTA href.                                                             |

Invalid props fall back silently to the defaults.

## Style controls (PROJECT_SPEC.md §6.4)

- Background, padding, margin, border, border radius, shadow.
- Width / height.
- Text color.
- Visibility (always / desktop / mobile).
- Animation preset on enter and on hover.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `setProps` for every prop above.
- `setStyle`, `setAnimation`, `setVisibility`.
- `removeComponent`, `moveComponent`.

## Data binding

Sprint 9 will allow the parent `Repeater` to inject `{{ row.* }}` tokens
into `heading`, `body`, `imageSrc`, `ctaHref`, and to bind `propertyId` to
the row's id.

## Children policy

`none`.
