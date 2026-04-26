# CLAUDE.md — Sprint 11: AI Edit (right sidebar)

## Mission

Sprint 11 lights up the second AI surface in Orion's Belt: the right-sidebar
chat that lets the property manager **talk to their site**. The user types
("Make the hero green"; "Add a contact form below the units"), optionally
attaches an image, and on send the editor POSTs to `/api/ai-edit` with the
prompt, the current `SiteConfig`, the current selection, and any
attachments. Claude returns either a `summary + operations[]` diff against
the config, or a clarifying question. The chat renders the assistant
message with **Accept** / **Discard** buttons; Accept folds the operations
into the working `draftConfig` (autosave then PATCHes the working version
exactly the way every other editor mutation does); Discard drops the
suggestion. Errors render with structured copy per `PROJECT_SPEC.md` §9.6.

The work spans three independent layers:

1. **The operations vocabulary.** Implement all 14 Tier-1 + 8 Tier-2
   operations from `PROJECT_SPEC.md` §9.4 plus the three detail-page
   Tier-1 additions from §8.12 (`setLinkMode`, `setDetailPageSlug`,
   `setQueryParamDefault`) as pure functions in
   `apps/web/lib/site-config/ops.ts`. 25 ops total.
2. **The endpoint.** `/api/ai-edit` runs on Node; calls Anthropic via the
   existing `lib/ai/client.ts` factory; returns the discriminated union
   `{ kind: "ok", summary, operations } | { kind: "clarify", question } |
   { kind: "error", error: AiError }` per §9.3 + §9.6.
3. **The UI.** A right-sidebar chat replaces the Sprint 6 placeholder at
   `apps/web/components/editor/sidebar/RightSidebar.tsx`. It composes new
   components under `apps/web/components/editor/ai-chat/`: a transcript,
   an input with image attach, a selection chip, suggested-prompts chips,
   per-message Accept/Discard, the four-string AI-Edit loading narration
   from §9.5, and the structured error UI from §9.6.

The work does **not** touch `lib/rm-api/`, `lib/site-config/schema.ts`,
the renderer, the Supabase migrations, the existing `/api/generate-initial-site`
route, or any site-component implementation file. It declares one bounded
hand-off into `lib/editor-state/` (a single new mutator, three-file
pattern Sprint 9 already established — see "Authorized hand-offs" below).

## Spec sections in scope

- `PROJECT_SPEC.md` §8.7 — Right sidebar AI chat (the UI contract).
- `PROJECT_SPEC.md` §8.8 — Right sidebar element-edit cohabitation.
- `PROJECT_SPEC.md` §8.12 — Detail pages "Operations vocabulary additions"
  (the three new Tier-1 ops Sprint 11 implements).
- `PROJECT_SPEC.md` §9.1 — The two AI surfaces (Sprint 11 ships the second).
- `PROJECT_SPEC.md` §9.3 — AI Edit system prompt requirements.
- `PROJECT_SPEC.md` §9.4 — The Operations vocabulary (Tier 1 + Tier 2).
- `PROJECT_SPEC.md` §9.5 — Loading narration ("AI Edit narration" — the
  four-string list Sprint 11 must rotate every 3–4 seconds).
- `PROJECT_SPEC.md` §9.6 — Error messaging (all seven categories).
- `PROJECT_SPEC.md` §9.7 — Model and API parameters
  (`claude-sonnet-4-5`, `max_tokens: 6000` for edits, `temperature: 0.2`
  for edits, single retry on parse failure).
- `PROJECT_SPEC.md` §9.8 — Image inputs (max 4 images per request,
  client-side resize to ≤1568px on long edge).
- `PROJECT_SPEC.md` §9.9 — Cost guardrails (200 edits per site soft cap;
  return a friendly error after).

Quote each section as you build the corresponding piece. Do not paraphrase
the constraints into your own words mid-implementation — the §9.4 operation
shapes especially are an exact contract.

## Pre-flight check (MANDATORY — emit before reading or writing any non-spec file)

Before reading or modifying any file other than the items listed in
"Spec sections in scope" above, run these twelve checks. If any
fails, STOP and emit a Deviation Report per the protocol embedded
later in this file. Do not attempt to work around a failed check.

1. **Single-branch workflow.** Run `git branch --show-current` and
   verify the output is exactly `master`. If it is not, STOP and
   emit a Deviation Report — do NOT create a `sprint/11` branch and
   do NOT switch branches. Per `DECISIONS.md` 2026-04-25 the project
   uses a single `master` branch on a single repo; worktrees are
   not in use.

2. **Predecessor sprints merged.** Confirm the following files
   exist on disk and are non-empty:
   - `apps/web/lib/ai/client.ts` (Sprint 4 — read-only consumer).
   - `apps/web/lib/ai/errors.ts` (Sprint 4 — read-only consumer;
     verify it exports `AiError`, `categorizeAiError`, and
     `formatErrorReport`, and that `AiErrorKind` includes both
     `"model_clarification"` and `"operation_invalid"` —
     `apps/web/lib/ai/__tests__/errors.test.ts` already exercises
     direct construction of both).
   - `apps/web/lib/ai/generate-initial-site.ts` (Sprint 4 — pattern
     to mirror; do NOT modify).
   - `apps/web/lib/ai/prompts/initial-generation.ts` (Sprint 4 —
     pattern to mirror; do NOT modify).
   - `apps/web/lib/ai/prompts/snippets/component-catalog.ts`
     (Sprint 4 — read-only; reuse in the Sprint 11 prompt).
   - `apps/web/lib/ai/prompts/snippets/data-sources.ts`
     (Sprint 4 — read-only; reuse).
   - `apps/web/lib/ai/prompts/snippets/schema-prose.ts`
     (Sprint 4 — read-only; reuse).
   - `apps/web/app/api/generate-initial-site/route.ts` (Sprint 4 —
     pattern to mirror).
   - `apps/web/lib/site-config/schema.ts` (Sprint 3/3b — read-only).
   - `apps/web/lib/site-config/ids.ts` (Sprint 3 — exports
     `newComponentId`; Sprint 11 uses this for `addComponent`).
   - `apps/web/lib/site-config/data-binding/index.ts` (Sprint 9 —
     read-only consumer; the four Repeater ops compose this layer).
   - `apps/web/lib/editor-state/store.ts` (Sprint 6/9 — Sprint 11
     adds ONE mutator with the explicit hand-off below).
   - `apps/web/lib/editor-state/types.ts` (same hand-off).
   - `apps/web/lib/editor-state/actions.ts` (same hand-off).
   - `apps/web/components/editor/sidebar/RightSidebar.tsx`
     (Sprint 6 placeholder — Sprint 11 REWRITES this; ownership
     hand-off declared below).
   - `apps/web/components/editor/index.ts` (Sprint 6 barrel —
     Sprint 11 appends ai-chat re-exports; hand-off declared
     below).
   - `apps/web/app/[site]/edit/EditorShell.tsx` (Sprint 6 — Sprint
     11 does NOT modify this; the rewritten `RightSidebar` keeps
     its existing import path so the shell is untouched).

