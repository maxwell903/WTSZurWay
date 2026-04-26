# CLAUDE.md — Sprint 9: Repeaters and filters

> Drop this file at the repo root of `WTSZurWay/` for the duration of
> Sprint 9, replacing the master `CLAUDE.md`. Restore the master
> `CLAUDE.md` after the sprint's quality gates pass and the Sprint
> Completion Report has been emitted. Per the 2026-04-25 entry in
> `DECISIONS.md`, this project uses a single-branch workflow on
> `master` — there is no `sprint/09` branch. Every commit lands on
> `master` after the quality gates pass. Hosted Supabase is in use
> (no Docker, no local Postgres). The Anthropic API key already in
> `.env.local` is unused this sprint — Sprint 9 ships zero AI calls.

## Mission

Make the **Repeater real**. Replace the Sprint-5 shell with a fully
data-bound iterating Repeater that fetches rows from `lib/rm-api/`,
filters them with the user's `react-querybuilder`-shaped query,
applies connected-input live filtering, sorts, limits, and renders
the template once per row inside a **shared row context** that
exposes `{{ row.* }}` tokens to every descendant string prop. Land
the **shared row context provider** under `apps/web/lib/row-context/`
and the **shared token resolver** under
`apps/web/lib/token-resolver/` so Sprint 9b can lift them to detail
pages without rewriting either. Wire the renderer to resolve
`{{ row.* }}` tokens on string-valued props before passing them to
the concrete component. Materialize the `units_with_property`
joined data source documented in
`apps/web/lib/ai/prompts/snippets/data-sources.ts`. Ship a brand-new
`/dev/repeater` preview page that hard-codes a Repeater-of-units
config so the smoke test can exercise the whole pipeline without
having to drag-and-drop in the real editor. The complete behavioral
contract is `PROJECT_SPEC.md` §8.9 plus the row-context and
token-resolver portions of §10.2 and §8.12.

This sprint **does not** ship: detail-page rendering or the public
detail-page route (Sprint 9b), `Button.linkMode="detail"` href
computation (Sprint 9b), `InputField.defaultValueFromQueryParam`
mount-read wiring beyond what Sprint 5b already shipped (Sprint 9b
generalizes), AI Edit (Sprint 11), the Adjustment chat (Sprint 12),
the Deploy flow / public route (Sprint 13), demo fallback fixtures
(Sprint 14), or polish (Sprint 15). Sprint 9 is the last sprint to
run before the AI-edit pipeline; correctness and test coverage
matter more than speed.

## Spec sections in scope

- `PROJECT_SPEC.md` §3.2 — locks `react-querybuilder` into the stack.
- `PROJECT_SPEC.md` §3.3 — locks `TanStack Query` into the stack.
- `PROJECT_SPEC.md` §5.3 — the `lib/rm-api/` typed-helper contract
  the data-binding layer consumes (do not modify; read only).
- `PROJECT_SPEC.md` §6.4 — shared style controls; the Repeater is
  not a primitive, so all of these apply (already wired in Sprint 8's
  StyleTab — read only).
- `PROJECT_SPEC.md` §8.9 — the entire Repeater behavioral contract
  (data source, filters, connected inputs, sort, limit, empty state,
  RM field tokens). Quoted in full below for self-containment.
- `PROJECT_SPEC.md` §8.12 — the row-context paragraph defines the
  semantics that Sprint 9 implements for Repeater iteration and
  Sprint 9b will extend to detail pages. Quoted below.
- `PROJECT_SPEC.md` §9.4 Tier 1 — `setProp`, `setStyle`,
  `setAnimation`, `setVisibility`, `bindRMField`, plus the new
  `setRepeaterDataSource`, `setRepeaterFilters`, `setRepeaterSort`,
  and `connectInputToRepeater` (all listed Tier-2 in §9.4 but Sprint
  9 makes them addressable from the EditPanel — they will be wired
  to the AI Edit endpoint in Sprint 11 via `lib/site-config/ops.ts`).
- `PROJECT_SPEC.md` §10 — the renderer contract. Sprint 9 extends
  the prop-resolution path; the change is opt-in (does nothing when
  no row context is in scope) so it is forward-compatible with
  Sprint 9b's detail-page generalization.
- `PROJECT_SPEC.md` §11 — the `DataBinding` shape:
  `{ source, filters?, connectedInputs?, sort?, limit?, emptyState? }`.
  The schema validator in `lib/site-config/schema.ts` keeps `filters`
  as `z.unknown()`; Sprint 9 narrows at the runtime boundary in
  `lib/site-config/data-binding/`. **Do not touch the schema.**
- `PROJECT_SPEC.md` §15 — coding standards, copied below verbatim.

### §8.9 verbatim (the binding behavioral contract)

> The most important data binding mechanic. Direct guidance for the
> implementation:
>
> - **Repeater** is a component that wraps a single child template
>   and renders it once per row of a data source.
> - Drag a Repeater into a Section/Row/Column.
> - In its Content tab:
>   - **Data Source**: dropdown — `properties`, `units`,
>     `units_with_property`, `company` (single — disables repeating).
>   - **Filters**: a `react-querybuilder` instance configured against
>     the chosen data source's fields. Multiple rules combinable with
>     AND/OR groups.
>   - **Connected Inputs**: a list of input fields elsewhere on the
>     page that the user wants to act as live filters. Each
>     connection picks the input and the data field it filters by,
>     and the operator. When any connected input changes value, the
>     Repeater re-queries.
>   - **Sort**: field + direction.
>   - **Limit**: optional max rows.
>   - **Empty State**: rich-text shown when no rows match.
> - Inside the Repeater, the user drops a **template component**
>   (typically PropertyCard, UnitCard, or a custom Container with
>   text/image children).
> - Children of the template can use **RM Field tokens**:
>   `{{ row.unit_name }}`, `{{ row.current_market_rent | money }}`,
>   `{{ row.property.name }}`. The Content tab on Heading,
>   Paragraph, Image, etc. exposes a "Bind to data" picker that
>   inserts these tokens.

### §8.12 row-context paragraph verbatim

> Every detail page wraps its `rootComponent` in a row context
> provider that exposes the fetched row. The same context provider
> is used by Repeater iterations (§8.9). Components inside a detail
> page or a Repeater iteration may reference the row in any
> string-valued prop using `{{ row.* }}` tokens — the renderer
> resolves them at render time. The token resolver is shared
> infrastructure, not a Repeater-only concept.
>
> Tokens not resolved against any in-scope row (e.g. a
> `{{ row.x }}` token on a static page outside any Repeater) pass
> through verbatim, matching the Sprint 5 shell behavior.

