# CLAUDE.md — Sprint 9b: Detail pages runtime + row context generalization

## Mission

Sprint 9b is the third and final piece of the detail-pages story
(`PROJECT_SPEC.md` §8.12 + the per-`kind` slug rule in §11). The
preceding pieces are already in place:

- **Sprint 3b** amended the schema so `Page.kind` is `"static" | "detail"`
  (default `"static"`), `Page.detailDataSource` is required iff
  `kind === "detail"`, and slug uniqueness is per-`kind` (the U2
  routing pattern: `/{site}/units` static + `/{site}/units/{id}`
  detail can share the slug `units`).
- **Sprint 5b** added `Button.linkMode: "static" | "detail"` and
  `Button.detailPageSlug?: string` (with a `superRefine` enforcing
  the cross-field rule), and switched `InputField` to a
  `"use client"` component that hydrates from
  `window.location.search` via `defaultValueFromQueryParam`.
- **Sprint 9** shipped `apps/web/lib/row-context/` (a
  `RowContextProvider` accepting `kind: "repeater" | "detail"` + a
  `useRow()` hook) AND `apps/web/lib/token-resolver/` (the pure
  `resolveTokens(value, row)` function with the `money` / `number` /
  `date` / `lower` / `upper` formatters), plus a resolver hook in
  `ComponentRenderer.tsx` that walks every component's string props
  when a row is in scope and short-circuits whole-token strings to
  the underlying typed value (per the 2026-04-26 DECISIONS.md
  entry).
- **Sprint 13** shipped the public catch-all at
  `apps/web/app/[site]/[[...slug]]/page.tsx` (the directory uses
  the **optional** catch-all `[[...slug]]` form per the 2026-04-26
  DECISIONS.md entry — Sprint 9b's plan paths are corrected from
  `[...slug]` to `[[...slug]]` accordingly), with a load-bearing
  `// === SPRINT 9B INSERTS DETAIL BRANCH HERE ===` comment
  immediately above the final `notFound()` and a sibling
  `resolve.ts` containing `resolveStaticPage`.

Sprint 9b adds the runtime that makes detail pages actually render:

1. **Detail-page resolver.**
   `apps/web/app/[site]/[[...slug]]/resolve.ts` gains a new exported
   helper:

```ts
   export type DetailMatch = { page: Page; rowId: number };
   export function resolveDetailPage(
     config: SiteConfig,
     slug: string[] | undefined,
   ): DetailMatch | null;
```

   The helper fires only when `slug` is exactly two segments, the
   second segment parses as a positive integer (regex
   `/^[1-9]\d*$/` — leading zeros, signs, decimals, and `0` are all
   rejected to keep the route URL space deterministic), AND a page
   exists with `kind === "detail"` whose `slug` equals the first
   segment. The single-segment case (`["units"]`), the
   multi-segment case (`["foo", "bar", "baz"]`), and the
   non-numeric trailing-segment case (`["units", "abc"]`) all
   return `null`. `resolveStaticPage` is unchanged.

2. **Detail branch in the catch-all.**
   `apps/web/app/[site]/[[...slug]]/page.tsx` is extended IN PLACE.
   The load-bearing comment line
   `// === SPRINT 9B INSERTS DETAIL BRANCH HERE ===` is REPLACED
   (the comment line itself goes away — its single purpose was to
   mark this insertion point) by a block that calls
   `resolveDetailPage`, fetches the row via `lib/rm-api/getUnitById`
   when `page.detailDataSource === "units"` or
   `lib/rm-api/getPropertyById` when `page.detailDataSource ===
   "properties"`, and renders the matched page wrapped in row
   context. If `resolveDetailPage` returns `null`, the static
   branch's behavior of falling through to `notFound()` is
   preserved. If the page resolves but the fetched row is `null`
   (unknown id), the branch ALSO falls through to `notFound()` —
   per `PROJECT_SPEC.md` §8.12 ("If the row is not found, the
   handler renders a 404."). The existing static branch above the
   insertion point is untouched. The final `notFound()` line is
   untouched.

3. **`Renderer` gains opt-in detail mode.**
   `apps/web/components/renderer/Renderer.tsx` accepts two new
   optional props:

```ts
   pageKind?: "static" | "detail";  // default "static"
   row?: unknown;                    // default undefined
```

   When `pageKind === "detail"`, the page lookup filters
   `pages.find((p) => p.slug === page && p.kind === "detail")` so
   the U2 same-slug coexistence resolves correctly. When `row` is
   provided AND `pageKind === "detail"`, the renderer wraps ONLY
   the matched page's `rootComponent` (not the global NavBar /
   Footer) in `<RowContextProvider row={row} kind="detail">`.
   NavBar and Footer stay outside the row scope so their `href`
   strings are not accidentally resolved against the in-scope row.
   Existing callers pass neither prop and continue to behave
   exactly as before; test snapshots, fixture pages, and the
   editor's `mode="edit"` path are unaffected.

4. **Button consumes row context for detail links.**
   `apps/web/components/site-components/Button/index.tsx` becomes
   a `"use client"` component (mirroring the Sprint 5b InputField
   switch). It calls `useRow()` and, when `data.linkMode ===
   "detail"`, `data.detailPageSlug !== undefined`, the row context
   `kind !== null`, the row is non-null, AND `row.id` is a
   `number | string`, the rendered `<a>`'s href is computed at
   render time as `/${data.detailPageSlug}/${row.id}`. In every
   other case the existing `data.href` passes through verbatim
   (the existing token-string and static-href behaviors are
   preserved), the existing `data-link-mode` and
   `data-detail-page-slug` data attributes continue to render, and
   Sprint 5b's silent-fallback semantics still hold for invalid
   prop combinations. Ownership of `Button/index.tsx` transfers
   from Sprint 5 to Sprint 9b for this hand-off, mirroring the
   Sprint 2c BrandSection precedent.