3. **Schema confirms `Page.kind` and `detailDataSource`.** Open
   `apps/web/lib/site-config/schema.ts` and verify `pageSchema`
   carries `kind: pageKindSchema.default("static")` and
   `detailDataSource: detailDataSourceSchema.optional()`. If
   absent, STOP — Sprint 3b is missing and the new
   `setLinkMode` / `setDetailPageSlug` ops cannot be implemented.

4. **§8.12 contains the three new ops.** Open `PROJECT_SPEC.md` and
   confirm the §8.12 "Operations vocabulary additions" subsection
   is present and lists `setLinkMode`, `setDetailPageSlug`,
   `setQueryParamDefault` exactly. If the subsection is missing or
   the names differ, STOP.

5. **§9.4 list.** Open `PROJECT_SPEC.md` §9.4 and confirm the Tier 1
   and Tier 2 lists match the 14+8 ops enumerated in
   "Operations vocabulary" below. If any name differs, STOP — the
   spec is canonical and the sprint must mirror it byte-for-byte.

6. **§9.5 narration.** Open `PROJECT_SPEC.md` §9.5 and confirm the
   "AI Edit narration" list is exactly the four strings:
   `"Reading your request…"`, `"Looking at the current page…"`,
   `"Planning the changes…"`, `"Writing the diff…"`. The Sprint 11
   `AiEditNarration` component must reproduce these strings
   verbatim (including the ellipsis character `…`).

7. **§9.6 error categories.** Open `PROJECT_SPEC.md` §9.6 and
   confirm all seven categories from `AiErrorKind` in
   `lib/ai/errors.ts` are documented (`network_error`, `timeout`,
   `model_clarification`, `invalid_output`, `operation_invalid`,
   `over_quota`, `auth_error`). If any drift, STOP.

8. **`ANTHROPIC_API_KEY` is documented.** Confirm the repo-root
   `.env.example` contains `ANTHROPIC_API_KEY=` (Sprint 4 created
   this; Sprint 11 reuses it). If absent, STOP — Sprint 4 is
   incomplete and the route cannot run.

9. **Anthropic SDK installed.** Open `apps/web/package.json` and
   confirm `@anthropic-ai/sdk` is in `dependencies`. The Sprint 4
   bundle pinned this; Sprint 11 imports it via the existing
   `lib/ai/client.ts` factory — do NOT add a second copy.

10. **Owned paths are clean.** Verify the following do NOT yet
    exist on disk (clean-slate creations):
    - `apps/web/app/api/ai-edit/`
    - `apps/web/lib/ai/prompts/ai-edit.ts`
    - `apps/web/lib/ai/ai-edit.ts`
    - `apps/web/lib/site-config/ops.ts`
    - `apps/web/components/editor/ai-chat/`
    
    If any already exists and is non-empty, STOP and surface — the
    sprint plan assumes these are new. (Empty stub files are OK;
    delete them and proceed.)

11. **Editor barrel is consumable.** Open
    `apps/web/components/editor/index.ts` and confirm it exports
    `RightSidebar` (Sprint 11 keeps that public name stable so
    `EditorShell` does not need to re-import). If the export is
    missing, STOP.

12. **Working version PATCH endpoint exists.** Confirm
    `apps/web/app/api/sites/[siteId]/working-version/route.ts`
    exists and exports a `PATCH` handler. The autosave loop fired
    by Accept relies on this. If absent, STOP — Sprint 6 is
    incomplete.

After all twelve checks pass, list each as `[x]` in your first
response and then proceed.

## Definition of Done

- [ ] **Operations vocabulary.** `apps/web/lib/site-config/ops.ts` exports
      a discriminated union `Operation` and a pure function
      `applyOperation(config: SiteConfig, op: Operation): SiteConfig`,
      plus a thin folder `applyOperations(config: SiteConfig, ops:
      readonly Operation[]): SiteConfig` that is `ops.reduce(applyOperation,
      config)`. Every operation listed under "Operations vocabulary" below
      is covered. `applyOperation` is **atomic**: an invalid op throws an
      `OperationInvalidError` carrying the offending `op.id` (when present)
      and a plain-English reason; the caller is responsible for catching
      the throw and surfacing it as `AiError.kind === "operation_invalid"`.
      No partial application.
- [ ] **Operations Zod schema.** `ops.ts` also exports
      `operationSchema: z.ZodType<Operation>` (a `z.discriminatedUnion(
      "type", [...])`) used by both the route handler and the runtime
      response parser. The schema is the single source of truth for op
      shape. Sprint 11's tests assert that every Tier-1 + Tier-2 + §8.12
      op type appears in the union (count: 25).
- [ ] **System prompt.** `apps/web/lib/ai/prompts/ai-edit.ts` exports
      `buildAiEditSystemPrompt(input: { config: SiteConfig; selection:
      Selection | null }): string`. The prompt embeds (a) the SiteConfig
      schema prose (reuse the snippet from `prompts/snippets/schema-prose.ts`),
      (b) the registered component catalog (reuse the snippet from
      `prompts/snippets/component-catalog.ts`), (c) the data-sources
      reference (reuse the snippet from `prompts/snippets/data-sources.ts`),
      (d) the operations vocabulary as documented strings — including the
      three §8.12 additions, with one example payload per op, (e) the
      current `SiteConfig` JSON, (f) the current selection (component
      ids and resolved metadata), (g) the strict output-format clause
      from §9.3 (a single JSON object: either `{ kind: "ok", summary,
      operations }` or `{ kind: "clarify", question }`; no prose, no
      markdown fences), (h) a clause forbidding invented components,
      props, fields. Same deterministic-output rule as Sprint 4: same
      input → same prompt string.