Sprint 9 implements the Repeater-iteration half of this contract.
Sprint 9b will reuse the exact same `RowContextProvider` and
`resolveTokens` exports to implement the detail-page half. **Design
both modules with that reuse in mind.**

## Naming reminder (`{{ row.* }}` field paths)

The §8.9 quote uses `snake_case` field names (`row.unit_name`,
`row.current_market_rent`) because it predates the
`PROJECT_SPEC.md` §15.3 boundary translation rule. The
`lib/rm-api/` helpers return **camelCase** rows (see
`apps/web/types/rm.ts` — `Unit.unitName`, `Unit.currentMarketRent`,
etc.). The renderer-facing token shape is **camelCase**:

- `{{ row.unitName }}` — correct.
- `{{ row.currentMarketRent | money }}` — correct.
- `{{ row.unit_name }}` — incorrect; the resolver MUST NOT translate
  snake_case tokens silently. Unknown paths pass through verbatim
  per §8.12.

The Sprint 4 system-prompt snippet at
`apps/web/lib/ai/prompts/initial-generation.ts` already uses the
camelCase form (`{{ row.unitName }}`, `{{ row.currentMarketRent }}`,
`{{ row.id }}`, `{{ row.heroImageUrl }}`). The token resolver MUST
match that emitted shape. If you discover the resolver and the
prompt disagree on case, that is a Deviation — stop and emit a
Deviation Report.

## Pre-flight check (MANDATORY — emit before reading or writing any non-spec file)

Before reading or modifying any file other than the items listed in
"Spec sections in scope" above, run these eight checks. If any
fails, STOP and emit a Deviation Report per the protocol embedded
in this file. Do not attempt to work around a failed check.

1. **Single-branch workflow.** Run `git branch --show-current` and
   verify the output is exactly `master`. If it is not, STOP and
   emit a Deviation Report — do NOT create a `sprint/09` branch and
   do NOT switch branches.

2. **Predecessor sprints merged.** Confirm the following files
   exist on disk and are non-empty:
   - `apps/web/components/site-components/Repeater/index.tsx`
     (Sprint 5 shell — Sprint 9 will REPLACE this).
   - `apps/web/components/site-components/Repeater/EditPanel.tsx`
     (Sprint 5 placeholder — Sprint 9 will REPLACE this).
   - `apps/web/components/site-components/UnitCard/index.tsx`
     (Sprint 5).
   - `apps/web/components/site-components/PropertyCard/index.tsx`
     (Sprint 5).
   - `apps/web/components/renderer/ComponentRenderer.tsx`
     (Sprint 3 — Sprint 9 EXTENDS via opt-in resolver).
   - `apps/web/lib/rm-api/index.ts` (Sprint 1 — read-only consumer).
   - `apps/web/lib/site-config/schema.ts` (Sprint 3/3b — read-only).
   - `apps/web/lib/editor-state/actions.ts` (Sprint 6 — Sprint 9
     adds ONE mutator with the explicit hand-off below).
   - `apps/web/components/editor/edit-panels/controls/TextInput.tsx`
     (Sprint 8 — read-only consumer).
   - `apps/web/components/editor/edit-panels/controls/NumberInput.tsx`
     (Sprint 8 — read-only consumer).
   - `apps/web/components/editor/edit-panels/controls/SelectInput.tsx`
     (Sprint 8 — read-only consumer).

3. **Schema confirms `dataBinding` shape.** Open
   `apps/web/lib/site-config/schema.ts` and verify
   `dataBindingSchema` exists with `source`, `filters` (typed
   `z.unknown()`), `connectedInputs`, `sort`, `limit`, `emptyState`
   fields. If any field is absent or differently named, STOP.

4. **Schema confirms `Page.kind` and `detailDataSource`.** Open
   the same file and verify `pageSchema` carries
   `kind: pageKindSchema.default("static")` and
   `detailDataSource: detailDataSourceSchema.optional()`. If absent,
   STOP — Sprint 3b is missing and the work cannot start.

5. **Sprint-5 Repeater invariants test exists.** Open
   `apps/web/components/site-components/Repeater/__tests__/Repeater.test.tsx`
   and confirm the fourth test case (the one asserting the source
   does NOT import `@/lib/rm-api`, does NOT import
   `@tanstack/react-query`, and does NOT contain RM-token braces)
   exists. **Sprint 9 deletes that test case** because it explicitly
   forbids the imports Sprint 9 must add. Note this in the Sprint
   Completion Report; this is the planned, in-scope removal of a
   Sprint-5 invariant guard, not a deviation.

6. **The Aurora demo seed is intact.** Run `pnpm test
   --filter web -- lib/rm-api` (or `pnpm --filter web test
   lib/rm-api`) and confirm the integration tests skip cleanly OR
   pass. If they fail with anything other than "skipped", run
   `pnpm db:push && pnpm seed` and rerun. If they still fail, STOP.

7. **`react-querybuilder` and `@tanstack/react-query` are NOT yet
   installed.** Open `apps/web/package.json` and verify the
   `dependencies` block does NOT contain `@tanstack/react-query`
   nor `react-querybuilder`. If either is already present, treat it
   as a partial earlier install and STOP — emit a Deviation Report
   describing the unexpected pre-state so the user can decide
   whether to clear it or proceed.

8. **No QueryClientProvider exists.** `git grep -n
   QueryClientProvider apps/web/` returns no results. If a partial
   provider exists, STOP.

If all eight checks pass, emit a one-line `pre-flight: PASSED`
acknowledgment and proceed. Do NOT continue silently — the
acknowledgment is part of the audit trail.

## Definition of Done

The sprint is complete when ALL of the following are observably
true. Each item is a single, testable outcome.

### Code surface

- [ ] `@tanstack/react-query` (latest 5.x stable) and
      `react-querybuilder` (latest 8.x stable) are installed in
      `apps/web/package.json` and recorded in `pnpm-lock.yaml`. No
      other new dependencies are added. Both libraries are listed
      verbatim in `PROJECT_SPEC.md` §3.2 / §3.3, so the install is
      not a deviation; using a third library is.

- [ ] `apps/web/components/providers/QueryProvider.tsx` exports a
      `QueryProvider` client component that creates one
      `QueryClient` per browser session (the React 19 `useState`
      idiom — `const [client] = useState(() => new QueryClient(...))`)
      and wraps its children in a `QueryClientProvider`. Default
      query options: `staleTime: 5 * 60 * 1000` (5 minutes —
      mock-RM data does not change between fetches),
      `refetchOnWindowFocus: false`. The QueryProvider is mounted
      exactly once at `apps/web/app/layout.tsx` so every route
      under it has access. Server components above the provider
      remain server components.