5. **Test coverage for detail-page row context.**
   New unit tests prove (a) `resolveDetailPage` returns the right
   `{ page, rowId }` for a U2 config and `null` for every
   non-detail-shaped slug; (b) the Button computes the
   `/units/{id}` href when wrapped in `<RowContextProvider row={{
   id: 42, ... }} kind="detail">`; (c) the Button leaves `href`
   untouched when `linkMode === "static"`, when no row is in scope,
   or when `row.id` is missing or non-scalar; (d) the Renderer's
   new `pageKind` filter resolves the static and detail variants
   of a U2 config independently; (e) descendants of the
   `RowContextProvider` resolve `{{ row.* }}` tokens through the
   existing ComponentRenderer hook (token resolution on a detail
   page is the same code path as token resolution inside a
   Repeater iteration — Sprint 9b adds a regression test that
   confirms this without rewriting the Sprint 9 hook); and (f) the
   pre-existing Sprint 13 resolver tests in
   `apps/web/app/[site]/[[...slug]]/__tests__/page.test.tsx` stay
   green verbatim.

The work does **not** touch `lib/rm-api/`, `lib/site-config/schema.ts`,
the renderer's `ComponentRenderer.tsx` source (the resolver hook
already handles every per-prop case), the `RowContextProvider` /
`useRow` source files, the `token-resolver` source files, the deploy
endpoint, the AI endpoints, the editor, the setup form, or the
Supabase migrations. It extends exactly three production files
(`Button/index.tsx`, `Renderer.tsx`, `[[...slug]]/page.tsx`), one
helper file (`resolve.ts`), one component SPEC.md
(`Button/SPEC.md`), and the matching test files.

## Spec sections in scope

- `PROJECT_SPEC.md` §8.12 — Detail pages: U2 routing, row context,
  Repeater→detail-page linking via `Button.linkMode = "detail"`,
  cross-page filter parameters, and the explicit out-of-scope list
  (no nested dynamic segments, no non-numeric ids, only `properties`
  and `units` are detail-eligible).
- `PROJECT_SPEC.md` §11 — Page validation rules: per-`kind` slug
  uniqueness, `detailDataSource` required iff `kind === "detail"`,
  `kind` defaults to `"static"`. Sprint 9b reads this contract; it
  does not modify it.
- `PROJECT_SPEC.md` §10 / §10.3 — The shared renderer; in `public`
  mode the public route is RSC, the row fetch is server-side, and
  the row context provider crosses the RSC→client boundary as a
  serialized prop.
- `PROJECT_SPEC.md` §17 — Out of scope: no per-customer subdomains,
  no auth beyond a placeholder. The detail-page route is reachable
  via the same service-role client the catch-all already uses; no
  new auth gates.
- `PROJECT_SPEC.md` §13.2 — Demo flow. Sprint 9b does not change
  the demo script; it makes the detail-page links inside the
  generated Aurora site clickable end-to-end so Sprint 15's E2E can
  assert "click a UnitCard's CTA → unit detail page renders with
  that unit's data."

Quote each section as you build the corresponding piece. Do not
paraphrase the §8.12 rules — the renderer behavior is gated on the
exact contract.

## Pre-flight check (MANDATORY — emit before reading or writing any non-spec file)

Before reading or modifying any file other than the items listed in
"Spec sections in scope" above, run these fifteen checks. If any
fails, STOP and emit a Deviation Report per the protocol embedded
later in this file. Do not attempt to work around a failed check.

1. **Single-branch workflow.** Run `git branch --show-current` and
   verify the output is exactly `master`. If it is not, STOP and
   emit a Deviation Report — do NOT create a `sprint/9b` branch
   and do NOT switch branches. Per `DECISIONS.md` 2026-04-25 the
   project uses a single `master` branch on a single repo;
   worktrees are not in use.

2. **Predecessor sprints merged.** Run `git log --oneline -n 50`
   and confirm commits referencing Sprints 0, 1, 2, 3, 3b, 5, 5b,
   4, 6, 7, 8, 9, 11, 13 are present. The recommended execution
   order in `docs/planning/SPRINT_SCHEDULE.md` §3 places Sprint 9b
   AFTER Sprint 13. If Sprint 13 is not merged, STOP — Sprint 9b
   cannot extend a route file that does not yet exist.

3. **Catch-all route present (with the optional brackets).**
   Run `ls apps/web/app/[site]/[[...slug]]/` and confirm the
   directory contains at least `page.tsx`, `resolve.ts`, and
   `__tests__/page.test.tsx`. The directory is `[[...slug]]`
   (TWO opening brackets, TWO closing brackets) per the
   2026-04-26 DECISIONS.md "Catch-all directory uses optional
   brackets" entry. If the directory is `[...slug]` instead, STOP
   — that means Sprint 13 did not land in its final form and
   Sprint 9b's plan path needs reconciliation. Do NOT create a
   second `[...slug]` directory in parallel; raise a Deviation.

4. **Insertion-point comment present.** Run
   `grep -n "SPRINT 9B INSERTS DETAIL BRANCH HERE" apps/web/app/[site]/[[...slug]]/page.tsx`
   and confirm exactly one match, immediately above the final
   `notFound()` line, in the form
   `// === SPRINT 9B INSERTS DETAIL BRANCH HERE ===`. If the
   comment is missing, has been moved, or has been re-worded,
   STOP — Sprint 13's contract has been broken; raise a
   Deviation. The replacement block goes EXACTLY where this
   comment is; nothing above it (the `staticPage` lookup, the
   config parse, the site / version load) is touched.

5. **`resolveStaticPage` exported and untouched.** Open
   `apps/web/app/[site]/[[...slug]]/resolve.ts` and confirm it
   exports `resolveStaticPage(config: SiteConfig, slug: string[] |
   undefined): Page | null`. Sprint 9b ADDS `resolveDetailPage` to
   this same file; it does NOT modify `resolveStaticPage`'s body
   or signature.

6. **Row context module exports the right names.** Open
   `apps/web/lib/row-context/index.ts` and confirm it re-exports
   `RowContext`, `RowContextProvider`, `RowProvided`, and `useRow`.
   Open `apps/web/lib/row-context/RowContext.tsx` and confirm
   `RowContextProvider` accepts `kind: "repeater" | "detail"` and
   the `RowProvided` type is the discriminated union
   `{ row: unknown; kind: "repeater" | "detail" } | { row: null;
   kind: null }`. Both shapes are required as written; if either
   diverges, STOP.

7. **Token resolver public surface intact.** Open
   `apps/web/lib/token-resolver/index.ts` and confirm it exports
   `resolveTokens` (the `(value: string, row: unknown | null) =>
   string` function) and `FORMATTERS`. Open
   `apps/web/lib/token-resolver/resolve.ts` and confirm the
   contract: when `row === null || row === undefined` the input
   is returned verbatim; unknown `{{ row.path }}` paths emit the
   token verbatim; the `money` / `number` / `date` / `lower` /
   `upper` formatters all exist. Sprint 9b consumes this surface
   read-only.

