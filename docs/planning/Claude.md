# CLAUDE.md — Sprint 12: Element 1 Adjustment Chat

> Drop this file at the repo root in place of (or alongside) the master
> `CLAUDE.md` for the duration of Sprint 12. Restore the master afterwards.
> The repo root must also contain `PROJECT_SPEC.md` and `DECISIONS.md`.

---

## Mission

Build the Element 1 "Request adjustments" chat (`PROJECT_SPEC.md` §2.2 item 6
and §7.5). After a successful initial generation, the user sees a freshly
rendered preview iframe in the `PreviewPanel`. Sprint 12 mounts a chat
control directly under that iframe so the user can keep refining the site —
in plain English, with optional image attachments — before they ever click
**Open in Editor**. Each successful adjustment writes a new working-version
config to Supabase and re-renders the iframe. The chat reuses Sprint 11's
`/api/ai-edit` endpoint verbatim; no model logic is duplicated.

This sprint does **not** add a separate "Accept / Discard" review step.
`PROJECT_SPEC.md` §2.2 / §7.5 describe Element 1's adjustment loop as
auto-apply: prompt → ops → PATCH → reload. Element 2's review-first flow
(Sprint 11) stays untouched. If you find yourself adding Accept / Discard,
that is a deviation — emit a Deviation Report.

## Spec sections in scope

- `PROJECT_SPEC.md` §2.2 — Element 1 → Element 2 handoff (item 6 is the
  adjustment chat behavior).
- `PROJECT_SPEC.md` §7.3 — `PreviewPanel` layout (you extend the
  generated-state region, do not touch the empty / generating / error
  states beyond layout reflow).
- `PROJECT_SPEC.md` §7.5 — Adjustment chat behavior (the canonical
  description of the loop).
- `PROJECT_SPEC.md` §9.4 — Operations vocabulary (read-only — you
  *consume* `applyOperations` from `lib/site-config/ops.ts`; you do
  not modify it).