- [ ] `apps/web/lib/row-context/` exists with:
      - `index.ts` re-exporting the public surface.
      - `RowContext.tsx` exporting the `RowContextProvider`
        (`"use client"`) and a `RowProvided` discriminated union
        type the resolver consumes.
      - `useRow.ts` exporting `useRow(): { row: unknown | null,
        kind: "repeater" | "detail" | null }`. Returns
        `{ row: null, kind: null }` outside any provider; nested
        providers shadow ancestors (the **innermost** row wins,
        matching natural React expectation for context).
      - `__tests__/useRow.test.tsx` with at least 6 tests:
        outside-provider returns null; inside provider returns the
        row; nested provider shadows; switching providers updates
        consumers; the `kind` field is propagated; rendering with
        `row=undefined` is handled (treated as no row).

- [ ] `apps/web/lib/token-resolver/` exists with:
      - `index.ts` re-exporting the public surface.
      - `resolve.ts` exporting `resolveTokens(value: string, row:
        unknown | null): string`. Pattern:
        `{{ <expr> }}` where `<expr>` is `row.<dot.path>` optionally
        followed by ` | <formatter>`. Whitespace inside the braces
        is permitted and trimmed. Unknown path → emit the original
        token verbatim (no replacement). `row === null` → return
        the original string verbatim with all tokens intact.
      - `formatters.ts` exporting `FORMATTERS: Record<string,
        (input: unknown) => string>` with at minimum: `money`
        (renders numbers as `$1,234` using en-US locale, matching
        the Sprint 5 `UnitCard` rent formatter), `number` (en-US
        thousand separators, no currency), `date` (ISO date string
        → `MMM d, yyyy`, falls back verbatim if not a valid date),
        `lower`, `upper`. An unknown formatter passes through the
        unformatted value as a string.
      - `__tests__/resolve.test.ts` with at least 14 tests:
        single token, multiple tokens in one string, nested path
        (`row.property.name`), unknown path verbatim, `row=null`
        verbatim, money formatter, number formatter, date
        formatter, unknown formatter passthrough, leading/trailing
        whitespace inside braces, brace-like literal that is not a
        token (e.g. `"{notAToken}"`), null/undefined field value
        renders as empty string, formatter on null renders as empty
        string, escaped braces (`\\{\\{`) render verbatim — if the
        escape pattern is hard to support, omit it and document the
        omission in `SPEC.md`.
      - The resolver is **pure**: no React imports, no DOM imports.
        It is consumed both by the renderer (client) and by future
        Sprint-9b RSC paths (server). Confirm this with a tiny
        node-environment test (`@vitest-environment node`).

- [ ] `apps/web/lib/site-config/data-binding/` exists with:
      - `index.ts` re-exporting the public surface.
      - `types.ts` with the runtime-validated narrow shape of
        `filters` (a Zod schema mirroring the
        `react-querybuilder`'s `RuleGroupType`: combinator
        `"and" | "or"`, rules array of either nested
        `RuleGroupType` or `Rule { field, operator, value }`).
        Operators supported (DEMO MUST cover): `=`, `!=`, `<`,
        `<=`, `>`, `>=`, `contains`, `beginsWith`, `endsWith`, `in`,
        `notIn`, `null`, `notNull`. Implementation MAY support more.
      - `applyFilters.ts` exporting
        `applyFilters<T>(rows: T[], filters: unknown): T[]`. Parses
        `filters` via the Zod schema; if parsing fails, returns
        `rows` unchanged (do not throw — match the Sprint 5
        defensive default pattern).
      - `applySort.ts` exporting
        `applySort<T>(rows: T[], sort: { field: string; direction:
        "asc" | "desc" } | undefined): T[]`. Stable sort. If `field`
        is unknown on the row, return input unchanged.
      - `applyLimit.ts` exporting
        `applyLimit<T>(rows: T[], limit: number | undefined): T[]`.
        `limit` of 0 returns `[]` (the user's explicit zero); `limit`
        of `undefined` returns all rows.
      - `fetchSource.ts` exporting `fetchSource(source:
        DataBindingSource): Promise<unknown[]>`. Routes to:
        - `"properties"` → `getProperties()`.
        - `"units"` → `getUnits()`.
        - `"units_with_property"` → in-memory join of
          `getUnits()` and `getProperties()`; for each unit, embed
          the matching property under a flat-field prefix
          (`property_name`, `property_city`, `property_state`,
          `property_propertyType`, `property_heroImageUrl`,
          `property_email`, `property_primaryPhone`,
          `property_street`, `property_postalCode`). The join is
          left-style: units with a null `propertyId` keep the
          unit shape but produce `property_*: null` fields. **No
          new database migration.** This is a runtime join.
        - `"company"` → `[await getCompany()]` (a one-row list, so
          a Repeater bound to `company` iterates exactly once).
      - `queryKey.ts` exporting `dataBindingQueryKey(binding:
        DataBinding, connectedInputValues: Record<string, string>):
        unknown[]`. Returns a stable, JSON-serializable key derived
        from `source`, a hashed `filters`, a hashed `sort`, the
        `limit`, and a sorted `connectedInputValues` snapshot. The
        hash is `JSON.stringify(...)` — stable enough for the demo;
        avoid `JSON.stringify` on circular structures (the inputs
        here are not circular).
      - `useConnectedInputs.ts` exporting
        `useConnectedInputs(connections: ConnectedInput[]):
        Record<string, string>`. Implementation: on each render, for
        each `inputId` in `connections`, query the DOM via
        `document.querySelector(\`[data-component-id="\${inputId}"]
        input, [data-component-id="\${inputId}"] textarea,
        [data-component-id="\${inputId}"] select\`)`. Read its
        current `value`. Subscribe to the `input` event with a
        150ms debounce (use `setTimeout` cleanup; do NOT add a new
        debounce dependency). Return the live record. If the input
        is not yet mounted (initial render), the value is `""`.
        `useEffect` cleans up listeners on unmount and on
        connections change. **This deliberately avoids touching
        InputField** (Sprint 5b territory). The test for this hook
        renders a mock InputField with the standard
        `data-component-id` data attribute the renderer wraps every
        node in (`apps/web/components/renderer/EditModeWrapper.tsx`
        uses `data-edit-id`, but every site component's own root
        — see `Repeater/index.tsx` and the cards — emits
        `data-component-id`; verify with `git grep -n
        data-component-id apps/web/components/site-components/`).
      - `__tests__/applyFilters.test.ts` — at minimum 14 tests
        covering each operator from the supported list above, AND
        groups, OR groups, nested groups, empty groups, malformed
        input → unchanged, missing field → rule skipped, type
        mismatch (string operator on numeric field) → rule skipped.
      - `__tests__/applySort.test.ts` — 6 tests covering ascending,
        descending, stability, null values (sort to end), unknown
        field (input unchanged), missing direction (default `asc`).
      - `__tests__/applyLimit.test.ts` — 4 tests: `limit=0`,
        `limit=undefined`, `limit > rows.length`, `limit 
        rows.length`.
      - `__tests__/fetchSource.test.ts` — 5 tests (mock
        `lib/rm-api/`): each of the four sources resolves correctly
        plus the `units_with_property` join shape spot-check.
      - `__tests__/queryKey.test.ts` — 4 tests: deterministic
        across runs, sensitive to `connectedInputValues` change,
        sensitive to `filters` change, key inequality across
        sources.

- [ ] `apps/web/components/site-components/Repeater/index.tsx` is
      **rewritten** as a client component that:
      - Reads `node.dataBinding`. If absent or `source` is
        unrecognized, renders the empty wrapper (defensive default).
      - Calls `useQuery({ queryKey: dataBindingQueryKey(...),
        queryFn: () => fetchSource(binding.source), ...})`.
      - While loading the **first** time (no cached data), renders
        a skeleton: 3 dimmed placeholders matching the template
        child's wrapper shape (use a simple grey block; no
        animation needed). The skeleton MUST be hidden via
        `aria-hidden="true"`.
      - On error, renders a small inline message: "Couldn't load
        data" inside the wrapper. Do not throw.
      - With data, runs `applyFilters → applySort → applyLimit`
        plus the connected-inputs synthetic rules (see
        `useConnectedInputs`) and renders the template child once
        per resulting row inside a `<RowContextProvider row={row}
        kind="repeater">`. The template child is `node.children?.[0]`.
      - For each iteration, the `key` is `row.id` if numeric, else
        `JSON.stringify(row).slice(0, 64)`-of-the-row index
        fallback. Prefer `row.id` — Aurora rows always have it.
      - When the post-pipeline result is empty, renders
        `node.dataBinding.emptyState` once via the
        `ComponentRenderer` (no row context). If `emptyState` is
        absent, renders nothing (empty wrapper).
      - Continues to emit `data-component-id={node.id}` and
        `data-component-type="Repeater"` on the root wrapper.
      - For `source: "company"`, iteration fires exactly once,
        matching `data-sources.ts` documentation.