8. **`useRow()` returns the right discriminated shape.** Open
   `apps/web/lib/row-context/useRow.ts` (or whatever file
   `useRow` is exported from) and confirm the function returns
   the same `RowProvided` union shape exported from `RowContext.tsx`.
   The Button code in step 4 of Mission depends on `kind === null`
   and `row !== null` being checkable independently.

9. **`ComponentRenderer.tsx` resolver hook present.** Open
   `apps/web/components/renderer/ComponentRenderer.tsx` and
   confirm it imports `useRow` from `@/lib/row-context`, that it
   has the `WHOLE_TOKEN_RE` regex, the `resolveStringProp` /
   `resolveValue` / `resolveProps` helpers, and the
   `useMemo<ComponentNode>(() => kind === null ? node : { ...node,
   props: resolveProps(node.props, row) }, ...)` block. Sprint 9b
   does NOT touch this file — the per-component prop resolution is
   already general enough to handle detail-page row context the
   moment a `RowContextProvider kind="detail"` wraps the rendered
   tree. If any of these landmarks are missing, STOP.

10. **`Renderer.tsx` exists and exports `Renderer`.** Open
    `apps/web/components/renderer/Renderer.tsx` and confirm the
    file exports a default or named `Renderer` component that
    takes `config: SiteConfig`, `page: string`, and `mode: "edit" |
    "preview" | "public"`. Note where the page lookup happens
    (`config.pages.find(...)`) and where the page's
    `rootComponent` is rendered relative to the global NavBar /
    Footer chrome — Sprint 9b's additive props (`pageKind`, `row`)
    interleave with that exact location.

11. **`lib/rm-api` exposes `getUnitById` and `getPropertyById`.**
    Open `apps/web/lib/rm-api/index.ts` and confirm it re-exports
    `getUnitById` from `./units` and `getPropertyById` from
    `./properties`. Both functions take a `number` id and return
    `Unit | null` / `Property | null` respectively (per
    `apps/web/lib/rm-api/__tests__/units.test.ts` and
    `apps/web/lib/rm-api/__tests__/properties.test.ts` — confirm
    by reading the test files, not by running them, since the
    integration tests skip without env vars in CI).

12. **`Button/index.tsx` matches the Sprint 5b shape.** Open
    `apps/web/components/site-components/Button/index.tsx` and
    confirm:
    - It does NOT have a `"use client"` directive at the top
      (Sprint 9b adds it).
    - The `buttonPropsSchema` includes `linkMode` (default
      `"static"`) and `detailPageSlug` (optional), joined by a
      `superRefine` that errors when `linkMode === "detail"` and
      `detailPageSlug === undefined`.
    - The module-level `BUTTON_FALLBACK = buttonPropsSchema.parse({})`
      exists.
    - The render emits `data-link-mode="detail"` and
      `data-detail-page-slug` data attributes only when
      `data.linkMode === "detail"` and `data.detailPageSlug !==
      undefined`.
    If anything diverges, STOP — Sprint 9b's wiring depends on the
    Sprint 5b contract.

13. **`InputField/index.tsx` is already a client component.**
    Open `apps/web/components/site-components/InputField/index.tsx`
    and confirm the first non-comment line is `"use client";` and
    that the `useEffect` reading `window.location.search` is
    wired to `data.defaultValueFromQueryParam`. Sprint 9b makes
    NO changes to this file — Sprint 5b's wiring is sufficient.
    If the directive is missing, STOP and raise a Deviation.

14. **`Repeater/index.tsx` continues to use `RowContextProvider`.**
    Open `apps/web/components/site-components/Repeater/index.tsx`
    and confirm it imports `RowContextProvider` from
    `@/lib/row-context` and wraps each row's template render in
    `<RowContextProvider key={...} row={row} kind="repeater">`.
    Sprint 9b's detail-page wrap uses the IDENTICAL component;
    confirm the import is still there so any future regression
    in the row-context surface affects both call sites equally.

15. **Schema enforces detail-page validation.** Open
    `apps/web/lib/site-config/schema.ts` and confirm `pageSchema`
    defaults `kind` to `"static"`, `siteConfigSchema`'s
    cross-page `superRefine` enforces per-`kind` slug uniqueness,
    and a per-page `superRefine` rejects `kind === "detail"`
    without `detailDataSource`. Sprint 9b relies on the catch-all
    receiving validated configs (the deploy gate re-validates
    before snapshotting), so a detail page in the deployed config
    is guaranteed to carry a `detailDataSource`.

After all fifteen checks pass, list each as `[x]` in your first
response and then proceed.

## Authorized hand-offs from earlier sprints

The following are planned hand-offs and are NOT Deviations. They
are honored by this sprint and listed in the Sprint Completion
Report under "Authorized hand-offs honored":

- `apps/web/components/site-components/Button/index.tsx` — Sprint 5
  shipped this as a server component; Sprint 5b extended its
  schema and data attributes; **Sprint 9b adds a `"use client"`
  directive and a `useRow()` call to compute the detail href**.
  The file's exported name (`Button`), its prop schema, its
  render output (the `<a>` / `<button>` discriminator on
  `data.href`), and the Sprint 5b data attributes are all
  preserved. The `BUTTON_FALLBACK`, `VARIANT_STYLES`, and
  `SIZE_STYLES` literals are unchanged.

- `apps/web/components/renderer/Renderer.tsx` — Sprint 3 owns the
  file; Sprint 9b adds two optional props (`pageKind`, `row`)
  with defaults that preserve every existing call site. Mirror
  the additive pattern Sprint 9 used when adding the resolver
  hook to `ComponentRenderer.tsx`.

- `apps/web/app/[site]/[[...slug]]/page.tsx` — Sprint 13 owns the
  file; the load-bearing
  `// === SPRINT 9B INSERTS DETAIL BRANCH HERE ===` comment is
  the agreed insertion point. Replace exactly that line with the
  new branch. Everything above it (the
  `loadSiteAndDeployedVersion` call, the `parseSiteConfig` call,
  the `staticPage` lookup, the static-render return) is
  untouched.

