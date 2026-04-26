# InputField

Presentational form input. Renders the appropriate native control based on
`inputType`. Sprint 10 will add submission wiring (the field's `name`
becomes the key in `submitted_data`).

> **Sprint 5b note:** This component is now a **client component**
> (`"use client"` directive at the top of `index.tsx`). The switch is
> required because `defaultValueFromQueryParam` reads
> `window.location.search` on mount, and React state is used to keep the
> input controlled so the URL-derived value can hydrate after the initial
> render. Sprint 10's Form continues to read submitted values via
> `FormData`, which works with controlled inputs that have a `name`
> attribute.

## Props

| Name           | Type                                                                                       | Default      | Description                                                                                |
| -------------- | ------------------------------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------ |
| `name`         | `string` — **required, no default**                                                        | —            | Submission key. Uniqueness within a Form is enforced by Sprint 10, not here.               |
| `label`        | `string`                                                                                   | `""`        | Visible label. Hidden when empty.                                                          |
| `inputType`    | `"text" \| "email" \| "tel" \| "number" \| "textarea" \| "select" \| "checkbox"`           | `"text"`    | Native control to render.                                                                  |
| `placeholder`  | `string`                                                                                   | `""`        | Placeholder text (where applicable).                                                       |
| `required`     | `boolean`                                                                                  | `false`     | Marks the field required and adds " *" to the label.                                       |
| `defaultValue` | `string \| undefined`                                                                      | `undefined` | Pre-filled value. For checkboxes, `"true"` or `"on"` checks the box.                       |
| `options`      | `Array<{ label: string; value: string }> \| undefined`                                     | `undefined` | Used only when `inputType === "select"`.                                                    |
| `defaultValueFromQueryParam` | `string \| undefined`                                                          | `undefined` | Sprint 5b — when set, the input reads `new URLSearchParams(window.location.search).get(name)` on mount and uses the resolved string as its initial value (overriding `defaultValue`). |

When `node.props.name` is missing or empty, the component falls back to a
neutral default and continues to render — Sprint 10 will surface "missing
name" as a real validation error.

## Style controls (PROJECT_SPEC.md §6.4)

- Margin, padding (on the wrapper).
- Visibility (always / desktop / mobile).
- Animation preset on enter and on hover.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `setProps` for every prop above.
- `setStyle`, `setAnimation`, `setVisibility`.
- `removeComponent`, `moveComponent`.
- `setQueryParamDefault({ value: string | null })` — Sprint 11 wires the vocabulary entry; `null` clears the binding.

## Data binding

None — the field is a producer of submission data, not a consumer of RM-API
data.

## Children policy

`none`.