- `PROJECT_SPEC.md` §9.6 — AI error envelope (`AiError` shape and the
  user-facing copy table — reuse Sprint 4's `PreviewPanel` table verbatim).
- `PROJECT_SPEC.md` §9.7 — Image attachments (max 4 per message,
  ≤ 5 MB each, image MIME types only).
- `PROJECT_SPEC.md` §11 — `SiteConfig` schema (read-only — you parse
  via `safeParseSiteConfig`; you never extend it).
- `PROJECT_SPEC.md` §15 — Coding standards (binding — see §"Coding
  standards" below).

## Authorized scope expansion (read carefully)

`SPRINT_SCHEDULE.md`'s short owned-list for Sprint 12 is
`AdjustmentChat.tsx` + `PreviewPanel.tsx` integration. The Sprint
Architect expanded that list during planning to also include:

1. A `GET` handler added to the existing
   `apps/web/app/api/sites/[siteId]/working-version/route.ts` (Sprint 6
   territory). Without a JSON GET, the client cannot load the current
   `SiteConfig` to apply operations to. The DECISIONS.md 2026-04-25
   Sprint 6 entry deliberately removed `lib/sites/repo.ts`; Sprint 12
   re-uses the inlined Supabase pattern from that decision.
2. `apps/web/components/setup-form/SetupExperience.tsx` (Sprint 4
   territory) — the four-line addition that carries `siteId` and
   `versionId` from the `/api/generate-initial-site` response into
   `PanelState`.
3. A small `PanelState` shape extension in `PreviewPanel.tsx` (already
   in this sprint's listed owned set).

These are pre-approved, additive, and behavior-preserving for existing
callers. The expansion is logged as a Sprint 12 entry in `DECISIONS.md`
that you (Claude Code) MUST append at the end of the sprint — see the
DoD. If you discover during execution that any of these three additions
cannot be made surgically (e.g. the GET would need a different path,
the existing PATCH tests break), STOP and emit a Deviation Report.

Anything *beyond* those three additions is out of scope. New API routes,
new lib/ modules, new shared components, new dependencies → Deviation.

## Definition of Done

- [ ] **DoD-1.** A new client component
      `apps/web/components/setup-form/AdjustmentChat.tsx` exists. It is
      a `"use client"` component. Default-exported as a named export
      `AdjustmentChat`. Props: `{ siteId: string; versionId: string;
      onConfigUpdated: () => void }`. When mounted it renders: a
      transcript area, a textarea input, an image-attach button, and a
      Send button. Empty-state copy under the transcript (when
      transcript is empty) reads exactly: *"Want to adjust something?
      Ask the AI."*
- [ ] **DoD-2.** `apps/web/components/setup-form/PreviewPanel.tsx`'s
      exported `PanelState` discriminated-union extends the
      `"generated"` variant with two new required string fields:
      `siteId` and `versionId`. The existing
      `previewUrl` and `siteSlug` fields are preserved. Importers must
      not break — only `SetupExperience` produces this state today and
      it is updated in lockstep.
- [ ] **DoD-3.** When `state.kind === "generated"`, `PreviewPanel`
      renders `<AdjustmentChat siteId={state.siteId}
      versionId={state.versionId} onConfigUpdated={...} />` directly
      below the iframe inside the same fake-browser-chrome card. The
      empty / generating / error states are visually unchanged.
- [ ] **DoD-4.** `PreviewPanel`'s iframe gains a generation-token
      cache-buster: its `src` becomes
      `` `${state.previewUrl}${state.previewUrl.includes("?") ? "&" : "?"}t=${token}` ``,
      where `token` is an integer that starts at `0` on mount of the
      generated state and is incremented by `onConfigUpdated`. The
      iframe is wrapped in `key={token}` so React fully remounts it on
      every increment. The existing `?v={versionId}` query string in
      `previewUrl` is preserved verbatim — the cache-buster appends, it
      never replaces.
- [ ] **DoD-5.**
      `apps/web/components/setup-form/SetupExperience.tsx`'s `submit`
      function captures `siteId` and `versionId` from the
      `/api/generate-initial-site` response and writes them into the
      new `PanelState["generated"]` shape. The `extractError` helper
      and the `lastPayload` retry path are unchanged.
- [ ] **DoD-6.** A new `GET` handler is added to
      `apps/web/app/api/sites/[siteId]/working-version/route.ts`. On
      success it returns `200` with body
      `{ versionId: string, config: SiteConfig }`. On no-matching-row
      it returns `404` with the existing `ErrorBody` envelope
      (`{ category: "not_found", message }`). On Supabase error it
      returns `500` with `{ category: "server_error", message }`. The
      handler uses `createServiceSupabaseClient()`, declares
      `runtime = "nodejs"`, and respects `dynamic = "force-dynamic"`
      (already declared at module scope — do not duplicate).
- [ ] **DoD-7.** `AdjustmentChat` hydrates its local `SiteConfig` state
      via the new `GET` on mount. While hydrating, the input and Send
      button are disabled with an `aria-busy="true"` indicator. If the
      GET fails, the chat surface displays the §9.6 copy keyed on the
      error category (`server_error` → "Service unavailable, please
      try again later." / `not_found` → "Couldn't load your site
      preview. Try refreshing the page.") and stays disabled.
      Hydration errors do **not** crash `PreviewPanel`.
- [ ] **DoD-8.** On Send: `AdjustmentChat` POSTs to `/api/ai-edit`
      with the body `{ siteId, currentVersionId: versionId, prompt,
      attachments }`. `selection` and `history` are intentionally
      omitted (Element 1's chat is whole-site and stateless across
      turns per `PROJECT_SPEC.md` §7.5). The Send button is disabled
      while the request is in flight. The user message is appended to
      the transcript immediately (optimistic).
- [ ] **DoD-9.** On a `kind: "ok"` response: `AdjustmentChat` applies
      the returned `Operation[]` to its local `SiteConfig` via
      `applyOperations` from `@/lib/site-config/ops`, then PATCHes the
      resulting full `SiteConfig` to
      `/api/sites/[siteId]/working-version`. On `204` (success) it
      replaces its local config with the new one, calls
      `props.onConfigUpdated()`, and appends an assistant message
      containing the response's `summary` to the transcript. There is
      **no** Accept / Discard step — the operation is auto-applied per
      §7.5.
- [ ] **DoD-10.** On a `kind: "clarify"` response: `AdjustmentChat`
      appends an assistant message containing the `question` verbatim.
      No `applyOperations` call. No PATCH. No `onConfigUpdated` call.
      Local config is not touched. The user can immediately reply with
      another prompt.
- [ ] **DoD-11.** On any error response (`{ error: AiError }` or
      `applyOperations` throws `OperationInvalidError` or the PATCH
      returns non-204): `AdjustmentChat` appends an assistant error
      message using exactly the same `ERROR_COPY` table that
      `PreviewPanel` uses today. Network failures map to
      `network_error`. PATCH non-204 maps to `auth_error` (matches
      `PreviewPanel`'s server-error treatment). `applyOperations`
      throwing maps to `operation_invalid`. Errors do **not** mutate
      the local config or call `onConfigUpdated`.
- [ ] **DoD-12.** Image attachments. Clicking the attach button opens
      a native file picker (`<input type="file" accept="image/*"
      multiple>`). Files are validated client-side: ≤ 4 per message
      (rejection copy: "You can attach up to 4 images per message."),
      ≤ 5 MB each ("Each image must be 5 MB or smaller."), MIME type
      starts with `image/` ("Only image files are supported."). Valid
      files are uploaded to the Supabase Storage `ai-attachments`
      bucket with a randomized prefix; the resulting public URLs are
      attached to the next Send. Pending attachments render as small
      thumbnail chips above the input with a remove (×) button each.
      The chips clear after a successful Send.
- [ ] **DoD-13.** Concurrency. The Send button is disabled while any
      request (`/api/ai-edit` POST, `/api/sites/[siteId]/working-
      version` PATCH, attachment upload) is in flight, AND while
      hydration is pending. There is no in-memory queue — the user
      waits for one round-trip to finish before issuing the next.
- [ ] **DoD-14.** The chat is fully unmounted (returns `null`) when
      `state.kind` is anything other than `"generated"`. It performs
      no network requests in any other state. `PreviewPanel` does not
      render `<AdjustmentChat>` outside the generated state.
- [ ] **DoD-15.** A unit test file
      `apps/web/components/setup-form/__tests__/adjustment-chat.test.tsx`
      exists. It uses `vi.fn()` mocks for `fetch` (covering both the
      GET and the POSTs) and asserts: (a) hydrate call hits GET on
      mount; (b) Send while not hydrated is impossible; (c) ok
      response triggers PATCH and `onConfigUpdated`; (d) clarify does
      not trigger PATCH; (e) error response shows the right copy and
      does not trigger PATCH; (f) attachments enforce ≤ 4 / ≤ 5 MB /
      image MIME; (g) 5th attachment is rejected with the expected
      copy; (h) an `OperationInvalidError` thrown during apply yields
      `operation_invalid` copy; (i) PATCH 500 yields `auth_error`
      copy. Storage upload is mocked.
- [ ] **DoD-16.** The existing
      `apps/web/components/setup-form/__tests__/preview-panel.test.tsx`
      "generated state" assertion is updated to provide the new
      `siteId` / `versionId` fields and asserts the `<AdjustmentChat>`
      is rendered (`getByTestId("adjustment-chat")`). The empty /
      generating / error / Copy-details / Retry tests are otherwise
      unchanged.
- [ ] **DoD-17.** The existing
      `apps/web/components/setup-form/__tests__/setup-experience.test.tsx`
      success-path test asserts the `data-panel-state="generated"`
      element also has a child with `data-testid="adjustment-chat"`.
      `siteId` / `versionId` are part of the mocked response.
- [ ] **DoD-18.** A new GET test block in
      `apps/web/app/api/sites/[siteId]/working-version/__tests__/route.test.ts`
      asserts: (a) 200 with body shape `{ versionId, config }` on
      success; (b) 404 with `category: "not_found"` when no working
      row; (c) 500 with `category: "server_error"` on Supabase error;
      (d) the `siteId` is read from the route context. The existing
      PATCH tests are unchanged.
- [ ] **DoD-19.** No new dependencies. No new top-level files outside
      the owned-paths list above.
- [ ] **DoD-20.** No `any`. No `// @ts-expect-error`. No skipped
      tests. No commented-out code.
- [ ] **DoD-21.** `pnpm test` passes with zero failures and zero
      skipped tests.
- [ ] **DoD-22.** `pnpm build` succeeds with zero TypeScript errors.
- [ ] **DoD-23.** `pnpm biome check` passes with zero warnings.
- [ ] **DoD-24.** Manual smoke test (numbered list at the end of this
      file) passes on a fresh `pnpm dev`.
- [ ] **DoD-25.** A Sprint 12 execution-record entry is appended to
      the END of `DECISIONS.md` (do not edit any earlier entry). The
      entry: (a) records the three pre-approved scope expansions
      listed above; (b) records any Deviations approved during
      execution; (c) lists the Sprint Completion Report's "External
      actions required" verbatim if any.

## Files you may create or modify

- `apps/web/components/setup-form/AdjustmentChat.tsx` (NEW)
- `apps/web/components/setup-form/__tests__/adjustment-chat.test.tsx` (NEW)
- `apps/web/components/setup-form/PreviewPanel.tsx` (MODIFY — extend
  `PanelState["generated"]`, render `<AdjustmentChat>`, wire iframe
  cache-buster)
- `apps/web/components/setup-form/__tests__/preview-panel.test.tsx`
  (MODIFY — update generated-state assertion only)
- `apps/web/components/setup-form/SetupExperience.tsx` (MODIFY —
  capture `siteId` and `versionId` into `PanelState`)
- `apps/web/components/setup-form/__tests__/setup-experience.test.tsx`
  (MODIFY — assert AdjustmentChat is mounted in the generated state)
- `apps/web/app/api/sites/[siteId]/working-version/route.ts` (MODIFY —
  add `GET` handler alongside existing `PATCH`)
- `apps/web/app/api/sites/[siteId]/working-version/__tests__/route.test.ts`
  (MODIFY — add GET test block; do not touch PATCH tests)
- `DECISIONS.md` (APPEND ONLY — Sprint 12 execution-record entry at
  the END of the file)

If a path you need to touch is not in this list, STOP and emit a
Deviation Report. Surgical, behavior-preserving inherited test fixes
under CLAUDE.md §15.9 are allowed without a Deviation but MUST be
listed in the Sprint 12 DECISIONS.md entry.

## Files you MUST NOT modify

- `PROJECT_SPEC.md` — authoritative spec; raise concerns via the
  Deviation Protocol, never edit.
- The repo-root `CLAUDE.md`.
- `apps/web/app/api/ai-edit/**` — Sprint 11 territory. Reuse via
  `fetch("/api/ai-edit", ...)` only.
- `apps/web/lib/ai/**` — Sprint 4 / 11 territory.
- `apps/web/lib/site-config/**` — Sprint 3 / 3b territory. You import
  `applyOperations`, `safeParseSiteConfig`, and types; you do not edit.
- `apps/web/lib/editor-state/**` — Sprint 6 / 11 territory. The
  `useAiEditChat` patterns are reference reading only — do NOT import
  from `apps/web/components/editor/ai-chat/**` into the setup-form
  tree. If you find a useful helper there that you want, copy the
  minimum logic (with attribution comment) into the setup-form module.
- `apps/web/components/editor/**` — entire editor tree.
- `apps/web/components/site-components/**` — site-component tree.
- `apps/web/app/[site]/preview/**` — Sprint 4 territory. The
  cache-buster query param works because `/preview/page.tsx` reads
  `v` from the URL and ignores all other params; do not modify it to
  read your `t` param.
- `apps/web/app/api/generate-initial-site/**` — Sprint 4 territory.
- `apps/web/app/[site]/edit/**` — Sprint 6 territory.
- All other `apps/web/app/api/**` routes (each is owned by its sprint).
- `supabase/migrations/**` — no schema change is needed for Sprint 12.
- Any `lib/**` module not explicitly listed as importable above.

## Coding standards (binding — copied from `PROJECT_SPEC.md` §15)

### TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitAny: true`
  are already on. Honor them.
- No `any`. If you reach for it, use `unknown` and narrow.
- Prefer types over interfaces unless extending.
- Branded types for IDs are not introduced for chat-local state — use
  the existing `SiteId` / `VersionId` brands if and only if the
  surrounding code already does.

### React

- Server components by default. `"use client"` only where needed.
  `AdjustmentChat` is a client component (it owns local state and uses
  `fetch` from the browser).
- One component per file. File name = export name.
- Use the `cn(...)` helper from `@/lib/utils` for class merging.
- No prop drilling deeper than 2 levels.
- All interactive elements have an accessible name (`aria-label`,
  visible label, or `<label htmlFor>`).

### Naming

- Files: `kebab-case.ts(x)` for non-component files;
  `PascalCase.tsx` for React components per the existing
  `setup-form/` convention (e.g. `PreviewPanel.tsx`).
- Components: `PascalCase`.
- Hooks: `useThing`.
- API routes: `kebab-case`.

### Testing

- Vitest for unit tests; React Testing Library for component tests.
- Mock `fetch` at the test level. Do not hit the network. Do not
  start a Supabase client.
- Test file name mirrors the source: `adjustment-chat.test.tsx` next
  to `AdjustmentChat.tsx` under `__tests__/`.
- Every Definition-of-Done bullet that names a behavior gets at least
  one test. If a behavior is hard to test, that is a Deviation, not
  an excuse.

### Errors and copy

- The `AiError` envelope from `@/lib/ai/errors` is the **only** error
  shape the chat surfaces. Do not invent new `kind` values. Do not
  let raw network errors leak into the UI.
- The §9.6 user-facing copy table already lives as a private const
  in `PreviewPanel.tsx`. Sprint 12 may either: (a) inline the same
  copy table in `AdjustmentChat.tsx`, or (b) extract it to a tiny
  shared module under `apps/web/components/setup-form/error-copy.ts`
  (allowed because both `PreviewPanel.tsx` and `AdjustmentChat.tsx`
  are owned). If you extract, update `PreviewPanel.tsx` to import
  from it. Either choice is fine — pick one and stick to it.

### CLAUDE.md §15.9 carve-out (cross-sprint test fixes)

If a Sprint 12 quality gate (`pnpm test` / `pnpm build` / `pnpm biome
check`) surfaces a failure that originates in another sprint's test
file (not production code), you may apply a minimal,
behavior-preserving fix to that test file without re-raising a
Deviation Report. Each such fix MUST be logged in the Sprint 12
`DECISIONS.md` entry. If the failure is in production code owned by
another sprint, that is a Deviation — stop and report.

## Deviation Protocol (mandatory — do not modify)

If you (Claude Code) discover during this sprint that ANY part of the plan
cannot be implemented exactly as written, you MUST stop and emit a
Deviation Report in the format below. You MUST NOT proceed with an
alternative until the user has explicitly approved it with the words
"Approved" or equivalent.

A "deviation" includes: missing/broken/incompatible libraries, impossible
function signatures, scope additions, file additions outside the declared
scope, test plans that cannot be executed as written, and any case where
you catch yourself thinking "I'll just do it slightly differently."

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

Approval forms accepted from the user:

- `Approved` — implement the alternative as proposed.
- `Approved with changes: [...]` — implement with the user's modifications.
- `Rejected — [direction]` — discard the alternative; follow the new direction.
- A clarifying question — answer it; do not start work yet.

If the user's reply is anything else, ask: "Is that an approval to
proceed?" Do not assume.

After any approved deviation, append an entry to the Sprint 12 record in
`DECISIONS.md` with: date, sprint, what was changed, the user's approval
message verbatim.

## Definition of "done" gating

A sprint is not done until all of the following pass with zero warnings:

- `pnpm test`
- `pnpm build`
- `pnpm biome check`
- The manual smoke test below.

If any check fails, treat it as a Deviation. Do not commit. Do not
declare the sprint complete.

## Useful local commands

- `pnpm dev` — local dev server (Next.js 15 + hosted Supabase)
- `pnpm test` — Vitest
- `pnpm test apps/web/components/setup-form` — narrow Vitest run
- `pnpm test apps/web/app/api/sites` — narrow Vitest run for route tests
- `pnpm build` — TypeScript + Next.js production build
- `pnpm biome check` — formatting + lint
- `pnpm typecheck` — TypeScript only (faster than full build during
  iteration)

Hosted Supabase note: per the 2026-04-25 entry in `DECISIONS.md`, the
local Docker stack is not used. The five env vars in `apps/web/.env.local`
must be populated from the hosted project's "Project Settings → API/
General" pages, plus the Anthropic console key. Re-run `pnpm dev` after
any env edit.

## Pre-flight checklist (run BEFORE writing code)

Run each of these and confirm. If any fails, emit a Deviation Report.

1. `apps/web/app/api/ai-edit/route.ts` exists and exports a `POST`
   handler that accepts `{ siteId, currentVersionId, prompt,
   attachments?, selection?, history? }` and returns either
   `{ kind: "ok"; summary; operations }`, `{ kind: "clarify";
   question }`, or `{ error: AiError }`. (Sprint 11.)
2. `apps/web/app/api/sites/[siteId]/working-version/route.ts` exists
   and exports a `PATCH` handler that takes `{ config: SiteConfig }`
   and returns 204 / 400 / 404 / 500. (Sprint 6.)
3. `apps/web/lib/site-config/ops.ts` exports `applyOperations(config,
   ops)` and `OperationInvalidError`. (Sprint 11.)
4. `apps/web/lib/site-config` re-exports `safeParseSiteConfig` and the
   `SiteConfig` type. (Sprint 3.)
5. `apps/web/lib/ai/errors.ts` exports `AiError` and `AiErrorKind`.
   (Sprint 4.)
6. `apps/web/components/setup-form/PreviewPanel.tsx` currently exports
   a `PanelState` discriminated union with a `"generated"` variant
   carrying `previewUrl: string` and `siteSlug: string`. (Sprint 4.)
7. `apps/web/components/setup-form/SetupExperience.tsx` currently
   POSTs to `/api/generate-initial-site` and parses the response into
   `{ siteId?: string; slug?: string; versionId?: string;
   previewUrl?: string }`. (Sprint 4.)
8. The Supabase Storage `ai-attachments` bucket exists in the hosted
   project. If it does not, list its absence under "External actions
   required" in the Sprint Completion Report — do NOT create it from
   code, and do NOT skip DoD-12.

## Manual smoke test (numbered, click-by-click)

1. Confirm `apps/web/.env.local` has all five hosted-Supabase /
   Anthropic env vars populated. Run `pnpm dev`.
2. Open `http://localhost:3000/setup`.
3. Type "Aurora Cincy" into the **Company Name** field.
4. Click the **Ocean** palette card under **Color Scheme**.
5. Click **Ready to Preview & Edit?** (the Save button on the setup
   form).
6. Wait for the preview iframe to render. Confirm the
   `data-testid="preview-panel-pill"` reads "Live" and the URL bar
   inside the panel shows `https://www.aurora-cincy.com`.
7. **Verify Sprint 12 mount.** Below the iframe, an element with
   `data-testid="adjustment-chat"` is visible. The empty-state copy
   "Want to adjust something? Ask the AI." is shown. The Send button
   is disabled (no prompt text yet).
8. Type into the chat input: `Change the headline to Welcome Home`.
   The Send button enables.
9. Click **Send**. Confirm: (a) the user message appears in the
   transcript immediately; (b) a `Thinking…` indicator appears; (c)
   the indicator is replaced by an assistant summary message; (d) the
   iframe re-renders (visually flickers / remounts).
10. The headline inside the iframe now reads (close to) "Welcome
    Home". (Exact wording is at the model's discretion; the change
    must be visible.)
11. **Verify the database write.** Open the hosted Supabase project
    in a browser → SQL editor. Run:
    ```sql
    select id, is_working, config -> 'pages' -> 0 -> 'rootComponent'
    from site_versions
    where site_id = (select id from sites where slug = 'aurora-cincy')
      and is_working = true;
    ```
    Confirm exactly one row, `is_working = true`, and the headline
    text appears somewhere inside the `pages[0].rootComponent` JSON.
12. **Clarification path.** Type `make it better` and click **Send**.
    Confirm: (a) the assistant returns a single clarifying question
    in the transcript; (b) the iframe does **not** re-render; (c) no
    new write to the working version (re-run the SQL from step 11
    and confirm the JSON is unchanged from step 11).
13. **Network-error path.** Open DevTools → Network → set throttling
    to "Offline". Type `add a footer with our address` and click
    **Send**. Confirm an error message with the network_error copy
    "We couldn't reach our AI service. Check your connection and try
    again." appears. Set throttling back to "No throttling".
14. **Attachment validation.** Click the attach button. Try to
    upload a 6 MB image. Confirm the inline rejection copy "Each
    image must be 5 MB or smaller." Try to upload a `.txt` file.
    Confirm the rejection copy "Only image files are supported."
    Upload four small valid images, then a fifth. Confirm the fifth
    is rejected with "You can attach up to 4 images per message."
15. **Attachment success.** Remove the attached chips. Upload one
    small valid image. Type `keep this hero image style` and click
    **Send**. Confirm: (a) the request body in DevTools → Network →
    Payload includes `attachments: [{ url: "https://..." }]` with a
    Supabase Storage public URL; (b) the chips clear from the input
    after the response.
16. **Concurrency.** Type a prompt and click **Send**. While the
    request is still pending, confirm the Send button is disabled
    and clicking it has no effect.
17. **Unmount safety.** Hard-refresh the page. Confirm
    `<AdjustmentChat>` is not rendered (it would only mount in the
    generated state, and the form is now in the empty state). The
    page does not crash; no console errors.

If any step fails, treat it as a deviation and stop.

## Notes & hints (non-binding)

- The Sprint 11 hook `apps/web/components/editor/ai-chat/useAiEditChat.ts`
  is the closest reference. **Do not import from it.** Re-implement a
  smaller, Element-1-flavored hook (e.g. `useAdjustmentChat`) inside
  `AdjustmentChat.tsx` (or as a sibling local file under
  `setup-form/` if you prefer). Element 1's loop is simpler:
  - No `selection` (whole-site only).
  - No `history` window (each prompt is independent per §7.5).
  - No Accept / Discard (auto-apply).
  - No editor store integration (the chat owns its own config copy).
- `applyOperations(config, ops)` is pure. It returns a new
  `SiteConfig` or throws `OperationInvalidError`. Wrap the call in a
  try/catch.
- The PATCH endpoint writes back the **full** `SiteConfig`, not the
  ops. Send the post-apply config object as `{ config: <full> }`.
- `PreviewPanel`'s `?v={versionId}` query param is preserved across
  every PATCH (the working version row's UUID does not change — only
  its `config` jsonb changes). The `t` cache-buster you append is
  what forces the iframe to re-fetch.
- The Supabase Storage upload pattern is established in Sprint 4's
  logo upload. Follow that for the attachment uploader. If you can't
  find it, search for `.from("logos")` under
  `apps/web/components/setup-form/` and mirror the call shape against
  the `ai-attachments` bucket. If the bucket doesn't exist in the
  hosted project, surface the missing-bucket condition as part of
  the Sprint Completion Report's "External actions required" block;
  do not auto-create.
- `safeParseSiteConfig` returns `{ success: true, data } | { success:
  false, error }`. Parse the GET response's `config` through it
  before storing locally — never trust raw JSON.
- Don't use `localStorage` or `sessionStorage` — both are forbidden
  in this codebase per CLAUDE.md (artifacts pattern). Use React
  state.
- A "generation token" counter starting at `0` and incrementing per
  successful op apply is the cleanest way to drive iframe remount.
  Lift it into `PreviewPanel` and pass `onConfigUpdated = () =>
  setToken(t => t + 1)` down to `AdjustmentChat`.
- Aria-busy on the chat surface during hydration / in-flight requests
  helps assistive tech and gives you a stable test selector.
- Keep `AdjustmentChat`'s state machine explicit:
  `idle | hydrating | hydrate-error | thinking | error`. Avoid
  ad-hoc booleans — they cause race bugs.
- The §9.6 copy table currently in `PreviewPanel.tsx` covers seven
  `AiError` kinds. Match it exactly — the user has already seen
  that copy in the error state of the panel; consistency matters.
- Vitest runs in jsdom for component tests. Mock `fetch` with
  `vi.fn<typeof fetch>(async () => new Response(...))`. The Sprint
  4 / Sprint 11 test files in this repo show working patterns —
  read them; do not import their helpers.