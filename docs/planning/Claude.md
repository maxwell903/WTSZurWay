# CLAUDE.md — Sprint 4: Initial Generation Endpoint

> Drop this file at the repo root of `WTSZurWay/` for the duration of Sprint
> 4, replacing the master `CLAUDE.md`. Restore the master `CLAUDE.md` after
> the sprint's quality gates pass and the Sprint Completion Report has been
> emitted. Per the 2026-04-25 entry in `DECISIONS.md`, this project uses a
> single-branch workflow on `master` — there is no `sprint/04` branch. Every
> commit lands on `master` after the quality gates pass.

## Mission

Build the first AI surface end to end: a POST endpoint at
`/api/generate-initial-site` that accepts the validated setup-form payload,
calls the Anthropic API with a system prompt grounded in the locked
`SiteConfig` schema, validates the model's JSON output, persists the new
site and its version 1 to Supabase, and returns enough data for the Element
1 preview iframe to load `/{slug}/preview?v={versionId}`. Build the
`/{site}/preview/[v]` route that renders that version through the existing
shared `Renderer` in `mode="preview"`. Build the rotating `LoadingNarration`
component and the `PreviewPanel` that hosts the fake-browser chrome, the
empty / generating / generated / error states, and the structured error UI
from `PROJECT_SPEC.md` §9.6. Wire the existing `<SetupForm>` `onValid`
callback through a small client coordinator on `/setup` so clicking **Save**
triggers the generation and updates the panel's state.

This sprint is the spine of Element 1 — every later AI surface (Sprint 11's
AI Edit, Sprint 12's adjustment chat, Sprint 14's fallback fixtures) is
built on the prompt assembly, validation, and error-categorization scaffold
this sprint ships.

## Spec sections in scope

Read each of these end-to-end before writing any code. They are the
authoritative source for everything below — when this file and the spec
disagree, the spec wins; surface the conflict via the Deviation Protocol
before proceeding.

- `PROJECT_SPEC.md` §2.2 — Element 1 → Element 2 handoff (the iframe URL
  shape, the version 1 contract, the slug-as-route guarantee).
- `PROJECT_SPEC.md` §3.1 — Anthropic SDK and model selection
  (`claude-sonnet-4-5`, server-side only).
- `PROJECT_SPEC.md` §3.4 — Anthropic API key in env, server-side only,
  never exposed to the client. (Per `DECISIONS.md` 2026-04-25, "Supabase
  local via Docker" is superseded by hosted Supabase — this sprint runs
  against the linked hosted project.)
- `PROJECT_SPEC.md` §7.3 — the preview area's chrome (empty / generating /
  generated states, "Pending"/"Live" pill, fake browser dots).
- `PROJECT_SPEC.md` §7.4 — the Element 1 generate flow (validate → POST →
  call Claude → insert site + version 1 → redirect iframe →
  surface errors per §9.6).
- `PROJECT_SPEC.md` §9.1 — the two AI surfaces; this sprint owns Initial
  Generation.
- `PROJECT_SPEC.md` §9.2 — Initial Generation system prompt requirements.
- `PROJECT_SPEC.md` §9.5 — Initial Generation loading narration (the seven
  strings, in order, rotating every 3–4 seconds).
- `PROJECT_SPEC.md` §9.6 — error categories
  (`network_error`, `timeout`, `model_clarification`, `invalid_output`,
  `operation_invalid`, `over_quota`, `auth_error`) plus the **Copy details**
  button.
- `PROJECT_SPEC.md` §9.7 — model and API parameters
  (`claude-sonnet-4-5`, `max_tokens: 16000`, `temperature: 0.4`, structured
  JSON output, one automatic retry on parse failure with the schema in the
  follow-up).
- `PROJECT_SPEC.md` §9.8 — image inputs (max 4 per request, sent as image
  content blocks, client-side already resizes to ≤ 1568px on the long edge).
- `PROJECT_SPEC.md` §9.9 — cost guardrails. **This sprint does NOT enforce
  the soft limit** (`20 generations and 200 edits per site`); §9.9
  instrumentation is Sprint 14 territory. Document the deferral in code
  comments.
- `PROJECT_SPEC.md` §9.10 — the demo fallback path. **Out of scope here**:
  Sprint 14 owns the `demo_fixtures` table and the silent-fallback wiring.
  Sprint 4 surfaces real errors per §9.6 instead.
- `PROJECT_SPEC.md` §10.1 — `RendererProps` (`config`, `page`, `mode`,
  `selection?`, `onSelect?`, `onContextMenu?`). The `/preview` route uses
  `mode: "preview"` and never passes `selection`/`onSelect`.
- `PROJECT_SPEC.md` §11 — the `SiteConfig` schema in full, including the
  `Page.kind` and `Page.detailDataSource` amendment from Sprint 3b
  (already-shipped Zod refinement enforces the cross-field invariants).
- `PROJECT_SPEC.md` §12 — the `sites` and `site_versions` table DDL. **Use
  the DDL in §12 verbatim**; the migration this sprint adds is the first
  use of these columns.
- `PROJECT_SPEC.md` §15 — coding standards (binding; copied below).
- `PROJECT_SPEC.md` §17 — Out of Scope (auth beyond placeholder; the
  endpoint MUST NOT introduce real auth).

Detail-pages amendment from `docs/planning/SPRINT_SCHEDULE.md` Sprint 4
entry: the system prompt MUST teach the model about `Page.kind` and
`Page.detailDataSource` per the amended §11, AND any initial generation
that contains a Repeater of units MUST include at least one `kind="detail"`
page with `detailDataSource: "units"`, and any initial generation that
contains a Repeater of properties MUST include at least one
`kind="detail"` page with `detailDataSource: "properties"`. Sprint 9b will
resolve `{{ row.* }}` tokens at render time; Sprint 4 only ensures the
emitted config is valid against the (already amended) `siteConfigSchema`.

