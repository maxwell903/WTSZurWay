# Form

The Form component wraps `InputField` children plus a child `Button`
(typically `buttonType: "submit"`) and POSTs the submitted values to
`/api/form-submissions` per `PROJECT_SPEC.md` §8.10. After Sprint 10, a
property manager can drop a Form into the canvas, name it, drop in
InputFields plus a submit Button, deploy (Sprint 13), receive submissions
on the public site, and read them back in the editor's Data tab.

## Props

| Name             | Type     | Default       | Description                                                                                  |
| ---------------- | -------- | ------------- | -------------------------------------------------------------------------------------------- |
| `formName`       | `string` — **required, no default** | — | Becomes `form_id` in the submission row. A blank value skips submission with a console warn. |
| `submitLabel`    | `string` | `"Submit"`    | Retained in the schema for backward compatibility; the EditPanel does not expose it. The user authors a child `Button` with `buttonType: "submit"` instead. |
| `successMessage` | `string` | `"Thank you."` | Replaces the form's children after a 2xx response.                                           |

When `formName` is missing or blank, the rendered form's `data-form-name`
falls back to the literal `"form"` for inspection convenience, but the
submit handler will still bail and emit a `console.warn` rather than
POSTing — submissions without a `form_id` would silently merge into one
bucket in the Data tab.

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

None directly — child `InputField`s are the data source for submission
payloads. Each `InputField`'s `name` prop becomes a key in the
`submitted_data` JSON object.

## Children policy

`many` — typically a sequence of `InputField`s and a submit `Button`.

## Sprint 10 behavior

### Submit handler

1. Always calls `event.preventDefault()` so the browser never navigates.
2. Reads `window.location.pathname.split("/")`. If `segments[2] === "edit"`
   (i.e. the user is on `/{slug}/edit`), returns immediately. The Form is
   a no-op in edit context so authoring remains friction-free. Real
   preview happens at `/{slug}/preview` (Sprint 4) — the in-editor
   Preview Toggle keeps the URL on `/edit` and is therefore also a
   no-op by design.
3. Reads `formName` from `node.props.formName`. An empty / missing value
   logs `console.warn` and bails without POSTing.
4. Derives `siteSlug` from `segments[1]`. Derives `pageSlug` based on
   the path:
   - `/{slug}/preview` → `URLSearchParams.get("page") || "home"`.
   - any other non-edit path → the trailing segments joined with `/`,
     or `null` when the path is just `/{slug}`.
5. Reads submitted values via `new FormData(event.currentTarget)`,
   skipping any `File` entries (no file upload per
   `PROJECT_SPEC.md` §17). Multi-value fields are joined with `, ` —
   the simplification keeps the response shape `Record<string, string>`
   matching the API's Zod schema. Keys with no value collapse to an
   empty string.
6. POSTs JSON `{ siteSlug, formId, pageSlug, submittedData }` to
   `/api/form-submissions`. On `2xx`, swaps the form's children for a
   `<div data-form-success role="status">` showing `successMessage`.
   On non-2xx or network error, renders an inline
   `<div data-form-error role="alert">` underneath the children with a
   generic retry message; the children remain editable so the user can
   resubmit without retyping.

### State

`useState<SubmissionState>` with four states: `idle`, `submitting`,
`success`, `error`. The success state replaces children entirely (no
extra Button click required); the error state preserves children so the
user can retry without losing input.

## Out of scope (Sprint 10)

- File uploads.
- Email-on-submission notifications (`PROJECT_SPEC.md` §17).
- Custom validation messages or per-field error UI — the only error
  state is the inline `data-form-error` block under the children.
- Row context (`{{ row.* }}`) — Sprint 9b territory.
