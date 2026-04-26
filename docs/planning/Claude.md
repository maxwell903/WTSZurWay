# CLAUDE.md — Sprint 6: Element 2 Layout Shell

> Drop this file at the repo root of `WTSZurWay/` for the duration of Sprint
> 6, replacing the master `CLAUDE.md`. Restore the master `CLAUDE.md` after
> the sprint's quality gates pass and the Sprint Completion Report has been
> emitted. Per the 2026-04-25 entry in `DECISIONS.md`, this project uses a
> single-branch workflow on `master` — there is no `sprint/06` branch.
> Every commit lands on `master` after the quality gates pass. Hosted
> Supabase is in use (no Docker, no local Postgres).

## Mission

Build the visual chrome of Element 2 — the editor — at `/[site]/edit`.
Specifically: a top bar (logo, editable site name, page selector with
add/rename/delete and a "DETAIL" badge for detail pages, preview-mode
toggle, decorative deploy button), a four-tab left sidebar (Site, Pages,
Add, Data), a right-sidebar placeholder shell (Sprint 11 fills it with the
AI chat), and a center canvas that renders the current page through the
already-shipped shared `<Renderer>` in `mode="edit"` with click-to-select
and hover highlighting. All editor state lives in a Zustand store at
`apps/web/lib/editor-state/`. A debounced autosave persists the draft
`SiteConfig` back to the working `site_versions` row through a new
`PATCH /api/sites/[siteId]/working-version` endpoint.

This sprint ships the **shell**, not the editing surfaces. Drag-and-drop
(Sprint 7), the right-click Element Edit panels (Sprint 8), Repeater data
binding (Sprint 9), the Data tab's submission list (Sprint 10), the AI
chat right sidebar (Sprint 11), and the Deploy flow (Sprint 13) are out of
scope and must remain so. The Add tab cards are visible and selectable
(visually) but **not draggable**. Right-click on the canvas does **nothing**
(Sprint 8 wires it). The Data tab shows a "Coming soon" placeholder. The
Right sidebar is an empty pane with a "Select a component to edit, or use
the AI chat (coming soon)" placeholder. The Deploy button renders enabled
but its `onClick` only opens a `Sonner` toast that says
"Deploy is coming in a later sprint."

This sprint is the spine of every later editor sprint. Get the Zustand
store shape and the canvas → renderer wiring right; everything from
Sprint 7 onward extends them.

## Pre-flight check (MANDATORY — emit before reading or writing any non-spec file)

Before reading or modifying any file other than the items listed below in
"Spec sections in scope", run these six checks. If any fails, STOP and
emit a Deviation Report per the protocol embedded in this file. Do not
attempt to work around a failed check.

1. **Spec amendment §8.12 is in place.** Read `PROJECT_SPEC.md` §8.12
   ("Detail pages"). Confirm the section exists and describes:
   - The `Page.kind: "static" | "detail"` field with default `"static"`.
   - The `Page.detailDataSource: "properties" | "units"` field, required
     iff `kind === "detail"`.
   - The per-kind slug uniqueness rule (a static page and a detail page
     may share a slug — the U2 same-slug coexistence pattern; two pages
     of the same kind may not share a slug).
   - The Pages-tab "Add page" modal exposes a `Page kind` dropdown and,
     when `Detail` is selected, a `Detail data source` dropdown.
   If §8.12 is missing or the prop shapes / rules differ, STOP and emit a
   Deviation Report with failure reason "PROJECT_SPEC.md §8.12 has not
   been amended; Sprint 6 cannot generate UI that contradicts the spec."

2. **Sprint 3b schema landed.** Read `apps/web/lib/site-config/schema.ts`.
   Confirm `pageSchema` contains the `kind` field
   (`z.enum(["static", "detail"]).default("static")`) and the
   `detailDataSource` field
   (`z.enum(["properties", "units"]).optional()`), and that
   `siteConfigSchema` has a `superRefine` enforcing per-kind slug
   uniqueness AND the "detailDataSource required iff kind=detail" rule.
   If any of these is missing, Sprint 3b has not landed against this
   branch — STOP and emit a Deviation Report.

3. **Sprint 4 sites + site_versions tables exist.** Read
   `apps/web/lib/sites/repo.ts`. Confirm `getSiteBySlug` and
   `getLatestWorkingVersion` are exported. Confirm the existing migration
   under `supabase/migrations/` creates `sites` and `site_versions` with
   columns `id`, `site_id`, `config jsonb`, `is_working boolean`,
   `is_deployed boolean`, `version_number`, `created_at`, `updated_at`,
   `created_by`, `source`, `parent_version_id`. If any of these is
   missing, Sprint 4 has not landed against this branch — STOP and emit
   a Deviation Report.

4. **Renderer + components exist.** Read
   `apps/web/components/renderer/Renderer.tsx`. Confirm it exports a
   default or named `Renderer` accepting `RendererProps` with at minimum
   `config`, `page` (slug), `mode: "edit" | "preview" | "public"`,
   `selection?: ComponentId | null`, `onSelect?: (id) => void`, and
   `onHover?: (id | null) => void`. If `onHover` is absent, that is
   acceptable — Sprint 6 may select via the existing `onSelect` only and
   render the hover overlay in pure CSS by detecting `:hover` on the
   selection wrapper. Note this in your sprint output. If `onSelect` is
   missing, STOP and emit a Deviation Report.

5. **Component registry has all 20 entries.** Read
   `apps/web/components/site-components/registry.ts`. Count distinct
   keys. If the count is not 20 (Section, Heading, Paragraph, Image,
   Spacer, Divider, Row, Column, Button, Logo, NavBar, Footer,
   HeroBanner, PropertyCard, UnitCard, Repeater, InputField, Form,
   MapEmbed, Gallery), STOP and emit a Deviation Report — Sprint 6's
   Add tab catalog is keyed off the registry; mismatched entries break
   the canvas.

6. **Single-branch workflow.** Confirm the current git branch is
   `master`. Run `git branch --show-current` and verify the output is
   exactly `master`. If it is not, STOP and emit a Deviation Report —
   the project workflow per `DECISIONS.md` 2026-04-25 is single-branch
   on `master`; do NOT create a `sprint/06` branch and do NOT switch
   branches.