- `apps/web/app/[site]/[[...slug]]/resolve.ts` — Sprint 13 owns
  the file; Sprint 9b APPENDS `resolveDetailPage` and exports it.
  `resolveStaticPage` is untouched.

- `apps/web/app/[site]/[[...slug]]/__tests__/page.test.tsx` —
  Sprint 13 owns the file; Sprint 9b APPENDS new `describe` blocks
  for `resolveDetailPage` and the U2 routing cases. Every existing
  Sprint 13 test passes verbatim.

No other earlier-sprint files are modified. If you find yourself
wanting to edit any other file, that is a Deviation.

## Definition of Done

- [ ] **`resolveDetailPage` exported.**
      `apps/web/app/[site]/[[...slug]]/resolve.ts` exports
      `resolveDetailPage(config: SiteConfig, slug: string[] |
      undefined): { page: Page; rowId: number } | null` with the
      exact signature above. The function:
      1. Returns `null` when `slug` is `undefined` or has length
         other than 2.
      2. Returns `null` when `slug[1]` does NOT match the regex
         `/^[1-9]\d*$/` (i.e., a positive integer with no leading
         zeros, no signs, no decimals — `"0"`, `"01"`, `"-1"`,
         `"1.5"`, `"abc"` all return `null`).
      3. Otherwise looks up
         `config.pages.find((p) => p.kind === "detail" && p.slug
         === slug[0])` and returns `{ page, rowId: Number(slug[1])
         }` when found, `null` when not.
      The function is pure (no async, no side effects) and is
      exported alongside `resolveStaticPage`. The existing
      `resolveStaticPage` body is untouched.

- [ ] **Detail branch landed in the catch-all.**
      `apps/web/app/[site]/[[...slug]]/page.tsx` is extended
      in place. The line currently reading
      `  // === SPRINT 9B INSERTS DETAIL BRANCH HERE ===`
      is REPLACED (the comment goes away) with a block that:
      1. Calls `resolveDetailPage(config, params.slug)`.
      2. If the match is non-null, calls
         `getUnitById(match.rowId)` when `match.page.detailDataSource
         === "units"` or `getPropertyById(match.rowId)` when
         `match.page.detailDataSource === "properties"`. The two
         imports are added to the top of the file alongside the
         existing supabase / renderer / parseSiteConfig imports.
      3. If the row is `null`, falls through to the existing
         `notFound()` line below (do NOT inline a new
         `notFound()` — let the existing one handle it).
      4. If the row is non-null, returns
         `<Renderer config={config} page={match.page.slug}
         pageKind="detail" row={row} mode="public" />`.
      The trailing `notFound()` line (and its position relative
      to the static branch) is unchanged. The static branch above
      the insertion point is unchanged. `generateMetadata` does
      NOT need a detail-page branch in this sprint — its
      fall-through behavior of using `config.meta.siteName` is
      acceptable for the demo; a detail-aware metadata branch is
      a Sprint 15 polish item.

- [ ] **`Renderer` accepts `pageKind` and `row`.**
      `apps/web/components/renderer/Renderer.tsx` accepts the two
      new optional props with the defaults documented in Mission
      §3. The page lookup uses `(p) => p.slug === page && p.kind
      === (pageKind ?? "static")`. When `pageKind === "detail"`
      AND `row !== undefined`, the rendered page-rootComponent
      tree is wrapped in `<RowContextProvider row={row}
      kind="detail">…</RowContextProvider>`; when `pageKind ===
      "static"` (the default) the wrap is NOT applied and the
      tree renders exactly as it did before this sprint. Global
      NavBar / Footer rendering is unaffected by either prop.

- [ ] **Button computes the detail href.**
      `apps/web/components/site-components/Button/index.tsx`:
      1. Adds `"use client";` as the first non-blank line of the
         file (above the existing comment block).
      2. Imports `useRow` from `@/lib/row-context`.
      3. Calls `const { row, kind } = useRow();` inside the
         `Button` function body, after `parsed` / `data` are
         derived.
      4. Computes `let href = data.href;` and, when (i)
         `data.linkMode === "detail"`, (ii) `data.detailPageSlug
         !== undefined`, (iii) `kind !== null`, (iv) `row !== null
         && typeof row === "object"`, AND (v)
         `(row as { id?: unknown }).id` is `typeof "number" |
         "string"`, sets
         `href = "/" + data.detailPageSlug + "/" + (row as {id:
         number | string}).id`.
      5. Renders the `<a>` branch when this computed `href` is
         defined (existing behavior — `<a>` is chosen iff `href`
         is set), and falls back to the `<button>` branch
         otherwise.
      6. Continues to emit `data-link-mode="detail"` and
         `data-detail-page-slug` data attributes under the
         existing condition (`data.linkMode === "detail"` AND
         `data.detailPageSlug !== undefined`); the data attrs
         are independent of whether row context is in scope.
      The Sprint 5b silent-fallback semantics (invalid prop
      combinations cause `parsed.success === false`, falling back
      to `BUTTON_FALLBACK`) are preserved verbatim — the new
      logic only fires on the success branch.

- [ ] **Button SPEC reflects the detail-href behavior.**
      `apps/web/components/site-components/Button/SPEC.md`'s
      "Data binding" section is updated to state that when a
      Button is inside a row context (Repeater iteration or
      detail page) AND `linkMode === "detail"` with a valid
      `detailPageSlug`, the rendered href is computed as
      `/{detailPageSlug}/{row.id}` at render time. The existing
      note about `{{ row.* }}` tokens being stored verbatim by
      Sprint 5b is preserved; Sprint 9b's wiring complements it,
      it does not replace it. No other section of `SPEC.md` is
      modified.

- [ ] **Resolver tests green + new detail cases.**
      `apps/web/app/[site]/[[...slug]]/__tests__/page.test.tsx`
      keeps every existing Sprint 13 test passing verbatim and
      adds a new `describe("resolveDetailPage", () => { … })`
      block with at least these six cases:
      1. Two-segment slug whose first segment matches a detail
         page → returns `{ page, rowId }` with the right page id
         and a numeric `rowId`.
      2. Two-segment slug whose first segment matches a STATIC
         page (and no sibling detail page exists) → returns
         `null`.
      3. U2 case: two-segment slug `["units", "42"]` against a
         config with a static `units` page AND a detail `units`
         page (`detailDataSource: "units"`) → returns the DETAIL
         page, `rowId === 42`. The static page is ignored.
      4. Single-segment slug `["units"]` against the same U2
         config → returns `null` (the detail branch does not
         fire on the bare slug; `resolveStaticPage` handles
         that — covered by the existing Sprint 13 test).
      5. Three-segment slug `["units", "42", "extra"]` → returns
         `null`.
      6. Non-numeric trailing segment `["units", "abc"]` → returns
         `null`. Edge-case sub-cases: `["units", "0"]`,
         `["units", "01"]`, `["units", "-1"]`,
         `["units", "1.5"]`, `["units", " 1 "]` all return `null`.