- [ ] `apps/web/components/site-components/Repeater/EditPanel.tsx`
      is **rewritten** to expose the Content tab UI from §8.9. The
      panel is a client component using existing Sprint 8 controls
      (`SelectInput`, `NumberInput`, `TextInput`,
      `SegmentedControl`) plus `react-querybuilder`'s
      `<QueryBuilder>` for the filters field. Layout (top to
      bottom):
      1. **Data Source** — `SelectInput` with options `properties`,
         `units`, `units_with_property`, `company`.
      2. **Filters** — `<QueryBuilder>` configured with the
         appropriate field list for the chosen source (use the
         camelCase fields from `apps/web/types/rm.ts`). Hidden when
         source is `company`.
      3. **Connected Inputs** — a list editor:
         - "+ Add connection" button.
         - Each row has: input picker (a select listing every
           `InputField` on the **current page** by its component
           id and visible label/name), field picker (a select
           listing the fields for the chosen source), operator
           picker (`=`, `!=`, `contains`, `beginsWith`, `>=`,
           `<=`).
         - The input-picker dropdown reads the current page's
           components from `useEditorStore(selectCurrentPage)`
           (already exported by `lib/editor-state/`).
      4. **Sort** — two `SelectInput`s side-by-side: field +
         direction.
      5. **Limit** — `NumberInput`, optional. Empty-string clears
         the field (writes `undefined`).
      6. **Empty State (preview-only message)** — a `TextInput`
         labeled "Empty-state message". Sprint 9 stores this as a
         single-`Paragraph` `emptyState: ComponentNode` whose
         `props.text` is the entered string. Documented limit (no
         rich-text editor in Sprint 9). Future sprints can swap in
         a richer editor.
      
      All field changes call the new `setComponentDataBinding`
      mutator (see editor-state hand-off below). The panel emits
      `data-component-edit-panel="Repeater"` on its root.

- [ ] `apps/web/components/renderer/ComponentRenderer.tsx`
      gains an opt-in **resolver hook** that, before invoking the
      concrete component, walks `node.props` and replaces every
      string-valued top-level prop with `resolveTokens(value, row)`
      where `row` is read from `useRow()`. Nested objects/arrays
      are walked one level deep (string elements inside arrays are
      resolved; nested object string values are resolved). If
      `useRow()` returns `{ row: null }`, **NO substitution
      occurs** — the original `node.props` is passed through
      unchanged. This preserves Sprint 5 shell behavior verbatim
      for static pages.
      
      The hook MUST be cheap when no row is in scope: short-circuit
      after the `useRow` read returns null. The non-row path of
      every test that existed before this sprint MUST continue to
      pass with zero changes.

- [ ] `apps/web/lib/editor-state/types.ts` and
      `apps/web/lib/editor-state/actions.ts` gain a single new
      mutator: `setComponentDataBinding: (id: ComponentId,
      dataBinding: DataBinding | undefined) => void`. The mutator
      walks the draft config, finds the component by id, replaces
      its `dataBinding` field (or removes it when `undefined`),
      and flips `saveState` to `"dirty"`. These are the **only**
      two files in `lib/editor-state/` Sprint 9 modifies; declare
      this hand-off explicitly in the Sprint Completion Report.
      Pattern matches `setComponentProps` already in those files.

- [ ] `apps/web/components/site-components/Repeater/SPEC.md` is
      **rewritten** to describe the Sprint-9 reality. Remove the
      "Sprint 5 invariants" section. Add: data binding fields,
      token resolution semantics, empty-state behavior, AI ops
      vocabulary (Tier 1 from §9.4 plus the Tier-2 Repeater ops
      that Sprint 11 will wire to the AI Edit endpoint).

- [ ] `apps/web/components/site-components/PropertyCard/SPEC.md`
      and `UnitCard/SPEC.md` get one-paragraph "Data binding"
      updates noting that, when placed inside a Repeater, every
      string-valued prop resolves `{{ row.* }}` tokens via the
      shared resolver before reaching the component. **No code
      change in either component's `index.tsx` is required**
      because the resolver runs in `ComponentRenderer` upstream of
      the component invocation. Confirm the Sprint 5 default-fallback
      tests still pass unchanged.