- [ ] **Orchestrator.** `apps/web/lib/ai/ai-edit.ts` exports
      `aiEdit(input: AiEditInput, client?: Anthropic): Promise<AiEditResult>`
      mirroring the `generateInitialSite` orchestrator's structure
      verbatim: build messages, call `client.messages.create` with
      model `claude-sonnet-4-5`, `max_tokens: 6000`, `temperature: 0.2`,
      Zod-validate the response, retry once on parse failure, map every
      thrown error through `categorizeAiError` from `lib/ai/errors.ts`.
      Result is the discriminated union `{ kind: "ok", summary,
      operations } | { kind: "clarify", question } | { kind: "error",
      error: AiError }`.
- [ ] **Endpoint.** `apps/web/app/api/ai-edit/route.ts` exports a
      Node-runtime POST handler that: (a) validates the request body
      against a Zod schema (siteId UUID, currentVersionId UUID, prompt
      non-empty, attachments array of `{ url }` capped at 4, optional
      `selection` shape), (b) loads the site's working version row from
      Supabase via the service-role client (the same `createServiceSupabaseClient`
      Sprint 4 / Sprint 6 / Sprint 10 use), (c) feeds the parsed
      `SiteConfig` into the orchestrator, (d) on `kind: "ok"`, dry-runs
      `applyOperations` against the loaded config to confirm validity —
      if `applyOperations` throws, swap the response to
      `{ error: { kind: "operation_invalid", message, details } }`, (e)
      returns the resulting discriminated union JSON, (f) maps each
      AiError kind to the same HTTP status code policy as Sprint 4's
      `httpStatusForError` (502 for invalid_output / operation_invalid,
      504 for timeout, 503 for over_quota / auth_error / network_error,
      200 for ok and clarify). The endpoint NEVER applies operations
      to the database — the client is responsible for committing.
- [ ] **Cost guardrail.** Before calling the orchestrator, the endpoint
      counts the site's prior `site_versions` rows where
      `source = "ai_edit"`. If the count is ≥ 200, return
      `{ error: { kind: "over_quota", message: "Demo edit limit
      reached for this site." } }` per §9.9.
- [ ] **Editor-state mutator.** `apps/web/lib/editor-state/types.ts`,
      `actions.ts`, and `store.ts` each gain ONE addition:
      `commitAiEditOperations: (operations: readonly Operation[]) =>
      void`. The mutator is a single transactional `set` that imports
      `applyOperations` from `@/lib/site-config/ops`, folds the ops
      against the current `draftConfig`, and writes
      `{ draftConfig: next, saveState: "dirty" }`. If `applyOperations`
      throws, the mutator catches and writes
      `{ saveError: e.message, saveState: "error" }` instead — the chat
      surfaces this via the `selectSaveState` selector. This is the
      same three-file additive pattern Sprint 9 used for
      `setComponentDataBinding` (see `DECISIONS.md` 2026-04-26 entry).
      No other changes to `lib/editor-state/` files.
- [ ] **Right-sidebar rewrite.** `apps/web/components/editor/sidebar/RightSidebar.tsx`
      replaces Sprint 6's placeholder with a thin shell that mounts
      `<RightSidebarAiChat />` from `@/components/editor/ai-chat`. The
      export name `RightSidebar` is preserved so `EditorShell.tsx` is
      not modified. The collapsed-vs-expanded toggle from §8.7 is
      implemented; the collapsed state shows the message-square icon
      and a small badge with the count of pending (non-accepted, non-
      discarded) suggestions. Default state on mount is **expanded**.
- [ ] **AI Chat components.** `apps/web/components/editor/ai-chat/`
      ships:
      - `RightSidebarAiChat.tsx` (`"use client"`) — the top-level
        composition. Holds the message transcript and current loading
        state. Handles the "send" action (POST + state machine).
      - `MessageList.tsx` — renders the `Message[]` array.
      - `MessageBubble.tsx` — single user/assistant turn. Assistant
        messages render the summary string + bulleted operations list
        + Accept / Discard buttons (when `kind: "ok"`). Clarification
        messages render the question only. Error messages render the
        §9.6 copy + Retry button + "Copy details" button (uses
        `formatErrorReport` from `lib/ai/errors.ts`).
      - `Composer.tsx` — input + image-attach + send. Files are
        client-side resized to ≤1568px on the long edge per §9.8 (use
        a canvas-based resize; cap to 4 attachments per send; reject
        any file larger than 5 MB before resize).
      - `SelectionChip.tsx` — reads `selectSelectedComponentNode` and
        renders `Editing: <ComponentType> — <componentId>` or
        `Editing: whole page` when no selection.
      - `SuggestedPrompts.tsx` — renders 3–4 chips contextual to the
        current selection. The mapping table is in `suggested-prompts.ts`
        below; clicking a chip prefills the composer.
      - `AiEditNarration.tsx` — rotates the four §9.5 strings every
        3.5 seconds while loading. Uses `useEffect` + `setInterval`;
        the timer cleans up on unmount.
      - `useAiEditChat.ts` — the hook owning the state machine
        (`{ kind: "idle" } | { kind: "loading" } | { kind: "error",
        error: AiError } | { kind: "awaiting_decision", proposed }`).
        Exposes `send(prompt, attachments)`, `accept(messageId)`,
        `discard(messageId)`, `retry()`.
      - `suggested-prompts.ts` — pure data: a function
        `suggestionsForSelection(node: ComponentNode | null): string[]`
        returning per-type prompt suggestions (e.g. for `HeroBanner`:
        "Make this taller", "Change the headline", "Add a CTA").
      - `types.ts` — chat-local types: `Message`, `LoadingState`,
        `ProposedDiff`, `Attachment`.
      - `index.ts` — barrel.
- [ ] **Accept flow.** Clicking Accept on a `kind: "ok"` assistant
      message calls `commitAiEditOperations(operations)`. The store's
      autosave loop (Sprint 6) picks up the `saveState: "dirty"` flip
      and PATCHes within ~1 second. The accepted message in the
      transcript is marked `accepted: true` (Accept/Discard buttons
      removed; replaced with a small "Applied" tag).