- [ ] **Button tests cover the detail-href computation.**
      `apps/web/components/site-components/Button/__tests__/Button.test.tsx`
      adds a new `describe("Button (detail href under row context)",
      () => { … })` block with at least these six cases (each
      rendered inside a `<RowContextProvider>` wrapper):
      1. `linkMode: "detail"`, `detailPageSlug: "units"`, row =
         `{ id: 42 }`, `kind: "repeater"` → rendered `<a>` has
         `href === "/units/42"`.
      2. Same as (1) but `kind: "detail"` → same href result.
      3. `linkMode: "static"`, `href: "/about"`, row = `{ id: 42 }`
         → href stays `/about` (static-mode is not affected by
         row context).
      4. `linkMode: "detail"`, `detailPageSlug: "units"`, row =
         `null` (no provider) → href stays `data.href`'s pre-row
         value (or undefined → `<button>` branch). The
         `data-link-mode="detail"` data attr still renders.
      5. `linkMode: "detail"`, `detailPageSlug: "units"`, row =
         `{ name: "Apt 101" }` (id missing) → href stays the
         pre-row value; no `/units/undefined` artifact.
      6. `linkMode: "detail"`, `detailPageSlug: "units"`, row =
         `{ id: { nested: 1 } }` (non-scalar id) → href stays
         the pre-row value.
      Pre-existing Sprint 5 / Sprint 5b Button tests continue to
      pass verbatim.

- [ ] **Renderer test covers the U2 disambiguation.**
      Add or extend a renderer test (in
      `apps/web/components/renderer/__tests__/Renderer.test.tsx`
      if a test already covers `Renderer`'s page lookup, or in a
      new sibling test file otherwise) that asserts:
      1. With a U2 config (a static `units` page and a detail
         `units` page), `<Renderer page="units" mode="public" />`
         renders the static page's tree.
      2. The same call with `pageKind="detail" row={{ id: 42, … }}`
         renders the detail page's tree, wrapped in row context
         (a descendant `{{ row.* }}` token resolves).
      If `Renderer.test.tsx` is in another sprint's domain and
      adding to it constitutes a deviation, prefer a new test
      file alongside the renderer at
      `apps/web/components/renderer/__tests__/Renderer.detail.test.tsx`
      and document the choice in the Sprint Completion Report.

- [ ] **End-to-end smoke test passes** (see "Manual smoke test"
      below).

- [ ] **All new code has unit tests (Vitest).**
- [ ] `pnpm test` passes with zero failures and zero new skipped
      tests (the pre-existing skip count for the integration
      tests that gate on env vars is unchanged).
- [ ] `pnpm build` succeeds with zero TypeScript errors and zero
      warnings.
- [ ] `pnpm lint` (Biome) passes with zero warnings.
- [ ] No new files outside the "may create or modify" list.
- [ ] No new dependencies added without an approved Deviation.
- [ ] `DECISIONS.md` updated if any deviation was approved during
      this sprint, AND a single execution-record entry is
      appended for Sprint 9b that lists the files actually
      modified, the new tests added, the pre-flight check result,
      and any retroactive cross-sprint test fixes (per CLAUDE.md
      §15.9) that proved necessary.

## File scope

### You may create or modify

- `apps/web/app/[site]/[[...slug]]/page.tsx` — extend in place at
  the load-bearing comment site only.
- `apps/web/app/[site]/[[...slug]]/resolve.ts` — append
  `resolveDetailPage`; do not modify `resolveStaticPage`.
- `apps/web/app/[site]/[[...slug]]/__tests__/page.test.tsx` —
  append the `resolveDetailPage` describe block.
- `apps/web/components/renderer/Renderer.tsx` — add the two
  optional props and the conditional row-context wrap.
- `apps/web/components/site-components/Button/index.tsx` — add
  the `"use client"` directive, the `useRow` import, and the
  detail-href computation.
- `apps/web/components/site-components/Button/SPEC.md` — update
  the Data binding section.
- `apps/web/components/site-components/Button/__tests__/Button.test.tsx`
  — append the detail-href describe block.
- `apps/web/components/renderer/__tests__/Renderer.detail.test.tsx`
  (NEW; only if extending the existing `Renderer.test.tsx` would
  cross sprint domains — see the DoD note).
- `DECISIONS.md` — append exactly one Sprint 9b execution-record
  entry at the END of the file (do not edit any earlier entry).

### You may read but NOT modify

- `PROJECT_SPEC.md` — authoritative spec; raise concerns via the
  Deviation Protocol, never edit.
- `CLAUDE.md` (root) — master coding standards + Deviation
  Protocol.
- `apps/web/lib/site-config/schema.ts` — Sprint 3/3b domain.
- `apps/web/lib/site-config/index.ts` — Sprint 3 domain (re-exports).
- `apps/web/types/site-config.ts` — Sprint 3 domain.
- `apps/web/lib/row-context/RowContext.tsx` — Sprint 9 domain.
- `apps/web/lib/row-context/useRow.ts` — Sprint 9 domain.
- `apps/web/lib/row-context/index.ts` — Sprint 9 domain.
- `apps/web/lib/token-resolver/**` — Sprint 9 domain.
- `apps/web/lib/rm-api/**` — Sprint 1 domain.
- `apps/web/lib/supabase/**` — Sprint 0/1 domain.
- `apps/web/components/renderer/ComponentRenderer.tsx` — Sprint 3/9
  domain. Sprint 9b does NOT touch the resolver hook; the
  existing per-prop walker already handles detail-page row
  context once a `<RowContextProvider kind="detail">` wraps the
  tree.
- `apps/web/components/site-components/Repeater/**` — Sprint 9
  domain (the row-context wrap pattern Sprint 9b mirrors lives
  here).