- [ ] `apps/web/app/dev/repeater/page.tsx` and
      `apps/web/app/dev/repeater/fixtures.ts` exist. The page
      renders a hardcoded `SiteConfig` in `mode="preview"` via the
      shared `Renderer`. The fixture contains:
      - One static page with slug `home`.
      - Inside it: a `Section` containing a `Repeater` bound to
        `units` with sort `currentMarketRent desc` and limit `12`,
        whose template is a `UnitCard` whose props use
        `{{ row.* }}` tokens for `heading`, `beds`, `baths`,
        `sqft`, `rent`, `imageSrc`, and `ctaHref` (the demo
        `ctaHref` form is `/units/{{ row.id }}`, which Sprint 9b
        will wire to a working detail page).
      - A second `Section` with an `InputField` named `q` and a
        `Repeater` bound to `units` with one `connectedInputs`
        entry: `{ inputId: "<the_input's_component_id>", field:
        "unitName", operator: "contains" }`.
      - A `Paragraph` `emptyState` with text "No units match."
      The page is dev-only (mirrors `/dev/preview` and
      `/dev/components` patterns); it's fine to ship unstyled.

### Tests

- [ ] All new code has unit tests (Vitest). The minimum-test counts
      above are floors, not ceilings — write more if the case
      coverage demands it.
- [ ] **Specifically: a Repeater integration test.** Renders a
      handcrafted `SiteConfig` containing a Repeater of units with
      a `UnitCard` template, mocks `lib/rm-api/getUnits` to return
      a small fixed list, and asserts (a) the correct number of
      cards render, (b) the headings reflect each row's
      `unitName`, (c) the rent text reflects each row's
      `currentMarketRent` formatted via the `money` formatter, (d)
      the image src reflects each row's `primaryImageUrl`, (e)
      `applySort` applied in order, (f) `applyLimit` capped the
      list. This test lives at
      `apps/web/components/site-components/Repeater/__tests__/Repeater.integration.test.tsx`.
- [ ] **Token-leak test.** A `{{ row.* }}` token on a static page
      outside any Repeater iteration **passes through verbatim**.
      Lives in
      `apps/web/components/renderer/__tests__/Renderer.test.tsx`
      (extend the existing test file — that's the renderer's home,
      not a cross-sprint touch since the file already exists and
      tests resolution behavior). If extending that file is judged
      a cross-sprint touch by §15.9 standards, place the test
      instead in
      `apps/web/lib/token-resolver/__tests__/integration.test.tsx`.
- [ ] The Sprint-5 Repeater-invariants test
      (`Repeater/__tests__/Repeater.test.tsx`'s "does not import
      from @/lib/rm-api or @tanstack/react-query and does not
      contain RM-token braces" case) is **deleted** as explicitly
      authorized above. The remaining cases in that file are
      replaced with Sprint-9 behavior tests: empty `dataBinding`
      → empty wrapper; bound to a mock list → N cards; bound to
      `company` → exactly 1 iteration; emptyState rendered when
      list is empty; loading skeleton rendered before data.

### Quality gates (binding for every sprint)

- [ ] `pnpm test` passes with zero failures and zero skipped tests
      (the `lib/rm-api/` integration tests skip cleanly when env
      vars are missing — that is not a "skipped test" failure for
      this gate).
- [ ] `pnpm build` succeeds with zero TypeScript errors and zero
      warnings.
- [ ] `pnpm biome check` passes with zero warnings.
- [ ] Manual smoke test (below) passes on a fresh `pnpm dev`.
- [ ] No new files outside the "Files you may create or modify"
      list below.
- [ ] No new dependencies added beyond `@tanstack/react-query` and
      `react-querybuilder`. If you find yourself reaching for a
      debounce library, an immer, a date library, or anything else
      — that is a Deviation.
- [ ] `DECISIONS.md` updated if any deviation was approved during
      the sprint.

## Manual smoke test (numbered, click-by-click)

Pre-step: confirm Aurora seed is loaded by running `pnpm db:push &&
pnpm seed` if you have not already today. Hosted Supabase project,
no Docker.

1. From a clean checkout, run `pnpm install` (the lockfile carries
   the two new dependencies) and then `pnpm dev`.
2. Open `http://localhost:3000/dev/repeater`.
3. **Top Repeater (units, sorted by rent desc, limit 12).**
   Verify:
   - Exactly 12 unit cards render.
   - Each card's heading is the unit's `unitName` (e.g.
     "Apt 101", "Apt 4B", drawn from the seed).
   - Each card's rent text is formatted as `$X,XXX/mo` (the
     `money` formatter, en-US locale, no decimals).
   - The cards are ordered such that the first card's rent is the
     highest of the 12.
   - The card images load (image elements have non-empty `src`).
4. Open the network tab; verify a single fetch to the rm-api
   surface (or to Supabase via `lib/rm-api/`) was made — TanStack
   Query's `staleTime: 5 * 60 * 1000` keeps it cached.
5. Reload the page. Verify NO new fetch fires (cache hit).
6. **Second Repeater (units, connected to the `q` input).** Verify
   it renders all (50+, depending on seed) units as cards, no
   filters applied yet.
7. Click into the `q` input field and type `101`. Within ~200ms the
   second Repeater re-renders with only the units whose `unitName`
   contains "101" (typically `Apt 101`).
8. Clear the input. The full unit list returns.
9. Type a string that matches no unit (e.g. `nopealdslfkj`). The
   second Repeater renders the empty-state Paragraph "No units
   match."
10. Open `http://localhost:3000/aurora-cincy/edit` (the existing
    Aurora editor from Sprint 4+6).
11. From the Add tab, drag a Repeater onto the Home page's main
    Section. Drag a UnitCard into the Repeater. Right-click the
    Repeater. The left sidebar swaps to Element Edit mode with the
    new Sprint-9 EditPanel.
12. In the **Data Source** dropdown, pick `units`. Verify the
    canvas updates: the Repeater now renders one UnitCard per
    seeded unit (~30+).
13. Set **Sort** to `currentMarketRent` desc. Verify the canvas
    re-orders.
14. Set **Limit** to `5`. Verify the canvas drops to exactly 5
    cards.
15. Open the **Filters** builder. Add a single rule
    `bedrooms >= 2`. Verify the canvas drops to only 2-bedroom or
    larger units, sorted, limited.
16. Add a **Connected Input**. From the input-picker dropdown,
    confirm only `InputField` components on the current page are
    listed (drag a new InputField named `q` into a Section above
    the Repeater first). Pick that input, field `unitName`,
    operator `contains`. Type into `q` in the canvas — the
    Repeater re-renders within ~200ms.
17. Switch to **Preview mode** (top bar toggle). Verify the live
    filter still works in preview.