- [ ] **Discard flow.** Clicking Discard marks the message
      `discarded: true` (Accept/Discard buttons removed; replaced with
      a small "Discarded" tag). No store mutation. No network call.
- [ ] **Clarification flow.** When the orchestrator returns
      `{ kind: "clarify", question }`, the chat renders the question as
      an assistant turn with no Accept/Discard. The composer is
      re-enabled; the user's next send carries the previous transcript
      (last 6 turns) as conversation history into `/api/ai-edit`.
- [ ] **Error flow.** Each error category from §9.6 surfaces with the
      exact user-facing copy from §9.6. `network_error` and
      `over_quota` show a Retry button that re-sends the last prompt.
      `auth_error` shows the public fallback copy ("Service unavailable…").
      `Copy details` is always present and copies
      `formatErrorReport(error)` to clipboard.
- [ ] **Tests — operations.**
      `apps/web/lib/site-config/__tests__/ops.test.ts` covers every
      operation type with: (a) a happy-path test, (b) at least one
      failure-mode test asserting `OperationInvalidError` is thrown
      with the expected reason. Plus tests for `applyOperations`
      atomicity (a batch with one bad op throws and leaves config
      untouched) and folding order (op N sees the result of op N-1).
- [ ] **Tests — Zod schema.**
      `apps/web/lib/site-config/__tests__/ops-schema.test.ts` asserts
      the discriminated union accepts every op type and rejects
      misspellings (`type: "setProps"` instead of `setProp`,
      `type: "setLinkmode"`, etc.).
- [ ] **Tests — orchestrator.**
      `apps/web/lib/ai/__tests__/ai-edit.test.ts` mirrors
      `initial-generation.test.ts`: mock client, happy path returning
      `kind: "ok"`, clarification path, parse-failure retry path,
      `APIConnectionError` → `network_error`, `AuthenticationError` →
      `auth_error`, `RateLimitError` → `over_quota`, image cap of 4
      enforced when 6 attachments are passed.