- `apps/web/components/site-components/InputField/**` — Sprint 5/5b
  domain. Sprint 9b makes NO changes; the Sprint 5b client wiring
  is sufficient for the smoke test.
- `apps/web/app/api/sites/[siteId]/deploy/**` — Sprint 13 domain.

### You MUST NOT modify

- `PROJECT_SPEC.md` — the spec is authoritative.
- `DECISIONS.md` — APPEND-ONLY; never edit earlier entries.
- The repo-root `CLAUDE.md`.
- `apps/web/lib/rm-api/**`, `apps/web/lib/site-config/**`,
  `apps/web/lib/ai/**`, `apps/web/lib/editor-state/**`,
  `apps/web/lib/row-context/**` (source files; tests live in
  `__tests__/`),  `apps/web/lib/token-resolver/**`,
  `apps/web/lib/supabase/**`.
- `apps/web/components/renderer/ComponentRenderer.tsx`.
- `apps/web/components/site-components/**` EXCEPT the four Button
  files listed above. Specifically: `InputField/**` is OFF
  LIMITS for this sprint.
- `apps/web/components/setup-form/**`,
  `apps/web/components/editor/**`, `apps/web/components/rmx-shell/**`.
- `apps/web/app/[site]/edit/**`, `apps/web/app/[site]/preview/**`,
  `apps/web/app/(rmx)/**`, `apps/web/app/dev/**`,
  `apps/web/app/setup/**`, `apps/web/app/api/**` (every API route
  is owned by the sprint that authored it).
- `supabase/migrations/**` — Sprint 9b introduces NO new
  migrations.
- `apps/web/package.json`, `next.config.*`, `tsconfig*.json`,
  `vitest.config.*`, `biome.json`, `apps/web/.env.local`,
  `.env.example`, `pnpm-lock.yaml` — Sprint 9b introduces NO new
  dependencies and NO new env vars.

If you find yourself wanting to add a file outside this list, that
is a Deviation. Raise the report; do not just add the file.

## Manual smoke test (numbered, click-by-click)

Run against the linked hosted Supabase project (per the 2026-04-25
DECISIONS.md "hosted Supabase" decision). Requires the seeded
Aurora Property Group fixture (`pnpm seed`) and a working version
that has been deployed at least once (Sprint 13's smoke test
covers this — re-run it if `site_versions` for the Aurora site
has no `is_deployed = true` row).

If the working SiteConfig for Aurora does not already include a
detail page for `units`, you can either (a) use the editor's
Pages tab "Add page" modal to add one (Static / Detail picker;
data source `units`; slug `units`) and re-deploy, OR (b) follow
the dev fixture path: open
`http://localhost:3000/dev/components` and confirm the U2 detail
page in the Sprint 5b dev fixture is rendered (Sprint 5b's
`p_units_static` + `p_units_detail` coexistence).

The smoke-test sequence below uses the Aurora Property Group
fixture and assumes a deployed site where at least one detail
page exists.

1. Run `pnpm dev` and confirm the dev server starts on
   `http://localhost:3000` with no startup errors in the console.

2. Run `pnpm seed` if not run since the last `pnpm db:reset`.
   Confirm the Aurora seed loads (rm-api integration tests
   in step 19 implicitly cover this).

3. Open `http://localhost:3000/setup`. Click into the existing
   Aurora site to open the editor at `/{site}/edit`.

4. In the Pages tab, confirm there is at least one detail page
   for the `units` data source. If the page selector visually
   distinguishes detail pages (per the Sprint 6 Pages-tab
   amendment), the badge / DETAIL marker confirms which page is
   the detail variant. If no detail page exists yet, add one via
   the "Add page" modal (Page kind: Detail; Detail data source:
   units; slug: `units`), drop a Heading and a Paragraph that
   reference `{{ row.unitName }}` and `{{ row.currentMarketRent
   | money }}` into its rootComponent, and let autosave settle.

5. Click Deploy. Click Confirm in the modal. Wait for the toast.

6. Open a new browser tab. Navigate to
   `http://localhost:3000/{siteSlug}/units` (the bare units URL).
   Confirm the static units listing renders — Sprint 13's static
   branch behavior is unchanged.

7. Navigate to `http://localhost:3000/{siteSlug}/units/<some
   seeded unit id>` — pick a real unit id from the Aurora seed
   (id 101 is the canonical "Apt 101" per
   `apps/web/lib/rm-api/__tests__/units.test.ts`). Confirm:
   - The detail page renders (NavBar + the detail page's
     rootComponent + Footer).
   - Tokens like `{{ row.unitName }}` render as the unit's name
     ("Apt 101").
   - Tokens like `{{ row.currentMarketRent | money }}` render
     formatted (e.g. `$1,200`).
   - There is no editor chrome (no selection outlines, no
     handles, no sidebars).

8. Navigate to
   `http://localhost:3000/{siteSlug}/units/999999` (a unit id
   that does not exist in the seed). Confirm Next renders the
   framework 404 page.

9. Navigate to
   `http://localhost:3000/{siteSlug}/units/abc`. Confirm 404 —
   the non-numeric trailing segment is rejected by
   `resolveDetailPage`.

10. Navigate to `http://localhost:3000/{siteSlug}/units/0`,
    `http://localhost:3000/{siteSlug}/units/01`, and
    `http://localhost:3000/{siteSlug}/units/-1`. Confirm each
    returns 404 (the regex rejects all three).

11. Navigate to
    `http://localhost:3000/{siteSlug}/units/42/extra-segment`.
    Confirm 404 — the three-segment shape is not a detail-page
    shape.

12. Back on the listing page (`/{siteSlug}/units`), find a
    UnitCard with a CTA that links to its detail page (the
    canonical pattern: a UnitCard inside a Repeater of `units`
    with a Button child whose `linkMode === "detail"` and
    `detailPageSlug === "units"`). Confirm the rendered `<a>`'s
    `href` attribute is exactly `/units/{thatUnitsId}` — inspect
    the DOM via DevTools. Click the CTA. Confirm the browser
    navigates to the detail page for that exact unit and the
    page renders that unit's data.

13. From the detail page, confirm the global NavBar links and
    Footer copyright text do NOT contain row-derived strings —
    if you authored a NavBar link with `{{ row.x }}` it should
    pass through verbatim because Sprint 9b's row-context wrap
    is scoped to the rootComponent only. (If you have not
    authored such a NavBar token, this step is a documentation
    confirmation rather than a runtime check.)