18. Refresh the page. Verify the editor reloads the Repeater's
    `dataBinding` from the server (the autosave from Sprint 6
    persists it). Verify all settings — source, filter, connected
    input, sort, limit — survive the reload.
19. **Edge case: `company` source.** Set the Repeater's source to
    `company`. The canvas renders exactly ONE UnitCard (or the
    template, whatever was in the slot). The filters builder is
    hidden. The connected-inputs section is still visible but
    shows a small note: "Connected inputs do nothing for a
    `company` binding (single row)."
20. Switch back to `units`, drop the limit, run `pnpm dev` in a
    second terminal pointing at the production build (`pnpm build
    && pnpm start`). Verify the Repeater still works in production
    mode. (No SSR is required from Sprint 9 — Repeater is a
    client component; a brief skeleton flash is expected. Sprint
    9b makes detail pages SSR-friendly; Sprint 9 stays
    client-side.)

If any step fails, treat it as a Deviation per §15.7. Do not
commit.

## Files you may create or modify

### New files (Sprint 9 owns 100%)

- `apps/web/components/providers/QueryProvider.tsx`
- `apps/web/lib/row-context/index.ts`
- `apps/web/lib/row-context/RowContext.tsx`
- `apps/web/lib/row-context/useRow.ts`
- `apps/web/lib/row-context/__tests__/useRow.test.tsx`
- `apps/web/lib/token-resolver/index.ts`
- `apps/web/lib/token-resolver/resolve.ts`
- `apps/web/lib/token-resolver/formatters.ts`
- `apps/web/lib/token-resolver/__tests__/resolve.test.ts`
- `apps/web/lib/token-resolver/__tests__/integration.test.tsx`
  (only if the Renderer.test extension path is judged a
  cross-sprint touch — see DoD note above).
- `apps/web/lib/site-config/data-binding/index.ts`
- `apps/web/lib/site-config/data-binding/types.ts`
- `apps/web/lib/site-config/data-binding/applyFilters.ts`
- `apps/web/lib/site-config/data-binding/applySort.ts`
- `apps/web/lib/site-config/data-binding/applyLimit.ts`
- `apps/web/lib/site-config/data-binding/fetchSource.ts`
- `apps/web/lib/site-config/data-binding/queryKey.ts`
- `apps/web/lib/site-config/data-binding/useConnectedInputs.ts`
- `apps/web/lib/site-config/data-binding/__tests__/applyFilters.test.ts`
- `apps/web/lib/site-config/data-binding/__tests__/applySort.test.ts`
- `apps/web/lib/site-config/data-binding/__tests__/applyLimit.test.ts`
- `apps/web/lib/site-config/data-binding/__tests__/fetchSource.test.ts`
- `apps/web/lib/site-config/data-binding/__tests__/queryKey.test.ts`
- `apps/web/lib/site-config/data-binding/__tests__/useConnectedInputs.test.tsx`
- `apps/web/components/site-components/Repeater/__tests__/Repeater.integration.test.tsx`
- `apps/web/components/site-components/Repeater/__tests__/EditPanel.test.tsx`
- `apps/web/app/dev/repeater/page.tsx`
- `apps/web/app/dev/repeater/fixtures.ts`
- `apps/web/app/dev/repeater/__tests__/fixtures.test.ts`

### Existing files (Sprint 9 rewrites or extends)

- `apps/web/components/site-components/Repeater/index.tsx`
  (full rewrite; ownership transfers from Sprint 5 to Sprint 9
  under the Sprint-5b precedent for hand-offs).
- `apps/web/components/site-components/Repeater/EditPanel.tsx`
  (full rewrite).
- `apps/web/components/site-components/Repeater/SPEC.md`
  (full rewrite).
- `apps/web/components/site-components/Repeater/__tests__/Repeater.test.tsx`
  (existing tests replaced; the Sprint-5 invariant test case is
  deleted explicitly per DoD).
