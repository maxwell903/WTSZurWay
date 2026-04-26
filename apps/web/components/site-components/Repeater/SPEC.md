# Repeater

The Repeater is the central data-binding mechanic
(PROJECT_SPEC.md §8.9). It wraps a single template child and renders
it once per row of a data source, exposing the row to descendant
string-valued props via `{{ row.* }}` tokens.

## Behavior

- Reads `node.dataBinding`. If absent or `source` is unrecognized,
  renders an empty wrapper (defensive default).
- Fetches via TanStack Query
  (`useQuery({ queryKey: dataBindingQueryKey(...), queryFn: () => fetchSource(...) })`).
- During the **first** load (no cached data), renders three dimmed
  grey-block placeholders inside an `aria-hidden="true"` skeleton
  host. Subsequent navigations reuse the cache and never flash a
  skeleton.
- On error, renders an inline `role="alert"` message
  ("Couldn't load data"). Errors are not re-thrown.
- Runs `applyFilters → applySort → applyLimit` on the fetched rows
  plus the connected-input synthetic AND rules. Each result row
  renders the template child once inside a
  `<RowContextProvider row={row} kind="repeater">`. The template is
  `node.children?.[0]`.
- For `source: "company"`, `fetchSource` returns a one-row list, so
  the Repeater iterates exactly once.
- When the post-pipeline result is empty, the Repeater renders
  `node.dataBinding.emptyState` (a `Paragraph` `ComponentNode`)
  outside any row context. If `emptyState` is absent, an empty
  wrapper renders.
- The root wrapper always carries `data-component-id={node.id}` and
  `data-component-type="Repeater"`.

## DataBinding fields

| Field              | Type                                                                                | Notes                                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `source`           | `"properties" \| "units" \| "units_with_property" \| "company"`                     | `units_with_property` is materialized as an in-memory join in `lib/site-config/data-binding/fetchSource.ts`; no DB migration. |
| `filters`          | `unknown` at the schema boundary; narrowed to `RuleGroupType` at runtime            | Mirrors `react-querybuilder`'s `RuleGroupType`. Operators: `=`, `!=`, `<`, `<=`, `>`, `>=`, `contains`, `beginsWith`, `endsWith`, `in`, `notIn`, `null`, `notNull`. Malformed input → no filter. |
| `connectedInputs`  | `{ inputId, field, operator }[]`                                                    | Each entry adds a synthetic AND rule sourced from the live DOM value of the targeted `InputField`. Empty values are skipped.   |
| `sort`             | `{ field, direction: "asc" \| "desc" } \| undefined`                                | Stable sort. Null/undefined values sort to the end regardless of direction. Unknown field → input order preserved.            |
| `limit`            | `number \| undefined`                                                               | `0` returns no rows; `undefined` returns all; values larger than `rows.length` return all.                                     |
| `emptyState`       | `ComponentNode \| undefined`                                                        | Rendered once, outside any row context, when the post-pipeline result is empty. Sprint 9 stores this as a `Paragraph` whose `props.text` is the EditPanel's "Empty-state message" string. |

## Token resolution semantics

`{{ row.<dot.path> }}` tokens in any descendant component's
string-valued prop resolve via `lib/token-resolver`. When the prop
string is exactly one token (no surrounding text and no formatter),
ComponentRenderer's resolver hook short-circuits to return the raw
row value, preserving its underlying type — this is what lets
`UnitCard.beds: "{{ row.bedrooms }}"` reach a `z.number()` schema
without coercion. See `DECISIONS.md` 2026-04-26 entry.

Available formatters: `money` (`$1,234`), `number`,
`date` (`MMM d, yyyy`), `lower`, `upper`. Unknown formatters
pass through the unformatted value.

Tokens whose path doesn't resolve, or any token outside an in-scope
row context, pass through verbatim — Sprint 5 shell behavior is
preserved on static pages (PROJECT_SPEC.md §8.12).

## AI ops vocabulary (PROJECT_SPEC.md §9.4)

Tier 1 (already addressable through the editor):

- `setStyle`, `setAnimation`, `setVisibility`.
- `addComponent` (the template child), `removeComponent`,
  `moveComponent`, `reorderChildren`.

Tier 2 (added in Sprint 9; AI Edit endpoint will dispatch them in
Sprint 11 via `lib/site-config/ops.ts`):

- `setRepeaterDataSource(id, source)` — switches the data source.
- `setRepeaterFilters(id, filters)` — replaces the filter group.
- `setRepeaterSort(id, sort)` — replaces the sort spec.
- `connectInputToRepeater(id, connection)` — appends a connected
  input.

Sprint 9 implements all four behaviors via the single
`setComponentDataBinding(id, binding)` mutator; Sprint 11 will
expose the four narrower ops on top of it.

## Children policy

`one` — the single child is the template. Sprint 9 renders it once
per row of the bound data source.
