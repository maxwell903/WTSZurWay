# CLAUDE.md — Sprint 14: Demo fallback fixtures

> Drop this file at the repo root in place of (or alongside) the master
> `CLAUDE.md` for the duration of Sprint 14. Restore the master afterwards.
> The repo root must also contain `PROJECT_SPEC.md` and `DECISIONS.md`.

---

## Mission

Build the demo safety net per `PROJECT_SPEC.md` §9.10. After Sprint 14, both
AI surfaces (`/api/generate-initial-site` and `/api/ai-edit`) silently fall
back to a pre-recorded fixture from a new `demo_fixtures` table when the
live Anthropic call fails. The user never sees a stage-time AI outage; the
demo flow continues with a known-good response. In dev mode only, an
`x-ai-source: live | fixture` response header surfaces which path served
the request, and three UI surfaces (PreviewPanel pill, Element 1
AdjustmentChat per-turn badge, Element 2 right-sidebar AI chat per-turn
badge) render a discreet `[live]` / `[fixture]` indicator. The sprint also
ships the `pnpm record-fixtures` script that captures canonical demo
prompts against the live API into the table, and resolves Sprint 4's
TODO for the §9.9 generation soft-limit (20 globally, mirroring Sprint
11's per-site `200` for edits).

This sprint must also satisfy the `SPRINT_SCHEDULE.md` Sprint 14
detail-pages amendment: the recorded canonical fixtures MUST include at
least one detail page in the initial-generation fixture, and at least
one ai-edit fixture whose operations exercise `setLinkMode` /
`setDetailPageSlug` (`PROJECT_SPEC.md` §8.12).

This sprint does NOT change the response body shape of either endpoint,
does NOT touch the §9.6 user-facing error copy, does NOT add Accept /
Discard semantics anywhere, and does NOT modify `lib/site-config/`,
`lib/setup-form/`, the renderer, or any site-component. If you find
yourself reaching into any of those, that is a Deviation — emit a
Deviation Report.

## Spec sections in scope

- `PROJECT_SPEC.md` §9.6 — AI error envelope. The fallback path
  PRESERVES this contract: when a fixture is found, the route returns
  the same success body shape as a live success (no fixture flag in
  the body); when no fixture is found, the route returns the same
  `{ error: AiError }` envelope it would have returned without the
  fallback wrap. Read-only.
- `PROJECT_SPEC.md` §9.7 — Model and API parameters. Read-only —
  Sprint 14 does not change `claude-sonnet-4-5`, `max_tokens`,
  `temperature`, or the single-retry policy. Sprint 14 wraps the
  orchestrator after its own retries have been exhausted.
- `PROJECT_SPEC.md` §9.8 — Image attachments. Read-only — fixtures
  are keyed on text-only canonical inputs; image attachments are
  excluded from the hash so the same prompt with or without
  inspiration screenshots resolves to the same fixture.
- `PROJECT_SPEC.md` §9.9 — Cost guardrails. Sprint 14 owns the
  generation soft-limit (20 globally) by adding a head-only count
  guard inside `generateInitialSite` mirroring Sprint 11's edit
  guard pattern. The 200-edits-per-site guard is already shipped by
  Sprint 11 and is left untouched.
- `PROJECT_SPEC.md` §9.10 — Demo fallback. Authoritative — this is
  what Sprint 14 implements. Re-read in full before touching code.
- `PROJECT_SPEC.md` §11 — `SiteConfig` schema (read-only — fixtures
  store complete `SiteConfig` JSON; the recording script validates
  every captured generation through `safeParseSiteConfig` before
  inserting).
- `PROJECT_SPEC.md` §12 — Database schema. The `demo_fixtures` DDL is
  specified verbatim there. Sprint 14 implements it in a migration
  with the exact column shape; no additions, no renames.
- `PROJECT_SPEC.md` §13.2 — Demo script. The canonical prompts in
  `lib/ai/fixtures-canonical.ts` MUST mirror what the demo runner will
  type on stage so the fixtures actually match real demo inputs.
- `PROJECT_SPEC.md` §15 — Coding standards (binding — see §"Coding
  standards" below).
- `PROJECT_SPEC.md` §16.1 — File scope declarations.

## Authorized scope expansion (read carefully)

`SPRINT_SCHEDULE.md`'s short owned-list for Sprint 14 is
`supabase/migrations/00X_demo_fixtures.sql` + `apps/web/lib/ai/fixtures.ts`
+ "additions to AI endpoints". The Sprint Architect expanded that list
during planning to include all of the following, each justified inline:

1. `apps/web/lib/ai/generate-initial-site.ts` (Sprint 4 territory) —
   MODIFY. The orchestrator gets two additive surgical changes: (a)
   the §9.9 generation soft-limit guard at the top of the function,
   and (b) a `try { ... } catch` wrap around its `messages.create` call
   path so the existing AiError return becomes a fixture-fallback
   return when a fixture is found. The function's existing happy path
   is not reordered, the existing retry logic is not rewritten, and
   the public type signature is unchanged.

2. `apps/web/lib/ai/ai-edit.ts` (Sprint 11 territory) — MODIFY. Same
   pattern as (1) without the §9.9 guard (Sprint 11 owns the edit
   guard at the route layer). The orchestrator's existing happy path,
   retry logic, and public type signature are unchanged.

3. `apps/web/app/api/generate-initial-site/route.ts` (Sprint 4
   territory) — MODIFY. Two additive lines: read the `source` flag
   from a new field on `GenerateInitialSiteResult`, set the
   `x-ai-source` response header on the 200 path. The error path is
   unchanged.

4. `apps/web/app/api/ai-edit/route.ts` (Sprint 11 territory) — MODIFY.
   Same as (3): read the `source` flag from `AiEditResult`, set the
   `x-ai-source` response header on every non-error 200 path
   (including the `clarify` path, which is also served from a live
   call when working).

5. `apps/web/components/setup-form/PreviewPanel.tsx` (Sprint 4 / 12
   territory) — MODIFY. Extend `PanelState["generated"]` with a new
   optional `aiSource?: "live" | "fixture"` field; render a discreet
   per-pill badge only when `process.env.NODE_ENV !== "production"`
   AND the field is set. No layout changes, no copy changes, no
   removal of existing elements.

6. `apps/web/components/setup-form/SetupExperience.tsx` (Sprint 4 /
   12 territory) — MODIFY. Read the `x-ai-source` header from the
   `/api/generate-initial-site` response and forward it into the new
   `PanelState["generated"].aiSource` field.

7. `apps/web/components/setup-form/AdjustmentChat.tsx` (Sprint 12
   territory) — MODIFY. Read the `x-ai-source` header from the
   `/api/ai-edit` response on each successful turn; render a discreet
   per-turn badge only in dev mode.

8. `apps/web/components/editor/ai-chat/useAiEditChat.ts` (Sprint 11
   territory) — MODIFY. Read the `x-ai-source` header on each
   successful turn and stash it on the assistant `Message`.

9. `apps/web/components/editor/ai-chat/<minimal renderer change>`
   (Sprint 11 territory) — MODIFY. The chat's assistant-turn renderer
   gets a dev-only badge driven by the new `Message.aiSource` field.
   Pick the smallest existing component that owns the assistant-turn
   layout (likely `MessageList.tsx` or equivalent — view first, then
   add the badge inside the existing element tree without restructuring).

10. `apps/web/types/database.ts` — MODIFY. The `demo_fixtures` table
    type is appended to the `Database["public"]["Tables"]` block in
    the same hand-written shape used by the existing entries. The
    Sprint 4 / Sprint 10 entries above it stay byte-for-byte unchanged.

11. `package.json` (repo root) — MODIFY. Add the `record-fixtures`
    script entry: `"record-fixtures": "tsx
    apps/web/scripts/record-fixtures.ts"`. Add `tsx` to
    `devDependencies`. Both additions are pre-authorized — DO NOT
    raise a Deviation for them.

12. `apps/web/scripts/record-fixtures.ts` — NEW. The recording script
    described in `SPRINT_SCHEDULE.md` Sprint 14 owned list. Reads the
    canonical inputs from `lib/ai/fixtures-canonical.ts`, calls each
    live orchestrator with each input, validates every generation
    response through `safeParseSiteConfig`, validates every ai-edit
    response through `aiEditResponseSchema` (importable via
    `_internal` from `lib/ai/ai-edit.ts` if exposed; otherwise import
    from `lib/site-config/ops.ts` for `Operation`), and UPSERTs the
    captured response into `demo_fixtures`.

13. `apps/web/lib/ai/fixtures-canonical.ts` — NEW. Exports
    `CANONICAL_GENERATION_INPUTS` and `CANONICAL_AI_EDIT_INPUTS`
    (constants, see "Canonical inputs" below). Imported by both
    `fixtures.ts` and `record-fixtures.ts`.

14. Test files for everything created or modified above (see "Files
    you may create or modify" below for the explicit list).

If a path you need to touch is NOT in this list and is NOT a §15.9
surgical inherited-test-file fix, STOP and emit a Deviation Report.

## Definition of Done

- [ ] **DoD-1.** A new migration file
      `supabase/migrations/<timestamp>_create_demo_fixtures.sql`
      exists. The timestamp is greater than every existing migration
      timestamp (use the largest existing prefix `20260426000010` and
      pick a value strictly larger — e.g.
      `20260427000001_create_demo_fixtures.sql`). The migration body
      creates the `demo_fixtures` table EXACTLY as specified in
      `PROJECT_SPEC.md` §12 (six columns: `id bigserial primary key`,
      `surface text not null`, `input_hash text not null`, `response
      jsonb not null`, `created_at timestamptz default now()`, plus
      one additional index on `(surface, input_hash)` for the
      head-only fast lookup the fallback uses). The migration also
      enables RLS with a single permissive `using (true) with check
      (true)` policy named `"demo_fixtures demo full access"`,
      mirroring the Sprint 4 / 10 pattern. No additional columns. No
      additional triggers.
- [ ] **DoD-2.** `apps/web/types/database.ts` has a new
      `demo_fixtures` entry under `Database["public"]["Tables"]` with
      `Row`, `Insert`, `Update`, and `Relationships: []` blocks
      mirroring the existing `form_submissions` entry shape. The
      Sprint 4 / Sprint 10 entries above it are byte-for-byte
      unchanged.
- [ ] **DoD-3.** A new module `apps/web/lib/ai/fixtures.ts` exports:
      (a) a `hashGenerationInput(form: SetupFormValues): string`
      function — SHA256 hex of the canonical-normalized JSON described
      in "Canonical hashing" below; (b) a
      `hashAiEditInput(input: AiEditInput): string` function — SHA256
      hex of the canonical-normalized JSON described in "Canonical
      hashing" below; (c) a
      `lookupGenerationFixture(form: SetupFormValues): Promise<SiteConfig | null>`
      function that head-queries `demo_fixtures` by
      `surface = "initial_generation"` and the matching hash, returns
      the parsed-validated `SiteConfig` on hit, returns `null` on
      miss or invalid stored JSON; (d) a
      `lookupAiEditFixture(input: AiEditInput): Promise<AiEditResult | null>`
      function with the analogous behavior for
      `surface = "ai_edit"` (returns `{ kind: "ok", ... }` or
      `{ kind: "clarify", ... }`); (e)
      `recordGenerationFixture(form, config): Promise<void>` and
      `recordAiEditFixture(input, result): Promise<void>` UPSERTs
      keyed on `(surface, input_hash)` (use Supabase's `upsert(...,
      { onConflict: "surface,input_hash" })` after the migration
      adds a unique constraint on that pair — add it inside the
      same migration).
- [ ] **DoD-4.** A new module
      `apps/web/lib/ai/fixtures-canonical.ts` exports two named const
      arrays: `CANONICAL_GENERATION_INPUTS: SetupFormValues[]` (length
      ≥ 1, MUST include the Aurora Cincy demo-script payload from
      `PROJECT_SPEC.md` §13.4) and
      `CANONICAL_AI_EDIT_INPUTS: { siteId: string; currentVersionId:
      string; prompt: string; selection: AiEditSelection | null }[]`
      (length ≥ 2; AT LEAST ONE input MUST be a prompt that the
      Sprint 11 system prompt would translate into a `setLinkMode` and
      a `setDetailPageSlug` operation — for instance
      `"Make each unit card link to a unit detail page so visitors
      can click into a unit."`). Both arrays are read-only — no
      runtime mutation.
- [ ] **DoD-5.** `apps/web/lib/ai/generate-initial-site.ts` is updated
      so `generateInitialSite` (a) BEFORE calling
      `client.messages.create`, head-counts `site_versions` where
      `source = 'initial_generation'` GLOBALLY (no `.eq("site_id",
      ...)` filter — see "§9.9 generation soft-limit interpretation"
      below); when the count is ≥ 20, returns the SAME
      `{ kind: "error", error: { kind: "over_quota", message: "Demo
      generation limit reached." } }` shape Sprint 11 returns for
      edits; (b) on every error path that previously returned
      `{ kind: "error", error }`, instead first calls
      `lookupGenerationFixture(input.form)`. If it returns a config,
      return `{ kind: "ok", config, source: "fixture" }`. If it
      returns null, return the original `{ kind: "error", error,
      source: "live" }`. (c) On the live success path, return
      `{ kind: "ok", config, source: "live" }`. The `GenerateInitial-
      SiteResult` type gains a non-optional `source: "live" |
      "fixture"` field on the `ok` variant; the `error` variant gains
      a non-optional `source: "live" | "fixture"` field too (a fixture
      lookup that ALSO failed is still `source: "live"` because no
      fixture served the call). Sprint 4's existing tests are
      preserved verbatim except where an exact-equality assertion
      tightens after the type widens — narrow the assertion in place
      with the new field rather than rewriting the test body.
- [ ] **DoD-6.** `apps/web/lib/ai/ai-edit.ts` mirrors DoD-5's pattern
      WITHOUT the §9.9 guard (the per-site edit cap stays at the
      route in `apps/web/app/api/ai-edit/route.ts`). `AiEditResult`'s
      `ok`, `clarify`, and `error` variants each gain
      `source: "live" | "fixture"`. The fallback returns the parsed
      stored result with `source: "fixture"`. Sprint 11's existing
      tests are preserved verbatim except for tightening exact-
      equality assertions in place.
- [ ] **DoD-7.** `apps/web/app/api/generate-initial-site/route.ts`
      reads the `source` field from `GenerateInitialSiteResult` on
      success and sets `x-ai-source: live` or `x-ai-source: fixture`
      on the 200 response — but ONLY when
      `process.env.NODE_ENV !== "production"`. In production the
      header is omitted entirely. The route's existing 200 body
      shape, error envelope, and HTTP status policy are unchanged.
- [ ] **DoD-8.** `apps/web/app/api/ai-edit/route.ts` mirrors DoD-7
      for the `kind: "ok"` AND `kind: "clarify"` 200 paths. The
      pre-existing `applyOperations` dry-run block is unchanged. The
      existing per-site 200-edit guard is preserved verbatim.
- [ ] **DoD-9.** `apps/web/components/setup-form/PreviewPanel.tsx`
      `PanelState["generated"]` gains an optional
      `aiSource?: "live" | "fixture"` field. When
      `process.env.NODE_ENV !== "production"` AND the field is set,
      the header bar renders a small `data-testid="preview-panel-
      ai-source"` element next to the existing pill containing the
      literal string `[live]` or `[fixture]` (square brackets
      included; lowercase). In production builds the element is not
      rendered. No other layout, copy, or DOM changes.
- [ ] **DoD-10.** `apps/web/components/setup-form/SetupExperience.tsx`
      reads `response.headers.get("x-ai-source")` from the
      `/api/generate-initial-site` 200 response and forwards the
      value (narrowed to `"live" | "fixture" | undefined`) into
      `PanelState["generated"].aiSource`. The existing
      `extractError`, `lastPayload`, retry path, and form wiring are
      unchanged.
- [ ] **DoD-11.** `apps/web/components/setup-form/AdjustmentChat.tsx`
      reads `response.headers.get("x-ai-source")` on each successful
      `/api/ai-edit` response. The header value is stashed on the
      assistant turn (extend the existing `Turn` type or analogous
      structure with `aiSource?: "live" | "fixture"`). When
      `process.env.NODE_ENV !== "production"` AND the value is set,
      a `data-testid="adjustment-chat-turn-ai-source"` element renders
      inline with the assistant turn (next to or under the summary /
      clarify text) containing the literal `[live]` or `[fixture]`.
      Production omits the element. The existing turn rendering,
      attachment validation, and PATCH wiring are unchanged.
- [ ] **DoD-12.** `apps/web/components/editor/ai-chat/useAiEditChat.ts`
      reads `response.headers.get("x-ai-source")` on each successful
      `/api/ai-edit` response and stashes it on the assistant
      `Message`. Extend the `AssistantOkMessage`,
      `AssistantClarifyMessage`, and `AssistantErrorMessage` types in
      `apps/web/components/editor/ai-chat/types.ts` with an optional
      `aiSource?: "live" | "fixture"` field. The error message gets
      `aiSource: "live"` (a fixture by definition didn't serve a
      failure).
- [ ] **DoD-13.** The smallest existing assistant-turn renderer in
      `apps/web/components/editor/ai-chat/` (view the directory before
      editing — likely `MessageList.tsx`, `Transcript.tsx`, or a
      similarly-named component) renders a
      `data-testid="ai-chat-turn-ai-source"` element next to the
      assistant turn body in dev mode only, containing `[live]` or
      `[fixture]`. The existing chip / suggested-prompts / accept-
      discard wiring is unchanged.
- [ ] **DoD-14.** `apps/web/scripts/record-fixtures.ts` exists and is
      executable via `pnpm record-fixtures`. The script:
      (a) Loads env via `dotenv` from `apps/web/.env.local`. If any
      required key is missing, prints a numbered checklist of missing
      vars and exits with code 1.
      (b) Iterates `CANONICAL_GENERATION_INPUTS` and
      `CANONICAL_AI_EDIT_INPUTS`. For each: calls the live
      orchestrator (`generateInitialSite` / `aiEdit`) with a fresh
      Anthropic client. For ai-edit inputs: looks up the working-
      version `SiteConfig` from `site_versions` first using the
      input's `siteId` and `currentVersionId`, fails the input with a
      clear error if not found, otherwise passes the parsed config
      into `aiEdit`. (Until at least one site exists in the linked DB,
      the canonical ai-edit inputs reference that site's id and
      working-version id; documenting the prerequisite in the script's
      header comment is required.)
      (c) Validates every generation response through
      `safeParseSiteConfig`. Bails on the input with a clear error if
      validation fails. Validates every ai-edit response is an
      `AiEditOk` or `AiEditClarify` shape (errors aren't recorded as
      fixtures — fixtures are known-good responses).
      (d) UPSERTs into `demo_fixtures` via
      `recordGenerationFixture` / `recordAiEditFixture`. Logs a
      one-line `[ok] surface=initial_generation hash=…` per record.
      (e) On exit prints a summary line:
      `Recorded N generation fixtures, M ai-edit fixtures.`
      (f) Exits 0 on full success, 1 on any input failure (after
      printing every failure).
- [ ] **DoD-15.** `package.json` at the repo root has a new
      `record-fixtures` script entry, `tsx` is in `devDependencies`,
      and `pnpm install` from a clean `node_modules/` succeeds. No
      other dependencies are added; no other scripts are renamed or
      removed.
- [ ] **DoD-16.** Vitest unit tests exist for:
      (a) `lib/ai/__tests__/fixtures.test.ts` — at minimum: hash is
      stable across runs (same input → same hex string); hash differs
      across normalized-different inputs; image-attachment URL
      changes do NOT change the generation hash; non-relevant fields
      (e.g. social URLs, advanced fields) do NOT change the
      generation hash; lookup returns null on miss; lookup returns
      parsed `SiteConfig` on hit; lookup returns null on hit-with-
      invalid-stored-JSON. ≥ 8 tests.
      (b) `lib/ai/__tests__/generate-initial-site.test.ts` (existing
      file — APPEND, do not overwrite) — at minimum: cap reached
      (count = 20) yields `over_quota` without calling
      `messages.create`; live success returns `source: "live"`; live
      error WITH a fixture returns `{ kind: "ok", source: "fixture" }`
      and the fixture config; live error WITHOUT a fixture returns
      `{ kind: "error", source: "live" }`. ≥ 4 new tests.
      (c) `lib/ai/__tests__/ai-edit.test.ts` (existing file —
      APPEND) — at minimum: live success returns `source: "live"`;
      live error WITH a fixture returns `{ kind: "ok" / "clarify",
      source: "fixture" }`; live error WITHOUT a fixture returns
      `{ kind: "error", source: "live" }`. ≥ 3 new tests.
      (d) `apps/web/app/api/generate-initial-site/__tests__/route.test.ts`
      (existing file — APPEND) — `x-ai-source` header is set when
      NODE_ENV is "development" / "test" and orchestrator returned
      `source: "live"`; same for `source: "fixture"`; header is
      ABSENT when NODE_ENV is "production". ≥ 3 new tests.
      (e) `apps/web/app/api/ai-edit/__tests__/route.test.ts`
      (existing file — APPEND) — same three cases for both `ok` and
      `clarify` body shapes. ≥ 3 new tests.
      (f) `apps/web/components/setup-form/__tests__/preview-panel.test.tsx`
      (existing file — APPEND) — badge renders when
      `aiSource: "fixture"` and NODE_ENV is "test"; badge does NOT
      render when `aiSource` is undefined; badge does NOT render
      when NODE_ENV is "production" (use `vi.stubEnv("NODE_ENV",
      "production")` then `vi.unstubAllEnvs()` in afterEach). ≥ 3
      new tests.
      (g) `apps/web/components/setup-form/__tests__/adjustment-chat.test.tsx`
      (existing file — APPEND) — assistant-turn badge renders in
      test-env when the `x-ai-source` header is `"fixture"`. ≥ 1
      new test.
      (h) `apps/web/components/editor/ai-chat/__tests__/<existing>.test.tsx`
      (existing files — APPEND or add a new sibling test file in the
      same directory if there isn't an obvious place) — assistant-
      turn badge renders in test-env when the header is `"fixture"`.
      ≥ 1 new test.
- [ ] **DoD-17.** `pnpm test` passes with zero failures and zero
      newly-skipped tests. The pre-existing 2 conditional skips
      (`describe.skipIf(skipIntegration)` in `lib/storage/__tests__`
      and `lib/rm-api/__tests__/*`) remain; Sprint 14 does not add
      to or remove from this set.
- [ ] **DoD-18.** `pnpm build` succeeds with zero TypeScript errors
      and zero warnings.
- [ ] **DoD-19.** `pnpm biome check` (or `pnpm lint`) passes with
      zero warnings.
- [ ] **DoD-20.** Manual smoke test (numbered list at the end of
      this file) passes against the linked hosted Supabase project
      AND a live Anthropic API key.
- [ ] **DoD-21.** No `any`. No `// @ts-expect-error`. No `xit` /
      `it.skip` / `it.todo`. No commented-out code.
- [ ] **DoD-22.** No new top-level files outside the "Files you may
      create or modify" list below. No new dependencies beyond
      `tsx` (pre-authorized).
- [ ] **DoD-23.** A Sprint 14 execution-record entry is appended to
      the END of `DECISIONS.md` (do not edit any earlier entry). The
      entry: (a) records the fourteen pre-approved scope expansions
      listed above; (b) records any Deviations approved during
      execution; (c) records the §9.9 generation soft-limit
      interpretation (global cap of 20, see below); (d) lists the
      Sprint Completion Report's "External actions required"
      verbatim; (e) lists every retroactive cross-sprint fix per
      §15.9.

## Files you may create or modify

- `supabase/migrations/<YYYYMMDDHHMMSS>_create_demo_fixtures.sql` (NEW)
- `apps/web/types/database.ts` (MODIFY — add `demo_fixtures` block;
  preserve every existing block byte-for-byte)
- `apps/web/lib/ai/fixtures.ts` (NEW)
- `apps/web/lib/ai/fixtures-canonical.ts` (NEW)
- `apps/web/lib/ai/__tests__/fixtures.test.ts` (NEW)
- `apps/web/lib/ai/generate-initial-site.ts` (MODIFY — fixture wrap +
  §9.9 guard; preserve happy path)
- `apps/web/lib/ai/__tests__/generate-initial-site.test.ts` (MODIFY —
  APPEND new cases; preserve every existing case)
- `apps/web/lib/ai/ai-edit.ts` (MODIFY — fixture wrap; preserve happy
  path)
- `apps/web/lib/ai/__tests__/ai-edit.test.ts` (MODIFY — APPEND new
  cases; preserve every existing case)
- `apps/web/app/api/generate-initial-site/route.ts` (MODIFY — set
  `x-ai-source` in dev only)
- `apps/web/app/api/generate-initial-site/__tests__/route.test.ts`
  (MODIFY — APPEND header tests)
- `apps/web/app/api/ai-edit/route.ts` (MODIFY — set `x-ai-source` in
  dev only)
- `apps/web/app/api/ai-edit/__tests__/route.test.ts` (MODIFY — APPEND
  header tests)
- `apps/web/components/setup-form/PreviewPanel.tsx` (MODIFY — extend
  `PanelState["generated"]`, render dev-mode badge)
- `apps/web/components/setup-form/__tests__/preview-panel.test.tsx`
  (MODIFY — APPEND badge tests)
- `apps/web/components/setup-form/SetupExperience.tsx` (MODIFY — read
  header into `PanelState`)
- `apps/web/components/setup-form/__tests__/setup-experience.test.tsx`
  (MODIFY — APPEND header-forwarding test)
- `apps/web/components/setup-form/AdjustmentChat.tsx` (MODIFY — read
  header on each turn, render dev-mode badge)
- `apps/web/components/setup-form/__tests__/adjustment-chat.test.tsx`
  (MODIFY — APPEND badge test)
- `apps/web/components/editor/ai-chat/types.ts` (MODIFY — extend
  assistant message types with `aiSource?`)
- `apps/web/components/editor/ai-chat/useAiEditChat.ts` (MODIFY —
  read header into Message)
- The smallest existing assistant-turn renderer file under
  `apps/web/components/editor/ai-chat/` (MODIFY — render dev-mode
  badge). View the directory and pick the file before writing.
- One existing test file under
  `apps/web/components/editor/ai-chat/__tests__/` (MODIFY — APPEND
  badge test) OR a new sibling test file there if no existing file
  is the obvious owner.
- `apps/web/scripts/record-fixtures.ts` (NEW)
- `apps/web/scripts/__tests__/record-fixtures.test.ts` (NEW —
  optional hash-stability check at minimum, lifted from the
  `fixtures.test.ts` patterns; you may skip this file if and only
  if `lib/ai/__tests__/fixtures.test.ts` covers every hash invariant
  the script depends on. If you skip it, note the decision in the
  Sprint Completion Report.)
- `package.json` (MODIFY — add `record-fixtures` script; add `tsx`
  to `devDependencies`)
- `DECISIONS.md` (APPEND ONLY — Sprint 14 execution-record entry at
  the END of the file)

If a path you need to touch is NOT in this list, STOP and emit a
Deviation Report. Surgical, behavior-preserving inherited test fixes
under `CLAUDE.md` §15.9 are allowed without a Deviation but MUST be
listed in the Sprint 14 DECISIONS.md entry under "Retroactive
cross-sprint fixes".

## Files you MUST NOT modify

- `PROJECT_SPEC.md` — authoritative spec; raise concerns via the
  Deviation Protocol, never edit.
- The repo-root `CLAUDE.md` (the master instructions, distinct from
  this Sprint 14 file).
- `apps/web/lib/site-config/**` — Sprint 3 / 3b territory. You import
  `SiteConfig`, `safeParseSiteConfig`, `Operation`, `applyOperations`,
  `OperationInvalidError` only.
- `apps/web/lib/setup-form/**` — Sprint 2 territory. You import
  `SetupFormValues` and `setupFormSchema` only.
- `apps/web/components/site-components/**` — Sprint 3 / 5 / 5b
  territory.
- `apps/web/components/renderer/**` — Sprint 3 territory.
- `apps/web/components/rmx-shell/**` — Sprint 1 territory.
- `apps/web/lib/rm-api/**` — Sprint 1 territory.
- `apps/web/lib/storage/**` — Sprint 2 territory.
- `apps/web/lib/supabase/**` — Sprint 1 territory. You import
  `createServiceSupabaseClient` only.
- `apps/web/lib/editor-state/**` — Sprint 6 / 7 / 9 territory.
- `apps/web/app/[site]/**` (preview / edit / public catch-all) —
  Sprint 4 / 6 / 13 / 9b territory.
- `apps/web/app/(rmx)/**` — Sprint 1 / 2 territory.
- `apps/web/app/api/sites/[siteId]/working-version/**` — Sprint 6
  territory.
- `apps/web/app/api/sites/[id]/deploy/**` — Sprint 13 territory.
- `apps/web/app/api/form-submissions/**` — Sprint 10 territory.
- `apps/web/app/dev/**` — Sprint 3 / 5 / 5b territory.
- Every existing migration in `supabase/migrations/`. Sprint 14 adds
  one new migration; it does NOT edit, rename, or delete any prior
  migration.

## §9.9 generation soft-limit interpretation (binding)

`PROJECT_SPEC.md` §9.9 states: "For the demo, hardcoded soft limits:
20 generations and 200 edits per site." Sprint 11 implemented
`200 edits per site` literally as a per-site count of `site_versions`
where `source = 'ai_edit'`. Sprint 14 implements `20 generations`
GLOBALLY because the per-site count of generations is by construction
always 1 (every initial generation creates a new site row, so a
per-site cap of 20 is identical to "no cap" in practice and cannot
have been the spec author's intent).

The guard reads:

```ts
const { count } = await supabase
  .from("site_versions")
  .select("id", { count: "exact", head: true })
  .eq("source", "initial_generation");
if ((count ?? 0) >= 20) return { kind: "error", error: { kind: "over_quota", message: "Demo generation limit reached." }, source: "live" };
```

Note the absence of `.eq("site_id", ...)` — the cap is global. This
interpretation is logged as part of the Sprint 14 execution record in
`DECISIONS.md`. The TODO comment Sprint 4 left at the top of
`generateInitialSite` is removed when the guard lands.

## Canonical hashing (binding)

The hash MUST be deterministic across machines. Implementation:

1. **Generation hash input** — a JSON object containing ONLY:
```ts
   {
     companyName: form.companyName.trim().toLowerCase(),
     palette: form.palette,
     templateStart: form.templateStart,
     customInstructions: (form.customInstructions ?? "").trim(),
     targetAudience: (form.targetAudience ?? "").trim(),
     pagesToInclude: [...form.pagesToInclude].sort(),
     propertyTypesFeatured: [...form.propertyTypesFeatured].sort(),
   }
```
   Every other `SetupFormValues` field — including `tagline`, all
   logo URLs, `inspirationImages`, advanced contact / social fields,
   `tone`, `primaryCta`, `brandVoiceNotes` — is excluded. Image URLs
   contain `Date.now()` prefixes and would defeat the hash.

2. **AI-edit hash input** — a JSON object containing ONLY:
```ts
   {
     prompt: input.prompt.trim().toLowerCase(),
     siteId: input.siteId, // present iff caller forwarded it; canonical inputs always provide it
     currentVersionId: input.currentVersionId,
     selection: input.selection
       ? {
           componentIds: [...input.selection.componentIds].sort(),
           pageSlug: input.selection.pageSlug,
           pageKind: input.selection.pageKind,
         }
       : null,
   }
```
   Attachments are excluded (image URLs are non-deterministic and
   the canonical demo prompts don't depend on attached images).
   `history` is excluded (free-form prior turns).

3. **Hash function** — `crypto.createHash("sha256").update(stableStringify(input)).digest("hex")`.
   Use a deterministic stringifier (alphabetically-sorted keys at
   every level). Implement the stringifier inline (≤ 30 lines); do
   NOT add `json-stable-stringify` as a dependency.

4. **`AiEditInput`** for the hash function takes the same shape as
   the runtime `AiEditInput` from `lib/ai/ai-edit.ts` plus the
   `siteId` and `currentVersionId` fields the route adds — define
   the hash-input shape locally in `fixtures.ts` rather than
   widening the orchestrator's input type.

## Coding standards (binding subset of `PROJECT_SPEC.md` §15)

- TypeScript strict + `noUncheckedIndexedAccess`. No `any`. No
  `// @ts-expect-error`. Use `unknown` and narrow.
- Branded types are NOT introduced in Sprint 14; the existing
  `SiteId` / `SiteVersionId` patterns are not in scope.
- React: server components by default, `"use client"` only when
  required. The new badges in PreviewPanel / AdjustmentChat / the
  editor chat live inside files that are already client components;
  do NOT add new `"use client"` directives unless the file is brand
  new and demands one.
- Files: `kebab-case.ts(x)`. Components: `PascalCase`. Hooks:
  `useThing`. API routes: `kebab-case`.
- Vitest for all unit tests. Each new behavior gets at least one
  test. `pnpm test` MUST pass with zero skipped tests beyond the two
  pre-existing conditional integration skips.
- All new code has comments explaining WHY non-obvious decisions
  were made (mirroring the existing style across Sprint 4 / 11 / 12
  files). Comment density is calibrated to "another engineer (or
  Claude Code) can pick this up cold and understand the intent."
- No `console.log` in production code paths; the recording script
  may use `console.log` / `console.error` because it IS the user
  interface.

## Pre-flight checklist (run BEFORE writing code)

Run each of these and confirm. If ANY fails, emit a Deviation
Report describing the failure.

1. `apps/web/lib/ai/generate-initial-site.ts` exists and exports
   `generateInitialSite(input, client?)` returning a Promise of
   `{ kind: "ok"; config: SiteConfig } | { kind: "error"; error: AiError }`.
   (Sprint 4.)
2. `apps/web/lib/ai/ai-edit.ts` exists and exports
   `aiEdit(input, client?)` returning a Promise of `AiEditResult`
   with three variants (`ok`, `clarify`, `error`). (Sprint 11.)
3. `apps/web/lib/ai/errors.ts` exports `AiError`, `AiErrorKind`,
   `categorizeAiError`, `formatErrorReport`. (Sprint 4.)
4. `apps/web/lib/site-config/ops.ts` exports `Operation`,
   `OperationInvalidError`, `applyOperations`. (Sprint 11.)
5. `apps/web/lib/site-config` re-exports `safeParseSiteConfig` and
   the `SiteConfig` type. (Sprint 3.)
6. `apps/web/lib/setup-form/types.ts` exports `SetupFormValues`.
   (Sprint 2.)
7. `apps/web/lib/setup-form/schema.ts` exports `setupFormSchema`.
   (Sprint 2.)
8. `apps/web/components/setup-form/PreviewPanel.tsx` exports a
   `PanelState` discriminated union with a `"generated"` variant
   carrying `previewUrl`, `siteSlug`, `siteId`, `versionId`.
   (Sprint 4 / 12.)
9. `apps/web/components/setup-form/AdjustmentChat.tsx` exists and
   POSTs to `/api/ai-edit`. (Sprint 12.)
10. `apps/web/components/editor/ai-chat/useAiEditChat.ts` exists
    and POSTs to `/api/ai-edit`. (Sprint 11.)
11. `apps/web/components/editor/ai-chat/types.ts` exports
    `AssistantOkMessage`, `AssistantClarifyMessage`,
    `AssistantErrorMessage`. (Sprint 11.)
12. `apps/web/types/database.ts` has `Database["public"]["Tables"]`
    entries for `sites`, `site_versions`, `form_submissions`, and
    the `rm_*` set. (Sprints 1, 4, 10.)
13. `supabase/migrations/` has a sites/site_versions migration and
    a form_submissions migration. (Sprints 4, 10.)
14. The repo root `package.json` has a `dev` / `build` / `test` /
    `lint` / `db:push` / `db:types` / `seed` script set. (Sprint 0
    + 1.)
15. `apps/web/.env.local` has `ANTHROPIC_API_KEY`,
    `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
    `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF`. (Sprint 0
    + 4.) Do NOT print the values; just confirm presence.
16. `crypto` is available in the Node runtime (it is — built-in
    module — but verify by searching for an existing import). The
    hash function uses `crypto.createHash`.
17. `tsx` is installable via `pnpm add -D tsx` (network-reachable).

## §15.9 retroactive cross-sprint fix authorization

If the new `source: "live" | "fixture"` field on
`GenerateInitialSiteResult` / `AiEditResult` / orchestrator returns
breaks an inherited test's exact-equality assertion (e.g.
`toEqual({ kind: "ok", config })` becomes structurally narrower than
the new return type), the §15.9 fix is **pre-authorized** —
narrow the assertion in place to include the new `source` field. Do
NOT raise a Deviation for these surgical assertion updates. List
them in the Sprint 14 DECISIONS.md entry under "Retroactive
cross-sprint fixes."

The same pre-authorization applies to:
- `apps/web/components/editor/__tests__/placeholders.test.tsx` (if
  the AI chat layout changes for the badge break the existing
  "renders without crashing" assertion — keep it as
  `getByTestId("right-sidebar")` or analogous).
- Any inherited assertion on `PanelState["generated"]` that
  exact-equality-checks the variant fields — narrow to include
  `aiSource: undefined` or use `expect.objectContaining`.

If a fix would require changing more than ~5 lines per file, or
would touch production code in another sprint's domain, escalate
via the Deviation Protocol.

## Deviation Protocol (mandatory — do not modify)

If you (Claude Code) discover during this sprint that ANY part of
the plan cannot be implemented exactly as written, you MUST stop and
emit a Deviation Report in the format below. You MUST NOT proceed
with an alternative until the user has explicitly approved it with
the words "Approved" or equivalent.

A "deviation" includes: missing/broken/incompatible libraries,
impossible function signatures, scope additions beyond the
fourteen pre-approved scope expansions above, file additions
outside the declared scope, test plans that cannot be executed as
written, and any case where you catch yourself thinking "I'll just
do it slightly differently."

### Deviation Report (emit verbatim)

```
🛑 DEVIATION DETECTED

Sprint: Sprint 14 — Demo fallback fixtures
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
- `pnpm biome check` (or `pnpm lint`)
- Manual smoke test from this file's "Manual smoke test" section.
- `DECISIONS.md` has the Sprint 14 execution-record entry appended.

If any check fails, treat it as a Deviation. Do not commit. Do not
declare the sprint complete.

## Useful local commands

- `pnpm dev` — Next.js dev server at http://localhost:3000
- `pnpm test` — Vitest (unit tests)
- `pnpm test:e2e` — Playwright (added in Sprint 15; unused here)
- `pnpm build` — production build
- `pnpm lint` (or `pnpm biome check`) — Biome lint + format check
- `pnpm format` — Biome format --write
- `pnpm typecheck` — TypeScript no-emit check
- `pnpm db:push` — `supabase db push` against the linked hosted
  project
- `pnpm db:types` — `supabase gen types typescript --linked >
  apps/web/types/database.ts` (regenerates the types file from the
  hosted project after `db:push` has run the new migration)
- `pnpm seed` — Sprint 1's seed script (unused in Sprint 14)
- `pnpm record-fixtures` — NEW in Sprint 14: runs the recording
  script. Requires `apps/web/.env.local` populated with the
  Anthropic key and the Supabase keys.

## External actions required (user must do these AFTER Claude Code finishes)

These are listed verbatim in the Sprint Completion Report. The user
runs them between merge and the next sprint:

1. **Run the new migration against the linked hosted Supabase
   project.** From the repo root: `pnpm db:push`. Confirm zero
   errors.
2. **Regenerate the typed database client.** `pnpm db:types`. The
   freshly-generated `apps/web/types/database.ts` should match the
   hand-edited file Claude Code shipped — if it does not, accept the
   generated file as canonical and re-run `pnpm test && pnpm build`.
3. **Record the canonical fixtures against the live Anthropic API.**
   From the repo root: `pnpm record-fixtures`. This populates
   `demo_fixtures` with the Aurora Cincy demo-script payload plus
   the two ai-edit canonical inputs (one of which exercises
   `setLinkMode` / `setDetailPageSlug`). Re-run anytime the
   canonical inputs change. The script is idempotent
   (UPSERT-on-conflict).
4. **Optional smoke verification.** Hit the dev server, open
   /setup, type the canonical Aurora Cincy inputs, and confirm the
   PreviewPanel pill shows `[live]` (since the API is up). Then
   temporarily invalidate `ANTHROPIC_API_KEY` in
   `apps/web/.env.local`, restart `pnpm dev`, run the same flow,
   and confirm the pill shows `[fixture]` and the preview still
   renders.

## Manual smoke test (numbered, click-by-click)

Pre-conditions:
- `apps/web/.env.local` is populated with all five env vars
  (Anthropic key, Supabase URL, Supabase anon key, Supabase service
  role key, Supabase project ref).
- `pnpm db:push` has been run for the new migration.
- `pnpm db:types` has been run.
- `pnpm record-fixtures` has been run successfully.
- `pnpm dev` is running.

Steps:
1. Open `http://localhost:3000/setup`. Confirm the page loads
   without errors.
2. Type "Aurora Cincy" into the **Company Name** field.
3. Click the **Ocean** palette card under **Color Scheme**.
4. Click the **Ready to Preview & Edit?** Save button.
5. Wait for the loading narration. Confirm the preview iframe
   renders.
6. **Verify the dev-mode badge.** Next to the existing
   `data-testid="preview-panel-pill"` element, an element with
   `data-testid="preview-panel-ai-source"` is visible. It contains
   either `[live]` or `[fixture]` (lowercase, square brackets).
7. Type into the AdjustmentChat input:
   `Make each unit card link to a unit detail page.`
8. Click **Send**. Confirm the assistant turn appears with a
   `data-testid="adjustment-chat-turn-ai-source"` element next to
   the summary, containing `[live]` or `[fixture]`.
9. **Force the fallback path.** Open a new terminal. Edit
   `apps/web/.env.local` and rename `ANTHROPIC_API_KEY` to
   `ANTHROPIC_API_KEY_DISABLED` (so the env var is missing). Save
   the file.
10. Restart `pnpm dev` (Ctrl+C, re-run).
11. Open `http://localhost:3000/setup` in a fresh tab.
12. Repeat steps 2–4 with the same Aurora Cincy / Ocean inputs.
13. The loading narration runs, then the preview iframe renders
    successfully. Confirm `data-testid="preview-panel-ai-source"`
    now reads `[fixture]`. Confirm the iframe content matches the
    recorded canonical generation (header copy, hero, etc.).
14. **Confirm the canonical detail-page presence.** Inside the
    iframe (right-click → Inspect or open the URL directly),
    confirm the rendered config has at least one `Page` with
    `kind: "detail"` (open `/aurora-cincy/preview?v=...` directly
    and check the network response or the rendered DOM for the
    detail-page route).
15. In the AdjustmentChat, send the same prompt
    `Make each unit card link to a unit detail page.` Confirm the
    assistant turn renders with `[fixture]`. Confirm the iframe
    refreshes and a follow-up navigation to a unit detail URL
    works (the working-version config now contains the
    `setLinkMode: "detail"` / `setDetailPageSlug` mutation applied
    via the fixture's operations list).
16. **Restore live mode.** Edit `apps/web/.env.local` back to
    `ANTHROPIC_API_KEY=...`. Restart `pnpm dev`. Repeat steps 2–4.
    Confirm the badge returns to `[live]`.
17. **Verify production hides the badge.** From a separate
    terminal: `pnpm build && pnpm start`. Open the same flow at
    `http://localhost:3000/setup`. Confirm
    `data-testid="preview-panel-ai-source"` is NOT in the DOM
    (production omits the header and the UI omits the element).
18. **Run the quality gate.** From the repo root:
    `pnpm test && pnpm build && pnpm lint`. Confirm zero
    failures, zero TypeScript errors, zero Biome warnings.

If any step fails, treat it as a Deviation per the Deviation
Protocol above. Do NOT mark the sprint complete.

## Sprint Completion Report (emit verbatim when finished)

```
✅ SPRINT 14 COMPLETE

Definition of Done:
- [x] DoD-1 ... DoD-23 (mark each)

Files created:
- supabase/migrations/<timestamp>_create_demo_fixtures.sql (X lines)
- apps/web/lib/ai/fixtures.ts (Y lines)
- apps/web/lib/ai/fixtures-canonical.ts (Z lines)
- apps/web/lib/ai/__tests__/fixtures.test.ts (A lines)
- apps/web/scripts/record-fixtures.ts (B lines)
- (optional) apps/web/scripts/__tests__/record-fixtures.test.ts (C lines)

Files modified:
- apps/web/types/database.ts (+D −E)
- apps/web/lib/ai/generate-initial-site.ts (+F −G)
- apps/web/lib/ai/__tests__/generate-initial-site.test.ts (+...)
- apps/web/lib/ai/ai-edit.ts (+...)
- apps/web/lib/ai/__tests__/ai-edit.test.ts (+...)
- apps/web/app/api/generate-initial-site/route.ts (+...)
- apps/web/app/api/generate-initial-site/__tests__/route.test.ts (+...)
- apps/web/app/api/ai-edit/route.ts (+...)
- apps/web/app/api/ai-edit/__tests__/route.test.ts (+...)
- apps/web/components/setup-form/PreviewPanel.tsx (+...)
- apps/web/components/setup-form/__tests__/preview-panel.test.tsx (+...)
- apps/web/components/setup-form/SetupExperience.tsx (+...)
- apps/web/components/setup-form/__tests__/setup-experience.test.tsx (+...)
- apps/web/components/setup-form/AdjustmentChat.tsx (+...)
- apps/web/components/setup-form/__tests__/adjustment-chat.test.tsx (+...)
- apps/web/components/editor/ai-chat/types.ts (+...)
- apps/web/components/editor/ai-chat/useAiEditChat.ts (+...)
- apps/web/components/editor/ai-chat/<assistant-renderer>.tsx (+...)
- apps/web/components/editor/ai-chat/__tests__/<test>.tsx (+...)
- package.json (+...)
- DECISIONS.md (Sprint 14 entry appended at the END)

Tests added: N (all passing)
Test command output: [paste the last 5 lines of `pnpm test`]
Build output: [paste the "Compiled successfully" line]
Lint output: [paste the "No fixes applied" line]

Deviations approved during sprint: [list, or "None"]

Retroactive cross-sprint fixes (CLAUDE.md §15.9): [list, or "None"]

External actions required (user must do these BEFORE the demo):
1. Run `pnpm db:push` to apply the demo_fixtures migration to the
   linked hosted Supabase project.
2. Run `pnpm db:types` to regenerate apps/web/types/database.ts
   from the linked project. Confirm the generated file matches
   the hand-edited shipped file; accept the generated version as
   canonical if there is drift.
3. Run `pnpm record-fixtures` to populate demo_fixtures with the
   canonical demo prompts. The script is idempotent and can be
   re-run after any canonical-input change.

Manual smoke test result: [PASS / FAIL with details — include the
result of every numbered step in the smoke test above]

Recommended next steps: Sprint 15 (Polish + demo prep).
```

## Notes & hints (non-binding)

- The Anthropic SDK is Node-only; both routes already declare
  `runtime = "nodejs"`. Don't switch them to Edge.
- `crypto` is a Node built-in; no install needed. Do NOT use the
  `crypto-js` npm package.
- `tsx` is the modern, well-maintained replacement for `ts-node`. The
  invocation is just `tsx <file.ts>`.
- Supabase's `.upsert(rows, { onConflict: "surface,input_hash" })`
  needs a unique constraint on `(surface, input_hash)` — add it in
  the migration alongside the helper index.
- `vi.stubEnv("NODE_ENV", "production")` + `vi.unstubAllEnvs()` in
  `afterEach` is the canonical Vitest pattern for testing dev-only
  code paths. The badge tests need this.
- The fixture lookup is the SECOND-to-last fallback (the actual
  last-resort is "user retries"). Don't put the fixture lookup
  inside the orchestrator's first retry — it goes after the second
  retry has already failed, on the function's outermost return path.
- The recording script's canonical ai-edit inputs reference a
  `siteId` and `currentVersionId`. Document in the script header that
  the prerequisite is "at least one Aurora-Cincy-shaped site exists in
  `sites` + has a working `site_versions` row" — recommend running
  the canonical generation FIRST (which produces a site), grabbing
  its id, and pinning it in the canonical AI-edit input array.
  Alternatively, the script can do this end-to-end: run the
  generation fixtures first, capture the resulting siteId / versionId,
  then run the ai-edit fixtures against the captured ids. This is the
  cleaner approach and is what DoD-14 implicitly assumes.
- The smoke test's step-9 "rename the env var" trick is brittle
  (changing env vars while `pnpm dev` is hot can be flaky). The
  documented workflow is to restart `pnpm dev` after the rename;
  follow that order.
- The new `source` field on `GenerateInitialSiteResult` /
  `AiEditResult` is intentionally non-optional (always either `"live"`
  or `"fixture"`). The route layer's `x-ai-source` header is the
  optional / dev-only piece — the orchestrator-internal field is
  always populated.