- `apps/web/components/renderer/ComponentRenderer.tsx`
  (additive: opt-in resolver hook before component invocation; the
  no-row code path is unchanged. Sprint 9b extends the same hook
  to source the row from a detail page's context).
- `apps/web/components/site-components/PropertyCard/SPEC.md`
  (one-paragraph "Data binding" update only).
- `apps/web/components/site-components/UnitCard/SPEC.md`
  (one-paragraph "Data binding" update only).
- `apps/web/lib/editor-state/types.ts` (one type addition:
  `setComponentDataBinding`).
- `apps/web/lib/editor-state/actions.ts` (one mutator addition:
  `setComponentDataBinding`).
- `apps/web/app/layout.tsx` (wrap children in `QueryProvider`).
- `apps/web/package.json` (two dependency additions).
- `pnpm-lock.yaml` (auto-updated by `pnpm install`).

## Files you MUST NOT modify

- `PROJECT_SPEC.md`.
- `DECISIONS.md` — append-only; never edit existing entries.
- `apps/web/lib/rm-api/**/*.ts` — Sprint 1's domain. Read only.
  `units_with_property` is materialized inside
  `lib/site-config/data-binding/fetchSource.ts` as an in-memory
  join of `getUnits()` + `getProperties()`. Do NOT add a
  `lib/rm-api/units_with_property.ts` file.
- `apps/web/lib/site-config/schema.ts` — Sprint 3/3b's domain.
  Sprint 9's narrow `filters` validation lives in
  `lib/site-config/data-binding/types.ts`, not in `schema.ts`. The
  TODO comment in `schema.ts` saying "Sprint 9 will narrow filters"
  is **deliberately not honored** — narrowing the schema there
  would be a schema-lock break per `SPRINT_SCHEDULE.md` §5,
  triggering rebases of every later sprint that already builds
  `SiteConfig` literals. Sprint 9 narrows at the runtime boundary.
- `apps/web/lib/site-config/parse.ts` — Sprint 3's domain.
- `apps/web/lib/site-config/index.ts` — Sprint 3/3b's domain. The
  data-binding submodule is reachable directly via
  `@/lib/site-config/data-binding`.
- `apps/web/lib/site-config/style.ts`, `ids.ts` — Sprint 3.
- `apps/web/components/site-components/Button/index.tsx` — Sprint
  5/5b. Sprint 9b will take over.
- `apps/web/components/site-components/InputField/index.tsx` —
  Sprint 5/5b. Sprint 9b will take over. Sprint 9's
  `useConnectedInputs` hook listens at the DOM level so that this
  file is never touched.
- All `EditPanel.tsx` files in `apps/web/components/site-components/`
  except `Repeater/EditPanel.tsx`.
- All `index.tsx` files in `apps/web/components/site-components/`
  except `Repeater/index.tsx`.
- `apps/web/components/renderer/EditModeWrapper.tsx`,
  `Renderer.tsx`, `ComponentErrorBoundary.tsx` — Sprint 3/8 (the
  `ComponentRenderer.tsx` opt-in resolver is the only renderer
  touch).
- `apps/web/components/editor/**` — Sprint 6/7/8/10 territory. The
  Repeater's EditPanel lives under `site-components/`, not
  `editor/`, so no `editor/` file is modified.
- `apps/web/lib/editor-state/store.ts`, `selectors.ts`,
  `autosave.ts` — Sprint 6 territory. The mutator addition is
  scoped to `types.ts` and `actions.ts` only.
- `apps/web/app/api/**` — every other sprint's domain.
- `supabase/migrations/**` — Sprint 1's domain. No new migration
  for Sprint 9.
- `apps/web/app/dev/preview/**`, `apps/web/app/dev/components/**` —
  Sprint 3/5 fixtures. Sprint 9 ships `app/dev/repeater/` instead.
- `apps/web/app/(rmx)/**`, `apps/web/app/[site]/edit/**`,
  `apps/web/app/[site]/preview/**` — earlier sprints' routes.

## Coding standards (binding — copied verbatim from PROJECT_SPEC.md §15)

### TypeScript (§15.1)

- `strict: true`, `noUncheckedIndexedAccess: true`,
  `noImplicitAny: true`. No `any`. If you reach for it, use
  `unknown` and narrow.
- Prefer types over interfaces unless extending.
- Branded types for IDs:
  `type SiteId = string & { __brand: "SiteId" }`.
- The `RowProvided` type is a discriminated union (`kind` field);
  consumers narrow on `kind` rather than on truthiness of `row`.

### React (§15.2)

- Server components by default. `"use client"` only where needed.
  The Repeater, RowContextProvider, EditPanel, QueryProvider, and
  the `useConnectedInputs` consumer are client. The token resolver
  and the data-binding pure functions are environment-agnostic
  (no React imports).
- One component per file. File name = export name.
- Use `cn(...)` from shadcn for class merging.
- No prop drilling deeper than two levels — lift to Zustand.

### Naming (§15.3)

- Files: `kebab-case.ts(x)`.
- Components: `PascalCase`.
- Hooks: `useThing`.
- API routes: `kebab-case`.
- DB tables / columns: `snake_case`.
- TypeScript fields: `camelCase` — translation happens at
  `lib/rm-api/`'s boundary; the renderer and templates see only
  camelCase.
- Tokens are camelCase (`{{ row.unitName }}`), matching the data
  the resolver receives.

### Commits (§15.4)

- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`,
  `docs:`, `test:`. One concern per commit. If a commit message has
  "and" in it, split it.
- Suggested commit decomposition for this sprint:
  1. `feat: install @tanstack/react-query and react-querybuilder`
  2. `feat: add QueryProvider and mount in app layout`
  3. `feat: add lib/row-context with provider, hook, tests`
  4. `feat: add lib/token-resolver with resolve, formatters, tests`
  5. `feat: add lib/site-config/data-binding (types, applyFilters,
     applySort, applyLimit, fetchSource, queryKey,
     useConnectedInputs) with tests`
  6. `feat: extend ComponentRenderer with opt-in token resolver`
  7. `feat: rewrite Repeater/index.tsx with TanStack Query data
     binding`
  8. `feat: rewrite Repeater/EditPanel.tsx with full §8.9 controls`
  9. `feat: add setComponentDataBinding mutator to editor-state`
  10. `docs: rewrite Repeater/SPEC.md and update PropertyCard /
      UnitCard SPEC.md data-binding sections`
  11. `feat: add /dev/repeater dev preview`
  12. `test: replace Sprint-5 Repeater shell tests with Sprint-9
      behavior tests`

### Testing (§15.5)

- Tests live next to the file under
  `__tests__/${name}.test.ts(x)`.
- Vitest + Testing Library. Reset the editor store between cases
  via `__resetEditorStoreForTests()` (already exported by
  Sprint 6).
- Mock `lib/rm-api/` with `vi.mock("@/lib/rm-api", () => ({...}))`.
  Mock at the data-binding boundary, not at the Supabase client
  boundary.
- For the `useConnectedInputs` hook: render real `<input>` DOM
  with `data-component-id="…"` data attributes, fire `input`
  events with `fireEvent.change`, advance fake timers to clear
  the 150ms debounce.

### Comments (§15.6)

- Comment *why*, not *what*. Code says what.
- TODO comments must include an owner: `// TODO(max): ...`.
- No commented-out code in committed files.

### Quality gates (§15.7) — all must pass with zero failures and zero warnings

- `pnpm test`
- `pnpm build`
- `pnpm biome check`
- The manual smoke test above

### Retroactive cross-sprint cleanup (§15.9)

If a pre-existing test or config issue (NOT runtime code in
another sprint's domain) blocks Sprint 9's quality gates, you may
apply a minimal, behavior-preserving fix per §15.9. Log every such
fix in the Sprint Completion Report's "Retroactive cross-sprint
fixes" subsection AND in `DECISIONS.md`. If the fix would touch
more than 5 lines or change runtime behavior, escalate via the
Deviation Protocol.

## Deviation Protocol (mandatory — do not modify)

If you (Claude Code) discover during this sprint that ANY part of
the plan cannot be implemented exactly as written, you MUST stop
and emit a Deviation Report in the format below. You MUST NOT
proceed with an alternative until the user has explicitly
approved it with the words "Approved" or equivalent.

A "deviation" includes: missing/broken/incompatible libraries,
impossible function signatures, scope additions, file additions
outside the declared scope, test plans that cannot be executed as
written, and any case where you catch yourself thinking "I'll
just do it slightly differently."

### Deviation Report (emit verbatim)

```🛑 DEVIATION DETECTEDSprint: [Sprint number and name]
Failed DoD item: [The exact bullet from Definition of Done that this blocks]What's not working (1–2 sentences, plain English):
[Describe the problem like you're talking to a non-engineer.]Why it's not working (1–2 sentences, technical):
[Brief technical reason.]Proposed alternative (1–2 sentences, plain English):
[Describe the replacement like you're talking to a non-engineer.]Trade-offs:

Gain: [What we get]
Lose: [What we give up]
Risk:  [What might break]
Estimated impact on the rest of the sprint:
[Will this affect later DoD items? Other sprints? Be honest.]Awaiting approval to proceed. Reply "Approved" to continue, or describe a
different direction.

After emitting the report, STOP. Do not write code. Do not edit
files. Wait.

### Approval handling

- "Approved" → implement the proposed alternative as written.
- "Approved with changes: [...]" → implement with the user's
  modifications.
- "Rejected — [direction]" → discard the proposal; follow the new
  direction.
- A clarifying question → answer it; do not start work yet.
- Anything else → ask "Is that an approval to proceed?" Do not
  assume.

After any approved deviation, append an entry to `/DECISIONS.md`
with date, sprint, what was changed, and the user's approval
message verbatim.

## Definition of "done" gating

A sprint is not done until all of the following pass with zero
warnings:

- `pnpm test`
- `pnpm build`
- `pnpm biome check`
- The manual smoke test above

If any check fails, treat it as a Deviation. Do not commit. Do not
declare the sprint complete.

## Useful local commands

- `pnpm dev` — local dev server.
- `pnpm test` — Vitest.
- `pnpm test --filter web -- lib/site-config/data-binding` — scope
  to the new directory's tests during development.
- `pnpm build` — production build (zero TS errors).
- `pnpm biome check` — lint + format check.
- `pnpm db:push` — apply migrations to the linked hosted Supabase
  project (no-op if you've already done it; Sprint 9 adds no new
  migrations).
- `pnpm seed` — re-seed Aurora data via `supabase db reset
  --linked`.
- `pnpm --filter web add @tanstack/react-query react-querybuilder`
  — install the two new dependencies. Do NOT add other
  dependencies in the same install.

## Notes & hints (non-binding)

- **react-querybuilder version.** Latest is 8.x as of writing.
  The `<QueryBuilder>` component takes `fields`, `query`,
  `onQueryChange`. The default operator set includes the operators
  Sprint 9 supports plus a few more — Sprint 9's `applyFilters`
  ignores any operator it doesn't recognize. The default UI styles
  are sufficient; no custom `controlClassnames` needed.
- **TanStack Query 5.x.** The `useQuery` signature is the
  object-arg form: `useQuery({ queryKey, queryFn, staleTime, ... })`.
  The `gcTime` (formerly `cacheTime`) defaults to 5 minutes; that's
  fine. **Do not use the deprecated positional-args form.**
- **`useConnectedInputs` DOM listening.** The Sprint-5 `InputField`
  renders its `<input>` as a child of the wrapper that receives
  `data-component-id`. Confirm with
  `git grep -n "data-component-id" apps/web/components/site-components/InputField/`
  before relying on the selector. If the data attribute is missing,
  Sprint 9 has two clean recourses: (a) DOM-listen on `name`
  attributes — but a page can have multiple InputFields with the
  same name, so this is fragile; (b) raise a Deviation requesting
  one-line attribute addition to InputField. Prefer (a) only as a
  fallback.
- **Skeleton loading.** TanStack Query's `isLoading` is true on
  the **first** load only (no cached data). After the first run,
  navigating between pages reuses the cache and `isLoading` is
  false. Match the §10.2 expectation that the editor canvas does
  not flash a skeleton on every render.
- **The `units_with_property` join.** Aurora has ~10 properties
  and ~50 units. The in-memory join is O(units × properties) =
  ~500 operations per fetch — trivial. No need for a Map.
- **Money formatter parity with Sprint 5.** Sprint 5's `UnitCard`
  uses `Intl.NumberFormat("en-US", { style: "currency", currency:
  "USD", maximumFractionDigits: 0 })` and renders `$X,XXX/mo`. The
  token-resolver `money` formatter must produce the same string
  shape **without** the `/mo` suffix — the suffix is the
  component's responsibility. Smoke-test step 3 verifies this.
- **Connected-input value initial read.** On first render, the
  hook returns `""` for every connected input even if the user has
  already typed (the DOM listener mounts in `useEffect`). To keep
  the smoke test fast, do an immediate-after-mount read of each
  input's current value via `useEffect` and trigger a single state
  update. Acceptable to do this in the same `useEffect` that
  attaches listeners.
- **Render-loop avoidance.** The `useConnectedInputs` hook returns
  a `Record<string, string>`. Use a `useMemo` keyed by JSON of the
  values so the queryKey is referentially stable when the values
  haven't changed. Otherwise TanStack Query refetches on every
  React render.
- **Ordering of resolver and renderer.** The resolver runs in
  `ComponentRenderer` BEFORE invoking the concrete component. This
  means the component sees already-resolved strings — no
  per-component change is required. Sprint 9b will keep this
  contract; it just adds another `RowContextProvider` insertion
  point at the page level.
- **Empty-state component renders without row context.** This is
  intentional. Empty-state messages should not depend on
  per-row data.
- **Single-input form value.** When a connected InputField has type
  `select` or `checkbox`, read its `value` for select and
  `checked ? input.value : ""` for checkbox. Don't over-engineer
  — that's the only departure from text-input handling.
- **The TODO in schema.ts.** It says "Sprint 9 will narrow filters
  to the react-querybuilder shape." Sprint 9 deliberately does NOT
  honor this. Update no comment in `schema.ts`. The narrow
  validation lives in `lib/site-config/data-binding/types.ts`. The
  TODO can be cleaned up by a future sprint that owns `schema.ts`.

## Cross-document touchpoints

- **`PROJECT_SPEC.md`** — read-only. The §3.2 / §3.3 stack lock-in
  pre-authorizes the two new dependencies; document the install in
  the Sprint Completion Report alongside the dependency list, and
  note Sprint 11 will use TanStack Query for AI Edit fetch state.
- **`DECISIONS.md`** — append entries for any approved deviation.
  No deviation is anticipated for the planned scope; the
  editor-state mutator addition is in scope (declared above) and
  does not require a deviation.
- **`SPRINT_SCHEDULE.md`** — read-only. Sprint 9b is the next
  scheduled sprint after Sprint 13 per the §3 recommended order;
  Sprint 11 (AI Edit) consumes Sprint 9's data-binding shape.

## Sprint Completion Report (emit verbatim when finished)✅ SPRINT 9 COMPLETEDefinition of Done:

 [item 1]
 [item 2]
...
Files created:

path/one.ts (X lines)
path/two.tsx (Y lines)
Files modified:

path/three.ts (+A −B)
Tests added: N (all passing)
Test command output: [paste last 5 lines]
Build output: [paste "Compiled successfully" line]Deviations approved during sprint: [list, or "None"]Retroactive cross-sprint fixes (per §15.9):
[list of file/lines, or "None"]Manual smoke test result: [PASS / FAIL with details]External actions required:

None — Sprint 9 introduces no new migrations and no new env vars.
pnpm install will pull the two new dependencies on the user's
next checkout.
Recommended next steps:
[Sprint 11 consumes setRepeaterDataSource / setRepeaterFilters /
setRepeaterSort / connectInputToRepeater via lib/site-config/ops.ts.
Sprint 9b lifts RowContextProvider and resolveTokens to the public
detail-page route.]