Only after all six checks pass may you proceed to write code.

## Spec sections in scope

Read each of these end-to-end before writing any code. They are the
authoritative source for everything below — when this file and the spec
disagree, the spec wins; surface the conflict via the Deviation Protocol
before proceeding.

- `PROJECT_SPEC.md` §6 — `SiteConfig` schema (canonical; you read it,
  you do NOT modify it).
- `PROJECT_SPEC.md` §6.4 — Shared style controls (palette + font binding
  reads from this).
- `PROJECT_SPEC.md` §8.1 — Editor route shape and the three renderer modes
  (`edit` / `preview` / `public`).
- `PROJECT_SPEC.md` §8.2 — Top bar (logo, site name, page selector,
  preview toggle, deploy).
- `PROJECT_SPEC.md` §8.3 — Left sidebar (the four tabs: Site, Pages, Add,
  Data; their content; the "Add page" modal).
- `PROJECT_SPEC.md` §8.4 — Right sidebar (Sprint 6 ships the shell only
  — placeholder copy; Sprint 11 fills it).
- `PROJECT_SPEC.md` §8.5 — Selection model (click to select; clicking the
  canvas background deselects; `Esc` clears selection).
- `PROJECT_SPEC.md` §8.6 — Canvas and the renderer in edit mode (selection
  outline, hover highlight, breadcrumb).
- `PROJECT_SPEC.md` §8.11 — Preview mode toggle in the top bar (clicking
  it swaps the canvas renderer's `mode` from `edit` to `preview` and
  hides the selection outline). Sprint 6 wires this toggle.
- `PROJECT_SPEC.md` §8.12 — Detail pages (the Pages-tab kind picker, the
  per-kind slug uniqueness rule, the page-selector "DETAIL" badge).
- `PROJECT_SPEC.md` §10.1 — `RendererProps` (the canvas calls
  `<Renderer mode="edit" selection={selectedId} onSelect={...} />`).
- `PROJECT_SPEC.md` §11 — `SiteConfig` schema in full, including the
  Sprint 3b detail-pages amendment.
- `PROJECT_SPEC.md` §12 — `sites` and `site_versions` table DDL — Sprint 6
  reads these tables and writes the working version's `config` jsonb.
- `PROJECT_SPEC.md` §15 — Coding standards (binding; copied below).

## File scope

### Owned (this sprint may create or modify)

- `apps/web/app/[site]/edit/page.tsx` — async server component; awaits
  `params`, fetches the working version via the existing
  `getSiteBySlug` + `getLatestWorkingVersion` helpers, and hands the
  result to the `EditorShell` client component.
- `apps/web/app/[site]/edit/EditorShell.tsx` — top-level client component;
  receives the loaded site + working version, hydrates the Zustand store,
  and composes `<TopBar />`, `<LeftSidebar />`, `<Canvas />`,
  `<RightSidebar />`.
- `apps/web/app/[site]/edit/loading.tsx` — Next.js loading UI (a
  skeleton matching the editor layout: top bar bar, two side rails, a
  blank canvas area).
- `apps/web/app/[site]/edit/error.tsx` — Next.js error UI with a "Try
  again" button (`reset()`) and a "Go back" link to `/setup`.
- `apps/web/app/[site]/edit/not-found.tsx` — Next.js 404 UI shown when
  the slug doesn't resolve to a site or the site has no working version.
- `apps/web/app/api/sites/[siteId]/working-version/route.ts` — the
  PATCH endpoint that accepts `{ config: SiteConfig }` and updates the
  working `site_versions` row's `config` jsonb. Server-only,
  `runtime = "nodejs"`, `dynamic = "force-dynamic"`,
  `Cache-Control: no-store`.
- `apps/web/components/editor/topbar/TopBar.tsx` — the top bar container.
- `apps/web/components/editor/topbar/SiteNameInput.tsx` — inline editable
  site name (Enter or blur commits; Esc cancels; max 100 chars).
- `apps/web/components/editor/topbar/PageSelector.tsx` — page dropdown
  showing the active page's name + a small "DETAIL" badge for
  detail pages; opens to a list of all pages with the same per-row
  badge; "+ Add page" entry at the bottom opens `AddPageDialog`.
- `apps/web/components/editor/topbar/PreviewToggle.tsx` — a segmented
  control (Edit / Preview) bound to the store's `previewMode`.
