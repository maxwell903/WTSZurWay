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

When placed inside a Repeater, every string-valued prop on this card
is resolved through the shared token resolver
(`lib/token-resolver`) before reaching the component. Author
templates with `{{ row.name }}`, `{{ row.heroImageUrl }}`,
`{{ row.shortName }}`, and `/properties/{{ row.id }}`. The whole-token
short-circuit also lets numeric props like `propertyId` accept
`"{{ row.id }}"` directly (see `DECISIONS.md` 2026-04-26 entry).
Sprint 5's default-fallback tests still pass unchanged.

## Children policy

`none`.
