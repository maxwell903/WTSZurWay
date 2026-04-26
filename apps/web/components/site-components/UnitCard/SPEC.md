# UnitCard

Card that displays a single rentable unit — image, heading, stats, rent,
and a CTA. Sprint 5 ships static-only; Sprint 9 will hydrate from
`lib/rm-api/getUnits` when bound.

## Props

| Name       | Type                  | Default       | Description                                                           |
| ---------- | --------------------- | ------------- | --------------------------------------------------------------------- |
| `unitId`   | `number \| undefined` | `undefined`   | **Stored but unused in Sprint 5.** Sprint 9 will hydrate from RM-API.  |
| `heading`  | `string`              | `"Unit Name"` | Card title.                                                            |
| `beds`     | `number`              | `0`           | Bedrooms.                                                              |
| `baths`    | `number`              | `0`           | Bathrooms.                                                             |
| `sqft`     | `number`              | `0`           | Square footage.                                                        |
| `rent`     | `number`              | `0`           | Monthly rent. Rendered as `$X/mo` with US locale formatting.           |
| `imageSrc` | `string`              | `""`         | Top image URL. Empty renders a grey placeholder.                       |
| `ctaLabel` | `string`              | `"View Unit"` | CTA text.                                                              |
| `ctaHref`  | `string`              | `"#"`         | CTA href.                                                              |

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
into `heading`, `imageSrc`, `ctaHref`, and to bind `unitId` / `beds` /
`baths` / `sqft` / `rent` to the row's fields.

## Children policy

`none`.