14. Test the cross-page filter integration: on a page that
    contains an `<InputField>` with
    `defaultValueFromQueryParam: "propertyId"`, navigate to
    `http://localhost:3000/{siteSlug}/{thatPageSlug}?propertyId=4`.
    Confirm the input is pre-filled with `4` on mount. (This
    confirms Sprint 5b's wiring is still intact end-to-end on a
    deployed page; Sprint 9b makes no code changes here.)

15. Run the full quality gate suite from the repo root:
```
    pnpm test
    pnpm build
    pnpm lint
```
    Confirm all three pass. The `pnpm test` output should show
    the new Sprint 9b tests passing AND the pre-existing skip
    count unchanged from before this sprint.

16. Run the targeted test for the resolver and the Button:
```
    pnpm test apps/web/app/\[site\]/\[\[...slug\]\]/__tests__/page.test.tsx
    pnpm test apps/web/components/site-components/Button/__tests__/Button.test.tsx
```
    Both files report all tests passing, and the new
    detail-branch / detail-href cases appear in the output.

If any step fails, treat the failure as a Deviation per the
protocol below — do not commit a partial sprint.

## User Actions Required

None. Sprint 9b introduces no new dependencies, no new env vars,
no new Supabase migrations, and no Vercel-specific changes. The
existing hosted Supabase project, the Sprint 13 Vercel project (if
already created), and the existing `.env.local` are sufficient.

## Coding standards (binding — copied verbatim from `PROJECT_SPEC.md` §15)

### 15.1 TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`,
  `noImplicitAny: true`.
- No `any`. If you reach for it, use `unknown` and narrow.
- Prefer types over interfaces unless extending.
- Branded types for IDs: `type SiteId = string & { __brand: "SiteId" }`.

### 15.2 React

- Server components by default. `"use client"` only where needed.
  The catch-all page is RSC. The Renderer is `"use client"`
  (inherited from `ComponentRenderer`). The Button BECOMES
  `"use client"` in this sprint because it calls `useRow()`.
  `RowContextProvider` is `"use client"` (Sprint 9). The
  RSC→client boundary at the Renderer call sends the `row` prop
  as a JSON-serialized payload.
- One component per file. File name = export name.
- Use `cn(...)` helper from shadcn for class merging.
- No prop drilling deeper than 2 levels — lift to Zustand. (Sprint
  9b adds NO Zustand usage; the row prop flows directly from the
  RSC catch-all to the Renderer to the RowContextProvider.)

### 15.3 Naming

- Files: `kebab-case.ts(x)`. (Sprint 9b follows the existing
  PascalCase / mixed-case filenames already in the affected
  directories — `Button/index.tsx`, `Renderer.tsx`,
  `[[...slug]]/page.tsx`, `[[...slug]]/resolve.ts` — to match
  precedent.)
- Components: `PascalCase`.
- Hooks: `useThing`.
- API routes: `kebab-case`.
- Database tables: `snake_case`.
- DB columns: `snake_case`.
- TypeScript fields: `camelCase` (translate at the boundary).

### 15.4 Commits

- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`,
  `docs:`, `test:`.
- One concern per commit. If a commit message has "and" in it,
  split it.
- Suggested commit sequence for this sprint: (1) `feat: add
  resolveDetailPage helper`, (2) `feat: add pageKind/row props
  to Renderer`, (3) `feat: button computes detail href under row
  context`, (4) `feat: detail branch in catch-all`, (5) `test:
  detail-page resolver, button, renderer cases`, (6) `docs:
  Button SPEC + DECISIONS.md execution record`. Splits and order
  are non-binding; the binding rule is "one concern per commit".

### 15.5 Testing

- Unit-test `resolveDetailPage` as a pure function.
- Unit-test `Button` with `<RowContextProvider>` wrappers in
  Vitest's `@testing-library/react` host.
- Unit-test `Renderer`'s `pageKind` filter on a U2 config (no
  Supabase, no async — feed `Renderer` a hand-built `SiteConfig`).
- The catch-all `page.tsx` itself is NOT mounted in a unit test
  (the RSC + async-params combination is not unit-testable in
  Vitest; the Sprint 13 pattern of testing the helper rather
  than the page module is preserved). The smoke test covers the
  end-to-end path.

### 15.6 Comments

- Comment *why*, not *what*. Code says what.
- TODO comments must include a person/owner: `// TODO(max): …`.
- No commented-out code in committed files.

### 15.7 Quality gates (binding)

A sprint is not "done" until ALL of the following pass:

- `pnpm test` (Vitest, all tests including new ones).
- `pnpm build` (Next.js production build, zero TypeScript
  errors).
- `pnpm lint` (Biome check, zero warnings).
- The sprint's manual smoke test.

If any check fails, treat it as a Deviation. Do not commit. Do
not declare the sprint complete.

### 15.8 Deviation discipline

Claude Code MUST NOT silently substitute, downgrade, or skip
work. The full Deviation Protocol is below. Every sprint
inherits it.

### 15.9 Retroactive cross-sprint cleanup

When the current sprint's quality gates cannot pass because of a
pre-existing breakage owned by an earlier sprint (typically a
TypeScript error or a stale assertion in a Sprint N test file
that blocks `pnpm build` or `pnpm test`), Claude Code is
permitted to apply a minimal, surgical fix to the offending
earlier-sprint test or config file rather than emitting a
Deviation per occurrence. Constraints are binding: smallest
possible change, no behavior changes, test/config files only
(production code in another sprint's domain still requires a
Deviation), each fix logged in `DECISIONS.md` and listed in the
Sprint Completion Report's "Retroactive cross-sprint fixes"
subsection. See the root `CLAUDE.md` §15.9 for the full text.

A specific risk for this sprint: making `Button/index.tsx` a
`"use client"` component MAY trigger latent type errors in
Sprint 5 or Sprint 5b tests that imported `Button` expecting it
to be a server-renderable function. If `pnpm build` or
`pnpm test` flags such a case, apply the §15.9 carve-out —
typically a one-line cast or a `vi.mock` stub — and log it in
`DECISIONS.md`. Production code in those test files' sister
production modules is OFF LIMITS; the carve-out is for tests
only.

## Deviation Protocol (mandatory — do not modify)