- [ ] **Tests — system prompt.**
      `apps/web/lib/ai/__tests__/ai-edit-prompt.test.ts` asserts every
      §9.3 + §8.12 clause is present in the prompt (same intent-by-
      intent style as Sprint 4's `initial-generation.test.ts`):
      references to `Operation`, the strict JSON output rule, the
      "no invented components" rule, the three §8.12 op names, and
      determinism (same input → same string).
- [ ] **Tests — endpoint.**
      `apps/web/app/api/ai-edit/__tests__/route.test.ts` covers:
      validation 400s on bad body shape; 404 on missing site; 503 on
      `over_quota` when the threshold is reached; 200 + ok payload on
      happy path with a mocked orchestrator; 502 + operation_invalid
      when the orchestrator returns ops that fail dry-run.
- [ ] **Tests — chat UI.**
      `apps/web/components/editor/ai-chat/__tests__/RightSidebarAiChat.test.tsx`
      and at least one focused test per sub-component
      (`Composer.test.tsx`, `SelectionChip.test.tsx`,
      `SuggestedPrompts.test.tsx`, `AiEditNarration.test.tsx`) cover:
      send → loading → ok turn renders Accept/Discard; Accept calls
      `commitAiEditOperations` exactly once with the parsed ops;
      Discard mutes the buttons; clarify renders the question with no
      buttons; error renders the §9.6 copy + Retry. Mock fetch
      throughout; never call the real Anthropic client.
- [ ] All new code has unit tests (Vitest).
- [ ] `pnpm test` passes with zero failures and zero skipped tests
      (excluding the two pre-existing skips inherited from earlier
      sprints).
- [ ] `pnpm build` succeeds with zero TypeScript errors and zero
      warnings.
- [ ] `pnpm lint` (Biome check) passes with zero warnings.
- [ ] Manual smoke test (below) passes on a fresh `pnpm dev`.
- [ ] No new files outside the "may create or modify" list.
- [ ] No new dependencies added without an approved Deviation.
      (Sprint 11 introduces zero new packages — every dependency
      it needs is already in the lockfile.)
- [ ] `DECISIONS.md` updated if any deviation was approved during
      this sprint.

## Operations vocabulary (binding — implement exactly these 25)

Every entry below corresponds to one variant in the discriminated union
`Operation`. Field names are exact. The "applies to" column is the
shape `applyOperation` validates before mutating. Spec citations are
inline.

**Tier 1 (`PROJECT_SPEC.md` §9.4):**

1. `addComponent({ parentId: ComponentId; index: number; component: ComponentNode })`
2. `removeComponent({ targetId: ComponentId })`
3. `moveComponent({ targetId: ComponentId; newParentId: ComponentId; newIndex: number })`
4. `setProp({ targetId: ComponentId; propPath: string; value: unknown })` — `propPath` is dot notation into `node.props`.
5. `setStyle({ targetId: ComponentId; stylePath: string; value: unknown })` — `stylePath` is dot notation into `node.style`.
6. `setAnimation({ targetId: ComponentId; on: "enter" | "hover"; preset: string; duration?: number; delay?: number })`
7. `setVisibility({ targetId: ComponentId; visibility: "always" | "desktop" | "mobile" })`
8. `setText({ targetId: ComponentId; text: string })` — convenience for Heading / Paragraph / Button label. Implementation: writes `props.text` for Heading/Paragraph, `props.label` for Button. For any other type, throws `OperationInvalidError`.
9. `bindRMField({ targetId: ComponentId; propPath: string; fieldExpression: string })` — `fieldExpression` is the raw token body (e.g. `"row.unitName"` or `"row.currentMarketRent | money"`); the op writes `"{{ ${fieldExpression} }}"` into the prop at `propPath`.
10. `addPage({ name: string; slug: string; atIndex?: number; fromTemplate?: string })` — defaults `kind: "static"`. The op MUST NOT create detail pages (those are user-authored only); detail-page creation via AI Edit is out of scope per §17 unless surfaced as a Deviation.
11. `removePage({ slug: string; kind?: "static" | "detail" })` — `kind` defaults to `"static"`. Removing the home page (slug=`"home"`, kind=`"static"`) throws `OperationInvalidError`.
12. `renamePage({ slug: string; kind?: "static" | "detail"; newName: string; newSlug?: string })` — `kind` defaults to `"static"`. Renaming the home page's slug throws.
13. `setSiteSetting({ path: string; value: unknown })` — dot path into top-level `SiteConfig` keys (`meta.siteName`, `brand.palette`, `brand.fontFamily`, `global.navBar.sticky`, etc.). The op rejects writes outside an allowlist of `meta`, `brand`, `global`.
14. `setPalette({ palette: PaletteId })` — convenience for `setSiteSetting({ path: "brand.palette", ... })`.

**Tier 1 additions from `PROJECT_SPEC.md` §8.12:**

15. `setLinkMode({ componentId: ComponentId; value: "static" | "detail" })` — applies to `Button` only. Other types throw.
16. `setDetailPageSlug({ componentId: ComponentId; value: string })` — applies to `Button` when `props.linkMode === "detail"`. Throws if the prop is `"static"`.
17. `setQueryParamDefault({ componentId: ComponentId; value: string | null })` — applies to `InputField`. `null` clears `props.defaultValueFromQueryParam`; a string sets it.

**Tier 2 (`PROJECT_SPEC.md` §9.4):**

18. `duplicateComponent({ targetId: ComponentId })` — clones the subtree, freshes every id via `newComponentId(...)` (Sprint 3 — read-only consumer), inserts the clone immediately after the source.
19. `wrapComponent({ targetId: ComponentId; wrapper: { type: ComponentType; props?: Record<string, unknown>; style?: StyleConfig } })` — wraps the target in a new node of `wrapper.type`, preserving the target as the wrapper's only child. The wrapper's id is freshly generated; the target keeps its id.
20. `unwrapComponent({ targetId: ComponentId })` — replaces the target with its children, splicing them in at the target's position. Throws if the target has zero children (no-op behavior would be ambiguous).
21. `reorderChildren({ parentId: ComponentId; newOrder: ComponentId[] })` — `newOrder` MUST be a permutation of the parent's existing children ids; mismatches throw.
22. `setRepeaterDataSource({ targetId: ComponentId; dataSource: DataBindingSource })` — applies to `Repeater` only. Reuses `DATA_BINDING_SOURCES` from `lib/site-config/data-binding/types.ts` for validation. Writes to `node.dataBinding.source`; preserves all other dataBinding fields.
23. `setRepeaterFilters({ targetId: ComponentId; query: FilterRuleGroup })` — applies to `Repeater` only. Reuses `filterRuleGroupSchema` from the data-binding module for validation. Writes to `node.dataBinding.filters`.
24. `setRepeaterSort({ targetId: ComponentId; sort: SortSpec })` — applies to `Repeater`. Reuses `sortSpecSchema`. Writes to `node.dataBinding.sort`.
25. `connectInputToRepeater({ inputId: ComponentId; repeaterId: ComponentId; field: string; operator: string })` — appends the connection to the Repeater's `dataBinding.connectedInputs` array. Throws if `inputId` does not refer to an `InputField` or if `repeaterId` does not refer to a `Repeater`.

Every op variant is also tagged with an optional `id?: string` field
on the wire (the AI may emit a stable id per op so error reports can
reference it). The `OperationInvalidError` message includes this id
when present so §9.6's "the change was discarded" copy can be more
specific in the future.

## Wire shapes (binding — implement exactly these)

```ts
// Request body sent to POST /api/ai-edit.
type AiEditRequest = {
  siteId: string;            // UUID
  currentVersionId: string;  // UUID — the working version row
  prompt: string;            // user's request, non-empty
  attachments?: Array<{ url: string }>; // capped at 4 server-side
  selection?: {              // optional; null when "whole page"
    componentIds: string[];  // typically length 1
    pageSlug: string;
    pageKind: "static" | "detail";
  };
  history?: Array<{          // last 6 turns of the local transcript
    role: "user" | "assistant";
    content: string;
  }>;
};

// Successful response (200): one of three shapes.
type AiEditResponse =
  | { kind: "ok"; summary: string; operations: Operation[] }
  | { kind: "clarify"; question: string }
  | { error: AiError };

// AiError comes from `lib/ai/errors.ts` — do not redefine.
```

The route handler validates `AiEditRequest` with Zod inline. The
orchestrator is responsible for mapping every model failure through
`categorizeAiError` exactly the way `generateInitialSite` does.

## File scope

### You may create or modify

**Owned outright:**
- `apps/web/app/api/ai-edit/route.ts`
- `apps/web/app/api/ai-edit/__tests__/route.test.ts`
- `apps/web/lib/ai/ai-edit.ts`
- `apps/web/lib/ai/__tests__/ai-edit.test.ts`
- `apps/web/lib/ai/prompts/ai-edit.ts`
- `apps/web/lib/ai/__tests__/ai-edit-prompt.test.ts`
- `apps/web/lib/site-config/ops.ts`
- `apps/web/lib/site-config/__tests__/ops.test.ts`
- `apps/web/lib/site-config/__tests__/ops-schema.test.ts`
- `apps/web/components/editor/ai-chat/RightSidebarAiChat.tsx`
- `apps/web/components/editor/ai-chat/MessageList.tsx`
- `apps/web/components/editor/ai-chat/MessageBubble.tsx`
- `apps/web/components/editor/ai-chat/Composer.tsx`
- `apps/web/components/editor/ai-chat/SelectionChip.tsx`
- `apps/web/components/editor/ai-chat/SuggestedPrompts.tsx`
- `apps/web/components/editor/ai-chat/AiEditNarration.tsx`
- `apps/web/components/editor/ai-chat/useAiEditChat.ts`
- `apps/web/components/editor/ai-chat/suggested-prompts.ts`
- `apps/web/components/editor/ai-chat/types.ts`
- `apps/web/components/editor/ai-chat/index.ts`
- `apps/web/components/editor/ai-chat/__tests__/RightSidebarAiChat.test.tsx`
- `apps/web/components/editor/ai-chat/__tests__/Composer.test.tsx`
- `apps/web/components/editor/ai-chat/__tests__/SelectionChip.test.tsx`
- `apps/web/components/editor/ai-chat/__tests__/SuggestedPrompts.test.tsx`
- `apps/web/components/editor/ai-chat/__tests__/AiEditNarration.test.tsx`

**Authorized hand-offs (declared upfront — not deviations):**
- `apps/web/components/editor/sidebar/RightSidebar.tsx` —
  Sprint 6 shipped this as a placeholder slot for Sprint 11. Sprint
  11 rewrites the file body to mount `<RightSidebarAiChat />`. The
  exported name `RightSidebar` is preserved so `EditorShell.tsx` is
  not modified.
- `apps/web/components/editor/index.ts` — append re-exports for the
  new ai-chat sub-components. No removals or reordering of existing
  exports. Append at the bottom of the file in alphabetical order.
- `apps/web/lib/editor-state/types.ts` — add ONE line in
  `EditorActions`: the `commitAiEditOperations` mutator signature.
- `apps/web/lib/editor-state/actions.ts` — add the implementation
  helper if needed (the mutator can also live entirely in `store.ts`
  by importing `applyOperations` directly; either layout is
  acceptable as long as the test boundaries hold).
- `apps/web/lib/editor-state/store.ts` — add ONE wiring line in the
  `creator` object that calls `applyOperations` and writes
  `{ draftConfig, saveState: "dirty" }` (or `{ saveState: "error",
  saveError }` on throw).

These five files were planned hand-offs from earlier sprints and are
NOT deviations. The Sprint Completion Report MUST list them in a
"Authorized hand-offs honored" subsection so the change is visible at
review time, but no Deviation Report is required.

### You may read but NOT modify

- `PROJECT_SPEC.md`.
- `apps/web/lib/site-config/schema.ts` — Sprint 3/3b's domain.
- `apps/web/lib/site-config/data-binding/**` — Sprint 9's domain.
- `apps/web/lib/ai/client.ts` — Sprint 4 (consume via
  `createAnthropicClient`).
- `apps/web/lib/ai/errors.ts` — Sprint 4 (consume `AiError`,
  `categorizeAiError`, `formatErrorReport`).
- `apps/web/lib/ai/generate-initial-site.ts` — Sprint 4 (pattern
  reference).
- `apps/web/lib/ai/prompts/initial-generation.ts` — Sprint 4 (pattern
  reference).
- `apps/web/lib/ai/prompts/snippets/component-catalog.ts` — Sprint 4
  (consume in the Sprint 11 prompt).
- `apps/web/lib/ai/prompts/snippets/data-sources.ts` — Sprint 4
  (consume).
- `apps/web/lib/ai/prompts/snippets/schema-prose.ts` — Sprint 4
  (consume).
- `apps/web/lib/supabase/**` — Sprint 0/1 (consume the service-role
  factory).
- `apps/web/lib/editor-state/selectors.ts` — Sprint 6 (consume; do
  not modify).
- `apps/web/components/editor/canvas/**` — Sprint 7's domain.
- `apps/web/components/editor/edit-panels/**` — Sprint 8's domain.
- `apps/web/components/editor/sidebar/data-tab/**` — Sprint 10's
  domain.
- `apps/web/app/[site]/edit/EditorShell.tsx` — Sprint 6 (do not
  modify; the rewritten `RightSidebar` keeps its export name).
- `apps/web/app/api/generate-initial-site/route.ts` — Sprint 4
  (read as the canonical route pattern).
- `apps/web/app/api/sites/[siteId]/working-version/route.ts` —
  Sprint 6 (consumed indirectly via autosave; do not modify).
- `apps/web/app/api/form-submissions/route.ts` — Sprint 10 (read as
  a second route pattern).

### You MUST NOT modify

- `PROJECT_SPEC.md` — raise concerns via the Deviation Protocol.
- `DECISIONS.md` — append-only; never edit existing entries.
- `apps/web/lib/rm-api/**` — Sprint 1's domain. Untouched.
- `apps/web/lib/site-config/schema.ts` — Sprint 3/3b. Untouched.
- `apps/web/lib/site-config/data-binding/**` — Sprint 9. Untouched.
- `apps/web/lib/ai/{client,errors,generate-initial-site,slug}.ts` —
  Sprint 4. Untouched.
- `apps/web/lib/ai/prompts/initial-generation.ts` — Sprint 4.
  Untouched.
- `apps/web/lib/ai/prompts/snippets/**` — Sprint 4. Untouched.
- `apps/web/components/site-components/**` — Sprint 5 / 5b territory.
  No prop changes, no schema changes, no behavior changes. Sprint 11
  exposes the §8.12 ops; the props they target already exist.
- `apps/web/components/renderer/**` — Sprint 3 / 9 territory.
- `apps/web/components/setup-form/**` — Sprint 2 territory.
- `apps/web/app/[site]/edit/EditorShell.tsx`,
  `apps/web/app/[site]/edit/page.tsx` — Sprint 6.
- `apps/web/app/[site]/preview/**` — Sprint 4.
- `apps/web/app/dev/**` — Sprint 5 / 9 fixtures.
- `apps/web/app/layout.tsx` — Sprint 9 (QueryProvider).
- `apps/web/app/api/generate-initial-site/**` — Sprint 4.
- `apps/web/app/api/sites/**` — Sprint 6.
- `apps/web/app/api/form-submissions/**` — Sprint 10.
- `supabase/**` — no migration changes for Sprint 11.
- `apps/web/package.json`, `pnpm-lock.yaml` — no new dependencies.
  All needed packages (`@anthropic-ai/sdk`, `zod`, `lucide-react`,
  shadcn/ui Dialog, etc.) are already in the lockfile.

If you find yourself needing to touch any file in this section to
make `pnpm build` pass, that is a Deviation. The §15.9 retroactive
cross-sprint cleanup carve-out (in the root `CLAUDE.md`) covers
test-file and config-file housekeeping only — it does not authorize
production-code edits in another sprint's domain.

## Manual smoke test (numbered, click-by-click)

Prerequisites: `apps/web/.env.local` populated with a real
`ANTHROPIC_API_KEY` and the four Supabase keys; `supabase link
--project-ref $SUPABASE_PROJECT_REF` already run; the seed already
loaded; at least one site already generated through Sprint 4's
`/setup` flow so `sites` and `site_versions` have rows.

1. Run `pnpm dev`.
2. Open `http://localhost:3000/setup` and generate a site if you
   don't have one. Note the site slug from the preview URL.
3. Navigate to `http://localhost:3000/<slug>/edit` (replace `<slug>`
   with your site's slug). Confirm the editor loads with the canvas
   centered and the right sidebar visible on the right edge.
4. Verify the right sidebar shows the AI Chat (input box at the
   bottom, transcript area above, no message bubbles yet, the
   placeholder copy "Ask anything about this site…" or similar in
   the empty transcript). Confirm the Selection chip reads
   `Editing: whole page`.
5. Click any component on the canvas (e.g. the HeroBanner). Verify
   the Selection chip now reads `Editing: HeroBanner — <id>` (the
   id will be a `cmp_*` string). Verify a few suggested-prompt chips
   appear contextual to the selection.
6. Type "Make the headline say Welcome to <CompanyName>" into the
   composer. Hit Send.
7. Verify the composer disables, a user bubble appears in the
   transcript, an "AI is thinking…" indicator with rotating
   narration appears (the four §9.5 strings rotate at ~3.5s
   intervals).
8. Wait for the response. Verify an assistant bubble appears with a
   short summary ("I'll change the hero headline to…") and an
   Accept / Discard pair of buttons.
9. Click Accept. Verify the canvas re-renders within ~1 second with
   the new headline visible in the HeroBanner. Verify the assistant
   bubble's buttons are replaced by an "Applied" tag.
10. In a separate terminal, run:
    `psql $DATABASE_URL -c "select id, source, created_at from
    site_versions where site_id = '<your-site-uuid>' order by
    created_at desc limit 5"` (or use Supabase Studio). Confirm a
    new row was NOT created for the Accept itself — Sprint 11 only
    PATCHes the working version row in place per Sprint 6's
    contract. (A new `is_working: true` row is only created by
    Sprint 13's Deploy.)
11. Click another component (e.g. the NavBar). Type "Add a Contact
    link to the navbar pointing to /contact" and Send.
12. On the assistant turn, click Discard. Verify the buttons are
    replaced by a "Discarded" tag and the canvas is unchanged.
13. Type "fix it" (deliberately ambiguous) and Send. The model is
    expected to return `kind: "clarify"`. Verify the assistant
    message renders ONLY the clarification question (no Accept /
    Discard buttons) and the composer is re-enabled.
14. Reply with a specific clarification (e.g. "make the navbar
    sticky"). Verify the chat continues; on the new assistant turn
    Accept / Discard reappear.
15. Disconnect from the network. Type any request and Send. Verify
    the chat renders the §9.6 `network_error` copy and a Retry
    button. Click Retry — it should fail again and re-display the
    error. Reconnect, click Retry, and verify the response succeeds.
16. Click the "Copy details" button on the error bubble; paste into
    a scratch buffer. Verify the JSON contains `"kind":
    "network_error"` and a `message` field.
17. Type a request that exercises a §8.12 op, e.g. "Make the
    'View units' button on the property card link to the units
    detail page." Send. Verify the response includes a
    `setLinkMode` op with `value: "detail"` (visible in the
    summary's bulleted operations list). Click Accept. Re-render
    the page in preview mode and confirm the button now points at
    `/units/<rowId>`.
18. Run `pnpm test` from the repo root. Confirm the new tests pass
    and the suite's pre-existing skip count is unchanged.
19. Run `pnpm build`. Confirm "Compiled successfully" with zero
    TypeScript errors.
20. Run `pnpm lint`. Confirm zero warnings.

If any step fails, treat the failure as a Deviation per the
protocol below — do not commit a partial sprint.

## Coding standards (binding — copied verbatim from `PROJECT_SPEC.md` §15)

### 15.1 TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`,
  `noImplicitAny: true`.
- No `any`. If you reach for it, use `unknown` and narrow.
- Prefer types over interfaces unless extending.
- Branded types for IDs: `type SiteId = string & { __brand: "SiteId" }`.

### 15.2 React

- Server components by default. `"use client"` only where needed.
  All Sprint 11 chat components are `"use client"`.
- One component per file. File name = export name.
- Use `cn(...)` helper from shadcn for class merging.
- No prop drilling deeper than 2 levels — lift to Zustand.

### 15.3 Naming

- Files: `kebab-case.ts(x)`. (Sprint 11 follows the existing camelCase
  filenames for the chat components — `RightSidebarAiChat.tsx`,
  `MessageList.tsx`, etc. — to match the `apps/web/components/editor/`
  convention already in place. Lowercase module files like
  `suggested-prompts.ts` use kebab-case.)
- Components: `PascalCase`.
- Hooks: `useThing`.
- API routes: `kebab-case`.
- Database tables: `snake_case`.
- DB columns: `snake_case`.
- TypeScript fields: `camelCase` (translate at the boundary).

### 15.4 Commits

- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`,
  `docs:`, `test:`.
- One concern per commit. If a commit message has "and" in it, split
  it.

### 15.5 Testing

- Unit-test every operation in `lib/site-config/ops.ts`.
- Unit-test the orchestrator with mocked clients.
- Unit-test the chat hook with `vi.fn()` fetch mocks.

### 15.6 Comments

- Comment *why*, not *what*. Code says what.
- TODO comments must include a person/owner: `// TODO(max): …`.
- No commented-out code in committed files.

### 15.7 Quality gates (binding)

A sprint is not "done" until ALL of the following pass:

- `pnpm test` (Vitest, all tests including new ones).
- `pnpm build` (Next.js production build, zero TypeScript errors).
- `pnpm lint` (Biome check, zero warnings).
- The sprint's manual smoke test.

If any check fails, treat it as a Deviation. Do not commit. Do not
declare the sprint complete.

### 15.8 Deviation discipline

Claude Code MUST NOT silently substitute, downgrade, or skip work.
The full Deviation Protocol is below. Every sprint inherits it.

### 15.9 Retroactive cross-sprint cleanup

When the current sprint's quality gates cannot pass because of a
pre-existing breakage owned by an earlier sprint (typically a
TypeScript error in a Sprint N test file that blocks `pnpm build`),
Claude Code is permitted to apply a minimal, surgical fix to the
offending earlier-sprint test or config file rather than emitting a
Deviation per occurrence. Constraints are binding: smallest possible
change, no behavior changes, test/config files only (production code
in another sprint's domain still requires a Deviation), each fix
logged in `DECISIONS.md` and listed in the Sprint Completion Report's
"Retroactive cross-sprint fixes" subsection. See the root `CLAUDE.md`
§15.9 for the full text.

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
- "Approved with changes: [...]" → implement with the user's
  modifications.
- "Rejected — [direction]" → discard the proposal; follow the new
  direction.
- A clarifying question → answer it; do not start work yet.
- Anything else → ask "Is that an approval to proceed?" Do not
  assume.

After any approved deviation, append an entry to `/DECISIONS.md`
with date, sprint, what was changed, and the user's approval message
verbatim.

## Definition of "done" gating

A sprint is not done until all of the following pass with no warnings:

- `pnpm test`
- `pnpm build`
- `pnpm lint` (Biome check)
- The manual smoke test above.

If any check fails, treat it as a Deviation. Do not commit. Do not
declare the sprint complete.

## Useful local commands

- `pnpm dev` — local dev server at <http://localhost:3000>.
- `pnpm test` — Vitest, all tests.
- `pnpm test apps/web/lib/site-config/__tests__/ops.test.ts` — fast
  iteration on the operations module.
- `pnpm test apps/web/lib/ai/__tests__/ai-edit.test.ts` — fast
  iteration on the orchestrator.
- `pnpm test apps/web/components/editor/ai-chat/__tests__/` — fast
  iteration on the chat UI.
- `pnpm build` — production build.
- `pnpm lint` — Biome check.
- `pnpm format` — Biome format --write.
- `pnpm typecheck` — TypeScript no-emit check.

## Notes & hints (non-binding context)

- **Pattern reference, route handler.** `apps/web/app/api/generate-initial-site/route.ts`
  is the closest existing parallel. Mirror its module-level comment
  structure, its `runtime = "nodejs"` declaration, its `jsonError(...)`
  helper, its `httpStatusForError(...)` switch, and its
  `ErrorResponseBody` / `SuccessResponseBody` types verbatim where
  the shapes are equivalent.
- **Pattern reference, orchestrator.** `apps/web/lib/ai/generate-initial-site.ts`
  is the closest existing parallel. The `aiEdit` orchestrator should
  copy its retry logic (single retry on Zod parse failure with a
  follow-up message stating "your previous output failed validation;
  here's the schema again") verbatim per §9.7.
- **Pattern reference, system prompt.** `apps/web/lib/ai/prompts/initial-generation.ts`
  is the closest existing parallel. Reuse the same string-builder
  pattern: a top-level `buildAiEditSystemPrompt(input)` function that
  composes section strings via template literals, with each section a
  named local constant for grep-ability.
- **Pattern reference, editor-state mutator.** The `setComponentDataBinding`
  mutator added by Sprint 9 is the textual model for
  `commitAiEditOperations`. Copy its location in `types.ts`, the
  three-line implementation in `actions.ts` (or skip `actions.ts` if
  the body fits in `store.ts` directly per Sprint 9's post-deviation
  pattern), and the wiring line in `store.ts`. The `try/catch` to
  produce `saveState: "error"` on `OperationInvalidError` is new and
  unique to Sprint 11.
- **Anthropic SDK image blocks.** When attachments are present, the
  user-message content array carries `{ type: "image", source:
  { type: "url", url } }` blocks before the `{ type: "text", text }`
  block. Mirror Sprint 4's `generate-initial-site.ts` image handling.
  Cap at 4 per request before sending.
- **Selection serialization.** `selectSelectedComponentNode` returns
  `ComponentNode | null`; for the prompt's "current selection" block,
  serialize id + type + a shallow JSON of `props` only. Don't serialize
  the whole subtree — it's already in the SiteConfig JSON earlier in
  the prompt.
- **History windowing.** Cap the `history` field to the last 6
  turns (3 user + 3 assistant) on the client before sending. Older
  turns are noise for the model and burn tokens. The assistant's
  ops payloads are dropped from the history window — only the
  `summary` strings ride along.
- **Test boundaries.** `apps/web/components/editor/ai-chat/__tests__/`
  tests must NEVER hit the real Anthropic client. `vi.stubGlobal('fetch', …)`
  is the right primitive. Mock the whole `/api/ai-edit` POST/response.
- **Cost guardrail counter source.** The §9.9 200-edit cap is on the
  `site_versions` table, but Sprint 11 does NOT write to that table on
  every edit (the autosave PATCH does). For Sprint 11 the guardrail
  is forward-compat: the count is taken via
  `select count(*) from site_versions where site_id = $1 and source =
  'ai_edit'`. Until Sprint 13 starts producing `source = 'ai_edit'`
  rows, this count will always be 0 — that is fine and intentional.
  The wiring is built; the rows fill in once Sprint 13 + the future
  ai-edit-version-snapshot work lands.
- **Loading narration timing.** Use `setInterval(advance, 3500)` and
  guard against the interval firing after the loading state ends.
  Cleanup via the `useEffect` return.
- **Where Accept commits.** Accept calls `commitAiEditOperations(ops)`
  exactly once. The store's autosave loop (Sprint 6's `useAutosave`)
  picks up the dirty flip and PATCHes the working version row; do
  not write a separate PATCH in the chat hook.
- **No version history.** Per §8.7's "No version history side-tab in
  the demo" note, the chat does NOT need to render undo/version
  history. Accept/Discard against the working version is the entire
  durability story until Sprint 13's Deploy.
- **Image attachment rejection.** Files larger than 5 MB before
  resize should reject client-side with a small inline error chip
  next to the composer ("That image is too large; max 5 MB.").
  Don't burn a network round-trip on a doomed upload.
- **Suggested-prompt mapping.** For the demo, three to four prompts
  per type is sufficient. Don't over-engineer — the table is a plain
  `Record<ComponentType, string[]>` plus a default fallback for
  whole-page ("Add a section about us", "Change the color palette",
  "Add a contact form"). The Sprint Completion Report should include
  the exact mapping you ship so future sprints have a paper trail.

---

*End of Sprint 11 CLAUDE.md.*