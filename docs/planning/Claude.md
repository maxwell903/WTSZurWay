# CLAUDE.md — Sprint 8: Element Edit Mode (manual)

> Drop this file at the repo root of `WTSZurWay/` for the duration of Sprint
> 8, replacing the master `CLAUDE.md`. Restore the master `CLAUDE.md` after
> the sprint's quality gates pass and the Sprint Completion Report has been
> emitted. Per the 2026-04-25 entry in `DECISIONS.md`, this project uses a
> single-branch workflow on `master` — there is no `sprint/08` branch.
> Every commit lands on `master` after the quality gates pass. Hosted
> Supabase is in use (no Docker, no local Postgres).

## Mission

Wire **Element Edit mode** for the editor. Right-clicking any component on
the canvas swaps the LeftSidebar from its primary four-tab mode (Site /
Pages / Add / Data) into a five-tab Element Edit panel — Content / Style /
Animation / Visibility / Advanced — that edits the right-clicked node in
place. Edits flow through new component-level mutators on the existing
Zustand store, the existing autosave hook persists them to the working
`site_versions` row, and the canvas re-renders immediately. Sprint 8 also
fills in the seven Content panels named by the spec
(`PROJECT_SPEC.md` §8.4 + `SPRINT_SCHEDULE.md` §2 Sprint 8 amendment):
Heading, Paragraph, Button (with the §8.12 Link-mode controls), Image,
NavBar, Footer, and InputField (with the §8.12
`defaultValueFromQueryParam` control). The other thirteen components ship a
documented Content-tab placeholder; their Style / Animation / Visibility
tabs work in full.

This sprint **does not** ship drag-and-drop (Sprint 7), Repeater data
binding (Sprint 9), Form submission wiring (Sprint 10), the AI chat right
sidebar (Sprint 11), or the Deploy flow (Sprint 13). The Add tab cards
remain non-draggable. The Right sidebar remains a placeholder. `setProp`
inside a Repeater template still saves verbatim — Sprint 9 will resolve
`{{ row.* }}` tokens at render time.

This sprint is the spine of every later editor sprint that needs to read
or write component state. Get the store mutators right; everything from
Sprint 9 onward consumes them.

## Pre-flight check (MANDATORY — emit before reading or writing any non-spec file)

Before reading or modifying any file other than the items listed below in
"Spec sections in scope", run these seven checks. If any fails, STOP and
emit a Deviation Report per the protocol embedded in this file. Do not
attempt to work around a failed check.

1. **Single-branch workflow.** Run `git branch --show-current` and verify
   the output is exactly `master`. If it is not, STOP and emit a
   Deviation Report — the project workflow per the 2026-04-25 entry in
   `DECISIONS.md` is single-branch on `master`; do NOT create a
   `sprint/08` branch and do NOT switch branches.

2. **Sprint 6 is merged.** Confirm all of the following exist and exporta
   from `apps/web/components/editor/index.ts`:
   `TopBar`, `LeftSidebar`, `RightSidebar`, `Canvas`, `SelectionBreadcrumb`,
   `PageSelector`, `PreviewToggle`, `DeployButton`, `SaveIndicator`,
   `SiteNameInput`, `AddTab`, `ComponentCard`, `COMPONENT_CATALOG`,
   `COMPONENT_GROUP_ORDER`, `DataTab`, `AddPageDialog`,
   `DeletePageConfirm`, `PageRow`, `PagesTab`, `RenamePageDialog`,
   `FontSelector`, `PaletteSelector`, `SiteTab`. If any is missing,
   STOP and emit a Deviation Report — Sprint 8 extends Sprint 6 in
   place; the editor shell must be present.

3. **Editor store has the Sprint-6 surface.** Read
   `apps/web/lib/editor-state/types.ts` and confirm `EditorState` has
   `draftConfig`, `currentPageSlug`, `selectedComponentId`,
   `hoveredComponentId`, `previewMode`, `leftSidebarTab`, `saveState`,
   `lastSavedAt`, `saveError`, and `EditorActions` has `selectComponent`,
   `setHoveredComponent`, `setLeftSidebarTab`, `setPreviewMode`,
   `addPage`, `renamePage`, `deletePage`, `reorderPages`, `setSiteName`,
   `setPalette`, `setFontFamily`, `markSaving`, `markSaved`, `markError`.
   If any is missing, STOP and emit a Deviation Report.

4. **`EditModeWrapper` exposes `onContextMenu`.** Read
   `apps/web/components/renderer/EditModeWrapper.tsx`. Confirm the
   component accepts an `onContextMenu?: (id: string) => void` prop, that
   the `onContextMenu` event handler calls `e.preventDefault()` before
   invoking the callback with the node id, and that the keyboard parity
   handler (`Shift+F10` / `ContextMenu` key) does the same. If any of
   that is missing, STOP and emit a Deviation Report — Sprint 8's
   right-click trigger relies on the wrapper's existing wiring.

5. **`Renderer` and `ComponentRenderer` plumb `onContextMenu`.** Read
   `apps/web/components/renderer/Renderer.tsx` and
   `apps/web/components/renderer/ComponentRenderer.tsx`. Confirm both
   declare an optional `onContextMenu?: (id: string) => void` prop and
   forward it to the `EditModeWrapper` only in `mode === "edit"`. If
   either is missing the prop, STOP and emit a Deviation Report.

6. **`ComponentNode` schema does NOT have `htmlId` or `className`
   fields.** Read `apps/web/lib/site-config/schema.ts` and confirm
   `componentNodeSchema` does not include either field, and that
   `PROJECT_SPEC.md` §11's `ComponentNode` definition likewise does
   not include them. If either has been added since this CLAUDE.md was
   written, STOP and emit a Deviation Report — the Advanced-tab
   placeholder in this plan assumes the schema gap; if the schema has
   been amended, the Advanced tab must ship live controls instead of
   a placeholder.

7. **All 20 `EditPanel.tsx` stubs exist.** For each
   `T ∈ { Section, Row, Column, Heading, Paragraph, Button, Image, Logo,
   Spacer, Divider, NavBar, Footer, HeroBanner, PropertyCard, UnitCard,
   Repeater, InputField, Form, MapEmbed, Gallery }`, confirm
   `apps/web/components/site-components/${T}/EditPanel.tsx` exists and
   exports `${T}EditPanel`. If any is missing, STOP and emit a
   Deviation Report — Sprint 8 fills these in; it does not create them
   from scratch.

Only after all seven checks pass may you proceed to write code.

## Spec sections in scope

Read each of these end-to-end before writing any code. They are the
authoritative source for everything below — when this file and the spec
disagree, the spec wins; surface the conflict via the Deviation Protocol
before proceeding.

- `PROJECT_SPEC.md` §6.1 — Component catalog (informs which components
  get a Content panel in this sprint vs. later).
- `PROJECT_SPEC.md` §6.4 — Shared style controls (binding for the Style
  tab).
- `PROJECT_SPEC.md` §6.5 — Animation presets (the ten enum values; the
  Animation tab edits exactly these).
- `PROJECT_SPEC.md` §8.4 — Left sidebar element edit mode (the five
  tabs, the back arrow, the bottom-of-panel Delete button).
- `PROJECT_SPEC.md` §8.5 — Selection model (right-click selects and
  swaps the left sidebar; left-click on background deselects; `Esc`
  clears).
- `PROJECT_SPEC.md` §8.6 — Canvas behavior in edit mode (selection
  outline already shipped by Sprint 3; this sprint does not change the
  canvas chrome beyond wiring `onContextMenu`).
