# HeroBanner

Big top-of-page band with a heading, optional subheading, optional CTA
button, and an optional background image with a darkening overlay for text
legibility.

## Props

| Name              | Type                  | Default      | Description                                                                |
| ----------------- | --------------------- | ------------ | -------------------------------------------------------------------------- |
| `heading`         | `string`              | `"Welcome"` | Headline text.                                                              |
| `subheading`      | `string`              | `""`        | Sub-headline text. Hidden when empty.                                       |
| `ctaLabel`        | `string`              | `""`        | CTA button label. Hidden when empty.                                        |
| `ctaHref`         | `string`              | `"#"`       | CTA href.                                                                   |
| `backgroundImage` | `string \| undefined` | `undefined` | URL of the background image.                                                |
| `overlay`         | `boolean`             | `true`      | When true and `backgroundImage` is set, draws a semi-transparent dark layer. |
| `height`          | `string`              | `"480px"`   | Any CSS length.                                                             |

Invalid props fall back silently to the defaults.

## Style controls (PROJECT_SPEC.md §6.4)

- Background, padding, margin, border, border radius, shadow.
- Width / height (height also has a dedicated prop above).
- Text color.
- Visibility (always / desktop / mobile).
- Animation preset on enter and on hover.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `setProps` for every prop above.
- `setStyle`, `setAnimation`, `setVisibility`.
- `removeComponent`, `moveComponent`.

## Data binding

None.

## Children policy

`none` — heading, subheading, and CTA are configured via props.
