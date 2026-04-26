# CLAUDE.md — Sprint 13: Deploy + Element 3

## Mission

Sprint 13 ships the third and final element of Orion's Belt: the
**public site**. The user clicks **Deploy** in the editor's top bar; the
working `SiteConfig` is snapshotted as a new row in `site_versions`
with `is_deployed = true` (after the previous deployed row, if any, is
flipped to `is_deployed = false`); a toast confirms the deploy with a
copy-to-clipboard link; and the deployed config becomes browsable at the
public route `/{site}/[...slug]` rendered by the shared renderer in
`mode="public"`.

The work spans three layers, each independently testable:

1. **The deploy endpoint.** `POST /api/sites/[siteId]/deploy` validates
   the `siteId` param, loads the working version row from Supabase,
   re-validates its config against `siteConfigSchema` (the deploy gate
   per `PROJECT_SPEC.md` §11 — an invalid working config CANNOT deploy),
   flips any existing `is_deployed=true` row for the site to `false`,
   and inserts a new `site_versions` row with the snapshotted config,
   `is_deployed=true`, `is_working=false`, `source="deploy"`,
   `parent_version_id` set to the working version's id. Returns
   `{ versionId, deployedUrl }` on 200; structured `AiError` on failure.
   `runtime = "nodejs"`, `dynamic = "force-dynamic"`.
2. **The Deploy button.** `apps/web/components/editor/topbar/DeployButton.tsx`
   replaces Sprint 6's placeholder ("Deploy is coming in a later sprint.")
   with a real button that opens a shadcn `<Dialog>` confirmation modal,
   POSTs to the deploy endpoint on confirm, fires a Sonner toast with
   the live URL plus a copy button on success, and surfaces error copy
   on failure. Per `PROJECT_SPEC.md` §8.2 the button is greyed out when
   there are unsaved changes (saveState `dirty` / `saving` / `error`)
   and enabled when the working version is fully saved (`saved` /
   `idle`).
3. **The public catch-all route.** `apps/web/app/[site]/[...slug]/page.tsx`
   is a server component (RSC) that loads the site by slug, loads the
   site's deployed `site_versions` row, parses the config, splits the
   trailing path into segments, finds a STATIC page where
   `kind === "static" && slug === segments.join("/")` (or `"home"` when
   there are no segments), and renders it via `<Renderer config={config}
   page={page.slug} mode="public" />`. If no site, no deployed version,
   or no matching static page — `notFound()`. **Sprint 9b will append
   the detail branch to this same file**; Sprint 13 must structure the
   file so 9b's addition is purely additive.

The work does **not** touch `lib/rm-api/`, `lib/site-config/schema.ts`,
the renderer source, `lib/editor-state/` (no new mutators), or any
site-component implementation file. It declares **one** retroactive
test-file fix per `CLAUDE.md` §15.9 to update an existing placeholder
test — see "Authorized retroactive fixes" below.

## Spec sections in scope

- `PROJECT_SPEC.md` §2.3 — The Element 2 → Element 3 handoff
  (the four-step deploy contract Sprint 13 must implement byte-for-byte).
- `PROJECT_SPEC.md` §3.1 — Tech stack (Next.js 15 App Router, RSC where
  useful — the public route is RSC).