- `PROJECT_SPEC.md` §8.8 — Right sidebar in element edit mode (the
  right sidebar STAYS as the AI-chat shell; the LEFT sidebar is the one
  that swaps — this is a deliberate deviation from the brainstorm and
  is binding).
- `PROJECT_SPEC.md` §8.12 — Detail pages (Button gains a Link-mode
  segmented control + Detail-page dropdown when `linkMode === "detail"`;
  InputField gains a `Default from query parameter` field).
- `PROJECT_SPEC.md` §10.1 — `RendererProps` (the canvas now passes
  `onContextMenu` in addition to `onSelect`).
- `PROJECT_SPEC.md` §11 — `SiteConfig` schema in full (canonical; you
  read it, you do NOT modify it — schema-lock break would require its
  own sprint per `SPRINT_SCHEDULE.md` §5).
- `PROJECT_SPEC.md` §15 — Coding standards (binding; the relevant
  subset is copied below).
- Each component's `apps/web/components/site-components/${T}/SPEC.md`
  for the seven components that get a Content panel in this sprint
  (Heading, Paragraph, Button, Image, NavBar, Footer, InputField).
  Their Style-tab carve-outs (Spacer and Divider's primitive notes;
  HeroBanner's `height` prop; etc.) are binding.

## File scope

### Owned (this sprint may create or modify)

**New: edit-panel infrastructure (this is the centerpiece of Sprint 8).**

- `apps/web/components/editor/edit-panels/EditPanelShell.tsx` — the
  container that wraps the five tabs. Renders a back-arrow button at
  the top (clicking returns the LeftSidebar to primary mode AND
  clears the active selection — a single store action,
  `exitElementEditMode`), the selected component's type as the panel
  title, the tabs nav, the active tab's pane, and a footer
  Delete-with-confirm button. Reads
  `selectedComponentId` + `selectSelectedComponentNode` from the store;
  if the selection resolves to `null` (selected node was removed
  mid-flight), the shell calls `exitElementEditMode` and renders nothing
  for one tick.
- `apps/web/components/editor/edit-panels/EditPanelTabs.tsx` — the
  tablist with five buttons, ARIA semantics (`role="tablist"`,
  `role="tab"`, `aria-selected`), and a controlled `activeTab` prop
  driven from the parent. Default tab is `"content"`. Tab order:
  Content, Style, Animation, Visibility, Advanced.
- `apps/web/components/editor/edit-panels/tabs/ContentTabHost.tsx` —
  routes by `node.type` to the per-component Content panel from
  `apps/web/components/site-components/${T}/EditPanel.tsx`. The
  per-component panel exports a default function that takes
  `{ node }` and uses store mutators directly. For component types
  that do not have a Content panel in Sprint 8, this host renders the
  documented placeholder (see "Sprint-8 Content panel matrix" below).
- `apps/web/components/editor/edit-panels/tabs/StyleTab.tsx` — the
  shared §6.4 style-control surface. Composes the sub-controls below.
  Reads `node.style` and writes it back through `setComponentStyle`.
  The tab honors per-component carve-outs by reading a small allow-list
  computed from `node.type`:
    - Spacer: only Visibility (no §6.4 chrome) — the Style tab renders
      a one-line note "Spacer is a primitive; use the Content tab to
      change its height" and nothing else.
    - Divider: Margin only (per `Divider/SPEC.md`); the rest of the
      Style tab is hidden, with a one-line note explaining that.
    - All other 18 components: full §6.4 controls (background, padding,
      margin, border, borderRadius, shadow, width, height, textColor).
- `apps/web/components/editor/edit-panels/tabs/AnimationTab.tsx` —
  edits `node.animation` with two `AnimationPreset` selects (onEnter,
  onHover) and two non-negative number inputs (duration ms, delay ms).
  Setting both preset selects to `"none"` and clearing duration/delay
  writes `animation: undefined` on the node (i.e. removes the field
  entirely). Otherwise writes the sparse `AnimationConfig` object.
- `apps/web/components/editor/edit-panels/tabs/VisibilityTab.tsx` —
  three radio cards (Always / Desktop only / Mobile only) bound to
  `node.visibility`. Selecting "Always" writes `visibility: undefined`
  on the node (i.e. removes the field entirely).
- `apps/web/components/editor/edit-panels/tabs/AdvancedTab.tsx` —
  documented placeholder ONLY (per the pre-flight check #6 outcome):
  renders an `Info` icon (`lucide-react`), the heading "Custom CSS
  class & HTML id", and the body copy "These escape hatches will land
  once the SiteConfig schema gains `htmlId` and `className` fields on
  `ComponentNode`. See `DECISIONS.md` for the planned schema
  amendment." Renders the `data-testid="advanced-tab-placeholder"`
  attribute so the smoke test can assert visibility. Does NOT mutate
  the store. Does NOT add any input.
- `apps/web/components/editor/edit-panels/DeleteComponentButton.tsx`
  — the bottom-of-panel destructive button. On click, opens a shadcn
  `AlertDialog` ("Delete this component? This cannot be undone.").
  On confirm, calls `removeComponent(selectedComponentId)`, then
  `exitElementEditMode`. Disabled with a tooltip ("The page root
  cannot be deleted; switch to the Pages tab to delete the page
  itself.") when the selected node is the current page's
  `rootComponent` — that case is detected by reading
  `selectCurrentPage(state).rootComponent.id === selectedComponentId`.
- `apps/web/components/editor/edit-panels/controls/SpacingInput.tsx`
  — controlled four-input row (top, right, bottom, left) for
  `Spacing | undefined`. Numeric inputs accept non-negative integers;
  empty fields encode "unset" by omitting the key. A "linked" toggle
  collapses all four inputs to one when active and writes the same
  value to all four sides on change. Writes `undefined` (clearing the
  whole `padding` / `margin` block) when all four fields are empty.
- `apps/web/components/editor/edit-panels/controls/ColorInput.tsx`
  — controlled native `<input type="color">` paired with a hex text
  input (kept in sync). Used by `textColor`, by `border.color`, and
  inside the Background control.
- `apps/web/components/editor/edit-panels/controls/BackgroundInput.tsx`
  — segmented control (None / Color / Gradient). When None: writes
  `background: undefined`. When Color: a single `ColorInput`. When
  Gradient: two `ColorInput`s (from / to) and a numeric angle (degrees,
  default 180). Reads / writes `ColorOrGradient | undefined`.
- `apps/web/components/editor/edit-panels/controls/BorderInput.tsx`
  — three controls (numeric width, enum select for `BORDER_STYLES`,
  `ColorInput`). When width is `0` and style is `"none"`, writes
  `border: undefined`.
- `apps/web/components/editor/edit-panels/controls/ShadowSelect.tsx`
  — five-button row (none / sm / md / lg / xl) bound to
  `ShadowPreset | undefined`. Clicking the active preset clears the
  field.
- `apps/web/components/editor/edit-panels/controls/SizeUnitInput.tsx`
  — text input that accepts any `SizeUnit` string per the schema
  comment ("any CSS length token"). No regex validation — the schema
  is intentionally permissive. Writes the empty string back as
  `undefined`. Used for `width` and `height` on the Style tab and for
  HeroBanner's `height` prop on its Content panel.
- `apps/web/components/editor/edit-panels/controls/AnimationPresetSelect.tsx`
  — a select of the ten `ANIMATION_PRESETS` values (with a leading
  "(none)" entry that maps to `undefined`).
- `apps/web/components/editor/edit-panels/controls/NumberInput.tsx`
  — controlled non-negative integer input with `min` and `step`
  props. Used for `borderRadius`, animation `duration` and `delay`,
  Spacing values, NavBar / Footer link counts, etc.
- `apps/web/components/editor/edit-panels/controls/TextInput.tsx`
  — controlled text input that commits on every change. Used by
  Heading text, Paragraph text, Button label, Image alt, etc.
- `apps/web/components/editor/edit-panels/controls/SelectInput.tsx`
  — generic controlled select used by Heading level, Image fit,
  Button variant / size / buttonType, NavBar logoPlacement,
  InputField inputType, etc.
- `apps/web/components/editor/edit-panels/controls/SegmentedControl.tsx`
  — generic segmented control (radio-group styled as buttons). Used
  by Button's Link mode (Static URL / Detail page) and the Visibility
  tab's three options.
- `apps/web/components/editor/edit-panels/controls/SwitchInput.tsx`
  — controlled boolean switch. Used by Button `fullWidth`, NavBar
  `sticky`, HeroBanner `overlay`, InputField `required`.
- `apps/web/components/editor/edit-panels/controls/LinksEditor.tsx`
  — vertical list editor for `{ label: string; href: string }[]`.
  Each row has Label + Href text inputs and a remove button; an Add
  button appends a new row. Used inside NavBar Content panel and
  inside Footer Content's per-column link list.
- `apps/web/components/editor/edit-panels/controls/FooterColumnsEditor.tsx`
  — vertical list editor for
  `Array<{ title: string; links: Array<{ label: string; href: string }> }>`.
  Each column has a Title input, a `LinksEditor`, and a remove button;
  an Add column button appends a new column.
- `apps/web/components/editor/edit-panels/controls/SelectOptionsEditor.tsx`
  — vertical list editor for `Array<{ label: string; value: string }>`,
  used by InputField when `inputType === "select"`. Hidden when the
  type is anything else.
- `apps/web/components/editor/edit-panels/controls/DetailPageSelect.tsx`
  — select of detail pages on the current site. Reads
  `state.draftConfig.pages.filter(p => p.kind === "detail")` and
  renders one option per page with `value={page.slug}`. When the
  list is empty, renders a disabled select with the placeholder
  "Add a detail page from the Pages tab first." Used inside Button's
  Content panel when `linkMode === "detail"`.
- `apps/web/components/editor/edit-panels/index.ts` — barrel
  re-export of every public component in this directory.
- `apps/web/components/editor/edit-panels/__tests__/` — Vitest tests
  for every non-trivial component above.

**Per-component Content panels (filled in for Sprint 8).**

For each of the seven components below, replace the Sprint-5 stub with
a full Content panel. Each panel takes `{ node: ComponentNode }`,
parses `node.props` against that component's prop schema, holds local
form state mirrored to `node.props`, and writes through
`setComponentProps(node.id, nextProps)` on every change. Validation is
best-effort (the schema's per-component `safeParse` guards the renderer
already; the panel just edits the JSON).

- `apps/web/components/site-components/Heading/EditPanel.tsx`
  — Text (`TextInput`, multi-line allowed via `<textarea>` for now);
  Level (`SelectInput` with options 1–6).
- `apps/web/components/site-components/Paragraph/EditPanel.tsx`
  — Text (`<textarea>`).
- `apps/web/components/site-components/Button/EditPanel.tsx`
  — Label, Href (text inputs); Variant
  (`primary | secondary | outline | ghost | link`); Size
  (`sm | md | lg`); Full width (`SwitchInput`); Button type
  (`button | submit | reset`). **Detail-pages amendment (§8.12):**
  Link mode (`SegmentedControl`: "Static URL" / "Detail page";
  default "Static URL"). When "Detail page" is selected, Href becomes
  read-only with the helper "Computed at render time as
  `/{detailPageSlug}/{row.id}`" and `DetailPageSelect` appears below
  Link mode. When "Static URL" is selected, the panel writes
  `linkMode: "static"` and `detailPageSlug: undefined`. When "Detail
  page" is selected, the panel writes `linkMode: "detail"` and
  `detailPageSlug: <chosen-slug>`. The schema's `superRefine`
  ("`detailPageSlug` is required when `linkMode === "detail"`") is the
  ultimate guard; the panel disables Save when no detail pages exist
  by guarding the select itself.
- `apps/web/components/site-components/Image/EditPanel.tsx`
  — Src, Alt (text inputs); Fit (`SelectInput` with the five
  `object-fit` values from `Image/SPEC.md`).
- `apps/web/components/site-components/NavBar/EditPanel.tsx`
  — Links (`LinksEditor`); Logo placement
  (`SelectInput`: left / center / right); Sticky (`SwitchInput`);
  Logo URL (text input, optional — clears `logoSrc` when empty).
- `apps/web/components/site-components/Footer/EditPanel.tsx`
  — Columns (`FooterColumnsEditor`); Copyright (text input).
- `apps/web/components/site-components/InputField/EditPanel.tsx`
  — Name (text input, required); Label (text input); Input type
  (`SelectInput`: text / email / tel / number / textarea / select /
  checkbox); Placeholder (text input); Required (`SwitchInput`);
  Default value (text input). When type is `"select"`,
  `SelectOptionsEditor` appears below Default value. **Detail-pages
  amendment (§8.12):** Default from query parameter (text input;
  empty writes `undefined`). Help text under the field reads
  "Reads `?<param>` from the current URL on render." The panel does
  NOT validate that `defaultValueFromQueryParam` matches an existing
  query string anywhere — that is a runtime concern.

**Per-component Content panels (placeholder for Sprint 8).**

For each of the thirteen components below, replace the Sprint-5 stub
with a tagged placeholder. The placeholder renders an `Info` icon, the
heading "Content fields for this component", and one of the following
`<p>` lines depending on the component. **No mutators are wired.**
Each placeholder still preserves `data-component-edit-panel="${T}"` as
a `<div data-testid="content-placeholder-${T.toLowerCase()}">` so
existing assertions and the Sprint 8 smoke test can detect them.

- Section: "Section is a structural container; the Style tab handles
  layout and the Pages tab handles its position."
- Row: "Edit Row props (gap, alignment, wrap) once the Row Content
  panel ships." 
- Column: "Edit Column props (span, gap, alignment) once the Column
  Content panel ships."
- Spacer: "Edit the spacer's height once the Spacer Content panel
  ships."
- Divider: "Edit the divider's thickness and color once the Divider
  Content panel ships."
- Logo: "Edit the logo source and alt text once the Logo Content
  panel ships."
- HeroBanner: "Edit the hero's heading, sub-heading, CTA, and
  background once the HeroBanner Content panel ships."
- PropertyCard: "Edit the property card's static fields once the
  PropertyCard Content panel ships."
- UnitCard: "Edit the unit card's static fields once the UnitCard
  Content panel ships."
- Repeater: "Repeater data binding (data source, filters, connected
  inputs, sort, limit) lands in Sprint 9."
- Form: "Form configuration (form id, success message) lands in
  Sprint 10."
- MapEmbed: "Edit the embedded address once the MapEmbed Content
  panel ships."
- Gallery: "Edit the gallery images and grid once the Gallery Content
  panel ships."

The exact wording is binding for the Sprint 8 smoke test — copy each
line verbatim into the corresponding `EditPanel.tsx`. Every other tab
on these components (Style / Animation / Visibility / Advanced) ships
in full per the matrix in the next section.

**Editor store extensions.**

- `apps/web/lib/editor-state/types.ts` — extend `EditorState` with
  `leftSidebarMode: "primary" | "element-edit"` (default `"primary"`)
  and `elementEditTab: "content" | "style" | "animation" | "visibility" | "advanced"`
  (default `"content"`). Extend `EditorActions` with:
  `enterElementEditMode(componentId: ComponentId): void`,
  `exitElementEditMode(): void`,
  `setElementEditTab(tab: ElementEditTab): void`,
  `setComponentProps(componentId: ComponentId, props: Record<string, unknown>): void`,
  `setComponentStyle(componentId: ComponentId, style: StyleConfig): void`,
  `setComponentAnimation(componentId: ComponentId, animation: AnimationConfig | undefined): void`,
  `setComponentVisibility(componentId: ComponentId, visibility: "always" | "desktop" | "mobile" | undefined): void`,
  `removeComponent(componentId: ComponentId): void`.
  Add a new `EditorActionErrorCode`: `"component_not_found"`,
  `"page_root_locked"`.
- `apps/web/lib/editor-state/store.ts` — wire the new state defaults
  and the new action wrappers. Each component-level mutator delegates
  to a pure helper in `actions.ts`, flips `saveState` to `"dirty"`,
  and (for `removeComponent`) clears `selectedComponentId` if the
  removed node WAS selected. `enterElementEditMode(id)` calls
  `selectComponent(id)` AND sets `leftSidebarMode = "element-edit"`
  AND resets `elementEditTab = "content"`. `exitElementEditMode()`
  sets `leftSidebarMode = "primary"` AND `selectedComponentId = null`
  AND `elementEditTab = "content"`. `setPreviewMode(true)`
  additionally exits element edit (preview hides selection chrome).
  `setCurrentPageSlug(...)` additionally exits element edit (the
  selected node would be on a different page).
- `apps/web/lib/editor-state/actions.ts` — add:
  `applySetComponentProps(config, componentId, props): SiteConfig`,
  `applySetComponentStyle(config, componentId, style): SiteConfig`,
  `applySetComponentAnimation(config, componentId, animation): SiteConfig`,
  `applySetComponentVisibility(config, componentId, visibility): SiteConfig`,
  `applyRemoveComponent(config, componentId): SiteConfig`. All five
  are pure functions; all five throw `EditorActionError` with code
  `"component_not_found"` if the id is not present in any page.
  `applyRemoveComponent` additionally throws
  `EditorActionError("page_root_locked", ...)` if the id is the
  `rootComponent.id` of any page. The tree walker is depth-first and
  rebuilds only the path from the page's `rootComponent` down to the
  modified node (immutability via spread; no `immer` dependency).
- `apps/web/lib/editor-state/selectors.ts` — add
  `selectIsElementEditMode(state): boolean` (returns
  `state.leftSidebarMode === "element-edit"`),
  `selectElementEditTab(state)`, and
  `selectSelectedComponentParentId(state): ComponentId | null`
  (used by `DeleteComponentButton`'s page-root guard).
- `apps/web/lib/editor-state/index.ts` — barrel update to re-export
  every new symbol.
- `apps/web/lib/editor-state/__tests__/store.test.ts` — extend with
  tests for the new state and action wrappers.
- `apps/web/lib/editor-state/__tests__/actions.test.ts` — extend
  with tests for each new pure helper (happy path + not-found +
  page-root-locked + style update + animation clear-to-undefined +
  visibility clear-to-undefined).

**Editor wiring extensions.**

- `apps/web/components/editor/canvas/Canvas.tsx` — extend the
  `<Renderer />` call to pass
  `onContextMenu={(id) => enterElementEditMode(id)}` in addition to
  the existing `onSelect`. Do NOT change the existing `onClick` /
  `Esc` / `onSelect` semantics.
- `apps/web/components/editor/sidebar/LeftSidebar.tsx` — read
  `leftSidebarMode` from the store. When `"primary"`: render the
  existing four-tab UI unchanged. When `"element-edit"`: render
  `<EditPanelShell />` instead. The four-tab tablist is hidden when
  the sidebar is in element-edit mode.
- `apps/web/components/editor/__tests__/canvas.test.tsx` — extend
  with right-click → `enterElementEditMode` test, and a test that
  switching the current page exits element edit.
- `apps/web/components/editor/__tests__/left-sidebar.test.tsx` (new
  file or extension of existing) — test that the sidebar renders the
  four-tab UI in primary mode and the `EditPanelShell` in
  element-edit mode.
- `apps/web/components/editor/index.ts` — barrel update to add
  every new public export from `edit-panels/`.

**Cross-document.**

- `DECISIONS.md` — append entries for any approved deviation. Also
  append a planning entry naming this sprint's known schema gap
  ("Advanced tab placeholder until `htmlId` / `className` ship") so
  Sprint 15 has a paper trail.

### Shared (read-only this sprint)

- `PROJECT_SPEC.md` — the authoritative spec (read, do not write).
- `apps/web/lib/site-config/` — schema, types, parse, style helpers
  (the schema is the contract; do NOT extend it).
- `apps/web/lib/setup-form/palettes.ts` and
  `apps/web/lib/setup-form/types.ts` — referenced indirectly through
  the existing Site tab; not touched.
- `apps/web/lib/sites/repo.ts` — autosave continues to use the
  Sprint-6 PATCH endpoint; no changes required.
- `apps/web/lib/supabase/` — autosave continues to use the
  service-role client through the existing endpoint.
- `apps/web/components/renderer/` — the renderer is final; if the
  pre-flight check #5 finds it does not forward `onContextMenu`,
  STOP and emit a Deviation Report rather than editing the renderer.
- `apps/web/components/site-components/${T}/index.tsx` — every
  component's runtime renderer; do NOT touch in this sprint. The
  Content panel writes back through `node.props`; the renderer
  consumes `node.props` exactly as Sprint 5/5b shipped.
- `apps/web/components/site-components/${T}/SPEC.md` — read-only
  reference for which props each Content panel exposes.
- `apps/web/app/[site]/edit/page.tsx` and
  `apps/web/app/[site]/edit/EditorShell.tsx` — Sprint 6 owns these;
  do NOT touch unless the LeftSidebar wiring genuinely requires a
  change (it should not — the LeftSidebar is composed from the
  EditorShell already).
- `apps/web/app/api/sites/[siteId]/working-version/route.ts` — the
  PATCH endpoint already validates `siteConfigSchema` end-to-end;
  Sprint 8's edits flow through it without modification.

### Forbidden (this sprint MUST NOT modify)

- `PROJECT_SPEC.md`. A spec change is its own sprint.
- `apps/web/lib/site-config/schema.ts`,
  `apps/web/lib/site-config/parse.ts`, and
  `apps/web/lib/site-config/style.ts`. Schema-lock break would require
  its own sprint per `SPRINT_SCHEDULE.md` §5.
- `apps/web/components/site-components/${T}/index.tsx` for any `T`
  (the runtime renderers are Sprint 5 / 5b territory). Touching one of
  these is a Deviation regardless of how minor the change appears.
- `apps/web/components/site-components/${T}/SPEC.md` for any `T`. The
  Content-panel descriptions in this CLAUDE.md exactly mirror the
  existing SPEC.md tables; if they drift, the SPEC.md is the source
  of truth and Sprint 8 emits a Deviation rather than editing it.
- `apps/web/components/site-components/registry.ts` and
  `apps/web/components/site-components/__tests__/registry.test.ts`.
- `apps/web/components/renderer/` — see "Shared" above.
- `supabase/migrations/`, `supabase/seed.sql`. No DB changes this
  sprint.
- `apps/web/app/api/**` — no API route changes this sprint.
- The Sprint-3 dev fixtures at `apps/web/app/dev/components/` and
  `apps/web/app/dev/preview/`.
- Any other sprint's owned files that are not explicitly enumerated
  in the "Owned" list above.

### Sprint-8 Content panel matrix (binding)

| Component      | Content tab in Sprint 8           | Style | Animation | Visibility | Advanced  |
| -------------- | --------------------------------- | ----- | --------- | ---------- | --------- |
| Section        | Placeholder                       | Full  | Full      | Full       | Placeholder |
| Row            | Placeholder                       | Full  | Full      | Full       | Placeholder |
| Column         | Placeholder                       | Full  | Full      | Full       | Placeholder |
| Heading        | **Live (text + level)**           | Full  | Full      | Full       | Placeholder |
| Paragraph      | **Live (text)**                   | Full  | Full      | Full       | Placeholder |
| Button         | **Live (+ §8.12 Link mode)**      | Full  | Full      | Full       | Placeholder |
| Image          | **Live (src + alt + fit)**        | Full  | Full      | Full       | Placeholder |
| Logo           | Placeholder                       | Full  | Full      | Full       | Placeholder |
| Spacer         | Placeholder                       | None  | Full      | Full       | Placeholder |
| Divider        | Placeholder                       | Margin only | Full | Full       | Placeholder |
| NavBar         | **Live (links + placement + sticky + logoSrc)** | Full | Full | Full | Placeholder |
| Footer         | **Live (columns + copyright)**    | Full  | Full      | Full       | Placeholder |
| HeroBanner     | Placeholder                       | Full  | Full      | Full       | Placeholder |
| PropertyCard   | Placeholder                       | Full  | Full      | Full       | Placeholder |
| UnitCard       | Placeholder                       | Full  | Full      | Full       | Placeholder |
| Repeater       | Placeholder (Sprint 9)            | Full  | Full      | Full       | Placeholder |
| InputField     | **Live (+ §8.12 query-param)**    | Full  | Full      | Full       | Placeholder |
| Form           | Placeholder (Sprint 10)           | Full  | Full      | Full       | Placeholder |
| MapEmbed       | Placeholder                       | Full  | Full      | Full       | Placeholder |
| Gallery        | Placeholder                       | Full  | Full      | Full       | Placeholder |

"Full" means every §6.4 control listed in the corresponding
`SPEC.md`. "None" / "Margin only" reflect the Spacer / Divider
primitives carve-out from §6.4.

## Coding standards (binding subset of `PROJECT_SPEC.md` §15)

- TypeScript strict; `noUncheckedIndexedAccess`, `noImplicitAny` on.
  No `any`. If you reach for it, use `unknown` and narrow.
- One component per file. File name = export name. PascalCase for
  components; camelCase for hooks (`useThing`); kebab-case for
  filenames in non-component modules.
- Server components by default; `"use client"` on line 1 only when
  needed. Every file in
  `apps/web/components/editor/edit-panels/` and every component-level
  EditPanel is a client component (they read the Zustand store and
  fire mutators). Add `"use client"` on line 1 of every such file.
- No prop drilling deeper than two levels. Hoist to the store.
- Shared components from `apps/web/components/ui/` are reusable; do
  NOT introduce a second design system. Use shadcn primitives
  (`Dialog`, `AlertDialog`, `Select`, `RadioGroup`, `Switch`,
  `Input`, `Textarea`, `Label`, `Tooltip`) where they exist. If a
  needed primitive is missing, run
  `pnpm dlx shadcn@latest add <name>` and treat the new file as
  Sprint-8-owned (`apps/web/components/ui/${name}.tsx`).
- No commented-out code. No `console.log`. No `.skip` / `.only` in
  tests. No `@ts-ignore`. No `as any`.
- Tests live next to the file under `__tests__/${name}.test.tsx`.
  Use Vitest + Testing Library; reset the editor store between cases
  via `__resetEditorStoreForTests()`.
- All paths, commands, and identifiers go in backticks in any prose.

## Definition of Done

- [ ] **Right-click swaps the LeftSidebar to Element Edit and selects
  the right-clicked component.** Right-clicking any component on the
  canvas (or pressing `Shift+F10` / `ContextMenu` on a focused
  component) calls `enterElementEditMode(id)`. The store's
  `selectedComponentId` becomes `id`, `leftSidebarMode` becomes
  `"element-edit"`, and `elementEditTab` resets to `"content"`. The
  LeftSidebar replaces its four-tab UI with `<EditPanelShell />`.
  Right-clicking a different component while already in element-edit
  mode replaces the selection without exiting the mode.

- [ ] **Five-tab Element Edit panel renders for every selected
  component.** The shell shows the component's type as the panel
  title, a back-arrow button, the five-tab tablist (Content / Style /
  Animation / Visibility / Advanced) with `role="tablist"` and
  ARIA-correct `aria-selected`, and the active tab's pane. Default
  tab is Content. Switching tabs writes `elementEditTab` to the store
  (and survives a renderer remount via the store).

- [ ] **Back-arrow exits element-edit mode and clears the selection.**
  Clicking the back arrow calls `exitElementEditMode`. The
  LeftSidebar reverts to its four-tab UI on the previously-active
  primary tab; `selectedComponentId` becomes `null`; the canvas
  selection outline disappears. Switching the page or toggling
  Preview mode also exits element-edit mode.

- [ ] **Style tab applies §6.4 controls per the Sprint-8 matrix and
  flows through `setComponentStyle`.** For every component except
  Spacer (no Style controls) and Divider (Margin only), the Style
  tab exposes Background, Padding, Margin, Border, Border radius,
  Shadow, Width, Height, Text color. Edits commit on every change;
  the canvas re-renders the affected node within the same React
  commit as the store update. Setting all four sides of Padding /
  Margin to empty writes the field as `undefined`. Choosing the
  active Shadow preset clears the field. Setting Width / Height to
  empty clears the field.

- [ ] **Animation tab edits `node.animation`.** The two preset selects
  list the ten `ANIMATION_PRESETS` (with a leading "(none)" entry
  that maps to `undefined`). Duration and Delay accept non-negative
  integers in milliseconds. Setting both presets to `(none)` and
  clearing duration/delay writes `animation: undefined` on the node.

- [ ] **Visibility tab edits `node.visibility`.** Three radio cards
  (Always / Desktop only / Mobile only). Selecting "Always" writes
  `visibility: undefined` on the node.

- [ ] **Advanced tab is a documented placeholder.** Renders the `Info`
  icon, the heading "Custom CSS class & HTML id", and the body copy
  exactly as written in the Owned-paths section. Renders
  `data-testid="advanced-tab-placeholder"`. Mutates nothing.

- [ ] **Content panels are live for the seven named components.**
  Heading, Paragraph, Button, Image, NavBar, Footer, and InputField
  expose every prop documented in their respective `SPEC.md`. Edits
  commit on every change through `setComponentProps`. The canvas
  reflects the change within the same React commit. Each panel's
  helper text and labels match the verbatim wording in the
  Owned-paths section.

- [ ] **Button's Content panel implements §8.12 Link mode and Detail
  page.** Selecting "Static URL" writes `linkMode: "static"` and
  `detailPageSlug: undefined`; the Href input is editable. Selecting
  "Detail page" writes `linkMode: "detail"` and a chosen
  `detailPageSlug`; the Href input becomes read-only with the helper
  "Computed at render time as `/{detailPageSlug}/{row.id}`." The
  detail-page select reads
  `state.draftConfig.pages.filter(p => p.kind === "detail")` and is
  disabled with the placeholder copy when the list is empty.

- [ ] **InputField's Content panel implements the §8.12
  `defaultValueFromQueryParam` field.** A text input under Default
  value, with helper text "Reads `?<param>` from the current URL on
  render." Empty writes `undefined`.

- [ ] **Content panels are placeholders for the other thirteen
  components, with the verbatim copy specified above.** Each
  placeholder exposes
  `data-testid="content-placeholder-${T.toLowerCase()}"` for tests.

- [ ] **Delete-component button removes the selected node and exits
  element-edit mode.** Clicking the bottom-of-panel Delete button
  opens a shadcn `AlertDialog` ("Delete this component? This cannot
  be undone."). Confirming calls `removeComponent(id)`, then
  `exitElementEditMode`. The page's tree no longer contains the
  removed node; the autosave PATCH fires within the standard
  debounce window. The button is disabled with a tooltip when the
  selected node is the current page's `rootComponent`.

- [ ] **Component-level mutators flip `saveState` to `"dirty"` and
  trigger autosave.** Each of `setComponentProps`,
  `setComponentStyle`, `setComponentAnimation`,
  `setComponentVisibility`, and `removeComponent` writes a new
  `draftConfig` and flips `saveState` to `"dirty"`. The existing
  Sprint-6 autosave hook PATCHes
  `/api/sites/[siteId]/working-version` after the standard debounce
  with the new config; on 204, `SaveIndicator` reports "Saved Xs
  ago". Concurrent mutations during an in-flight save coalesce per
  the Sprint-6 contract.

- [ ] **Coding standards (§15) honored.** No `any`. No
  `@ts-ignore`. No `.skip` or `.only` in tests. No commented-out
  code. No `console.log`. Server-only files start with
  `import "server-only";`. Client components start with
  `"use client";` on line 1. New shadcn primitives (if any) live
  under `apps/web/components/ui/` and are added through
  `pnpm dlx shadcn@latest add`.

- [ ] **Tests added.** ≥ 25 new Vitest tests across:
  - editor-state actions: `applySetComponentProps` happy path +
    not-found + nested-tree round-trip; `applySetComponentStyle`
    happy path + clear-to-undefined; `applySetComponentAnimation`
    clear-to-undefined; `applySetComponentVisibility`
    clear-to-undefined; `applyRemoveComponent` happy path +
    not-found + page-root-locked.
  - editor-state store: `enterElementEditMode` /
    `exitElementEditMode` / `setElementEditTab` semantics;
    page-switch and preview-toggle exit element-edit mode;
    `removeComponent` clears `selectedComponentId` if it was
    selected.
  - canvas: right-click on a component fires
    `enterElementEditMode` with the correct id; right-clicking a
    different component while in element-edit replaces the
    selection without exiting.
  - left sidebar: renders the four-tab UI in primary mode; renders
    `<EditPanelShell />` in element-edit mode.
  - StyleTab: writes `setComponentStyle` on Background / Padding /
    Border / Shadow change; honors the Spacer "no chrome" carve-out;
    honors the Divider "Margin only" carve-out.
  - AnimationTab: setting both presets to "(none)" writes
    `animation: undefined`.
  - VisibilityTab: selecting "Always" writes `visibility: undefined`.
  - AdvancedTab: renders the placeholder testid and does not write.
  - Heading EditPanel: text + level edits commit through the store.
  - Paragraph EditPanel: text edits commit through the store.
  - Button EditPanel: switching to Detail mode disables the Href
    input and writes `linkMode: "detail"`; switching back to Static
    clears `detailPageSlug`.
  - Image EditPanel: src / alt / fit edits commit through the store.
  - NavBar EditPanel: adding and removing a link writes the new
    array.
  - Footer EditPanel: adding and removing a column writes the new
    array.
  - InputField EditPanel: setting `defaultValueFromQueryParam`
    writes the prop; clearing it writes `undefined`.
  - DeleteComponentButton: confirming removes the node and exits
    element-edit mode; disabled state tooltip text matches the
    spec.

- [ ] **All quality gates pass.**
  - `pnpm test` — zero failures, zero skipped.
  - `pnpm build` — zero TypeScript errors, zero warnings.
  - `pnpm biome check` — zero warnings.
  - Manual smoke test (below) — every step PASS.

- [ ] **No new files outside the Owned scope.** `git status` shows
  changed files only inside the Owned list above, plus any
  shadcn primitive added via `pnpm dlx shadcn@latest add` (each one
  noted in the Sprint Completion Report under External Actions
  Required as "ran shadcn add for ${name}").

- [ ] **No new dependencies added without an approved Deviation.**
  Adding a shadcn primitive does NOT require a Deviation — that is
  expected and pre-authorized. Adding any other npm package
  requires the Deviation Protocol.

- [ ] **No deviations were silently absorbed.** Every deviation that
  occurred during the sprint was reported and approved per the
  protocol below. `DECISIONS.md` has one new entry per approved
  deviation with the user's verbatim approval text.

- [ ] **Sprint Completion Report emitted verbatim** in the format at
  the bottom of this file, with a populated External Actions Required
  block (Vercel: none; Supabase: none — no migrations; Anthropic:
  none — no AI calls in this sprint; Local: list any shadcn primitives
  added; Other: none unless approved deviations dictate otherwise).

## Manual smoke test (numbered, click-by-click)

This script runs against a clean `pnpm dev` after the sprint's automated
gates pass. The seeded Aurora demo site is the default target.

1. Run `pnpm install` to pick up any new shadcn primitives.
2. Run `pnpm seed` if the hosted Supabase data is not loaded for this
   workstation (re-uses the Sprint-1b/2a seeded Aurora rows).
3. Run `pnpm dev` and open `http://localhost:3000/`.
4. Click **Open Setup**, fill the form with placeholder data, click
   **Ready to Preview & Edit?**, and wait for the iframe preview to
   resolve. (Sprint 4 path; this primes a working version.)
5. Click **Open in Editor** in the Element-1 footer. Verify the URL
   becomes `/{site-slug}/edit` and the editor chrome (top bar, left
   sidebar with four tabs, canvas, right sidebar) is visible.
6. **Right-click the HeroBanner heading on the canvas.** Verify the
   left sidebar replaces its four-tab UI with the Element Edit panel,
   the title shows "Heading", and the active tab is Content.
7. In the Content tab, change the Heading text from its current
   value to `Welcome to Aurora`. Verify the canvas updates within
   one second AND the SaveIndicator in the top bar transitions
   `Unsaved changes → Saving… → Saved 1s ago` over the next few
   seconds.
8. Click the **Style** tab. Change Padding (linked) to `24`. Verify
   the canvas reflects the new padding within one second.
9. Click **Animation**. Set onEnter to `fadeInUp`, duration to `300`.
   Verify the change saves (SaveIndicator goes through the
   dirty → saving → saved cycle).
10. Click **Visibility**. Select **Desktop only**. Verify the change
    saves and the canvas continues to render the heading (Visibility
    is honored at deploy time only — no client-side hide in the
    editor).
11. Click **Advanced**. Verify the placeholder copy ("Custom CSS
    class & HTML id …") renders and no inputs are present.
12. Click the **back arrow** at the top of the panel. Verify the
    left sidebar reverts to its four-tab UI on the previously-active
    primary tab and the canvas selection outline disappears.
13. **Right-click a Button anywhere in the canvas** (or temporarily
    add one via the Pages-tab → Add page flow if no Button exists on
    the home page). In the Button Content panel, switch Link mode
    to **Detail page**. Verify the Href input becomes read-only, the
    Detail-page select appears, and (because the demo site does not
    have a detail page yet) the select is disabled with the helper
    "Add a detail page from the Pages tab first."
14. Click the back arrow. Switch to the Pages tab. Click **Add
    page**. Set kind to **Detail**, data source to **units**, slug
    to `unit`. Submit.
15. Right-click the same Button as in step 13. Switch Link mode to
    **Detail page**. Verify the Detail-page select now lists "Unit
    Detail" (the page name), choose it, and verify the panel writes
    `linkMode: "detail"` and `detailPageSlug: "unit"` (visible by
    refreshing or by inspecting the working-version row in the
    Supabase dashboard). The canvas Button's `data-link-mode` and
    `data-detail-page-slug` attributes update accordingly per the
    Sprint-5b Button renderer.
16. Right-click an InputField (the demo seeded form has one; if not,
    add a Form via Pages-tab template flow — Sprint 10 work — OR
    open `/dev/components` and right-click the seeded
    `cmp_input_query` InputField in the canvas-rendered fixture).
    In its Content panel, set Default from query parameter to
    `propertyId`. Verify the change saves and the InputField's
    runtime hydration (visible at the same dev preview) reads
    `?propertyId=…` on next page load.
17. Right-click any leaf component. Click **Delete component** at
    the bottom of the panel. Confirm the AlertDialog. Verify the
    component disappears from the canvas, the panel exits to
    primary mode, and the SaveIndicator goes through the
    dirty → saving → saved cycle.
18. Right-click the page's outermost Section (its `rootComponent`).
    Verify the **Delete component** button is disabled with the
    tooltip "The page root cannot be deleted; switch to the Pages
    tab to delete the page itself."
19. Toggle Preview mode in the top bar. Verify the LeftSidebar
    automatically exits element-edit (if it was in element-edit) and
    the canvas removes the selection outline.
20. Reload the editor URL. Verify every change made above
    persisted: the heading text, the padding, the animation preset,
    the Button's Detail-mode link, the InputField's query-param
    default, and the deleted component is still gone.

Every step must PASS before the sprint is declared done. A single
FAIL is a Deviation, not a "we'll fix it next sprint" item.

## Known risks and failure modes

- **Edit-panel re-render thrash on every keystroke.** Each keystroke
  in a text input writes a new `draftConfig` reference. The renderer
  is memoized at the `ComponentRenderer` level, so only the affected
  subtree re-renders, but the LeftSidebar itself reads `draftConfig`
  for the detail-page select and the page-root guard. Mitigation:
  the LeftSidebar's `EditPanelShell` selects only what it needs
  (`selectedComponentId`, `leftSidebarMode`,
  `selectSelectedComponentNode`) — do NOT subscribe the whole
  `draftConfig` reference inside the Shell or any tab. Use Zustand's
  selector form (`useEditorStore((s) => s.selectedComponentId)`) and
  shallow-equal comparators where helpful.
- **Component-level mutator races with autosave.** A mutation that
  fires while `saveState === "saving"` flips state back to
  `"dirty"`; the autosave hook coalesces into one follow-up save.
  This is identical to Sprint-6 behavior; do NOT add a second
  debouncer in the edit panel. If you see double-PATCHes in the
  Network tab, that is a Deviation — escalate.
- **Pre-Sprint-3b configs in the store.** A working version saved
  before the Sprint-3b schema-lock break does not have `kind` on
  any page. `parseSiteConfig` injects `kind: "static"` on read; the
  Pages tab and `DetailPageSelect` rely on that. If a working
  version is read raw (without `parseSiteConfig`) anywhere in the
  edit-panel code, the Detail-page select will appear empty when it
  should not. Always use the parsed config.
- **shadcn primitives may be missing.** If the editor uses any
  shadcn primitive that is not yet in `apps/web/components/ui/`
  (e.g., `Select`, `RadioGroup`, `Switch`, `Tooltip`,
  `AlertDialog`), run `pnpm dlx shadcn@latest add ${name}` and treat
  the new file as Sprint-8 owned. Note each one in the Sprint
  Completion Report's External Actions Required block. Do NOT roll
  your own; use the canonical primitive.
- **`onContextMenu` swallowed by inner elements.** If a child element
  inside a component (e.g., a NavBar `<a>`) prevents-default on
  right-click before `EditModeWrapper` sees it, the swap will not
  fire. Mitigation: `EditModeWrapper` already uses
  `onContextMenu={handleContextMenu}` which is captured at the
  wrapper level; React's bubbling delivers it after the inner
  default. If a specific component's renderer prevents bubbling,
  that is a Sprint-5 bug, not Sprint-8 — emit a Deviation.
- **Detail-page select with zero detail pages.** The select is
  intentionally disabled with the placeholder "Add a detail page
  from the Pages tab first." Do NOT auto-create a detail page; the
  user must do that explicitly.
- **Schema mismatch on advanced fields.** If pre-flight check #6
  finds `htmlId` / `className` already on `componentNodeSchema`,
  the Advanced placeholder is wrong. Emit a Deviation Report
  rather than silently shipping live controls.
- **Right-click on the page-root component.** The page-root delete
  guard relies on
  `selectCurrentPage(state).rootComponent.id === selectedComponentId`.
  If a page somehow has no `rootComponent` (impossible per schema,
  but defend defensively), treat the panel as if no node is
  selected and exit element-edit mode.

## Notes and hints (non-binding context)

- **Tab default and keyboard nav.** Initial tab is Content. Left and
  Right arrow keys cycle the tablist; the active tab gets focus.
- **Where to put local form state.** Each component-specific Content
  panel can hold local `useState` for in-flight text edits if
  necessary (e.g., to debounce by 200ms before committing), but
  prefer immediate `setComponentProps` writes. The autosave debounce
  protects the network; per-keystroke local debouncing only helps if
  Vitest tests measure render counts (they do not in Sprint 8).
- **Schema-aware fallback in panels.** Use each component's existing
  prop schema (e.g., `buttonPropsSchema` is module-private inside
  `Button/index.tsx`). Since you cannot import it (Forbidden file),
  re-derive the panel's local validators using `z.object(...)` to
  match the SPEC.md table — the runtime renderer's `safeParse` is the
  ultimate guard regardless.
- **Background gradient angle.** Default to 180 degrees per
  `styleConfigToCss`'s fallback. The Background control surfaces
  the angle as a numeric input with default 180.
- **Spacing "linked" toggle.** When linked, all four sides share one
  value; the linked control writes the same value to all four sides
  on every change. Toggling linked off does not zero anything.
- **Selection trail across tab switches.** Switching tabs MUST NOT
  change the selection. Switching the active tab is purely a UI
  concern in the store — `selectedComponentId` stays put.
- **Esc inside the edit panel.** The Sprint-6 Canvas Esc handler
  bails when focus is in an input / textarea / select. That logic
  applies inside the edit panel for free — Esc inside a
  panel input does NOT clear selection. Esc on the canvas
  (background-focused) still clears.
- **Delete confirm copy.** "Delete this component? This cannot be
  undone." (sentence case; period). Confirm button reads "Delete";
  cancel reads "Cancel". Use shadcn `AlertDialog` defaults.
- **Detail-page select rendering.** Render
  `<option value={page.slug}>{page.name}</option>` per detail page,
  sorted by `name` ascending. Two detail pages with the same name
  is permitted by the schema; surface the slug in parentheses to
  disambiguate when names collide.
- **Test fixture pattern.** Re-use `__resetEditorStoreForTests` from
  `apps/web/lib/editor-state/store.ts` and `hydrate` a minimal
  config in `beforeEach`. Every action test imports
  `applyXxxxx` directly from `actions.ts`, never the store.
- **Renderer memoization.** `ComponentRenderer` is memoized on
  `node` reference equality. The action helpers preserve referential
  equality for unchanged subtrees by structural sharing (only the
  changed subtree gets a new object). Verify by running a render-count
  test on a deep fixture — not required for the sprint, but a useful
  sanity check during development.

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

```🛑 DEVIATION DETECTEDSprint: Sprint 8 — Element Edit Mode (manual)
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

A sprint is not done until all of the following pass with no warnings:

- `pnpm test`
- `pnpm build`
- `pnpm biome check`
- The manual smoke test above.

If any check fails, treat it as a Deviation. Do not commit. Do not declare
the sprint complete.

## Useful local commands

- `pnpm dev` — local dev server (against the hosted Supabase project).
- `pnpm test` — Vitest.
- `pnpm test:e2e` — Playwright (only the demo flow; not required for
  Sprint 8).
- `pnpm seed` — `supabase db reset --linked`; reloads the hosted
  Aurora seed.
- `pnpm db:push` — apply pending migrations against the hosted
  Supabase project.
- `pnpm db:types` — regenerate `apps/web/types/database.ts` after
  any schema change. Sprint 8 should not need this.

## Sprint Completion Report (emit verbatim when finished)✅ SPRINT 8 COMPLETEPre-flight check:

 git branch is master
 Sprint 6 is merged (editor barrel exposes the expected exports)
 Editor store has the Sprint-6 surface (state + actions)
 EditModeWrapper exposes onContextMenu (and Shift+F10 / ContextMenu key)
 Renderer + ComponentRenderer plumb onContextMenu in mode="edit"
 componentNodeSchema does NOT have htmlId / className (Advanced is a placeholder)
 All 20 EditPanel.tsx stubs exist
Definition of Done:

 Right-click swaps the LeftSidebar to Element Edit and selects the right-clicked component
 Five-tab Element Edit panel renders for every selected component
 Back-arrow exits element-edit mode and clears the selection
 Style tab applies §6.4 controls per the Sprint-8 matrix and flows through setComponentStyle
 Animation tab edits node.animation
 Visibility tab edits node.visibility
 Advanced tab is a documented placeholder
 Content panels are live for the seven named components
 Button's Content panel implements §8.12 Link mode and Detail page
 InputField's Content panel implements the §8.12 defaultValueFromQueryParam field
 Content panels are placeholders for the other thirteen components, with verbatim copy
 Delete-component button removes the selected node and exits element-edit mode
 Component-level mutators flip saveState to "dirty" and trigger autosave
 Coding standards (§15) honored
 Tests added (count: N)
 All quality gates pass
 No new files outside the Owned scope
 No new dependencies added without an approved Deviation
 No deviations were silently absorbed
 Sprint Completion Report emitted verbatim
Files created:

apps/web/components/editor/edit-panels/EditPanelShell.tsx (X lines)
apps/web/components/editor/edit-panels/EditPanelTabs.tsx (X lines)
apps/web/components/editor/edit-panels/DeleteComponentButton.tsx (X lines)
apps/web/components/editor/edit-panels/tabs/ContentTabHost.tsx (X lines)
apps/web/components/editor/edit-panels/tabs/StyleTab.tsx (X lines)
apps/web/components/editor/edit-panels/tabs/AnimationTab.tsx (X lines)
apps/web/components/editor/edit-panels/tabs/VisibilityTab.tsx (X lines)
apps/web/components/editor/edit-panels/tabs/AdvancedTab.tsx (X lines)
apps/web/components/editor/edit-panels/controls/{SpacingInput,ColorInput,BackgroundInput,BorderInput,ShadowSelect,SizeUnitInput,AnimationPresetSelect,NumberInput,TextInput,SelectInput,SegmentedControl,SwitchInput,LinksEditor,FooterColumnsEditor,SelectOptionsEditor,DetailPageSelect}.tsx (X lines each)
apps/web/components/editor/edit-panels/index.ts (X lines)
apps/web/components/editor/edit-panels/tests/*.test.tsx (X test files)
Files modified:

apps/web/lib/editor-state/types.ts (+A −B)
apps/web/lib/editor-state/actions.ts (+A −B)
apps/web/lib/editor-state/store.ts (+A −B)
apps/web/lib/editor-state/selectors.ts (+A −B)
apps/web/lib/editor-state/index.ts (+A −B)
apps/web/lib/editor-state/tests/store.test.ts (+A −B)
apps/web/lib/editor-state/tests/actions.test.ts (+A −B)
apps/web/components/editor/canvas/Canvas.tsx (+A −B)
apps/web/components/editor/sidebar/LeftSidebar.tsx (+A −B)
apps/web/components/editor/tests/canvas.test.tsx (+A −B)
apps/web/components/editor/index.ts (+A −B)
apps/web/components/site-components/Heading/EditPanel.tsx (+A −B)
apps/web/components/site-components/Paragraph/EditPanel.tsx (+A −B)
apps/web/components/site-components/Button/EditPanel.tsx (+A −B)
apps/web/components/site-components/Image/EditPanel.tsx (+A −B)
apps/web/components/site-components/NavBar/EditPanel.tsx (+A −B)
apps/web/components/site-components/Footer/EditPanel.tsx (+A −B)
apps/web/components/site-components/InputField/EditPanel.tsx (+A −B)
apps/web/components/site-components/{Section,Row,Column,Logo,Spacer,Divider,HeroBanner,PropertyCard,UnitCard,Repeater,Form,MapEmbed,Gallery}/EditPanel.tsx (+A −B each, placeholder)
Tests added: N (all passing)
Test command output: [paste last 5 lines of pnpm test]
Build output: [paste the "Compiled successfully" line]
Biome output: [paste the "No fixes applied." line]Deviations approved during sprint: [list with date + DECISIONS.md anchor, or "None"]Manual smoke test result: [PASS / FAIL with details]External Actions Required (the user does these before declaring the sprint shipped):

Vercel: none.
Supabase: none. No new migrations. No DB schema changes.
Anthropic: none. No AI calls in this sprint.
Local: pnpm install (if any shadcn primitives were added).
Other: none unless approved deviations dictate otherwise.
Recommended next steps:

Sprint 7 (Drag-and-drop). Sprint 7 wires dnd-kit so users can drag
Add-tab cards onto the canvas and reorder existing components. Sprint 7
consumes the same Zustand store this sprint extended; the new
setComponentProps and tree-walk helpers in actions.ts are
reusable for "move under a different parent". Sprint 7 also adds
resize handles to Section / Row / Column / Image / Spacer / Cards;
those handles call setComponentStyle for width / height and
setComponentProps for Column.span.