# Form (SHELL — Sprint 10 owns submission)

Sprint 5 ships only the structural shell. The submit handler intentionally
calls `event.preventDefault()` and does nothing else. Sprint 10 will replace
the handler with one that POSTs to `/api/form-submissions` per
`PROJECT_SPEC.md` §8.10.

## Props

| Name             | Type     | Default       | Description                                                                |
| ---------------- | -------- | ------------- | -------------------------------------------------------------------------- |
| `formName`       | `string` — **required, no default** | — | Becomes `form_id` in Sprint 10's submission table.                          |
| `submitLabel`    | `string` | `"Submit"`    | Provisional. Sprint 10 will read this from a child `Button` instead.        |
| `successMessage` | `string` | `"Thank you."` | Stored but unused in Sprint 5.                                             |

When `formName` is missing or empty, the component falls back to a neutral
default and continues to render — Sprint 10 will surface "missing formName"
as a real validation error.

## Style controls (PROJECT_SPEC.md §6.4)

- Background, padding, margin, border, border radius, shadow, width.
- Visibility (always / desktop / mobile).
- Animation preset on enter and on hover.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

- `setProps` for `formName`, `submitLabel`, `successMessage`.
- `setStyle`, `setAnimation`, `setVisibility`.
- `addComponent` (to add child `InputField`s and a submit `Button`).
- `removeComponent`, `moveComponent`.

## Data binding

None directly — the children `InputField`s are the data source for Sprint
10's submission payload.

## Children policy

`many` — typically a sequence of `InputField`s and a submit `Button`.

## Sprint 5 invariants

- `Form/index.tsx` MUST NOT contain the substring `/api/form-submissions`.
- `Form/index.tsx` MUST NOT call `fetch`.
- The submit handler MUST call `event.preventDefault()` and return.