- `PROJECT_SPEC.md` §3.4 — Infra (Vercel hosting target).
- `PROJECT_SPEC.md` §8.2 — Top bar Deploy button ("greyed out if no
  unsaved changes since last deploy"; toast confirms).
- `PROJECT_SPEC.md` §8.13 — Deploy details (confirmation modal copy,
  the "Live at..." toast with copy button, snapshot semantics).
- `PROJECT_SPEC.md` §10 / §10.3 — The shared renderer; in `public` mode,
  fetching happens server-side via RSC where possible.
- `PROJECT_SPEC.md` §11 — Page validation rules (the deploy endpoint
  re-validates against `siteConfigSchema` so an invalid config — e.g. a
  detail page with no `detailDataSource` — cannot deploy).
- `PROJECT_SPEC.md` §12 — `sites` and `site_versions` schema (the
  partial unique index `site_versions_one_deployed_per_site` is what
  drives the "flip old to false, then insert new" ordering).
- `PROJECT_SPEC.md` §13.2 — Demo flow step 7-8 (the canonical Deploy
  click and the "Live at https://www.aurora-cincy.com" toast).
- `PROJECT_SPEC.md` §17 — Out of scope (no per-customer subdomains;
  the deploy URL is `https://www.{siteSlug}.com` — a display string,
  not a real DNS mapping).

Quote each section as you build the corresponding piece. Do not
paraphrase the §8.13 toast copy — it is part of the demo script.

## Pre-flight check (MANDATORY — emit before reading or writing any non-spec file)

Before reading or modifying any file other than the items listed in
"Spec sections in scope" above, run these fourteen checks. If any
fails, STOP and emit a Deviation Report per the protocol embedded
later in this file. Do not attempt to work around a failed check.

1. **Single-branch workflow.** Run `git branch --show-current` and
   verify the output is exactly `master`. If it is not, STOP and
   emit a Deviation Report — do NOT create a `sprint/13` branch and
   do NOT switch branches. Per `DECISIONS.md` 2026-04-25 the project
   uses a single `master` branch on a single repo; worktrees are
   not in use.

2. **Predecessor sprints merged.** Confirm the following files
   exist on disk and are non-empty:
   - `apps/web/lib/site-config/schema.ts` (Sprint 3/3b — read-only;
     verify it exports `siteConfigSchema` and that `pageSchema`
     carries `kind: pageKindSchema.default("static")`).
   - `apps/web/lib/site-config/index.ts` (Sprint 3 — read-only;
     verify it re-exports `parseSiteConfig`, `safeParseSiteConfig`,
     and the `SiteConfig` / `Page` types).
   - `apps/web/lib/supabase/service.ts` (Sprint 0/1 — read-only;
     consume `createServiceSupabaseClient`).
   - `apps/web/lib/ai/errors.ts` (Sprint 4 — read-only; consume
     `AiError` and `formatErrorReport` for structured error
     responses and the toast copy).
   - `apps/web/types/database.ts` (Sprint 1 — read-only; verify
     `Database.public.Tables.site_versions.Row` exists with the
     `is_deployed`, `is_working`, `source`, `parent_version_id`,
     `config` columns).
   - `apps/web/components/renderer/Renderer.tsx` (Sprint 3 — read-only;
     verify it accepts `mode: "edit" | "preview" | "public"`).
   - `apps/web/components/editor/topbar/DeployButton.tsx` (Sprint 6
     placeholder — Sprint 13 REWRITES this; ownership hand-off is
     declared below and matches the Sprint 11 RightSidebar pattern).
   - `apps/web/components/editor/topbar/TopBar.tsx` (Sprint 6 —
     Sprint 13 does NOT modify; the rewritten DeployButton keeps
     its existing import path so TopBar is untouched).
   - `apps/web/app/[site]/preview/page.tsx` (Sprint 4 — read-only;
     pattern reference for the public route's "load site by slug,
     load version, parse, render" flow).
   - `apps/web/app/api/sites/[siteId]/working-version/route.ts`
     (Sprint 6 — read-only; pattern reference for the deploy
     endpoint's request-validate-supabase-respond flow).
   - `apps/web/app/api/generate-initial-site/route.ts` (Sprint 4 —
     read-only; pattern reference for `runtime = "nodejs"`,
     `jsonError`, error-status mapping).

3. **`site_versions` partial unique index exists.** Confirm
   `supabase/migrations/20260425000007_create_sites_and_site_versions.sql`
   contains the line
   `create unique index site_versions_one_deployed_per_site on
   site_versions (site_id) where is_deployed = true;`. If absent,
   STOP — Sprint 1's migration is incomplete and the deploy
   endpoint's flip-then-insert ordering cannot be relied upon.

4. **Owned paths are clean.** Verify the following do NOT yet exist
   on disk (clean-slate creations):
   - `apps/web/app/api/sites/[siteId]/deploy/`
   - `apps/web/app/[site]/[...slug]/`
   - `apps/web/components/editor/topbar/DeployConfirmDialog.tsx`

   If any already exists and is non-empty, STOP and surface — the
   sprint plan assumes these are new. (Empty stub files are OK;
   delete them and proceed.)

5. **DeployButton is the Sprint 6 placeholder.** Open
   `apps/web/components/editor/topbar/DeployButton.tsx` and confirm
   it currently imports from `sonner` and toasts the literal string
   `"Deploy is coming in a later sprint."`. If the file has already
   been rewritten with real deploy behavior, STOP — Sprint 13 is
   already partially executed; surface the deviation.

6. **Placeholder test is present.** Open
   `apps/web/components/editor/__tests__/placeholders.test.tsx` and
   confirm it asserts `toastMock.toHaveBeenCalledWith("Deploy is
   coming in a later sprint.")`. This test is owned by Sprint 6;
   Sprint 13's rewrite will break it. The fix is one of two paths
   (your choice — both are §15.9 retroactive test-file fixes): (a)
   update the assertion to `getByTestId("deploy-button")` (matching
   the same pattern Sprint 11 used for the right-sidebar
   placeholder rewrite — see DECISIONS.md 2026-04-26 Sprint 11 entry),
   or (b) delete the assertion entirely. Pick (a) — it preserves the
   "renders without crashing" intent. Log it in the Sprint Completion
   Report's "Retroactive cross-sprint fixes" subsection and in
   `DECISIONS.md`.

7. **`Toaster` is mounted.** Confirm
   `apps/web/app/[site]/edit/EditorShell.tsx` already mounts
   `<Toaster />` from `@/components/ui/sonner`. If absent, STOP —
   the Deploy success/error toasts will not render and Sprint 6 is
   incomplete.

8. **shadcn `Dialog` primitive available.** Confirm
   `apps/web/components/ui/dialog.tsx` exists and exports `Dialog`,
   `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`,
   `DialogFooter`. (It is consumed by `AddPageDialog` so it should
   be present.) If absent, STOP — re-running `pnpm dlx shadcn@latest
   add dialog` is a Sprint 1c concern, not a Sprint 13 concern.

9. **`@/components/ui/button` is canonical shadcn.** Confirm
   `apps/web/components/ui/button.tsx` exports `Button` and supports
   `variant="outline"` and `size="sm"`. The confirmation modal uses
   both.

10. **Deployed-version partial unique index is honored.** Open
    `apps/web/types/database.ts` and confirm
    `Database.public.Tables.site_versions.Insert` accepts
    `is_deployed?: boolean | null`. The deploy route's INSERT writes
    `is_deployed: true`; the type must allow it.

11. **No Vercel-specific code paths.** Verify there is no existing
    `vercel.json`, no `output: "standalone"` in `next.config.*`, and
    no Vercel-only API used in any source file you will read. The
    Sprint 13 deploy mechanism is **runtime-agnostic** (Supabase
    rows + Next route handlers); the User Actions Required section
    handles the Vercel project setup separately.

12. **`.env.example` lists the five required keys.** Open
    `.env.example` at the repo root and confirm it lists
    `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
    `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF`,
    `ANTHROPIC_API_KEY`. Sprint 13 does not introduce a new env var,
    but the User Actions Required section instructs the user to set
    these five on Vercel — the file must match the instructions.

13. **Slug routing safety.** Open
    `apps/web/lib/site-config/schema.ts` and confirm
    `siteConfigSchema`'s `superRefine` enforces per-`kind` slug
    uniqueness (per `PROJECT_SPEC.md` §11 "Page validation rules").
    The deploy endpoint relies on this — if a config with two
    static pages sharing a slug somehow reaches deploy, the
    re-validation step must reject it.

14. **Renderer accepts `mode="public"`.** Open
    `apps/web/components/renderer/Renderer.tsx` and confirm the
    `Mode` type from `./ComponentRenderer` is
    `"edit" | "preview" | "public"`. If `"public"` is missing, STOP
    — Sprint 3 is incomplete and the catch-all route cannot pass
    `mode="public"` without a TypeScript error.

After all fourteen checks pass, list each as `[x]` in your first
response and then proceed.

## Authorized hand-offs from earlier sprints

The following are planned hand-offs and are NOT Deviations. They are
honored by this sprint and listed in the Sprint Completion Report under
"Authorized hand-offs honored":

- `apps/web/components/editor/topbar/DeployButton.tsx` — Sprint 6
  shipped this as a placeholder that toasts "Deploy is coming in a
  later sprint." Sprint 13 REWRITES it. The export name `DeployButton`
  is preserved so `TopBar.tsx` (Sprint 6) is not modified.
- `apps/web/components/editor/__tests__/placeholders.test.tsx` — the
  existing assertion against the placeholder toast text is updated to
  a "renders without crashing" assertion via `getByTestId`. This is a
  §15.9 retroactive test-file fix; log it in `DECISIONS.md` and the
  Sprint Completion Report.

## Definition of Done

- [ ] **Deploy route handler.**
      `apps/web/app/api/sites/[siteId]/deploy/route.ts` exports a
      `POST` handler with `runtime = "nodejs"` and
      `dynamic = "force-dynamic"`. The handler:
      1. Reads the `siteId` route param via `await context.params`.
      2. Validates the body is empty or `{}` (the deploy endpoint
         takes no body — the working version is the input).
      3. Loads the site row by id (`select id, slug, name from sites
         where id = siteId`). 404 if not found.
      4. Loads the working `site_versions` row
         (`select id, config from site_versions where site_id =
         siteId and is_working = true`). 404 if not found.
      5. Re-validates the loaded `config` against `siteConfigSchema`.
         If invalid, returns 400 with
         `{ error: { kind: "invalid_output", message: "Working
         config failed schema validation.", details: <issues JSON> } }`.
         This is the §11 "deploy gate" — a config that fails schema
         validation cannot deploy.
      6. Flips any existing deployed row for the site:
         `update site_versions set is_deployed = false where
         site_id = siteId and is_deployed = true`.
      7. Inserts a new row:
         `{ site_id: siteId, config: <validatedConfig>,
            is_working: false, is_deployed: true,
            source: "deploy", parent_version_id: workingVersion.id,
            created_by: null }`.
         Returns the new row's `id`.
      8. Returns 200 with body
         `{ versionId: string, deployedUrl: string }`. The
         `deployedUrl` is `https://www.{site.slug}.com` — a display
         string per §17, not a real DNS mapping.

      Errors map via the existing `categorizeAiError` only when
      they originate from a thrown exception in the orchestration;
      otherwise the handler builds the structured `AiError` body
      directly. HTTP status mapping: 400 for invalid_output, 404
      for not_found-shaped errors, 500 for everything else.

- [ ] **Deploy route unit tests.**
      `apps/web/app/api/sites/[siteId]/deploy/__tests__/route.test.ts`
      tests, with Supabase mocked via `vi.mock("@/lib/supabase", ...)`
      (mirroring the
      `apps/web/app/api/sites/[siteId]/working-version/__tests__/`
      pattern Sprint 6 established):
      1. Returns 200 + `{ versionId, deployedUrl }` on the happy
         path; verifies the orchestrated supabase calls in order
         (load site, load working version, schema validation, flip
         old deployed, insert new deployed).
      2. Returns 404 when the site does not exist.
      3. Returns 404 when no working version exists.
      4. Returns 400 with `kind: "invalid_output"` when the working
         config fails schema validation. Use a config with two
         static pages sharing a slug to trigger the §11 refinement.
      5. Returns 200 even when there is no existing deployed row
         (the flip step is a no-op; the insert still succeeds).
      6. Verifies the inserted row's `source === "deploy"` and
         `parent_version_id === workingVersion.id`.
      7. Returns 500 with a generic `AiError` when Supabase throws
         on the insert.

- [ ] **Public catch-all route.**
      `apps/web/app/[site]/[...slug]/page.tsx` is a server component
      that:
      1. Awaits `params` (Next 15 async params) and reads `site`
         (string) and `slug` (string[] | undefined).
      2. Computes `slugPath = (slug?.join("/") ?? "") || "home"` —
         empty trailing path resolves to the `home` page.
      3. Loads the site by slug:
         `select id, slug, name from sites where slug = site`.
         Calls `notFound()` if not found.
      4. Loads the deployed version:
         `select id, config from site_versions where site_id =
         site.id and is_deployed = true`. Calls `notFound()` if
         absent.
      5. Parses the config via `parseSiteConfig`. If the parse
         throws, calls `notFound()` (a corrupted deployed config
         should never be reachable since the deploy gate validates,
         but the catch is defense-in-depth).
      6. **Static branch (Sprint 13 owns this):**
         `const page = config.pages.find((p) => p.kind === "static"
         && p.slug === slugPath);`
         If `page` is found, render
         `<Renderer config={config} page={page.slug} mode="public" />`.
         If not, fall through.
      7. Calls `notFound()` if no static branch matched. **Sprint
         9b will replace this `notFound()` call with the detail
         branch** — the file structure must clearly mark the
         insertion point with a comment block:
         `// === SPRINT 9B INSERTS DETAIL BRANCH HERE ===` immediately
         above the `notFound()` call.
      8. Implements `generateMetadata` that loads the site +
         deployed config + matching page and returns `{ title:
         page.meta?.title ?? config.meta.siteName, description:
         page.meta?.description ?? config.meta.description }`. On any
         error, returns `{ title: "Site not found" }` (mirrors the
         Sprint 4 preview page pattern).

- [ ] **Public route unit-style test.**
      `apps/web/app/[site]/[...slug]/__tests__/page.test.tsx` tests
      the segment-to-slug computation and static-page lookup as a
      pure function. Extract a helper
      `resolveStaticPage(config: SiteConfig, slug: string[] |
      undefined): Page | null` from the page module, export it for
      test purposes (or test via a small helper file
      `apps/web/app/[site]/[...slug]/resolve.ts` that the page
      imports). Cases:
      1. `undefined` slug → resolves to the `home` page.
      2. Empty array `[]` → resolves to the `home` page.
      3. `["about"]` → resolves to a static page with
         `slug: "about"`.
      4. `["foo", "bar"]` → resolves to a static page with
         `slug: "foo/bar"` (multi-segment static slug).
      5. No matching page → returns `null`.
      6. A detail page with the same slug as the static branch
         lookup is **ignored** — only `kind === "static"` is matched.
         Use a config with one static page `slug: "units"` and one
         detail page `slug: "units"` (the U2 case from §11). The
         lookup for `["units"]` returns the static page; the lookup
         for `["units", "42"]` returns `null` (Sprint 9b will handle
         the detail branch).

- [ ] **Deploy button rewrite.**
      `apps/web/components/editor/topbar/DeployButton.tsx` is
      replaced with a `"use client"` component that:
      1. Reads `siteId`, `siteSlug`, and `saveState` from
         `useEditorStore`.
      2. Renders the same `<Button>` shell as the placeholder
         (preserving `data-testid="deploy-button"` and the Rocket
         icon) but with `disabled` set to
         `saveState !== "saved" && saveState !== "idle"`. On hover
         the button shows a tooltip via `title=` attribute when
         disabled — `"Save in progress…"` for `"saving"`,
         `"Saving…"` for `"dirty"`, `"Save failed; cannot deploy"`
         for `"error"`. (No new tooltip primitive — the native
         `title` attribute is sufficient for the demo.)
      3. On click, opens a `<DeployConfirmDialog />` (new sibling
         file). The dialog renders the §8.13 copy `"Deploy current
         version to your live site?"` with Cancel and Confirm
         buttons.
      4. On Confirm, the dialog closes and the button POSTs to
         `/api/sites/{siteId}/deploy` (no body). While the request
         is in flight the button shows "Deploying…" and is
         disabled.
      5. On 200, fires
         `toast.success("Deployed. Your site is live at " + url, {
         action: { label: "Copy", onClick: () =>
         navigator.clipboard.writeText(url) } })` where
         `url = response.deployedUrl`. The `action` button is the
         Sonner-canonical way to add a "Copy" affordance to a
         toast.
      6. On error, fires
         `toast.error("Deploy failed: " + error.message)` (or the
         §9.6 friendly copy when `error.kind` matches a known
         category).

- [ ] **DeployConfirmDialog.**
      `apps/web/components/editor/topbar/DeployConfirmDialog.tsx` is
      a `"use client"` component that wraps shadcn `<Dialog>` /
      `<DialogContent>` / `<DialogHeader>` / `<DialogTitle>` /
      `<DialogDescription>` / `<DialogFooter>`. Props:
      `{ open: boolean; onOpenChange: (open: boolean) => void;
      onConfirm: () => void; isDeploying: boolean }`. The Confirm
      button is disabled when `isDeploying` is true.

- [ ] **Deploy button tests.**
      `apps/web/components/editor/topbar/__tests__/DeployButton.test.tsx`
      tests, with `useEditorStore` hydrated to a known state and
      `fetch` mocked via `vi.stubGlobal("fetch", ...)` and `sonner`
      mocked the same way the existing `placeholders.test.tsx`
      does:
      1. Renders an enabled button when `saveState === "saved"`.
      2. Renders a disabled button when `saveState === "dirty"`,
         `saveState === "saving"`, or `saveState === "error"`. The
         disabled `title` matches the expected hint.
      3. Clicking opens the confirmation dialog (`getByRole(
         "dialog" )` is present).
      4. Clicking Confirm POSTs to
         `/api/sites/{siteId}/deploy` with method `"POST"`.
      5. On a 200 response, `toast.success` is called with a
         message containing `"Deployed."` and the deployedUrl, and
         with an `action` object whose `label` is `"Copy"`.
      6. Clicking the `action.onClick` writes the URL to
         `navigator.clipboard.writeText`.
      7. On a 4xx response with
         `{ error: { kind: "invalid_output", message: "..." } }`,
         `toast.error` is called.
      8. While the request is in flight the button label is
         `"Deploying…"` and the button is disabled.

- [ ] **Placeholder test fix (§15.9).**
      `apps/web/components/editor/__tests__/placeholders.test.tsx`
      has its `"Deploy button fires a toast and does not navigate"`
      assertion rewritten to a `"Deploy button renders without
      crashing"` assertion using
      `expect(getByTestId("deploy-button")).toBeInTheDocument()`,
      mirroring how Sprint 11 fixed the parallel right-sidebar
      placeholder test (DECISIONS.md 2026-04-26 Sprint 11 entry).
      List this fix in the Sprint Completion Report's "Retroactive
      cross-sprint fixes" subsection and append a `DECISIONS.md`
      entry per §15.9.

- [ ] **DECISIONS.md updated.** A single entry is appended for the
      §15.9 retroactive fix above. If any in-sprint Deviation is
      raised and approved, additional entries are appended per the
      Deviation Protocol.

- [ ] **All new code has unit tests (Vitest).** No new function
      ships without a test.

- [ ] `pnpm test` passes with zero failures and zero new skipped
      tests. Pre-existing skip count is unchanged.

- [ ] `pnpm build` succeeds with zero TypeScript errors.

- [ ] `pnpm lint` (Biome check) passes with zero warnings.

- [ ] Manual smoke test (below) passes on a fresh `pnpm dev`
      against the linked hosted Supabase project.

- [ ] No new files outside the "Files you may create or modify"
      list.

- [ ] No new dependencies added without an approved Deviation
      Report.

## File scope

### You may create or modify

- `apps/web/app/api/sites/[siteId]/deploy/route.ts` (new).
- `apps/web/app/api/sites/[siteId]/deploy/__tests__/route.test.ts`
  (new).
- `apps/web/app/[site]/[...slug]/page.tsx` (new — catch-all; static
  branch only. Sprint 9b adds the detail branch).
- `apps/web/app/[site]/[...slug]/resolve.ts` (new — pure helper for
  static-page lookup, exposed for unit testing).
- `apps/web/app/[site]/[...slug]/__tests__/page.test.tsx` (new —
  unit tests against `resolve.ts`).
- `apps/web/components/editor/topbar/DeployButton.tsx` (REWRITE —
  authorized Sprint 6 hand-off).
- `apps/web/components/editor/topbar/DeployConfirmDialog.tsx` (new).
- `apps/web/components/editor/topbar/__tests__/DeployButton.test.tsx`
  (new).
- `apps/web/components/editor/__tests__/placeholders.test.tsx`
  (§15.9 retroactive test fix — one assertion rewrite).
- `DECISIONS.md` (append-only — log the §15.9 fix and any approved
  Deviations).

### You may read but NOT modify

- `PROJECT_SPEC.md`.
- `apps/web/lib/site-config/schema.ts`.
- `apps/web/lib/site-config/index.ts`.
- `apps/web/lib/site-config/parse.ts`.
- `apps/web/lib/supabase/service.ts`.
- `apps/web/lib/supabase/index.ts`.
- `apps/web/lib/ai/errors.ts`.
- `apps/web/types/database.ts`.
- `apps/web/types/site-config.ts`.
- `apps/web/components/renderer/**`.
- `apps/web/components/site-components/**`.
- `apps/web/components/editor/topbar/TopBar.tsx`.
- `apps/web/components/editor/topbar/SaveIndicator.tsx`
  (read-only — useful pattern for `useEditorStore` consumption).
- `apps/web/components/ui/dialog.tsx`.
- `apps/web/components/ui/button.tsx`.
- `apps/web/components/ui/sonner.tsx`.
- `apps/web/lib/editor-state/index.ts`.
- `apps/web/lib/editor-state/store.ts`.
- `apps/web/app/[site]/preview/page.tsx` (pattern reference).
- `apps/web/app/[site]/edit/page.tsx` (pattern reference).
- `apps/web/app/[site]/edit/EditorShell.tsx` (verify Toaster mount).
- `apps/web/app/api/generate-initial-site/route.ts` (pattern).
- `apps/web/app/api/sites/[siteId]/working-version/route.ts`
  (pattern reference).
- `apps/web/app/api/sites/[siteId]/working-version/__tests__/route.test.ts`
  (pattern reference for the deploy route's tests).
- `supabase/migrations/20260425000007_create_sites_and_site_versions.sql`
  (verify the partial unique index).
- `.env.example`.

### You MUST NOT modify

- `PROJECT_SPEC.md` — raise concerns via the Deviation Protocol.
- `DECISIONS.md` — append-only; never edit existing entries.
- `apps/web/lib/rm-api/**` — Sprint 1's domain.
- `apps/web/lib/site-config/**` — Sprint 3/3b/9 domain.
- `apps/web/lib/ai/**` — Sprint 4/11 domain.
- `apps/web/lib/editor-state/**` — Sprint 6/9/11 domain. Sprint 13
  introduces NO new mutators.
- `apps/web/lib/row-context/**` — Sprint 9 domain (Sprint 9b will
  generalize, not Sprint 13).
- `apps/web/lib/token-resolver/**` — Sprint 9 domain.
- `apps/web/components/renderer/**` — Sprint 3/9 domain.
- `apps/web/components/site-components/**` — Sprint 5/9/10 domain.
- `apps/web/components/setup-form/**` — Sprint 2/4 domain.
- `apps/web/components/editor/sidebar/**` — Sprint 6/9/10/11 domain.
- `apps/web/components/editor/canvas/**` — Sprint 6/7 domain.
- `apps/web/components/editor/edit-panels/**` — Sprint 8 domain.
- `apps/web/components/editor/ai-chat/**` — Sprint 11 domain.
- `apps/web/components/editor/topbar/TopBar.tsx` — Sprint 6 (do
  not modify; the rewritten `DeployButton` keeps its export name).
- `apps/web/components/editor/topbar/PageSelector.tsx`,
  `PreviewToggle.tsx`, `SaveIndicator.tsx`, `SiteNameInput.tsx` —
  Sprint 6 (read-only).
- `apps/web/app/[site]/preview/**` — Sprint 4.
- `apps/web/app/[site]/edit/**` — Sprint 6.
- `apps/web/app/(rmx)/**` — Sprint 1.
- `apps/web/app/dev/**` — Sprint 3/5/9 dev fixtures (Sprint 13
  does not need these and they 404 in production).
- `apps/web/app/api/generate-initial-site/**` — Sprint 4.
- `apps/web/app/api/sites/[siteId]/working-version/**` — Sprint 6.
- `apps/web/app/api/ai-edit/**` — Sprint 11.
- `apps/web/app/api/form-submissions/**` — Sprint 10.
- `supabase/migrations/**` — Sprint 13 introduces NO migrations.
- `apps/web/package.json` — Sprint 13 introduces NO dependencies.
- `next.config.*`, `tsconfig*.json`, `vitest.config.*`,
  `biome.json` — root config files; untouched.

## Manual smoke test (numbered, click-by-click)

Run against the linked hosted Supabase project (per the 2026-04-25
DECISIONS.md "hosted Supabase" decision). Requires the seeded Aurora
Property Group fixture (`pnpm seed`) and a working version row to
exist. If a working version does not exist, run the Element 1 generate
flow first (open `/setup`, fill the form, click "Ready to Preview &
Edit", wait for generation to complete) so an editable site exists.

1. Run `pnpm dev` and confirm the dev server starts on
   `http://localhost:3000` with no startup errors in the console.
2. Open `http://localhost:3000/setup` and find an existing site in
   the "Open an existing site in the editor" list. Click into it
   to open the editor at `/{site}/edit`.
3. The editor loads. The top-bar SaveIndicator shows "Ready" or
   "Saved Xs ago". The Deploy button is enabled (saveState is
   `idle` or `saved`).
4. Click the Deploy button. A modal opens with the title "Deploy
   current version to your live site?" and Cancel / Confirm
   buttons.
5. Click Cancel. The modal closes; nothing happens. The button is
   still enabled.
6. Click Deploy again. Click Confirm. The button label changes to
   "Deploying…" and is disabled.
7. Within ~2 seconds, a Sonner toast appears in the top-right
   reading
   `Deployed. Your site is live at https://www.{siteSlug}.com`
   with a Copy action button. The Deploy button returns to its
   normal state.
8. Click the Copy button on the toast. Open a scratch buffer and
   paste — confirm the URL was copied.
9. Open a new browser tab and navigate to
   `http://localhost:3000/{siteSlug}` (the bare site URL with no
   trailing path). The home page renders in `mode="public"` with
   no editor chrome (no selection outlines, no drag handles, no
   sidebars). Sub-page navigation links (if any in the navbar)
   work.
10. Navigate to `http://localhost:3000/{siteSlug}/about` (or
    whichever static page exists in the deployed config). The
    page renders.
11. Navigate to `http://localhost:3000/{siteSlug}/this-page-does-not-exist`.
    Next renders the framework 404 page.
12. Run a SQL query against the linked Supabase project (in the
    Supabase dashboard SQL editor):
    `select id, is_working, is_deployed, source, parent_version_id
    from site_versions where site_id = '<siteId>' order by
    created_at desc limit 5;`
    Confirm:
    - The top row is the new deployed snapshot:
      `is_working = false`, `is_deployed = true`,
      `source = 'deploy'`, `parent_version_id` matches the working
      row's id.
    - The working row is unchanged: `is_working = true`,
      `is_deployed = false`.
    - At most one row has `is_deployed = true` (the partial unique
      index is honored).
13. Back in the editor, make a small edit (rename the site via
    `SiteNameInput`). The SaveIndicator flips to "Saving…" then
    "Saved Xs ago" once autosave completes. The Deploy button is
    disabled during "Saving…" and enabled again after "Saved".
14. Click Deploy → Confirm. Wait for the success toast.
15. Re-run the SQL query in step 12. Confirm:
    - A second deployed snapshot row was inserted (it is now the
      top row).
    - The previous deployed snapshot has been flipped to
      `is_deployed = false`.
    - Exactly one row still has `is_deployed = true`.
16. Open `http://localhost:3000/{siteSlug}` in a new tab.
    Confirm the renamed site name appears in the navbar / page
    title.
17. Test the deploy gate: in the Supabase dashboard, manually
    insert a row with an invalid config (e.g. two static pages
    sharing a slug) and set `is_working = true` for a TEST site
    (do NOT do this on the Aurora Property Group fixture).
    Click Deploy on that test site. Confirm the toast reads a
    `Deploy failed:` message referencing schema validation. The
    SQL query confirms no new deployed row was created. (If you
    do not have a test site to spare, skip this step and rely on
    the unit test that covers it.)
18. Run `pnpm test` from the repo root. Confirm all tests pass and
    the suite's pre-existing skip count is unchanged.
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
  The catch-all page is RSC. The DeployButton and
  DeployConfirmDialog are `"use client"` (they read from Zustand
  and call `fetch` / `navigator.clipboard`).
- One component per file. File name = export name.
- Use `cn(...)` helper from shadcn for class merging.
- No prop drilling deeper than 2 levels — lift to Zustand.

### 15.3 Naming

- Files: `kebab-case.ts(x)`. (Sprint 13 follows the existing
  PascalCase filenames for the editor's topbar components —
  `DeployButton.tsx`, `DeployConfirmDialog.tsx` — to match the
  `apps/web/components/editor/topbar/` convention already in
  place.)
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

### 15.5 Testing

- Unit-test the deploy route with a mocked Supabase client.
- Unit-test the static-page resolver as a pure function.
- Unit-test DeployButton with `vi.stubGlobal("fetch", ...)` and a
  Sonner mock.

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
TypeScript error or a stale assertion in a Sprint N test file that
blocks `pnpm build` or `pnpm test`), Claude Code is permitted to
apply a minimal, surgical fix to the offending earlier-sprint test
or config file rather than emitting a Deviation per occurrence.
Constraints are binding: smallest possible change, no behavior
changes, test/config files only (production code in another
sprint's domain still requires a Deviation), each fix logged in
`DECISIONS.md` and listed in the Sprint Completion Report's
"Retroactive cross-sprint fixes" subsection. See the root
`CLAUDE.md` §15.9 for the full text.

The §15.9 fix for Sprint 13 is the
`apps/web/components/editor/__tests__/placeholders.test.tsx`
assertion rewrite covered above. It is pre-authorized by the DoD;
log it in `DECISIONS.md` and the Sprint Completion Report but do
NOT raise a separate Deviation.

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
- `pnpm test apps/web/app/api/sites/\[siteId\]/deploy/__tests__/route.test.ts`
  — fast iteration on the deploy route.
- `pnpm test apps/web/app/\[site\]/\[...slug\]/__tests__/page.test.tsx`
  — fast iteration on the resolver.
- `pnpm test apps/web/components/editor/topbar/__tests__/DeployButton.test.tsx`
  — fast iteration on the button.
- `pnpm build` — production build.
- `pnpm lint` — Biome check.
- `pnpm format` — Biome format --write.
- `pnpm typecheck` — TypeScript no-emit check.

## User Actions Required (emit at the end of the Sprint Completion Report)

These are external steps only the user can perform. Surface them
explicitly in the Sprint Completion Report under a section titled
"User Actions Required" so they cannot be missed.

1. **Vercel project setup (one-time).**
   - Sign in to <https://vercel.com> with the same GitHub account
     that owns this repo.
   - Click **Add New… → Project**, import the Orion's Belt repo,
     and select `apps/web` as the Root Directory.
   - Framework preset: **Next.js** (auto-detected).
   - Build command: leave default (`next build`).
   - Output: leave default.
   - Click **Deploy**. The first deploy will fail because env vars
     are not yet set — that is expected. Proceed to step 2.

2. **Vercel environment variables (one-time per environment).**
   In the Vercel project dashboard, **Settings → Environment
   Variables**, add the following five variables for **Production**
   (also Preview if you want preview deployments):
   - `NEXT_PUBLIC_SUPABASE_URL` — from Supabase Project Settings →
     API.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same page.
   - `SUPABASE_SERVICE_ROLE_KEY` — same page. **KEEP SECRET.** Do
     not check the "Expose to client-side bundle" box.
   - `SUPABASE_PROJECT_REF` — the project ref segment from your
     Supabase URL.
   - `ANTHROPIC_API_KEY` — from <https://console.anthropic.com>.
     **KEEP SECRET.**
   After adding all five, click **Deployments** in the left rail,
   find the most recent failed deployment, and click **Redeploy**.

3. **Verify the public route works on Vercel.**
   Once the redeploy succeeds, open the production Vercel URL.
   Navigate to `/setup`, generate a small site (or use a seeded
   one), open it in the editor, click Deploy, accept the
   confirmation. Then visit `/{site-slug}` on the production
   Vercel URL. The deployed site should render. If it does not,
   check the Vercel runtime logs for the failed request.

4. **Optional: custom domain.**
   The toast displays `https://www.{siteSlug}.com` per
   `PROJECT_SPEC.md` §17 — this is a display string, not a real
   domain. If you want one of the demo sites to actually resolve
   at `aurora-cincy.com`, that is a Vercel custom-domain setup
   step (Settings → Domains) that is **out of scope for Sprint 13
   per `PROJECT_SPEC.md` §17** ("Multi-tenant deployment to
   per-customer Netlify subdomains" is out of scope). Skip
   unless explicitly directed.

5. **No new Supabase migrations.** Sprint 13 introduces no schema
   changes. The `sites` and `site_versions` tables are already in
   place from Sprint 4. No `pnpm db:push` is required.

6. **No new env vars.** Sprint 13 does not introduce new
   environment variables. `.env.example` is unchanged.

## Notes & hints (non-binding context)

- **Pattern reference, route handler.** The Sprint 6 file
  `apps/web/app/api/sites/[siteId]/working-version/route.ts` is
  the closest existing parallel. Mirror its `runtime = "nodejs"`,
  `dynamic = "force-dynamic"`, `RouteContext` typing, the `await
  context.params` pattern for Next 15 async params, the
  `requestBodySchema.safeParse` style (even though deploy takes no
  body — explicitly accept empty body or `{}` and reject anything
  else with 400 invalid_output), the `jsonError(...)` helper, and
  the structured `ErrorBody` type. Sprint 13's `ErrorBody` should
  use the `AiError` shape from `lib/ai/errors.ts` so the
  DeployButton's error toast can route on `error.kind` if needed.
- **Pattern reference, public route loader.** The Sprint 4 file
  `apps/web/app/[site]/preview/page.tsx` is the closest parallel
  to the Sprint 13 catch-all. Mirror its `loadSiteAndVersion`
  inline-helper pattern (per the Sprint 6 deviation that
  rejected the `lib/sites/repo.ts` extraction). Do NOT extract a
  shared helper — three near-duplicate loaders is acceptable for
  the demo; consolidation is its own future sprint.
- **Why `parent_version_id` matters.** It records that the
  deployed snapshot was forked from a specific working version.
  Future sprints (notably an "ai-edit creates a versioned
  snapshot" follow-up referenced in the Sprint 11 cost-guardrail
  comment) may want to walk the chain. Set it explicitly.
- **Why `is_working: false` on the deployed row.** The partial
  unique index `site_versions_one_working_per_site` enforces
  exactly one working row per site. The deployed snapshot is a
  separate row from the working version — it must NOT carry
  `is_working = true`, or the insert will fail.
- **Why no transaction.** Supabase JS client doesn't expose
  transactions without an RPC; flip-then-insert is two sequential
  awaits. A theoretical race is possible if two deploys land
  simultaneously, but the demo is single-user. Sprint 15 polish
  could harden this with an RPC; not required here.
- **Toast `action` button.** Sonner's `action: { label, onClick }`
  is the canonical way to attach an actionable button to a toast.
  Confirm the project's installed Sonner version supports this
  shape (it does — see usages elsewhere in the repo if unsure).
- **Catch-all + `notFound()`.** Next 15's `notFound()` from
  `next/navigation` triggers the route segment's `not-found.tsx`
  if present, otherwise the framework default 404. Sprint 13 does
  NOT need to author a custom `not-found.tsx` — the framework
  default is acceptable for the demo.
- **`mode="public"` vs `mode="preview"`.** The renderer treats
  both modes identically for chrome (no edit affordances). The
  difference is documented in `PROJECT_SPEC.md` §10.2-10.3:
  "public" mode also commits to RSC-where-possible data fetching.
  For Sprint 13, the page-level data load (sites, site_versions)
  IS server-side. The renderer itself remains a client component
  per the Sprint 9 deviation; that is fine for SEO of the
  initial HTML payload (Next streams the client component's
  initial render server-side).
- **The "no unsaved changes" §8.2 nuance.** Sprint 13 implements
  a simpler gate (`saveState in {"saved", "idle"}`) rather than a
  diff-against-deployed-snapshot gate. The simpler gate matches
  the demo flow (§13.2 step 7-8: edit → accept → autosave saves
  → Deploy enabled → Confirm → live). A true diff-based gate is a
  Sprint 15 polish item. Do NOT implement it here.
- **Sprint 9b insertion-point comment.** The literal text
  `// === SPRINT 9B INSERTS DETAIL BRANCH HERE ===` immediately
  above the `notFound()` call is load-bearing — Sprint 9b's plan
  greps for it. Do not change the wording.
- **Auth is a placeholder.** Per `PROJECT_SPEC.md` §17 / §3.1
  the deploy endpoint writes via the service-role client; RLS is
  permissive in the demo. Do not add an auth check; that is a
  post-demo hardening item.
- **Test boundaries.**
  `apps/web/components/editor/topbar/__tests__/DeployButton.test.tsx`
  must NEVER hit the real `/api/sites/[siteId]/deploy` route.
  `vi.stubGlobal('fetch', …)` is the right primitive. The
  resolver test (`apps/web/app/[site]/[...slug]/__tests__/page.test.tsx`)
  is a pure-function test against the helper in `resolve.ts`; it
  does NOT mount the React Server Component itself (RSC unit
  testing is out of scope for the demo per the Sprint 4 pattern).
- **"Live at..." toast copy.** Per `PROJECT_SPEC.md` §13.2 step 8
  the canonical demo toast is
  `Live at https://www.aurora-cincy.com`. The implementation
  builds this URL from `siteSlug` (e.g.
  `https://www.aurora-cincy.com` for slug `aurora-cincy`). Note
  this is a display string only — DNS does not resolve it. The
  user is aware and the toast is the demo's pretty-URL theater.

---

*End of Sprint 13 CLAUDE.md.*