## Pre-flight check (run BEFORE any other work)

Treat each of the following as an assertion. If any assertion fails,
**STOP immediately** and emit a Deviation Report (see §"Deviation Protocol"
below). Do not write a single line of new code until every assertion
passes.

1. `apps/web/lib/site-config/schema.ts` exports `pageKindSchema`,
   `detailDataSourceSchema`, `pageSchema`, `siteConfigSchema`, and
   `componentNodeSchema`. The `pageSchema` enforces "detailDataSource iff
   kind='detail'" via `superRefine`. The `siteConfigSchema` enforces
   per-`kind` slug uniqueness via `superRefine`.
2. `apps/web/lib/site-config/index.ts` re-exports `parseSiteConfig`,
   `safeParseSiteConfig`, `siteConfigSchema`, and `pageKindSchema`.
3. `apps/web/components/site-components/registry.ts` exports
   `componentRegistry` keyed by every type in `COMPONENT_TYPES`, with no
   missing entries.
4. `apps/web/types/rm.ts` exports `Company`, `Property`, `Unit`,
   `PropertyType`, `PropertyFilters`, `UnitFilters`. (Used by the
   data-source description block of the system prompt.)
5. `apps/web/components/renderer/index.ts` exports `Renderer` and the
   `RendererProps` type. The `Renderer` accepts `mode: "edit" | "preview" |
   "public"`.
6. `apps/web/lib/supabase/index.ts` exports
   `createServiceSupabaseClient` and `createServerSupabaseClient`.
7. `apps/web/lib/setup-form/schema.ts` exports `setupFormSchema` and
   `apps/web/lib/setup-form/types.ts` exports `SetupFormValues`,
   `PALETTE_IDS`, `TEMPLATE_STARTS`, `PROPERTY_TYPES_FEATURED`,
   `PAGE_INCLUSIONS`, `TONES`, `PRIMARY_CTAS`. (The endpoint validates the
   inbound payload with `setupFormSchema` server-side.)
8. `apps/web/components/setup-form/setup-form.tsx` exports `SetupForm` and
   accepts an `onValid?: (values: SetupFormValues) => void` prop. (Sprint 4
   wires this without modifying the file.)
9. `apps/web/package.json` lists `@anthropic-ai/sdk` (already pinned to
   `0.91.1`). Do **not** add it again or bump the version.
10. `supabase/migrations/` exists and contains at least one
    `20260425*_create_rm_*.sql` file. Determine the highest existing
    `YYYYMMDDNNNNNN` ordinal and use one greater than it for the new
    migration filename.