If you (Claude Code) discover during this sprint that ANY part
of the plan cannot be implemented exactly as written, you MUST
stop and emit a Deviation Report in the format below. You MUST
NOT proceed with an alternative until the user has explicitly
approved it with the words "Approved" or equivalent.

A "deviation" includes: missing/broken/incompatible libraries,
impossible function signatures, scope additions, file additions
outside the declared scope, test plans that cannot be executed
as written, and any case where you catch yourself thinking "I'll
just do it slightly differently."

### Deviation Report (emit verbatim)

```
🛑 DEVIATION DETECTED

Sprint: [Sprint number and name]
Failed DoD item: [The exact bullet from Definition of Done that this blocks]

What's not working (1–2 sentences, plain English):
[Describe the problem like you're talking to a non-engineer.]

Why it's not working (1–2 sentences, technical):
[Brief technical reason.]

Proposed alternative (1–2 sentences, plain English):
[Describe the replacement like you're talking to a non-engineer.]

Trade-offs:
- Gain: [What we get]
- Lose: [What we give up]
- Risk:  [What might break]

Estimated impact on the rest of the sprint:
[Will this affect later DoD items? Other sprints? Be honest.]

Awaiting approval to proceed. Reply "Approved" to continue, or describe a
different direction.
```

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

A sprint is not done until all of the following pass with no
warnings:

- `pnpm test`
- `pnpm build`
- `pnpm lint` (Biome check)
- The manual smoke test above.

If any check fails, treat it as a Deviation. Do not commit. Do
not declare the sprint complete.

## Useful local commands

- `pnpm dev` — local dev server at <http://localhost:3000>.
- `pnpm test` — Vitest, all tests.
- `pnpm test apps/web/app/\[site\]/\[\[...slug\]\]/__tests__/page.test.tsx`
  — fast iteration on the resolver helpers.
- `pnpm test apps/web/components/site-components/Button/__tests__/Button.test.tsx`
  — fast iteration on the Button.
- `pnpm test apps/web/components/renderer/`
  — fast iteration on the Renderer (covers the new `pageKind`
  filter regardless of which test file ends up holding it).
- `pnpm seed` — re-seed Supabase mock data on the linked hosted
  project.

## Notes & hints (non-binding context)

- **The `[[...slug]]` directory.** The Sprint 13 catch-all
  uses the OPTIONAL catch-all form (`[[...slug]]`) per the
  2026-04-26 DECISIONS.md entry. This is what allows the bare
  `/{siteSlug}` URL (no trailing path) to render the home page.
  Sprint 9b's plan in `docs/planning/SPRINT_SCHEDULE.md` was
  drafted before that decision and uses `[...slug]` in places —
  treat the SCHEDULE wording as referring to the `[[...slug]]`
  directory wherever they conflict. Do NOT create a parallel
  `[...slug]` directory.

- **`generateMetadata` is intentionally minimal.** Sprint 13's
  `generateMetadata` calls `resolveStaticPage` and falls back to
  `config.meta.siteName` when no static match is found. For a
  detail page the same fallback is acceptable for the demo —
  per-row metadata (e.g. `<title>{unit.unitName} | Aurora</title>`)
  is a Sprint 15 polish item. Do NOT add a detail branch to
  `generateMetadata` in this sprint; it is a deviation.

- **Numeric ID regex `/^[1-9]\d*$/`.** This intentionally
  rejects `"0"`. Sprint 1's RM-API seed assigns ids starting at
  1; an id of 0 would be unreachable in practice. Allowing `"0"`
  would also let `"00"`, `"000"` etc. through with `Number(...)`
  coercing to 0; rejecting at the regex level avoids the
  ambiguity.

- **`getUnitById` / `getPropertyById` accept `number`.** The
  resolver returns `rowId: number` (parsed via `Number(slug[1])`
  after the regex check). Pass that number directly to the
  rm-api helper; do NOT pass the original string — the helper
  signature is `(id: number) => Promise<… | null>`.

- **Button "use client" is the same pattern Sprint 5b used for
  InputField.** No bundle-size impact concerns are in scope for
  this sprint; Buttons in static (non-row) contexts continue to
  serialize fine across the RSC→client boundary because the
  encompassing `<Renderer>` is already client.

- **No `RowContextProvider` source changes.** The Sprint 9
  provider already accepts `kind: "repeater" | "detail"`. Sprint
  9b's only new use is `<RowContextProvider row={row}
  kind="detail">` inside `Renderer.tsx`. The provider's source
  file is OFF LIMITS.

- **No `ComponentRenderer.tsx` source changes.** The Sprint 9
  resolver hook (`useRow()` + `resolveProps`) is general — the
  moment a detail page wraps in `<RowContextProvider
  kind="detail">`, every descendant token resolves identically
  to a Repeater iteration. The 2026-04-26 DECISIONS.md
  whole-token passthrough also flows through verbatim. Sprint
  9b's tests should include at least one regression case
  proving this (a Heading or Paragraph inside the detail page's
  rootComponent renders `{{ row.unitName }}` as the actual
  unitName).

- **Test fixture choice.** For Button tests, render inside
  `<RowContextProvider row={...} kind="repeater">` rather than
  `kind="detail"` for at least one case — the Button's
  detail-href computation must NOT depend on which kind of row
  context wraps it; either context activates the wiring. Confirm
  this with one test of each kind.

- **Pre-existing skip count.** `pnpm test` reports a small set
  of skipped tests (the rm-api integration tests gate on
  `process.env.NEXT_PUBLIC_SUPABASE_URL`, etc.). The DoD's
  "zero new skipped tests" rule means: the count after Sprint
  9b equals the count before Sprint 9b. Do NOT skip Sprint 9b's
  new tests.

- **Auth is a placeholder.** Per `PROJECT_SPEC.md` §17 / §3.1
  the catch-all reads via the service-role client; RLS is
  permissive in the demo. Sprint 9b adds no auth check. The
  detail-page row fetch is just another service-role read.

- **The `// === SPRINT 9B INSERTS DETAIL BRANCH HERE ===`
  comment is consumed.** When Sprint 9b lands, the comment line
  goes away — its sole purpose was to mark this insertion point.
  Do NOT preserve the comment "for future sprints"; there is no
  future sprint that needs it. The detail branch IS the comment's
  payload.

---

*End of Sprint 9b CLAUDE.md.*