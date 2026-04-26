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

When placed inside a Repeater, every string-valued prop on this card
is resolved through the shared token resolver
(`lib/token-resolver`) before reaching the component. Author
templates with `{{ row.unitName }}`, `{{ row.primaryImageUrl }}`,
`{{ row.bedrooms }}`, `{{ row.bathrooms }}`, `{{ row.squareFootage }}`,
`{{ row.currentMarketRent }}`, and `/units/{{ row.id }}`. No code
change in `index.tsx` is required: when the prop is exactly one
token, ComponentRenderer's resolver hook short-circuits to the
underlying row value (number, boolean, etc.), so this card's
`z.number()`-typed props receive numbers as expected
(see `DECISIONS.md` 2026-04-26 entry). Sprint 5's default-fallback
tests still pass unchanged.

## Children policy

`none`.