- `apps/web/components/editor/topbar/DeployButton.tsx` — decorative
  button that opens a Sonner toast on click ("Deploy is coming in a
  later sprint.").
- `apps/web/components/editor/topbar/SaveIndicator.tsx` — reads the
  store's `saveState` and renders one of: "Saved 2s ago" /
  "Saving…" / "Unsaved changes" / "Save failed — retry".
- `apps/web/components/editor/sidebar/LeftSidebar.tsx` — the left rail
  container with the four-tab tab list and the active tab's content
  panel.
- `apps/web/components/editor/sidebar/site-tab/SiteTab.tsx` — the Site
  tab pane.
- `apps/web/components/editor/sidebar/site-tab/PaletteSelector.tsx` —
  six radio cards mirroring the Element 1 setup form's palette grid
  (Ocean, Forest, Sunset, Violet, Monochrome, Rose). The data source
  for the palette definitions is shared — the file imports the palettes
  from `apps/web/lib/setup-form/palettes.ts` (Sprint 2 — read-only).
- `apps/web/components/editor/sidebar/site-tab/FontSelector.tsx` —
  two dropdowns: Heading font and Body font, each populated from a
  small curated list of Google-Fonts-friendly names declared inline at
  the top of this file (e.g. Inter, Manrope, Source Sans 3, Lora,
  Merriweather, Playfair Display). Selection writes to whichever font
  field exists in the schema's site-level theme block; if the schema
  has separate `headingFont` and `bodyFont` fields, both are wired; if
  the schema only has a single `fontFamily` field, the selector
  collapses to a single dropdown and a header comment says so. Read
  the schema first and adapt; do NOT modify the schema.
- `apps/web/components/editor/sidebar/pages-tab/PagesTab.tsx` — the
  Pages tab pane: list of pages with rename / delete buttons per row;
  reorder via up/down arrows (drag-reorder is Sprint 7); an "Add page"
  button at the bottom that opens `AddPageDialog`.
- `apps/web/components/editor/sidebar/pages-tab/AddPageDialog.tsx` —
  shadcn `Dialog`. Fields: Name (text, required, max 100), Slug (text,
  required, lowercased, slug-validated regex `^[a-z0-9-]+$`, max 60),
  Page kind (segmented control: Static / Detail; default Static),
  Detail data source (dropdown shown only when kind = Detail; values
  `properties`, `units`; required when shown). Submits via the store's
  `addPage` action. Per-kind slug uniqueness validated client-side
  against the current pages list; matches the §8.12 rule. The schema's
  `superRefine` is the ultimate guard — server-side autosave will fail
  the PATCH and show the SaveIndicator's "Save failed" state if the
  client check is somehow bypassed.
- `apps/web/components/editor/sidebar/pages-tab/RenamePageDialog.tsx` —
  shadcn `Dialog` with Name + Slug fields; same validation rules as
  `AddPageDialog`. The Home page (slug = `"home"`) cannot have its slug
  changed — the slug field is disabled with a tooltip
  "The home page slug is fixed." (Renaming the displayed name is
  permitted.)
- `apps/web/components/editor/sidebar/pages-tab/DeletePageConfirm.tsx`
  — shadcn `AlertDialog` confirming page deletion. The Home page is
  not deletable — the row's delete button is disabled with a tooltip
  "The home page cannot be deleted."
- `apps/web/components/editor/sidebar/pages-tab/PageRow.tsx` — single
  row in the pages list with name + slug + DETAIL badge if applicable
  + rename + delete + up/down buttons.
- `apps/web/components/editor/sidebar/add-tab/AddTab.tsx` — the Add
  tab pane: a grid of `<ComponentCard />`s grouped by section
  (Layout, Content, Media, Data, Forms, Navigation). The cards are
  visually styled and selectable (a click selects the card visually
  for visual feedback) but **DO NOT** add the component to the canvas
  — Sprint 7 wires drag-and-drop. A muted helper line at the bottom
  reads "Drag-and-drop coming in the next update."
- `apps/web/components/editor/sidebar/add-tab/ComponentCard.tsx` — a
  single card with an icon (`lucide-react`), the component's display
  name, and a one-line description. Card receives a
  `ComponentCatalogEntry` prop.
- `apps/web/components/editor/sidebar/add-tab/component-catalog.ts` —
  the canonical list of 20 catalog entries
  (`{ type: ComponentType; group: ComponentGroup; label: string;
  icon: LucideIcon; description: string }`). The `type` strings MUST
  match the keys in `apps/web/components/site-components/registry.ts`
  exactly. The grouping: Layout = Section, Row, Column, Spacer,
  Divider; Content = Heading, Paragraph, Button; Media = Image, Logo,
  Gallery, MapEmbed; Data = Repeater, PropertyCard, UnitCard;
  Forms = Form, InputField; Navigation = NavBar, Footer; HeroBanner =
  Layout (a hero is a structural lead block).
- `apps/web/components/editor/sidebar/data-tab/DataTab.tsx` —
  placeholder pane: a centered `Database` icon (`lucide-react`) and
  the copy "Form submissions will appear here once Sprint 10 ships."
- `apps/web/components/editor/sidebar/RightSidebar.tsx` — placeholder
  pane: a centered `MessageSquare` icon and the copy "Select a
  component to edit it, or chat with the AI assistant (coming soon)."
- `apps/web/components/editor/canvas/Canvas.tsx` — the canvas
  container; reads the current page's `rootComponent` from the store's
  `draftConfig`, calls `<Renderer config={draftConfig} page={currentPageSlug}
  mode={previewMode ? "preview" : "edit"} selection={selectedComponentId}
  onSelect={selectComponent} onHover={setHoveredComponent} />` (omitting
  `onHover` if the renderer does not support it — pre-flight check #4).
  Wraps the renderer in a scrollable area with a maximum width matching
  a typical desktop canvas (1280px) and a subtle gridded background.
  Wires a global `keydown` handler: `Esc` clears selection.
- `apps/web/components/editor/canvas/SelectionBreadcrumb.tsx` —
  small breadcrumb shown at the bottom of the canvas reading the
  selection trail from `siteConfig` root → selected node. Reads the
  store; pure rendering.
- `apps/web/components/editor/index.ts` — barrel re-export.
- `apps/web/components/editor/__tests__/` — Vitest tests for every
  component above that has non-trivial logic. Bare placeholder
  components (DataTab, RightSidebar, DeployButton) need only a single
  smoke render test each.
- `apps/web/lib/editor-state/index.ts` — public re-exports of the store
  hook, selector helpers, action helpers, and the autosave hook.
- `apps/web/lib/editor-state/types.ts` — `EditorState`,
  `EditorActions`, `LeftSidebarTab`, `SaveState` type definitions.
  Re-exports `SiteConfig`, `Page`, `ComponentId` from
  `apps/web/lib/site-config/index.ts` for convenience.
- `apps/web/lib/editor-state/store.ts` — the Zustand store
  definition. Uses `zustand` and `zustand/middleware` (the `devtools`
  middleware in dev only — read `process.env.NODE_ENV`). Default
  `saveState` is `"idle"`; every mutator that touches `draftConfig`
  flips it to `"dirty"` (centralised through a `mutate(updater)`
  helper).
- `apps/web/lib/editor-state/selectors.ts` — derived selectors:
  `selectCurrentPage`, `selectSelectedComponentNode`,
  `selectAllPagesForPicker`, `selectPaletteId`, `selectIsHomePage`.
  Pure functions that take state, return derived values; tested in
  isolation.
- `apps/web/lib/editor-state/actions.ts` — page-level mutators:
  `addPage`, `renamePage`, `deletePage`, `reorderPages`, plus
  site-level `setSiteName`, `setPalette`, `setHeadingFont`,
  `setBodyFont`. Each is a pure function `(state, args) =>
  newDraftConfig`; the store wires them through `mutate()`. Page
  mutators enforce: the home page cannot be deleted, the home page's
  slug cannot change, slug must be `^[a-z0-9-]+$`, per-kind slug
  uniqueness, and `detailDataSource` is required iff `kind ===
  "detail"`. Failed validation throws a typed `EditorActionError`
  which the calling component catches and surfaces via Sonner.
- `apps/web/lib/editor-state/autosave.ts` — `useAutosave(siteId,
  workingVersionId, options?)` hook. Subscribes to `draftConfig` +
  `saveState`; when state flips to `"dirty"`, debounces by `1000ms`
  (configurable via `options.debounceMs`), flips state to `"saving"`,
  PATCHes `/api/sites/[siteId]/working-version` with the current
  `draftConfig`. On 204, flips state to `"saved"` and stores
  `lastSavedAt = Date.now()`. On non-2xx or fetch error, flips state
  to `"error"`. Coalesces overlapping mutations: if `draftConfig`
  changes during a save, queue exactly one follow-up save after the
  in-flight one resolves. Aborts in-flight saves on unmount via
  `AbortController`.
- `apps/web/lib/editor-state/__tests__/store.test.ts` — store unit
  tests (selection, hover, page-tab, preview-mode toggle).
- `apps/web/lib/editor-state/__tests__/actions.test.ts` — page-action
  unit tests (add static, add detail, add detail without
  data-source rejected, slug uniqueness per-kind, home delete
  rejected, home slug rename rejected, reorder, etc.).
- `apps/web/lib/editor-state/__tests__/autosave.test.ts` — fake-timers
  test of the debounce + coalesce + error path.

### Shared (read-only this sprint)

- `PROJECT_SPEC.md` (the authoritative spec — read, do not write).
- `apps/web/lib/site-config/` (Sprint 3 + 3b — read-only; the schema is
  the contract, do NOT extend it).
- `apps/web/lib/setup-form/palettes.ts` (Sprint 2 — read-only; reused
  by the Site tab's PaletteSelector).
- `apps/web/lib/setup-form/types.ts` (Sprint 2 — read-only; reused for
  the `PaletteId` type).
- `apps/web/lib/sites/repo.ts` (Sprint 4 — read-only; Sprint 6 calls
  `getSiteBySlug` and `getLatestWorkingVersion` from server components).
- `apps/web/lib/supabase/` (Sprint 1 — read-only; the autosave
  endpoint imports the service-role client from here).
- `apps/web/components/renderer/` (Sprint 3 — read-only; the canvas
  calls `<Renderer />`).
- `apps/web/components/site-components/` (Sprints 3 + 5 + 5b — read-only;
  the Add tab catalog references the registry's keys).
- `apps/web/components/ui/` (shadcn primitives — read-only; reused for
  Dialog, AlertDialog, Tabs, Tooltip, etc.).
- `apps/web/types/database.ts` (Sprint 4 — read-only; the API route
  uses the generated `Database` type for the Supabase client).

### Forbidden (do not touch under any circumstance)

- `PROJECT_SPEC.md` — read only. Spec amendments are a separate planning
  workflow, not a sprint task.
- `DECISIONS.md` — append-only. You may add new entries; you may NOT
  edit existing entries.
- `apps/web/lib/site-config/` — Sprint 3 + 3b ownership. The schema is
  locked. If you discover a schema gap, raise a Deviation.
- `apps/web/components/renderer/` — Sprint 3 ownership. If the renderer
  needs a new prop (e.g. an `onHover` it doesn't already have), raise a
  Deviation; do NOT modify it inline.
- `apps/web/components/site-components/` — Sprints 3 + 5 + 5b
  ownership. If a component card in the catalog needs an icon mapping,
  declare it in the catalog file, not in the component itself.
- `apps/web/lib/sites/repo.ts` — Sprint 4 ownership. Sprint 6's autosave
  endpoint calls Supabase directly (via the existing service-role client
  in `lib/supabase/`), not through `repo.ts`. If a `repo.ts` helper
  feels needed, raise a Deviation; do NOT modify `repo.ts` inline.
- `apps/web/components/setup-form/` — Sprint 2 ownership.
- `apps/web/app/api/generate-initial-site/` — Sprint 4 ownership.
- `apps/web/app/[site]/preview/` — Sprint 4 ownership.
- `supabase/migrations/` — no migrations in this sprint. The autosave
  endpoint UPDATES an existing column on an existing row; no DDL is
  needed. If you find yourself wanting a migration, raise a Deviation.
- Any file under `apps/web/components/editor/edit-panels/` — Sprint 8
  ownership. The Right sidebar in this sprint is a placeholder, not a
  panel host.
- Any file under `apps/web/components/editor/canvas/dnd/` — Sprint 7
  ownership.
- Any file under `apps/web/components/editor/sidebar/data-tab/` other
  than the placeholder `DataTab.tsx` — Sprint 10 ownership.
- Any file under `apps/web/components/editor/ai-chat/` — Sprint 11
  ownership.
- The `package.json` `dependencies` block — only the additions explicitly
  listed in this CLAUDE.md may be added (`zustand`). Adding any other
  dependency is a Deviation.
- Any test file outside `apps/web/components/editor/__tests__/` and
  `apps/web/lib/editor-state/__tests__/`.

## Definition of Done

Treat each item as a hard requirement. The sprint is not done until ALL
boxes are checked AND every quality gate in the "Definition of done
gating" block at the bottom passes with zero warnings.

- [ ] **Pre-flight check passed.** All six checks above succeeded; the
  Sprint Completion Report records each as ✅ in its body.

- [ ] **Editor route loads a real site.** Navigating to
  `/{slug}/edit` with a valid slug renders the editor shell and the
  canvas displays the working version's home page through the shared
  `<Renderer mode="edit">`. Navigating to a missing slug renders the
  Next.js 404 page (`not-found.tsx`). Navigating to a slug whose site
  has no `is_working` version also renders the 404 page (the same
  page; no separate copy needed for this sprint).

- [ ] **Top bar renders and is fully wired.** The TopBar shows: a
  static "Orion's Belt" wordmark on the far left; an inline-editable
  site name input bound to `draftConfig.name` (Enter or blur commits;
  Esc reverts); the page selector dropdown showing the active page
  with a small "DETAIL" badge if the active page has `kind ===
  "detail"`, opening to a list of all pages with the same per-row
  badge and a footer "+ Add page" entry that opens `AddPageDialog`;
  the preview toggle bound to the store's `previewMode`; the
  SaveIndicator showing one of "Saved 2s ago" / "Saving…" /
  "Unsaved changes" / "Save failed — retry"; the decorative Deploy
  button.

- [ ] **Left sidebar four-tab structure works.** The LeftSidebar
  renders four tab triggers (Site, Pages, Add, Data); clicking a
  trigger swaps the panel content and writes the active tab to the
  store (`leftSidebarTab`); the active tab persists across re-renders
  (it lives in the store, not in `useState`). Default tab is
  `pages` — the user lands looking at the page list.

- [ ] **Site tab edits palette and fonts.** The Site tab renders six
  palette cards (using the same definitions as Sprint 2's setup form,
  imported from `apps/web/lib/setup-form/palettes.ts`); clicking a card
  fires `setPalette(paletteId)`, which updates `draftConfig` and flips
  `saveState` to `"dirty"`. The currently selected palette is shown
  with a 2px accent border. The font selectors (Heading + Body if the
  schema supports both, or single Font if not) populate from the
  inline curated list and update the schema's font fields when changed.
  Changes are reflected in the canvas immediately (the renderer reads
  the same `draftConfig`).

- [ ] **Pages tab supports add (static + detail), rename, delete, and
  reorder.**
  - Add: clicking "Add page" opens `AddPageDialog`. Filling the form
    with kind = Static creates a static page (no `detailDataSource`).
    Filling the form with kind = Detail requires choosing a
    `detailDataSource` (`properties` or `units`) before Submit is
    enabled. On submit, a new page is appended to `draftConfig.pages`
    with a brand-new empty `Section` as `rootComponent` and the page
    list updates.
  - Rename: clicking the rename button on a page row opens
    `RenamePageDialog`. Editing name + slug commits to the store on
    submit. The home page's slug field is disabled (tooltip
    "The home page slug is fixed.").
  - Delete: clicking the delete button on a non-home page row opens
    `DeletePageConfirm`. Confirming removes the page from
    `draftConfig.pages` and, if the deleted page was the current
    page, switches the current page to home. The home page's delete
    button is disabled (tooltip "The home page cannot be deleted.").
  - Reorder: each non-home page row has up/down arrow buttons that
    move it within `draftConfig.pages`; the home page is locked at
    index 0 and cannot be moved.
  - Per-kind slug uniqueness: attempting to add or rename to a slug
    that conflicts with another page **of the same kind** is blocked
    with an inline error in the dialog. Adding a detail page with
    `slug: "units"` when a static page with `slug: "units"` already
    exists is **allowed** (the U2 same-slug coexistence pattern from
    §8.12).

- [ ] **Add tab shows all 20 component cards (non-draggable).** The Add
  tab renders one `ComponentCard` per entry in
  `component-catalog.ts`, grouped by `group` field (Layout, Content,
  Media, Data, Forms, Navigation), each section labeled with a small
  uppercase header. The card count is exactly 20 (asserted in a test).
  Cards are clickable for visual feedback only — clicking a card sets
  a transient `selectedAddCard` value in component-local state but does
  NOT mutate `draftConfig`. The footer line "Drag-and-drop coming in
  the next update." is visible.

- [ ] **Data tab + Right sidebar are placeholder shells.** The Data tab
  renders the `Database` icon and the placeholder copy. The Right
  sidebar renders the `MessageSquare` icon and the placeholder copy.
  Neither pane has interactive elements.

- [ ] **Canvas wires selection + hover + Esc clears.** Clicking a
  component in the canvas sets `selectedComponentId` to that node's
  id and the renderer renders the selection outline (per Sprint 3's
  edit-mode behavior). Clicking the canvas background (not on any
  component) clears `selectedComponentId`. Pressing `Esc` while the
  canvas is focused clears `selectedComponentId`. Hovering a component
  highlights its outline (via the `onHover` callback if the renderer
  supports it; otherwise via pure CSS). The breadcrumb at the bottom of
  the canvas shows the selection trail (root → ... → selected); when
  nothing is selected, the breadcrumb is hidden.

- [ ] **Preview toggle swaps renderer mode.** Clicking the PreviewToggle
  flips `previewMode`. When `previewMode === true`, the canvas calls
  `<Renderer mode="preview" />` (no selection outlines, no hover
  highlights, animations enabled per Sprint 3 behavior); when
  `previewMode === false`, the canvas reverts to `mode="edit"`.

- [ ] **Page selector switches the canvas page.** Selecting a different
  page in the PageSelector writes `currentPageSlug` to the store and the
  canvas re-renders with the new page's `rootComponent`.
  `selectedComponentId` is cleared on page change.

- [ ] **Zustand store is the single source of truth.** All editor state
  (current page, selection, hover, sidebar tab, preview mode, draft
  config, save state, last saved timestamp) lives in the store. No
  editor component holds editor state in `useState` other than transient
  UI state (form-input drafts inside dialogs, dialog open/closed
  bindings local to a single dialog). The store is the only consumer of
  `zustand` — the dependency is added in this sprint.

- [ ] **Autosave debounces, coalesces, and surfaces failures.** A
  mutation to `draftConfig` flips `saveState` to `"dirty"`; after
  1000ms of quiet, the autosave hook PATCHes
  `/api/sites/{siteId}/working-version` with the current `draftConfig`
  body. On 204, the SaveIndicator displays "Saved Xs ago" with a
  ticking time. On non-2xx, the SaveIndicator displays "Save failed —
  retry" with a button that re-attempts the PATCH. Concurrent
  mutations during an in-flight save coalesce into exactly one
  follow-up save. The hook aborts in-flight saves on unmount via
  `AbortController`.

- [ ] **PATCH endpoint validates and persists.** `PATCH
  /api/sites/[siteId]/working-version` parses the request body with
  Zod (`{ config: siteConfigSchema }`), uses the service-role
  Supabase client, and updates the row matching `site_id = :siteId
  AND is_working = true`, setting `config = :newConfig` and
  `updated_at = NOW()`. Returns 204 on success. Returns 400 with a
  category-keyed JSON body `{ category: "validation_error", message,
  details }` on Zod failure. Returns 404 if no working row exists.
  Returns 500 with `{ category: "server_error", message }` on
  Supabase failure (no stack traces, no service-role key in any
  response body, ever).

- [ ] **Coding standards (§15) honored.** No `any`. No `@ts-ignore`. No
  `.skip` or `.only` in tests. No commented-out code. No `console.log`
  in committed files (use the existing logger if one exists; otherwise
  no logging in this sprint). Server-only files start with
  `import "server-only";`. Client components start with `"use client";`
  on line 1.

- [ ] **Tests added.** ≥ 18 new Vitest tests across the editor-state
  store, the editor-state actions, the autosave hook (with fake
  timers), the PATCH endpoint (with a mocked Supabase client), the
  AddPageDialog, the RenamePageDialog, the PageSelector (DETAIL
  badge), the PaletteSelector, the FontSelector, and the Canvas
  selection / hover / Esc behavior. No `.skip`, no `.only`.

- [ ] **All quality gates pass.**
  - `pnpm test` — zero failures, zero skipped.
  - `pnpm build` — zero TypeScript errors.
  - `pnpm biome check` — zero warnings.
  - Manual smoke test (below) — every step PASS.

- [ ] **No new files outside the Owned scope.** `git status` shows
  changed files only inside the Owned list above. The only new
  dependency added is `zustand` (and, if absent already,
  `zustand`'s peer types).

- [ ] **No deviations were silently absorbed.** Every deviation that
  occurred during the sprint was reported and approved per the
  protocol below. `DECISIONS.md` has one new entry per approved
  deviation with the user's verbatim approval text.

- [ ] **Sprint Completion Report emitted verbatim** in the format at
  the bottom of this file, with a populated External Actions Required
  block (Vercel: none; Supabase: none — no migrations; Anthropic:
  none — no AI calls in this sprint; Local: install `zustand` via
  `pnpm install`; Other: none unless approved deviations dictate
  otherwise).

## Coding standards (binding — copied from PROJECT_SPEC.md §15)

- TypeScript strict mode is on (`strict`, `noUncheckedIndexedAccess`,
  `noImplicitAny`). No `any`, no `@ts-ignore`, no `as unknown as` casts
  except where unavoidable (and only with a one-line comment naming
  the reason).
- Runtime validation at trust boundaries uses Zod; never trust
  unvalidated `unknown`.
- Server-only modules (`lib/sites/`, the API route) start with
  `import "server-only";`.
- Client components start with `"use client";` as the first line.
- Use `lucide-react` for icons. No alternative icon libraries.
- Use `sonner` for toasts. No alternative toast libraries.
- Use shadcn `Dialog` / `AlertDialog` / `Tabs` / `Tooltip` for the
  obvious patterns; do NOT roll new primitives.
- Use Tailwind utility classes for styling. No new CSS files. No
  inline `style={...}` except for dynamic values that cannot be
  expressed as Tailwind classes (gridded canvas backgrounds, etc.).
- Tests use Vitest. No `.skip`, no `.only`, no `xdescribe`. Each test
  has a clear name describing the behavior under test.
- File naming: PascalCase for components and component files, camelCase
  for non-component modules, kebab-case for routes (Next.js convention).
- Comments explain *why*, not *what*. Lean on naming for *what*.

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

## Definition of "done" gating

A sprint is not done until all of the following pass with no warnings:

- `pnpm test`
- `pnpm build`
- `pnpm biome check`
- Manual smoke test from the sprint plan (see "Manual smoke test" below).

If any check fails, treat it as a Deviation. Do not commit. Do not
declare the sprint complete.

## Manual smoke test (numbered, click-by-click)

Prerequisites: `apps/web/.env.local` is populated with
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF`, and
`ANTHROPIC_API_KEY` (the last one is required because the smoke test
walks through Element 1 to create a site to edit). The hosted Supabase
project is linked. At least one site has been generated through Element
1 (or you can re-run step 1 to generate one fresh).

1. Run `pnpm dev` from the repo root. Wait for the "Ready" line.
2. Open `http://localhost:3000/setup`. Fill the setup form with
   Company Name `Aurora Property Group`, palette `Ocean`. Click
   **Save**. Wait for the PreviewPanel to transition to "generated".
   Note the slug shown in the fake browser URL field (e.g.
   `aurora-property-group-x7k2pq`).
3. Open `http://localhost:3000/{slug}/edit` directly in a new tab
   (replacing `{slug}` with the slug from step 2). Confirm the editor
   shell renders: TopBar across the top, LeftSidebar on the left
   (Pages tab visible by default), Canvas in the center showing the
   home page with selection wrappers, RightSidebar on the right with
   the placeholder copy.
4. In the TopBar, confirm the site name input shows "Aurora Property
   Group". Click into it, type ` Demo` at the end, press Enter.
   Confirm the SaveIndicator briefly shows "Saving…" and within ~1.5s
   shows "Saved 1s ago".
5. Open Supabase Studio (or a SQL prompt). Run
   `select config->>'name' as name, updated_at from site_versions
   where site_id = '<the new id>' and is_working = true;`. Confirm
   the name reads "Aurora Property Group Demo" and `updated_at` is
   within the last few seconds.
6. Click the PageSelector. Confirm the dropdown opens and shows the
   home page with NO "DETAIL" badge. Click "+ Add page" at the bottom.
7. In the AddPageDialog, leave kind = Static. Type Name `Properties`,
   Slug `properties`. Click Submit. Confirm the dialog closes, the
   PageSelector shows "Properties" as the active page, and the Canvas
   renders an empty page (an empty Section is the rootComponent).
8. Click the PageSelector → "+ Add page". In the dialog, change kind
   to **Detail**. Confirm a "Detail data source" dropdown appears.
   Select `units`. Type Name `Unit Detail Template`, Slug `units`.
   Confirm the dialog allows the slug `units` even though no static
   page with that slug exists (the per-kind uniqueness rule). Click
   Submit. Confirm the new page is added with the "DETAIL" badge in
   the page selector and the canvas now shows it.
9. Click the PageSelector → "+ Add page" again. In the dialog, leave
   kind = Static. Type Name `Units`, Slug `units`. Click Submit.
   Confirm the dialog accepts the slug `units` (the U2 same-slug
   coexistence rule with the existing detail page).
10. Click the PageSelector → "+ Add page" once more. In the dialog,
    leave kind = Static. Type Name `Properties Duplicate`, Slug
    `properties`. Confirm the dialog blocks Submit with an inline
    error reading "Another static page already uses this slug." Close
    the dialog without submitting.
11. Switch back to the home page in the PageSelector. In the
    LeftSidebar, click the **Site** tab. Confirm the six palette
    cards render with Ocean selected. Click `Forest`. Confirm the
    canvas re-themes within ~0.2s (text colors and accent change) and
    SaveIndicator briefly shows "Saving…" then "Saved Xs ago".
12. Click the **Pages** tab. Find the home page row; confirm its
    delete button is disabled and its slug field (when rename dialog
    is opened) is also disabled with the expected tooltip.
13. Click the rename button on the `Properties` page row. Change Name
    to `Our Properties`. Click Save. Confirm the PageSelector now
    shows `Our Properties`.
14. Click the delete button on the `Properties Duplicate` page row…
    wait, you didn't add it because step 10 blocked. OK — click the
    delete button on `Unit Detail Template` instead. Confirm the
    AlertDialog opens; confirm; confirm the page disappears from the
    page list and the Canvas reverts to the home page.
15. Click the **Add** tab. Confirm the section headers render in this
    order: Layout, Content, Media, Data, Forms, Navigation. Confirm
    every component group has its expected cards. Confirm the total
    card count is 20. Click any card; confirm a visual selection
    indicator appears on the card; confirm the canvas does NOT
    change (no component was added).
16. Click the **Data** tab. Confirm the placeholder copy renders.
17. In the canvas, click any component (e.g. the home page's
    Heading). Confirm a selection outline appears around it and the
    breadcrumb at the bottom of the canvas reads
    "Section / Heading" or similar. Hover a sibling component;
    confirm a hover highlight appears. Press `Esc`; confirm the
    selection outline disappears and the breadcrumb hides.
18. In the TopBar, click the PreviewToggle to switch to Preview mode.
    Confirm the selection outlines and hover highlights vanish; the
    canvas now looks like the deployed site would. Click the toggle
    again to return to Edit mode.
19. Click the Deploy button. Confirm a Sonner toast appears with the
    text "Deploy is coming in a later sprint." Confirm clicking the
    button does not navigate or mutate state.
20. Open `http://localhost:3000/no-such-site/edit`. Confirm the
    Next.js 404 page renders.
21. Stop the dev server (`Ctrl+C`). Run `pnpm test`. Confirm zero
    failures, zero skipped, ≥ 18 new tests added.
22. Run `pnpm build`. Confirm zero TypeScript errors and the build
    completes.
23. Run `pnpm biome check`. Confirm zero warnings.

Every step above must PASS before declaring the sprint complete. A
FAIL on any step is a Deviation.

## Useful local commands

- `pnpm dev` — local dev server (port 3000)
- `pnpm test` — Vitest in watch mode (use `pnpm test --run` for CI mode)
- `pnpm test --run` — Vitest single-pass
- `pnpm test --run -- editor-state` — run only the editor-state tests
- `pnpm build` — Next.js production build
- `pnpm biome check` — lint + format check
- `pnpm biome check --write` — auto-fix
- `pnpm db:types` — regenerate Supabase types (NOT needed this sprint
  — no schema changes — but listed in case of a Deviation that adds a
  migration)

## Notes & hints (non-binding)

- **Zustand v4 vs v5.** As of this sprint's planning, both are widely
  used. v5 has a slightly cleaner API for slices. Pin to whichever is
  current and stable; do NOT mix versions. If the install pulls in v5
  and a peer dep complains, that is a Deviation, not a "let's downgrade
  silently".
- **Server / client split for the editor route.** The route's `page.tsx`
  is async server, awaits `params`, calls `getSiteBySlug` and
  `getLatestWorkingVersion`, then renders `<EditorShell />` (a client
  component) with the result as a prop. The store hydrates from those
  props on first render via a `useEffect` with a stable dependency
  array (the `workingVersionId`). Do NOT call `getLatestWorkingVersion`
  from the client.
- **Page-selector "DETAIL" badge.** A small `Badge` from shadcn
  (`variant="secondary"`) with the text `DETAIL` works. Keep it under
  the page name in the dropdown row, not next to the dropdown trigger
  — only the active page in the trigger gets the badge inline (because
  space is tight there).
- **Renderer onHover.** The Sprint 3 renderer's existing `RenderContext`
  may not expose an `onHover` callback. If absent, pure CSS handles
  hover (the selection wrapper has `:hover { outline: ... }`). Do NOT
  modify the renderer to add a callback — that is a Deviation.
- **Autosave debounce + coalesce.** The simplest correct implementation:
  one `useEffect` watching `[draftConfig, saveState]`; when state is
  `"dirty"` and not already saving, set a 1000ms timer; on timer fire,
  flip to `"saving"` and PATCH; on response, flip to `"saved"` /
  `"error"`. Keep a ref to the latest `draftConfig` so the in-flight
  save sees the snapshot it intended to send. If a new mutation lands
  while saving, set a flag and re-trigger the effect after the response.
- **Avoid storing computed values.** The selected component node is a
  derived value — compute it via `selectSelectedComponentNode(state)`,
  do NOT store the node itself. Same for the current page's
  `rootComponent`. The single source of truth is the `draftConfig`
  tree plus the `selectedComponentId` and `currentPageSlug` ids.
- **Esc handler.** Attach the global `keydown` listener inside
  `EditorShell` (or `Canvas`) via `useEffect` with proper cleanup. Use
  `event.key === "Escape"`. Bail out if the active element is an
  `<input>` or `<textarea>` (don't hijack Esc inside the AddPageDialog).
- **AddPageDialog form lib.** Use `react-hook-form` + Zod (already in
  the repo for the setup form). Do NOT introduce a second forms lib.
- **Saving copy time format.** "Saved Xs ago" — use a simple
  `setInterval(1000)` driven from a `useTime` hook local to
  `SaveIndicator`. After 60s, switch to "Saved Xm ago".
- **Catalog icons.** Reasonable defaults: Section → `LayoutPanelTop`,
  Row → `Rows3`, Column → `Columns3`, Spacer → `Space`, Divider →
  `Minus`, Heading → `Heading1`, Paragraph → `Pilcrow`, Button →
  `RectangleHorizontal`, Image → `Image`, Logo → `BadgePlus`, Gallery
  → `Images`, MapEmbed → `MapPin`, Repeater → `Repeat`, PropertyCard
  → `Building2`, UnitCard → `DoorOpen`, Form → `ClipboardList`,
  InputField → `TextCursorInput`, NavBar → `Menu`, Footer → `Square`,
  HeroBanner → `LayoutTemplate`. None of these is binding — pick what
  reads well; document choices inline.

## Sprint Completion Report (emit verbatim when finished)

```
✅ SPRINT 6 COMPLETE

Pre-flight check:
- [x] PROJECT_SPEC.md §8.12 present and correct
- [x] apps/web/lib/site-config/schema.ts has Page.kind / detailDataSource / superRefine
- [x] sites + site_versions tables exist; lib/sites/repo.ts has getSiteBySlug + getLatestWorkingVersion
- [x] components/renderer/Renderer.tsx exports Renderer with onSelect (and onHover or pure-CSS fallback)
- [x] components/site-components/registry.ts has 20 entries
- [x] git branch is master

Definition of Done:
- [x] Editor route loads a real site
- [x] Top bar renders and is fully wired
- [x] Left sidebar four-tab structure works
- [x] Site tab edits palette and fonts
- [x] Pages tab supports add (static + detail), rename, delete, reorder
- [x] Add tab shows all 20 component cards (non-draggable)
- [x] Data tab + Right sidebar are placeholder shells
- [x] Canvas wires selection + hover + Esc clears
- [x] Preview toggle swaps renderer mode
- [x] Page selector switches the canvas page
- [x] Zustand store is the single source of truth
- [x] Autosave debounces, coalesces, and surfaces failures
- [x] PATCH endpoint validates and persists
- [x] Coding standards honored
- [x] Tests added (count: N)
- [x] All quality gates pass
- [x] No new files outside the Owned scope
- [x] No deviations were silently absorbed
- [x] Sprint Completion Report emitted verbatim

Files created:
- apps/web/app/[site]/edit/page.tsx (X lines)
- apps/web/app/[site]/edit/EditorShell.tsx (X lines)
- apps/web/app/[site]/edit/loading.tsx (X lines)
- apps/web/app/[site]/edit/error.tsx (X lines)
- apps/web/app/[site]/edit/not-found.tsx (X lines)
- apps/web/app/api/sites/[siteId]/working-version/route.ts (X lines)
- apps/web/components/editor/topbar/TopBar.tsx (X lines)
- apps/web/components/editor/topbar/SiteNameInput.tsx (X lines)
- apps/web/components/editor/topbar/PageSelector.tsx (X lines)
- apps/web/components/editor/topbar/PreviewToggle.tsx (X lines)
- apps/web/components/editor/topbar/DeployButton.tsx (X lines)
- apps/web/components/editor/topbar/SaveIndicator.tsx (X lines)
- apps/web/components/editor/sidebar/LeftSidebar.tsx (X lines)
- apps/web/components/editor/sidebar/site-tab/SiteTab.tsx (X lines)
- apps/web/components/editor/sidebar/site-tab/PaletteSelector.tsx (X lines)
- apps/web/components/editor/sidebar/site-tab/FontSelector.tsx (X lines)
- apps/web/components/editor/sidebar/pages-tab/PagesTab.tsx (X lines)
- apps/web/components/editor/sidebar/pages-tab/AddPageDialog.tsx (X lines)
- apps/web/components/editor/sidebar/pages-tab/RenamePageDialog.tsx (X lines)
- apps/web/components/editor/sidebar/pages-tab/DeletePageConfirm.tsx (X lines)
- apps/web/components/editor/sidebar/pages-tab/PageRow.tsx (X lines)
- apps/web/components/editor/sidebar/add-tab/AddTab.tsx (X lines)
- apps/web/components/editor/sidebar/add-tab/ComponentCard.tsx (X lines)
- apps/web/components/editor/sidebar/add-tab/component-catalog.ts (X lines)
- apps/web/components/editor/sidebar/data-tab/DataTab.tsx (X lines)
- apps/web/components/editor/sidebar/RightSidebar.tsx (X lines)
- apps/web/components/editor/canvas/Canvas.tsx (X lines)
- apps/web/components/editor/canvas/SelectionBreadcrumb.tsx (X lines)
- apps/web/components/editor/index.ts (X lines)
- apps/web/lib/editor-state/index.ts (X lines)
- apps/web/lib/editor-state/types.ts (X lines)
- apps/web/lib/editor-state/store.ts (X lines)
- apps/web/lib/editor-state/selectors.ts (X lines)
- apps/web/lib/editor-state/actions.ts (X lines)
- apps/web/lib/editor-state/autosave.ts (X lines)
- (test files under both __tests__ directories)

Files modified:
- package.json (+1 dep: zustand)
- pnpm-lock.yaml (regenerated)

Tests added: N (all passing)
Test command output (last 5 lines):
[paste]

Build output (the "Compiled successfully" line and adjacent context):
[paste]

Biome output:
[paste]

Deviations approved during sprint: [list with one-line summaries, or "None"]

Manual smoke test result: PASS (steps 1–23 all green) [or FAIL with the
specific step that failed and the exact failure mode]

External Actions Required:
- Vercel: none.
- Supabase: none. No new migrations. The autosave endpoint UPDATEs an
  existing column on an existing row.
- Anthropic: none. No AI calls in this sprint.
- Local: run `pnpm install` once to pull in the new `zustand` dependency
  (already done by Claude Code as part of the sprint, but mentioned in
  case the user wants to re-verify on a clean clone).
- Other: none.

Recommended next steps:
- Sprint 8 (Element edit mode — manual). Sprint 8 fills the right
  sidebar's "Element Edit" mode (Content / Style / Animation / Visibility
  / Advanced tabs) when a component is right-clicked. The Canvas already
  surfaces selection — Sprint 8 wires the contextmenu handler to swap
  the LeftSidebar from Site/Pages/Add/Data into Element Edit mode and
  populate the Style controls per PROJECT_SPEC.md §6.4. Sprint 7
  (Drag-and-drop) follows Sprint 8 per the recommended sequential order
  in SPRINT_SCHEDULE.md.
```