11. `.env.example` (or `apps/web/.env.example`) documents
    `ANTHROPIC_API_KEY`. The Sprint 4 README amendment (see "User actions
    required" in the Sprint Completion Report) reminds the user to set it
    in `apps/web/.env.local`.

If any of those are missing, emit a Deviation Report naming the missing
asset, and wait for explicit user approval before either (a) implementing
the missing asset (likely outside this sprint's owned scope) or (b)
narrowing the sprint.

## Definition of Done

Every box must be ticked before the Sprint Completion Report is emitted.
Each item is a single observable outcome — do not collapse them.

- [ ] **Migration**: a new file at
      `supabase/migrations/2026MMDDNNNNNN_create_sites_and_site_versions.sql`
      creates the `sites` and `site_versions` tables exactly per
      `PROJECT_SPEC.md` §12, enables RLS on both with a single permissive
      `using (true) with check (true)` policy named consistently with the
      existing `rm_*` migrations, and adds a partial unique index ensuring
      "at most one `is_working = true` row per `site_id`" and "at most one
      `is_deployed = true` row per `site_id`". The file uses the next
      available `YYYYMMDDNNNNNN` ordinal greater than every existing
      migration.
- [ ] **Anthropic client wrapper**: `apps/web/lib/ai/client.ts` exports a
      `createAnthropicClient()` factory that constructs an `Anthropic`
      instance from the `ANTHROPIC_API_KEY` env var, throws a
      `"createAnthropicClient called in browser"` error if `typeof window
      !== "undefined"`, and throws a "Missing ANTHROPIC_API_KEY" error if
      the key is unset (mirrors `lib/supabase/service.ts`).
- [ ] **System-prompt builder**: `apps/web/lib/ai/prompts/initial-generation.ts`
      exports a pure function
      `buildInitialGenerationSystemPrompt(input: InitialGenerationInput): string`
      whose output (a) explicitly references "SiteConfig", (b) embeds a
      verbatim TypeScript-prose rendering of the schema produced by
      `apps/web/lib/ai/prompts/snippets/schema-prose.ts` including
      `Page.kind` and `Page.detailDataSource`, (c) embeds the registered
      component catalog from `apps/web/lib/ai/prompts/snippets/component-catalog.ts`,
      (d) embeds the data-source descriptions from
      `apps/web/lib/ai/prompts/snippets/data-sources.ts` listing every
      field on `Property`, `Unit`, and `Company`, (e) instructs strict JSON
      output with no prose and no markdown fences, (f) instructs the model
      to use only registered components, (g) instructs the model to apply
      the chosen palette consistently, (h) instructs the model to bind
      `UnitCard` / `PropertyCard` props to RM fields where appropriate,
      (i) caps total components per page at 40, (j) instructs the model to
      treat any attached inspiration screenshots as vibe references only,
      (k) instructs the model that any page with a Repeater over `units`
      MUST be paired with a `kind="detail"` page with
      `detailDataSource: "units"`, and any page with a Repeater over
      `properties` MUST be paired with a `kind="detail"` page with
      `detailDataSource: "properties"`, and (l) restates the per-`kind`
      slug uniqueness rule. The function is deterministic — no clock,
      no randomness, no I/O.
- [ ] **Generation orchestrator**:
      `apps/web/lib/ai/generate-initial-site.ts` exports an async function
      `generateInitialSite(input: InitialGenerationInput): Promise<GenerateInitialSiteResult>`
      where `GenerateInitialSiteResult` is a discriminated union:
      `{ kind: "ok"; config: SiteConfig }` or
      `{ kind: "error"; error: AiError }`. The function (a) builds the
      system prompt, (b) attaches up to 4 image content blocks from
      `input.inspirationImages` (URL source per the SDK) capped at 4 even
      if more are passed, (c) calls the SDK with `model:
      "claude-sonnet-4-5"`, `max_tokens: 16000`, `temperature: 0.4`,
      (d) extracts the first `text` content block, strips an optional
      leading ```` ```json ```` fence and trailing ```` ``` ````, parses
      JSON, and validates with `safeParseSiteConfig`; (e) on parse or
      validation failure, retries ONCE with a second user message that
      embeds the schema again and the previous output, prefixed with
      "Your previous output failed validation. Re-emit a valid SiteConfig
      JSON object. Validation errors:" and the Zod issue list; (f) maps
      every failure to an `AiError` with one of the seven §9.6 categories;
      (g) returns `{ kind: "ok", config }` on first success.
- [ ] **Error categorizer**: `apps/web/lib/ai/errors.ts` exports an
      `AiError` discriminated-union type with the seven §9.6 categories
      and a `categorizeAiError(unknown): AiError` helper that maps SDK
      errors to categories (HTTP 401/403 → `auth_error`, HTTP 429 →
      `over_quota`, `AbortError` / fetch network failure →
      `network_error`, request-timeout → `timeout`, ZodError after retry →
      `invalid_output`, anything else → `auth_error` with the original
      message in `details`). Includes a `formatErrorReport(error: AiError):
      string` that produces the JSON blob the **Copy details** button
      copies.
- [ ] **API route**: `apps/web/app/api/generate-initial-site/route.ts`
      exports a `POST(request: Request)` handler that (a) parses the body
      against `setupFormSchema` (server-side) and returns `400` with a
      structured error if invalid, (b) derives a unique `slug` (see next
      DoD item), (c) calls `generateInitialSite`, (d) on `{ kind: "ok" }`
      inserts a row into `sites` and a row into `site_versions` with
      `is_working = true`, `is_deployed = false`, `created_by = "ai"`,
      `source = "initial_generation"`, `parent_version_id = null`, the
      validated config in `config`, (e) returns 200 with
      `{ siteId, slug, versionId, previewUrl }` where `previewUrl` is
      `/{slug}/preview?v={versionId}`; on `{ kind: "error" }` it returns
      the appropriate HTTP status (`5xx` for `network_error`/`timeout`/
      `auth_error`/`over_quota`, `502` for `invalid_output`) and a JSON
      body `{ error: AiError }`. It uses the service-role Supabase client
      (per the existing `rm-api/` pattern; auth is a placeholder for the
      demo per §17). The route exports `runtime = "nodejs"` to keep the
      Anthropic SDK happy.
- [ ] **Slug generator**: `apps/web/lib/ai/slug.ts` exports
      `deriveSiteSlug(input: { companyName: string; currentWebsiteUrl?: string }): string`
      and a separate `async ensureUniqueSlug(slug: string): Promise<string>`
      that consults `sites.slug` and appends `-2`, `-3`, … until it finds a
      free one. Lowercase; ASCII; collapse whitespace and non
      `[a-z0-9-]` characters into `-`; strip leading/trailing `-`; max 60
      characters; falls back to `"site"` if input would yield empty.
- [ ] **`/{site}/preview` route**:
      `apps/web/app/[site]/preview/page.tsx` is an async server component
      that reads `params.site` and `searchParams.v`, fetches the matching
      `site_versions` row (by `id` if `v` is present, else the row with
      `is_working = true` for the resolved site_id, else the most recent
      row for that site), parses `config` with `parseSiteConfig`, and
      renders `<Renderer config={config} page={searchParams.page ??
      "home"} mode="preview" />`. Returns `notFound()` if the site or
      version is missing. Sets `metadata` from `config.meta.siteName` and
      `config.meta.description`. Uses the service-role Supabase client.
- [ ] **`LoadingNarration` component**:
      `apps/web/components/setup-form/LoadingNarration.tsx` is a `"use
      client"` component that accepts an optional `messages: string[]`
      prop (defaults to the seven §9.5 Initial Generation strings in the
      documented order) and an optional `intervalMs: number` (default
      `3500`), rotates through them with `setInterval`, fades between
      them with a CSS transition (no Framer Motion — it's not in
      `package.json`), cleans the interval on unmount, and respects
      `prefers-reduced-motion` by snapping rather than fading.
- [ ] **`PreviewPanel` component**:
      `apps/web/components/setup-form/PreviewPanel.tsx` is a `"use client"`
      component with a discriminated-union `state` prop:
      `{ kind: "empty" } | { kind: "generating" } | { kind: "generated";
      previewUrl: string; siteSlug: string } | { kind: "error"; error:
      AiError }`. It renders the §7.3 fake-browser chrome (red/yellow/
      green dots, inert back/forward/refresh, URL field showing
      `https://www.{slug}.com` once known, "Pending"/"Live" pill that
      flips on `kind: "generated"`), and inside the body: the empty state
      (file icon + the §7.3 hint string), the generating state
      (`<LoadingNarration />`), the generated state (`<iframe
      src={previewUrl} title="Generated site preview" />` sized to fill
      the chrome), or the error state (per the §9.6 user-facing copy keyed
      on `error.kind`, plus a **Retry** button when `error.kind` is
      `network_error`/`timeout`/`over_quota`, plus a **Copy details**
      button that calls `navigator.clipboard.writeText` with the result of
      `formatErrorReport(error)`).
- [ ] **Element 1 wire-up**:
      `apps/web/components/setup-form/SetupExperience.tsx` is a new `"use
      client"` component that owns the local state for the panel
      (`PanelState`), renders `<SetupForm onValid={handleSubmit} />`
      followed by `<PreviewPanel state={panelState} />`, and `handleSubmit`
      issues `fetch("/api/generate-initial-site", { method: "POST", body:
      JSON.stringify(values) })`. The page at
      `apps/web/app/(rmx)/setup/page.tsx` swaps its current
      `<SetupForm />` usage for `<SetupExperience />`. Ownership of
      `apps/web/app/(rmx)/setup/page.tsx` transfers from Sprint 2 to
      Sprint 4 for this single edit (record this in the Sprint Completion
      Report as a same-sprint scope expansion, not a Deviation, per the
      "ownership transfers" pattern used in Sprint 5b).
- [ ] **Type generation**: `apps/web/types/database.ts` is regenerated
      with `pnpm db:types` AFTER the migration is applied. The orchestrator
      and route handler import the `Database` type so the Supabase client
      is fully typed for the new `sites` / `site_versions` tables. Commit
      the regenerated `database.ts` as part of this sprint.
- [ ] **Tests — pure functions**: Vitest unit tests cover
      (a) `deriveSiteSlug` happy paths and edge cases (empty input,
      diacritics, very long input, all-non-ASCII input → fallback), (b)
      `buildInitialGenerationSystemPrompt` snapshot test asserting the
      output mentions every required clause from §9.2 plus the
      detail-pages amendment, (c) `categorizeAiError` mapping for each
      §9.6 category (network, timeout, auth, over_quota, invalid_output,
      operation_invalid, model_clarification — model_clarification is
      reachable when the JSON-validated response shape includes a
      `kind: "clarify"` field; for Sprint 4 the initial-generation
      response shape does not include clarifications, so this case is
      tested via direct construction), (d) `formatErrorReport` produces
      JSON parseable back to the same `AiError`.
- [ ] **Tests — orchestrator**: Vitest test for `generateInitialSite`
      using `vi.mock("@anthropic-ai/sdk")` to inject a stub that returns
      (i) a valid SiteConfig on first call → asserts `{ kind: "ok" }`,
      (ii) an invalid JSON on first call + a valid SiteConfig on retry →
      asserts retry happened and `{ kind: "ok" }`, (iii) invalid JSON
      twice → asserts `{ kind: "error", error.kind: "invalid_output" }`
      and the retry user-message contained "Your previous output failed
      validation", (iv) network error → asserts `{ kind: "error",
      error.kind: "network_error" }`, (v) HTTP 401 → `auth_error`, (vi)
      HTTP 429 → `over_quota`. Image attachment passing is covered: a
      call with 6 `inspirationImages` results in exactly 4 image content
      blocks in the request payload.
- [ ] **Tests — API route**: Vitest test for the route handler that
      mocks both the Anthropic SDK and the Supabase client (a
      `vi.mock("@/lib/supabase")` returning a fake builder), asserts
      (a) invalid form payload → 400, (b) valid payload + ok generation →
      200 with `{ siteId, slug, versionId, previewUrl }`, slug is unique
      (collision test inserts a pre-existing `aurora-cincy` row and
      verifies the next slug is `aurora-cincy-2`), (c) generation error →
      correct HTTP status and `{ error }` body.
- [ ] **Tests — UI**: React Testing Library tests for `LoadingNarration`
      (rotates messages on a fake timer; respects custom messages;
      cleans up interval on unmount) and `PreviewPanel` (each `state.kind`
      renders the right chrome and body; Retry button is present iff
      `error.kind` is retryable; Copy details copies the right blob using
      a stubbed `navigator.clipboard`).
- [ ] **Tests — `/preview` route**: Vitest test for the page component
      with mocked Supabase client: returns `notFound()` for missing site,
      returns `notFound()` for missing version, renders the `Renderer`
      with the parsed config and the requested `page` slug.
- [ ] **All pre-existing tests still pass.** No test renamed, deleted, or
      `.skip`'d. If a Sprint-2 setup-form test breaks because the page now
      mounts inside `<SetupExperience>` instead of directly, fix the test
      so it still asserts what it was asserting (and document the change
      in the Sprint Completion Report).
- [ ] `pnpm test` (from the repo root) passes with zero failures and
      zero skipped tests, except for the existing
      `describe.skipIf(skipIntegration)` blocks in `lib/rm-api/__tests__/`
      which remain conditional on Supabase env vars.
- [ ] `pnpm build` succeeds with zero TypeScript errors and zero warnings.
- [ ] `pnpm lint` (Biome) passes with zero warnings.
- [ ] `pnpm typecheck` (`tsc --noEmit` from `apps/web`) passes.
- [ ] No new dependencies added (the `@anthropic-ai/sdk` already pinned in
      `apps/web/package.json` is used as-is). Adding a dependency is a
      Deviation.
- [ ] No file outside the "Files you may create or modify" list is
      touched, with the explicit ownership transfer of
      `apps/web/app/(rmx)/setup/page.tsx` recorded above.
- [ ] `DECISIONS.md` is updated if any deviation was approved.
- [ ] Manual smoke test (numbered, click-by-click below) passes on a
      fresh `pnpm dev` with the user's real `ANTHROPIC_API_KEY` and
      hosted-Supabase env vars set.

## Files you may create or modify

Use the exact paths below. Anything not listed is forbidden — adding to
this list is a Deviation.

- `supabase/migrations/2026MMDDNNNNNN_create_sites_and_site_versions.sql`
  (new — exact ordinal determined at creation time per the pre-flight
  check rule).
- `apps/web/types/database.ts` (regenerated by `pnpm db:types` after the
  migration is pushed; commit the result).
- `apps/web/lib/ai/client.ts` (new).
- `apps/web/lib/ai/errors.ts` (new).
- `apps/web/lib/ai/slug.ts` (new).
- `apps/web/lib/ai/generate-initial-site.ts` (new).
- `apps/web/lib/ai/prompts/initial-generation.ts` (new).
- `apps/web/lib/ai/prompts/snippets/schema-prose.ts` (new).
- `apps/web/lib/ai/prompts/snippets/component-catalog.ts` (new).
- `apps/web/lib/ai/prompts/snippets/data-sources.ts` (new).
- `apps/web/lib/ai/__tests__/slug.test.ts` (new).
- `apps/web/lib/ai/__tests__/initial-generation.test.ts` (new — orchestrator
  + system-prompt snapshot).
- `apps/web/lib/ai/__tests__/errors.test.ts` (new).
- `apps/web/app/api/generate-initial-site/route.ts` (new).
- `apps/web/app/api/generate-initial-site/__tests__/route.test.ts` (new).
- `apps/web/app/[site]/preview/page.tsx` (new).
- `apps/web/app/[site]/preview/__tests__/page.test.tsx` (new).
- `apps/web/components/setup-form/LoadingNarration.tsx` (new).
- `apps/web/components/setup-form/PreviewPanel.tsx` (new).
- `apps/web/components/setup-form/SetupExperience.tsx` (new).
- `apps/web/components/setup-form/__tests__/loading-narration.test.tsx`
  (new).
- `apps/web/components/setup-form/__tests__/preview-panel.test.tsx` (new).
- `apps/web/components/setup-form/__tests__/setup-experience.test.tsx`
  (new).
- `apps/web/app/(rmx)/setup/page.tsx` (**ownership transfer from Sprint 2
  for this sprint** — the only change is replacing `<SetupForm />` with
  `<SetupExperience />` and updating any imports).
- `DECISIONS.md` (append-only; only if a deviation is approved).

## Files you MUST NOT modify

- `PROJECT_SPEC.md`.
- `docs/planning/SPRINT_SCHEDULE.md`, `docs/planning/Claude.md`,
  `docs/planning/BUNDLE_README.md`.
- The existing entries in `DECISIONS.md`.
- Any existing migration in `supabase/migrations/` (timestamp-prefixed
  immutability rule from the cross-sprint risk register).
- `supabase/seed.sql` — Sprint 4 does NOT seed sites or versions; the
  endpoint is the only writer.
- `apps/web/lib/site-config/**` — schema is locked since Sprint 3b. A
  schema change is a deviation.
- `apps/web/lib/setup-form/**`, `apps/web/components/setup-form/setup-form.tsx`
  and the existing per-section files (`brand-section.tsx`,
  `general-section.tsx`, `color-scheme-section.tsx`,
  `template-start-section.tsx`, `custom-instructions-section.tsx`,
  `advanced-section.tsx`) — Sprint 2-locked.
- `apps/web/components/site-components/**` — Sprint 3 / Sprint 5 / Sprint
  5b territory. Sprint 4 calls into the registry but never edits a
  component.
- `apps/web/components/renderer/**` — Sprint 3.
- `apps/web/components/rmx-shell/**`, `apps/web/lib/rm-api/**`,
  `apps/web/lib/supabase/**` — Sprint 1 / 1a / 1b / 1c.
- `apps/web/lib/storage/**` — Sprint 2c.
- `apps/web/app/dev/preview/**`, `apps/web/app/dev/components/**` — Sprint
  3 and Sprint 5b respectively.
- `apps/web/app/page.tsx`, `apps/web/app/layout.tsx`, `apps/web/app/globals.css`
  — Sprint 0 territory; not in scope here.
- `package.json`, `pnpm-lock.yaml`, `apps/web/package.json`,
  `apps/web/biome.json`, `apps/web/next.config.*`, `apps/web/tsconfig.json`,
  `apps/web/vitest.config.*`, `apps/web/playwright.config.ts` — toolchain
  is locked since Sprint 0; a change here is a Deviation.

## Coding standards (binding — copied from `PROJECT_SPEC.md` §15)

- TypeScript: `strict: true`, `noUncheckedIndexedAccess: true`,
  `noImplicitAny: true`. No `any`. If you reach for it, use `unknown` and
  narrow.
- Prefer types over interfaces unless extending.
- Branded types for IDs where helpful: `type SiteId = string & { __brand:
  "SiteId" }`. Sprint 4 introduces `SiteId` and `VersionId` as branded
  string aliases in `apps/web/lib/ai/types.ts` (or inline if not reused).
- React: Server components by default. `"use client"` only where needed.
  `LoadingNarration`, `PreviewPanel`, `SetupExperience` are client
  components (they use state and effects). The `/preview` route page is a
  server component; the `Renderer` it returns is already client-marked.
- One component per file. File name `kebab-case.tsx`; export name
  `PascalCase`. Match the existing per-section convention in
  `components/setup-form/`.
- API routes: `kebab-case` segments. `route.ts` exports `POST` as the
  handler. Use `runtime = "nodejs"`.
- Use `safeParse` + structured-error fallback in API code; never throw an
  uncategorized error to the client.
- No commented-out code; no `.skip` tests; no `TODO` without a sprint
  reference. `// TODO(sprint-14): per-site soft-limit per §9.9` is the
  acceptable shape.
- Match the existing in-file comment style (header comments explain
  *why*, not *what*; see `lib/supabase/service.ts` and
  `components/site-components/Form/index.tsx` for examples).

## Deviation Protocol (mandatory — do not modify)

If you (Claude Code) discover during this sprint that ANY part of the plan
cannot be implemented exactly as written, you MUST stop and emit a Deviation
Report in the format below. You MUST NOT proceed with an alternative until
the user has explicitly approved it with the words "Approved" or equivalent.

A "deviation" includes: missing/broken/incompatible libraries, impossible
function signatures, scope additions, file additions outside the declared
scope, test plans that cannot be executed as written, and any case where you
catch yourself thinking "I'll just do it slightly differently."

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

After emitting the report, STOP. Do not write code. Do not edit files. Wait.

### Approval handling

- "Approved" → implement the proposed alternative as written.
- "Approved with changes: [...]" → implement with the user's modifications.
- "Rejected — [direction]" → discard the proposal; follow the new direction.
- A clarifying question → answer it; do not start work yet.
- Anything else → ask "Is that an approval to proceed?" Do not assume.

After any approved deviation, append an entry to `/DECISIONS.md` with date,
sprint, what was changed, and the user's approval message verbatim.

## Definition of "done" gating

A sprint is not done until all of the following pass with zero warnings:

- `pnpm test` (root) — Vitest, all suites green, no skipped tests beyond
  the existing `skipIf(skipIntegration)` rm-api integration blocks.
- `pnpm build` (root) — Next.js production build, zero TypeScript errors,
  zero warnings.
- `pnpm lint` (root) — Biome check, zero warnings.
- `pnpm typecheck` (`pnpm --filter web typecheck`) — `tsc --noEmit`, no
  errors.
- The manual smoke test below passes against a fresh `pnpm dev` with all
  five env vars set in `apps/web/.env.local`.

If any of those fails, treat it as a Deviation. Do not commit. Do not
declare the sprint complete.

## Manual smoke test (numbered, click-by-click)

Prerequisites: `apps/web/.env.local` is populated with
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF`, `ANTHROPIC_API_KEY`;
the hosted Supabase project is linked (`supabase link --project-ref ...`);
`pnpm db:push` has been run after the new migration was committed.

1. From the repo root, run `pnpm dev`. Wait for the "Ready" line.
2. Open a fresh browser tab at `http://localhost:3000/setup`. Confirm the
   RMX shell renders and the setup form is visible.
3. Confirm the **PreviewPanel** is visible below (or beside) the form,
   showing the empty state: file icon and the §7.3 hint copy
   ("Fill in your details above to see a live preview of your site.").
4. In the form, type `Aurora Property Group` into the Company Name field.
5. Click the **Ocean** palette card.
6. Click **Save**. Confirm Save was enabled before clicking (it should
   become enabled the moment both required fields are valid).
7. Within 1–2 seconds, the PreviewPanel transitions to the **generating**
   state. Confirm the LoadingNarration is visible and the first message
   reads `Reading your brand details…`.
8. Watch the narration rotate. Confirm at least three different §9.5
   strings appear over the next 10 seconds.
9. Within ~30 seconds, the PreviewPanel transitions to the **generated**
   state. Confirm:
    - The fake browser URL field shows `https://www.aurora-property-group.com`
      (or whatever slug the deriver produced — record the actual slug).
    - The pill on the right says **Live** (or **Pending** flipping to
      **Live**).
    - The iframe loads and the rendered site shows the company name,
      uses Ocean palette colors, and contains at least one Section.
10. Open the browser DevTools Network tab. Confirm the POST to
    `/api/generate-initial-site` returned 200 with a JSON body containing
    `siteId`, `slug`, `versionId`, and `previewUrl`. Confirm there is no
    occurrence of `ANTHROPIC_API_KEY` or any `sk-ant-` substring in any
    response body.
11. Open the iframe URL directly in a new tab
    (`http://localhost:3000/{slug}/preview?v={versionId}`). Confirm the
    page renders the same content (no edit chrome).
12. Open `http://localhost:3000/{slug}/preview` (no `?v=`). Confirm the
    same site renders (resolved to the working version).
13. Open `http://localhost:3000/no-such-site/preview`. Confirm Next.js
    returns the 404 page.
14. In Supabase Studio (or a SQL prompt against the linked project), run
    `select id, slug, name from sites order by created_at desc limit 1;`
    and `select id, site_id, source, created_by, is_working, is_deployed
    from site_versions where site_id = '<the new id>';`. Confirm one
    site row, one version row, `source = 'initial_generation'`,
    `created_by = 'ai'`, `is_working = true`, `is_deployed = false`.
15. **Error path — invalid key.** Stop the dev server. Set
    `ANTHROPIC_API_KEY=invalid` in `apps/web/.env.local`. Restart `pnpm
    dev`. Repeat steps 4–6. Confirm the PreviewPanel transitions to the
    **error** state with the §9.6 `auth_error` user-facing copy
    ("Service unavailable, please try again later.") and a **Copy
    details** button that copies a JSON blob containing
    `"kind":"auth_error"` to clipboard. Restore the real key when done.
16. **Error path — network outage.** With the real key restored,
    disconnect from the network (or block `api.anthropic.com` via
    /etc/hosts), repeat steps 4–6, and confirm the **error** state shows
    the `network_error` copy and a **Retry** button. Reconnect and
    confirm the Retry succeeds.
17. **Detail-page presence.** In the SiteConfig stored in `site_versions`
    (run `select config from site_versions where id = '<the new id>';`
    and inspect the JSON), confirm at least one page has `kind: "detail"`
    with a valid `detailDataSource`, OR — if no Repeater of properties or
    units appeared in the generation — confirm there are no Repeaters of
    those types either. Either branch is valid; the assertion is the
    invariant from the system-prompt clause (k).

If any step fails, treat it as a Deviation.

## Useful local commands

- `pnpm dev` — local dev server.
- `pnpm test` — Vitest run.
- `pnpm test:watch` (from `apps/web`) — Vitest watch.
- `pnpm test:e2e` — Playwright; not used by Sprint 4.
- `pnpm build` — Next.js production build.
- `pnpm lint` — Biome check.
- `pnpm typecheck` — `tsc --noEmit`.
- `pnpm db:push` — push pending migrations to the linked hosted Supabase
  project.
- `pnpm db:types` — regenerate `apps/web/types/database.ts` from the
  linked project's schema.
- `pnpm seed` — re-seed Supabase mock data (Sprint 1c). Sprint 4 does not
  re-seed.

## Known risks & failure modes

- **Anthropic SDK version drift.** The pinned `@anthropic-ai/sdk@0.91.1`
  may have a different content-block shape than older snippets you've
  seen. Trust the SDK's published types over memory: pass image inputs
  as `{ type: "image", source: { type: "url", url } }`. If the runtime
  rejects URL sources, that is a Deviation — do **not** silently swap to
  base64 fetch+upload without approval (it has cost and latency
  consequences for the demo).
- **Streaming vs. one-shot.** The §9.7 spec implies a one-shot
  `messages.create({ stream: false })` call. Do not stream. Streaming
  changes the response-handling code path and the test surface; it's a
  Deviation if you pull it in.
- **JSON-mode availability.** If the SDK exposes a strict-JSON output
  mode for the chosen model, prefer it. If not, the prompt's "no prose,
  no markdown fences" instruction plus the orchestrator's fence-stripping
  + `safeParseSiteConfig` validation is the contract. Do not invent a
  tool-use path — that's a Deviation.
- **Slug collisions and case folding.** The unique constraint on
  `sites.slug` will surface as a 23505 error from Postgres if
  `ensureUniqueSlug` has a TOCTOU race (two simultaneous requests pick
  the same suffix). For the demo this is acceptable; document the race
  in a comment and surface it as `auth_error` (catch-all) if it occurs.
- **`@/` path alias from `app/api/...`.** The route handler must use the
  configured `@/` alias for `lib/ai`, `lib/supabase`, etc. The Sprint 0
  `tsconfig.json` already aliases `@/*` to `apps/web/*` (or
  `apps/web/src/*` — verify before importing). If the alias does not
  resolve from inside `app/api/`, that's a Deviation; do not work around
  it with relative paths.
- **`searchParams` typing in Next.js 15.** In App Router, page components
  receive `searchParams` as a `Promise<Record<string, string | string[]
  | undefined>>`. Await it before reading. The route handler reads
  `request.nextUrl.searchParams` which is sync.
- **Test environment for the API route.** Vitest runs in jsdom by
  default; the route test should add `// @vitest-environment node` at
  the top, mirroring the rm-api integration tests. Mocks use `vi.mock`
  hoisting — declare the Anthropic and Supabase mocks at the top of the
  test file.
- **`navigator.clipboard` in jsdom.** `navigator.clipboard.writeText` is
  not implemented in jsdom by default. Stub it in the test setup with
  `Object.assign(navigator, { clipboard: { writeText: vi.fn() } })`
  before mounting the component.
- **Render output cap.** Cap component count at 40 per page in the
  prompt as required by §9.2; if Claude returns more, validate but do
  not auto-truncate. The `siteConfigSchema` does not enforce 40-per-page;
  this is a soft suggestion from the prompt. Sprint 4 does not need to
  add a hard schema-level cap.
- **`SetupForm` test mocks.** The Sprint 2 setup-form test for the
  default Save handler (the one that asserts the "Sprint 4 will wire
  the API" toast) will start to fail once `SetupExperience` is mounted
  on `/setup`. The test exercises `<SetupForm />` directly so it is
  independent of `/setup`'s wrapper — it will continue to pass. Do not
  change that test.

## Notes & hints (non-binding)

- The `@anthropic-ai/sdk` exposes `Anthropic.HUMAN_PROMPT` constants and
  a `messages.create()` method. Sample call shape (verify against the
  installed types before relying on this):
  ```ts
  const client = createAnthropicClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 16000,
    temperature: 0.4,
    system: systemPrompt,
    messages: [{ role: "user", content: [
      { type: "text", text: userInstruction },
      ...images.map((img) => ({ type: "image" as const, source: { type: "url" as const, url: img.url } })),
    ]}],
  });
  ```
- For the system-prompt assembly, prefer one large template-literal in
  `initial-generation.ts` that calls into the snippet modules. Keep each
  snippet under ~100 lines; the prompt will end up around 3–6 KB.
- The `data-sources.ts` snippet should describe `properties`, `units`,
  `units_with_property` (joined view — for Sprint 4's prompt we describe
  it as a virtual data source even though the editor materializes it in
  Sprint 9), and `company` (single — disables repeating).
- Lucide icons available: `lucide-react` is already pinned. Use
  `<File />` for the empty-state file icon, `<Loader2 className="animate-spin" />`
  if you want a small spinner inside the LoadingNarration, `<Copy />` for
  the Copy details button, `<RotateCcw />` for the Retry button.
- For the iframe, set `sandbox="allow-scripts allow-same-origin"` so the
  rendered React app inside `/preview` can hydrate. Set
  `loading="eager"`.
- For `setup-experience.tsx`, the simplest state is:
  ```ts
  type PanelState =
    | { kind: "empty" }
    | { kind: "generating" }
    | { kind: "generated"; previewUrl: string; siteSlug: string }
    | { kind: "error"; error: AiError };
  ```
  Use `useState<PanelState>({ kind: "empty" })` and update it in
  `handleSubmit`.
- For the `/preview` route, pass `searchParams.page` through unchanged
  if present, else default `"home"`. The `Renderer` returns "Page not
  found" for any unrecognized slug — that's intentional behavior, not a
  Sprint-4 bug.

## Sprint Completion Report (emit verbatim when finished)

```
✅ SPRINT 4 COMPLETE

Definition of Done:
- [x] Migration: supabase/migrations/2026MMDDNNNNNN_create_sites_and_site_versions.sql
- [x] Anthropic client wrapper: apps/web/lib/ai/client.ts
- [x] System-prompt builder: apps/web/lib/ai/prompts/initial-generation.ts
- [x] Generation orchestrator: apps/web/lib/ai/generate-initial-site.ts
- [x] Error categorizer: apps/web/lib/ai/errors.ts
- [x] API route: apps/web/app/api/generate-initial-site/route.ts
- [x] Slug generator: apps/web/lib/ai/slug.ts
- [x] /{site}/preview route: apps/web/app/[site]/preview/page.tsx
- [x] LoadingNarration component
- [x] PreviewPanel component
- [x] Element 1 wire-up: SetupExperience + setup/page.tsx edit
- [x] Type generation: apps/web/types/database.ts regenerated
- [x] Tests — pure functions, orchestrator, API route, UI, /preview route
- [x] All pre-existing tests still pass
- [x] pnpm test passes
- [x] pnpm build succeeds
- [x] pnpm lint passes
- [x] pnpm typecheck passes
- [x] No new dependencies
- [x] No files outside scope (with the recorded ownership transfer)
- [x] DECISIONS.md updated if any deviation was approved
- [x] Manual smoke test: PASS

Files created:
- supabase/migrations/2026MMDDNNNNNN_create_sites_and_site_versions.sql (X lines)
- apps/web/lib/ai/client.ts (X lines)
- apps/web/lib/ai/errors.ts (X lines)
- apps/web/lib/ai/slug.ts (X lines)
- apps/web/lib/ai/generate-initial-site.ts (X lines)
- apps/web/lib/ai/prompts/initial-generation.ts (X lines)
- apps/web/lib/ai/prompts/snippets/schema-prose.ts (X lines)
- apps/web/lib/ai/prompts/snippets/component-catalog.ts (X lines)
- apps/web/lib/ai/prompts/snippets/data-sources.ts (X lines)
- apps/web/lib/ai/__tests__/slug.test.ts (X lines)
- apps/web/lib/ai/__tests__/initial-generation.test.ts (X lines)
- apps/web/lib/ai/__tests__/errors.test.ts (X lines)
- apps/web/app/api/generate-initial-site/route.ts (X lines)
- apps/web/app/api/generate-initial-site/__tests__/route.test.ts (X lines)
- apps/web/app/[site]/preview/page.tsx (X lines)
- apps/web/app/[site]/preview/__tests__/page.test.tsx (X lines)
- apps/web/components/setup-form/LoadingNarration.tsx (X lines)
- apps/web/components/setup-form/PreviewPanel.tsx (X lines)
- apps/web/components/setup-form/SetupExperience.tsx (X lines)
- apps/web/components/setup-form/__tests__/loading-narration.test.tsx (X lines)
- apps/web/components/setup-form/__tests__/preview-panel.test.tsx (X lines)
- apps/web/components/setup-form/__tests__/setup-experience.test.tsx (X lines)

Files modified:
- apps/web/app/(rmx)/setup/page.tsx (+A −B)         [Sprint-2 ownership transferred for this edit only]
- apps/web/types/database.ts (+A −B)                [regenerated by pnpm db:types]
- DECISIONS.md (+A −0)                              [only if a deviation was approved]

Tests added: N (all passing)
Test command output: [paste last 5 lines of pnpm test]
Build output: [paste the "Compiled successfully" / "✓ Compiled" line]

Deviations approved during sprint: [list, or "None"]

Manual smoke test result: [PASS / FAIL with details]

External Actions Required (for the user):
- Confirm `ANTHROPIC_API_KEY` is set in `apps/web/.env.local`. Get one
  from <https://console.anthropic.com> if you haven't.
- Run `pnpm db:push` to apply the new migration to the linked hosted
  Supabase project.
- Run `pnpm db:types` to refresh the typed Supabase client (already done
  by Claude Code; re-run if Claude Code couldn't reach the project from
  its sandbox).
- Verify the new `sites` and `site_versions` tables exist in Supabase
  Studio.
- (Optional) In Supabase Studio, confirm the permissive RLS policies on
  the new tables — they should match the `rm_*` migrations' pattern.

Recommended next steps: Sprint 6 (Element 2 layout shell). Per
`docs/planning/SPRINT_SCHEDULE.md` recommended order
(`… → 5 → 4 → 6 → …`), Sprint 6 is the next step. Sprints 5 components are
already in the registry from earlier work.
```