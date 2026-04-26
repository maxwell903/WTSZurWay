# CLAUDE.md — Sprint 7: Drag-and-drop & resize

> Drop this file at the repo root of `WTSZurWay/` for the duration of
> Sprint 7, replacing the master `CLAUDE.md`. Restore the master
> `CLAUDE.md` after the sprint's quality gates pass and the Sprint
> Completion Report has been emitted. Per the 2026-04-25 entry in
> `DECISIONS.md`, this project uses a single-branch workflow on
> `master` — there is no `sprint/07` branch. Every commit lands on
> `master` after the quality gates pass. Hosted Supabase is in use
> (no Docker, no local Postgres).

## Mission

Wire **drag-and-drop and resize** into the editor canvas. Cards in
the Add tab become drag sources; every component on the canvas
becomes a sortable child of its parent and a drop target for
compatible new children; selected resizable components display
edge-handles that adjust `Column.span` (1–12) and the height of
container/media components. The editor store gains three new
component-tree mutators — `addComponentChild`, `moveComponent`, and
`reorderChildren` — plus two resize-specific helpers
(`setComponentSpan`, `setComponentDimension`). Existing Sprint-6
selection chrome and Sprint-8 element-edit mode keep working
unchanged: a left-click still selects, a right-click still opens the
Element Edit panel, Esc still deselects, and autosave still PATCHes
the working `site_versions` row through the Sprint-6 hook.

This sprint **does not** ship Repeater data binding (Sprint 9), Form
submission wiring (Sprint 10), the AI chat right sidebar (Sprint 11),
the Deploy flow (Sprint 13), or the public site (also Sprint 13).
The Right sidebar remains the Sprint-6 placeholder. The Add tab keeps
its current six categories and 20 cards — Sprint 7 only swaps the
static cards for draggable ones. Drag-and-drop **inside** a Repeater
template is intentionally out of scope this sprint and is documented
as an explicit Tier-2 concern for Sprint 9.

This sprint makes the editor feel like an editor. Every later editor
sprint that needs to insert, move, or resize components consumes the
new store mutators below; get them right and the rest of the project
runs on top of them.

## Pre-flight check (MANDATORY — emit before reading or writing any non-spec file)

Before reading or modifying any file other than the items listed in
"Spec sections in scope" below, run these eight checks. If any
fails, STOP and emit a Deviation Report per the protocol embedded in
this file. Do not attempt to work around a failed check.

1. **Single-branch workflow.** Run `git branch --show-current` and
   verify the output is exactly `master`. If it is not, STOP and
   emit a Deviation Report — the project workflow per the
   2026-04-25 entry in `DECISIONS.md` is single-branch on
   `master`; do NOT create a `sprint/07` branch and do NOT switch
   branches.

2. **Sprint 6 is merged.** Confirm all of the following exist and
   re-export from `apps/web/components/editor/index.ts`:
   `TopBar`, `LeftSidebar`, `RightSidebar`, `Canvas`,
   `SelectionBreadcrumb`, `PageSelector`, `PreviewToggle`,
   `DeployButton`, `SaveIndicator`, `SiteNameInput`, `AddTab`,
   `ComponentCard`, `COMPONENT_CATALOG`, `COMPONENT_GROUP_ORDER`,
   `DataTab`, `AddPageDialog`, `DeletePageConfirm`, `PageRow`,
   `PagesTab`, `RenamePageDialog`, `FontSelector`,
   `PaletteSelector`, `SiteTab`. If any is missing, STOP and emit
   a Deviation Report.

3. **Sprint 8 is merged.** Confirm
   `apps/web/components/editor/edit-panels/EditPanelShell.tsx`
   exists and that `apps/web/components/editor/index.ts` re-exports
   `EditPanelShell`, `EditPanelTabs`, `ContentTabHost`, `StyleTab`,
   `AnimationTab`, `VisibilityTab`, `AdvancedTab`, and
   `DeleteComponentButton`. Confirm that the editor store actions
   `enterElementEditMode`, `exitElementEditMode`,
   `setElementEditTab`, `setComponentProps`, `setComponentStyle`,
   `setComponentAnimation`, `setComponentVisibility`, and
   `removeComponent` are all present in
   `apps/web/lib/editor-state/types.ts`. If any is missing, STOP
   and emit a Deviation Report — Sprint 7 layers on top of these.

4. **Renderer wrappers are stable.** Read
   `apps/web/components/renderer/EditModeWrapper.tsx` and
   `apps/web/components/renderer/ComponentRenderer.tsx`. Confirm
   that `EditModeWrapper` accepts `id`, `selected`, `onSelect`,
   `onContextMenu`, and `children`; that its `handleClick` and
   `handleContextMenu` both call `e.stopPropagation()` (the Sprint
   8 deviation); and that `ComponentRenderer` is `memo`-wrapped on
   reference equality. If any of that is missing, STOP and emit a
   Deviation Report.

5. **Component registry exposes `childrenPolicy` for all 20
   types.** Read `apps/web/components/site-components/registry.ts`
   and confirm `componentRegistry[T].meta.childrenPolicy` is one of
   `"none" | "one" | "many"` for every `ComponentType` `T` in
   `COMPONENT_TYPES`. Sprint 7 routes drop validation through this
   field. If the field is absent or the values are wrong for any
   component, STOP and emit a Deviation Report.

6. **Schema lock holds.** Read
   `apps/web/lib/site-config/schema.ts` and confirm
   `componentNodeSchema` is unchanged from the Sprint 3 / 3b
   shape: `{ id, type, props, style, animation?, visibility?,
   children?, dataBinding? }`. Sprint 7 must not add fields to
   this schema. If you find yourself wanting to, that is a
   Deviation. STOP and emit a Deviation Report.

7. **dnd-kit is not yet installed.** Read
   `apps/web/package.json` and confirm `@dnd-kit/core` and
   `@dnd-kit/sortable` are NOT present in `dependencies`. They
   are introduced this sprint. If either is already present at an
   unexpected version, STOP and emit a Deviation Report.

8. **`apps/web/components/editor/canvas/dnd/` does not yet
   exist.** Run `ls apps/web/components/editor/canvas/dnd/
   2>/dev/null || echo MISSING`. The expected output is `MISSING`.
   If the directory exists, STOP and emit a Deviation Report — its
   contents are owned by this sprint and must not pre-exist.

After all eight checks pass, emit a one-line acknowledgement
("Pre-flight: 8/8 PASS") and proceed.

## Spec sections in scope

- `PROJECT_SPEC.md` §6.3 — Component spec format. Children policy
  comes from each component's `SPEC.md`; the registry meta mirrors
  it and Sprint 7 reads from the registry, never the SPEC files.
- `PROJECT_SPEC.md` §6.4 — Shared style controls. Sprint 7 writes
  to `style.height` (string, e.g. `"320px"`) for height resize on
  every component except `Spacer`, which has its own
  `props.height` numeric field per `Spacer/SPEC.md`.
- `PROJECT_SPEC.md` §8.3 (Add tab) — the component palette.
  Cards become drag sources this sprint.
- `PROJECT_SPEC.md` §8.5 — The canvas, selection model, drop
  zones, and reorder behavior. Sprint 7 implements drop zones and
  drag-to-reorder.
- `PROJECT_SPEC.md` §8.6 — Resize, position, and grid mechanics.
  Binding paragraph: Columns adjust `span` 1–12 by dragging the
  right edge; container heights are `auto` by default and become
  fixed px by dragging a bottom handle. Vertical positioning is
  order-based (drag-to-reorder), never absolute. The canvas is
  NOT pixel-perfect Webflow.
- `PROJECT_SPEC.md` §9.4 — AI ops vocabulary. Sprint 7 implements
  the Tier-1 mutators `addComponent`, `moveComponent`, and the
  Tier-2 mutator `reorderChildren` as editor-store actions backed
  by pure helpers in `actions.ts`. The AI op layer in
  `lib/site-config/ops.ts` is Sprint 11; Sprint 7 only ships the
  store helpers, not the AI ops themselves.
- `PROJECT_SPEC.md` §11 — `SiteConfig` schema (canonical).
  Sprint 7 reads `componentNodeSchema` only — never modifies it.
- `PROJECT_SPEC.md` §15 — Coding standards (binding; the relevant
  subset is copied below).
- `PROJECT_SPEC.md` §16 — File scope rules.
- Each component's `apps/web/components/site-components/${T}/SPEC.md`
  for the seven resizable components: `Section`, `Row`, `Column`,
  `Image`, `Spacer`, `PropertyCard`, `UnitCard`. Sprint 7 reads
  these SPECs to confirm the height-resize is on the wrapper's
  CSS (or, for `Spacer`, on the prop) — and never invents a new
  prop surface.

## File scope

### Owned (this sprint may create or modify)

**New: dnd-kit glue (the centerpiece of Sprint 7).**

- `apps/web/components/editor/canvas/dnd/DndCanvasProvider.tsx`
  — the React component that wraps the canvas tree in dnd-kit's
  `DndContext`. Configures pointer + keyboard sensors with the
  10-pixel pointer activation distance recommended by dnd-kit
  (so single clicks still register as clicks, not drags). Owns
  the `onDragStart`, `onDragOver`, `onDragEnd`, `onDragCancel`
  handlers. Reads the editor store directly for the current
  config, computes the drag intent (palette-insert vs.
  tree-reorder vs. tree-move), validates against the children
  policy of the prospective parent (see
  `dropTargetPolicy.ts`), and dispatches to the editor store
  actions `addComponentChild`, `moveComponent`, or
  `reorderChildren`. Renders a `DragOverlay` that shows the
  catalog icon + label while a palette card is being dragged
  and the component's type label while a canvas node is being
  dragged.
- `apps/web/components/editor/canvas/dnd/dnd-ids.ts` — the id
  vocabulary used by dnd-kit. Three id flavors:
  `palette:${ComponentType}`, `node:${ComponentId}`, and
  `dropzone:${ComponentId}`. Exports type guards and parsers so
  the `onDrag*` handlers don't string-sniff. Sprint 7 puts these
  helpers behind named exports — no default exports.
- `apps/web/components/editor/canvas/dnd/dropTargetPolicy.ts`
  — pure functions:
  `getChildrenPolicy(type: ComponentType): ChildrenPolicy`
  (reads from the registry meta), `canAcceptChild(parent:
  ComponentNode, candidate: ComponentType): boolean` (returns
  `false` for `none`; `false` for `one` if parent already has a
  child; `true` for `many`), and
  `findInsertionIndex(parent: ComponentNode, overId: string):
  number` (computes the index a drop should land at given the
  hovered node id within the parent's children). All three are
  pure and unit-tested.
- `apps/web/components/editor/canvas/dnd/createDefaultNode.ts`
  — `createDefaultNode(type: ComponentType): ComponentNode`.
  Returns a freshly-id'd `ComponentNode` with a stable
  `cmp_<short>` id (use `crypto.randomUUID().slice(0, 8)` and
  prefix with `cmp_`), the registered type, an empty `style: {}`,
  and props chosen from the catalog defaults — see the
  per-component default-props table in "Default props for
  palette inserts" below. The function does NOT add a
  `dataBinding` (Sprint 9 owns that), does NOT add `animation`,
  and does NOT add `visibility`. Pure; unit-tested with a case
  per `ComponentType`.
- `apps/web/components/editor/canvas/dnd/PaletteDraggable.tsx`
  — wraps a Sprint-6 `ComponentCard` with dnd-kit's
  `useDraggable({ id: paletteId(type) })`. Forwards the card's
  `onSelect` so click-to-highlight still works (Sprint 6
  behavior). Activation distance is inherited from the
  pointer sensor in `DndCanvasProvider`, not configured
  here.
- `apps/web/components/editor/canvas/dnd/SortableNodeContext.tsx`
  — exports `useNodeSortable(id: ComponentId)` which calls
  dnd-kit's `useSortable({ id: nodeId(id) })` when a
  `DndCanvasProvider` is in scope, and returns `null` otherwise.
  The hook returns `{ setNodeRef, listeners, attributes,
  transform, transition, isDragging } | null`. The
  EditModeWrapper consumes this to attach refs/listeners
  conditionally.
- `apps/web/components/editor/canvas/dnd/DropZoneIndicator.tsx`
  — a 4-px tall accent bar rendered as a child of every
  `EditModeWrapper` whose `id` is the current drop target id.
  Visible only during a drag (driven by a small Sprint-7
  context, `DragStateContext`, defined in the same file).
  Greys itself out when the policy in `dropTargetPolicy.ts`
  rejects the candidate.
- `apps/web/components/editor/canvas/dnd/ResizeHandles.tsx`
  — overlays a right-edge handle and a bottom-edge handle on
  the selected component when its type is in the resizable set
  (`Section`, `Row`, `Column`, `Image`, `Spacer`, `PropertyCard`,
  `UnitCard`). The right-edge handle is rendered ONLY for
  `Column` and writes through `setComponentSpan`. The
  bottom-edge handle writes through `setComponentDimension(id,
  "height", "${px}px")` for every type except `Spacer`, which
  writes through `setComponentProps(id, { ...node.props, height:
  pixels })` (numeric, per `Spacer/SPEC.md`). Both handles use
  pointer events directly (no dnd-kit) and snap on
  `pointerup`. Span snaps to the integer 1–12 nearest the
  release column inside the parent Row's bounding rect; height
  snaps to the nearest 8-pixel multiple with a floor of 8 px
  (Spacer floor is 0). Pressing Esc during a resize cancels
  and reverts.
- `apps/web/components/editor/canvas/dnd/index.ts` — barrel
  exporting every public name from this directory (the
  provider, the policy helpers, `createDefaultNode`, the id
  helpers, `DropZoneIndicator`, `ResizeHandles`).

**New: tests for dnd glue.**

- `apps/web/components/editor/canvas/dnd/__tests__/dropTargetPolicy.test.ts`
  — covers every branch of `canAcceptChild` for all three
  policies (none / one / many) plus the empty-vs-non-empty
  variants for `one`. Covers `findInsertionIndex` for
  before/middle/after positions and the empty-children case.
  Covers `getChildrenPolicy` for every `ComponentType` against
  the registry meta — this test acts as a contract guard
  against future component additions.
- `apps/web/components/editor/canvas/dnd/__tests__/createDefaultNode.test.ts`
  — every `ComponentType` round-trips through
  `componentNodeSchema.safeParse` successfully. Generated ids
  match `/^cmp_[a-z0-9]+$/`. Two consecutive calls produce
  distinct ids. The function never sets `animation`,
  `visibility`, or `dataBinding`.
- `apps/web/components/editor/canvas/dnd/__tests__/dnd-ids.test.ts`
  — round-trip parse for every id flavor; rejection of
  malformed strings.
- `apps/web/components/editor/canvas/dnd/__tests__/DndCanvasProvider.test.tsx`
  — uses `@testing-library/react` with manual `pointerDown` /
  `pointerMove` / `pointerUp` events on dnd-kit-rendered cards.
  Cases:
  (a) palette card → empty Section drops at index 0 and
      writes a new node into the store;
  (b) palette card → `none`-policy Image drop is rejected
      and the store is unchanged;
  (c) palette card → `one`-policy Repeater drop on an empty
      Repeater inserts; on an occupied Repeater is rejected;
  (d) sortable reorder within a Section reorders children;
  (e) sortable move from Section A to Section B updates both
      parents in a single store transition;
  (f) Esc during a drag cancels — store is unchanged from the
      pre-drag snapshot;
  (g) `previewMode === true` disables drag (no listeners
      register, no drop validates).

**Editor store extensions.**

- `apps/web/lib/editor-state/types.ts` — extend `EditorActions`
  with:
  - `addComponentChild(parentId: ComponentId, index: number,
    node: ComponentNode): void` — inserts `node` as a child of
    `parentId` at position `index`. Throws
    `EditorActionError("invalid_drop_target", ...)` if
    `canAcceptChild` rejects the candidate. Throws
    `EditorActionError("component_not_found", ...)` if
    `parentId` does not resolve.
  - `moveComponent(targetId: ComponentId, newParentId:
    ComponentId, newIndex: number): void` — removes `targetId`
    from its current parent and re-inserts it at `newIndex`
    under `newParentId`. Same error semantics. The page-root
    is not movable; attempting to move it throws
    `EditorActionError("page_root_locked", ...)`.
  - `reorderChildren(parentId: ComponentId, newOrder:
    ComponentId[]): void` — replaces `parent.children` with the
    nodes referenced by `newOrder` in the supplied order. Throws
    `EditorActionError("reorder_mismatch", ...)` if `newOrder`
    is not a permutation of the current children's ids.
  - `setComponentSpan(id: ComponentId, span: 1|2|3|4|5|6|7|8|9|10|11|12): void`
    — writes `span` into `node.props.span`, but only if `node.type
    === "Column"`; otherwise throws
    `EditorActionError("invalid_resize_target", ...)`.
  - `setComponentDimension(id: ComponentId, axis: "width" |
    "height", value: string | undefined): void` — writes
    `node.style[axis] = value`. `undefined` clears the field
    (e.g. revert to `auto`). For `Spacer`, throws
    `EditorActionError("invalid_resize_target", ...)` — the
    Spacer's height belongs in `props`, not `style`, and is set
    via `setComponentProps`. The handle component knows this and
    routes accordingly.
  - Add to `EditorActionErrorCode`: `"invalid_drop_target"`,
    `"reorder_mismatch"`, `"invalid_resize_target"`.
- `apps/web/lib/editor-state/store.ts` — wire the new action
  wrappers. Each delegates to a pure helper in `actions.ts`,
  flips `saveState` to `"dirty"`, and (for `moveComponent`)
  preserves `selectedComponentId` if the moved node was selected.
  `addComponentChild` after a successful insert sets
  `selectedComponentId = node.id` (the new node becomes the
  selection) so the user immediately sees what they dropped.
- `apps/web/lib/editor-state/actions.ts` — add:
  - `applyAddComponentChild(config: SiteConfig, parentId:
    ComponentId, index: number, node: ComponentNode): SiteConfig`
    — pure; calls `canAcceptChild` against the resolved parent
    and throws on rejection. Uses the same tree-walk pattern as
    `applyRemoveComponent`. Tested for the four cases above
    plus a deep-nesting case (3 levels deep).
  - `applyMoveComponent(config: SiteConfig, targetId:
    ComponentId, newParentId: ComponentId, newIndex: number):
    SiteConfig` — pure; first removes the node from its current
    parent, then inserts under the new parent. Disallows
    moving a node under itself or any descendant
    (`invalid_drop_target` with the message "Cannot move a
    component into one of its own descendants.").
  - `applyReorderChildren(config: SiteConfig, parentId:
    ComponentId, newOrder: ComponentId[]): SiteConfig` — pure;
    validates `newOrder` is a permutation of the parent's
    current children's ids before writing.
- `apps/web/lib/editor-state/index.ts` — export the three new
  apply helpers and the new error codes from the public barrel.
- `apps/web/lib/editor-state/__tests__/actions.test.ts`
  (extend) — at least 12 new cases across the three new
  helpers, hitting each error path explicitly.
- `apps/web/lib/editor-state/__tests__/store.test.ts` (extend)
  — at least 8 new cases for the new action wrappers,
  including the autosave-dirty flip and the new-selection
  side-effect of `addComponentChild`.

**Renderer wrapper extension (minimal).**

- `apps/web/components/renderer/EditModeWrapper.tsx` — extend
  the wrapper to call `useNodeSortable(id)` from the new
  `SortableNodeContext`. When the hook returns non-`null`,
  apply the returned `setNodeRef` to the same `<div>` that
  already carries `data-edit-id`, spread `attributes` and
  `listeners` onto it, and apply
  `style={{ ...callerStyle, transform:
  CSS.Transform.toString(transform), transition, opacity:
  isDragging ? 0.5 : undefined }}`. When the hook returns
  `null` (no `DndCanvasProvider` in scope), behavior is
  exactly the Sprint-6/8 wrapper. **Do not change** the
  existing `onClick`, `onContextMenu`, `onKeyDown`, or
  `data-edit-*` attributes — every existing test in
  `EditModeWrapper.test.tsx` must continue to pass.
  Add new tests covering: (a) rendered with a stub
  `SortableNodeContext` that returns refs/listeners — the
  wrapper applies them; (b) rendered without a provider — the
  wrapper does not crash and behaves identically to Sprint
  6/8.

**Add-tab card extension (minimal).**

- `apps/web/components/editor/sidebar/add-tab/ComponentCard.tsx`
  — rewrap the existing `<button>` in `PaletteDraggable`. Keep
  every existing `data-testid`, `aria-pressed`, `onSelect`
  prop, and Tailwind class. The card is BOTH a
  click-to-highlight target (Sprint 6) AND a drag source
  (Sprint 7). dnd-kit's pointer activation distance prevents
  click and drag from firing simultaneously on a single
  pointer-down→pointer-up.
- `apps/web/components/editor/sidebar/add-tab/AddTab.tsx` —
  remove the `<p>Drag-and-drop coming in the next update.</p>`
  footer line. Replace it with nothing — the tab now ends at
  the last category section.
- `apps/web/components/editor/sidebar/add-tab/__tests__/ComponentCard.test.tsx`
  (extend) — add a test confirming the card is wrapped in a
  `useDraggable` source (assert presence of the
  `data-dnd-handle` attribute the wrapper adds; verify the
  existing `aria-pressed` selection assertion still passes).

**Canvas integration.**

- `apps/web/components/editor/canvas/Canvas.tsx` — wrap the
  `<Renderer>` in `<DndCanvasProvider>`. The provider is a
  no-op when `previewMode === true` (it renders children
  unchanged). The canvas onClick/onKeyDown deselect handler is
  unchanged. Mount a `<ResizeHandles />` overlay positioned
  absolutely inside the canvas card; it reads
  `selectedComponentId` from the store and finds the selected
  element's bounding rect via `document.querySelector(
  '[data-edit-id="${id}"]')` so the handles align with the
  rendered element. Update on resize / scroll via a
  `ResizeObserver` and a `scroll` listener.
- `apps/web/components/editor/canvas/__tests__/Canvas.test.tsx`
  (extend if exists; create if not) — case: in preview mode,
  no drag listeners attach (assert the absence of dnd-kit's
  data attributes on rendered nodes). Case: a Section ID
  becomes the new selection after a successful palette drop.
- `apps/web/components/editor/index.ts` — export
  `DndCanvasProvider` and the dnd folder's barrel from
  `./canvas/dnd`.

**Dependency manifest.**

- `apps/web/package.json` — add `@dnd-kit/core` and
  `@dnd-kit/sortable` (and `@dnd-kit/utilities` if and only if
  the typed `CSS` helper used in `EditModeWrapper.tsx` cannot be
  imported from `@dnd-kit/sortable` directly). Pin all three
  with `pnpm add -E`. The exact installed versions go into the
  Sprint Completion Report. If `pnpm install` reports a peer
  conflict against React 19.2.5, STOP and emit a Deviation
  Report — do not downgrade React, do not patch the peer range,
  do not `--legacy-peer-deps`.

### Shared (read-only — read but do not modify)

- `PROJECT_SPEC.md`
- `apps/web/lib/site-config/schema.ts`
- `apps/web/lib/site-config/style.ts`
- `apps/web/components/site-components/registry.ts` and every
  per-component `index.tsx` and `SPEC.md` under
  `apps/web/components/site-components/${T}/`. The 20
  components ship with their data attributes (e.g.
  `data-component-id`, `data-component-type`,
  `data-column-span` on Column) — Sprint 7 reads these,
  never writes new ones to per-component files.
- `apps/web/components/renderer/Renderer.tsx`,
  `ComponentRenderer.tsx`, and `ComponentErrorBoundary.tsx`.
  Sprint 7 modifies only `EditModeWrapper.tsx` in this
  folder.
- `apps/web/components/editor/edit-panels/**` (Sprint 8
  territory).
- `apps/web/components/editor/topbar/**` (Sprint 6 territory).
- `apps/web/components/editor/sidebar/site-tab/**`,
  `pages-tab/**`, `data-tab/**` (Sprint 6 territory).
- `apps/web/lib/editor-state/autosave.ts` and `selectors.ts`
  (Sprint 6 territory; Sprint 7 only adds new selectors via the
  new actions, never edits the existing ones).
- `DECISIONS.md` (append-only — never edit existing entries).
- `SPRINT_SCHEDULE.md`.

### Forbidden (do not touch under any circumstances)

- `PROJECT_SPEC.md` (the spec is authoritative; raise concerns
  via Deviation).
- Existing entries in `DECISIONS.md`.
- `apps/web/lib/site-config/schema.ts` — schema-lock break
  would require its own sprint per `SPRINT_SCHEDULE.md` §5.
- `apps/web/lib/ai/prompts/**` (Sprint 4 / Sprint 11).
- `apps/web/app/api/**` — no API route changes this sprint.
- `apps/web/app/dev/**` — Sprint 3 / 5 fixtures stay frozen.
- `apps/web/app/setup/**` — Sprint 1 / 2 / 4 territory.
- `supabase/migrations/`, `supabase/seed.sql`. No DB changes
  this sprint.
- The seven Content panels Sprint 8 made live
  (`apps/web/components/site-components/${T}/EditPanel.tsx` for
  `Heading`, `Paragraph`, `Button`, `Image`, `NavBar`, `Footer`,
  `InputField`).

### Default props for palette inserts (binding)

`createDefaultNode(type)` MUST produce nodes whose `props`
match the table below. Every default must validate against the
component's runtime `safeParse` — Sprint 7's
`createDefaultNode.test.ts` enforces this.

| ComponentType  | Default `props`                                                                 |
| -------------- | ------------------------------------------------------------------------------- |
| `Section`      | `{ as: "section" }`                                                             |
| `Row`          | `{ gap: 16, alignItems: "stretch", justifyContent: "start", wrap: false }`      |
| `Column`       | `{ span: 12, gap: 8, alignItems: "stretch" }`                                   |
| `Heading`      | `{ text: "New heading", level: 2 }`                                             |
| `Paragraph`    | `{ text: "New paragraph." }`                                                    |
| `Button`       | `{ label: "Button", href: "#", variant: "primary", linkMode: "static" }`        |
| `Image`        | `{ src: "", alt: "", fit: "cover" }`                                            |
| `Logo`         | `{}` (Logo reads from brand config)                                             |
| `Spacer`       | `{ height: 40 }`                                                                |
| `Divider`      | `{ thickness: 1, color: "#e5e7eb" }`                                            |
| `NavBar`       | `{ links: [], logoPlacement: "left", sticky: false }`                           |
| `Footer`       | `{ columns: [], copyright: "© 2026" }`                                          |
| `HeroBanner`   | `{ headline: "New hero", subheadline: "", ctaLabel: "Learn more", ctaHref: "#" }` |
| `PropertyCard` | `{ heading: "Property Name", body: "Property description goes here.", imageSrc: "", ctaLabel: "View Details", ctaHref: "#" }` |
| `UnitCard`     | `{ unitName: "Unit", bedrooms: 1, bathrooms: 1, rent: 0, primaryImageUrl: "", ctaLabel: "View", ctaHref: "#" }` |
| `Repeater`     | `{}` (data binding lands in Sprint 9)                                           |
| `InputField`   | `{ name: "field", label: "Field", inputType: "text", required: false }`         |
| `Form`         | `{ formId: "new_form", successMessage: "Thanks." }`                             |
| `MapEmbed`     | `{ address: "" }`                                                               |
| `Gallery`      | `{ images: [], columns: 3, gap: 8 }`                                            |

If any of the above does not validate against the corresponding
component's runtime `safeParse`, treat it as a Deviation. Do
NOT silently fall back to the component's internal defaults —
the schema is authoritative.

### Resizable component matrix (binding)

| ComponentType  | Right-edge handle      | Bottom-edge handle              | Notes                                                |
| -------------- | ---------------------- | ------------------------------- | ---------------------------------------------------- |
| `Section`      | none                   | `style.height` (px or `auto`)   | Width is parent-driven (canvas stage).               |
| `Row`          | none                   | `style.height` (px or `auto`)   | Width fills parent.                                  |
| `Column`       | `props.span` (1–12)    | `style.height` (px or `auto`)   | Span snap snaps to integers within parent Row width. |
| `Image`        | none                   | `style.height` (px or `auto`)   | Width is parent-driven.                              |
| `Spacer`       | none                   | `props.height` (number, px)     | Numeric prop, NOT `style.height`.                    |
| `PropertyCard` | none                   | `style.height` (px or `auto`)   | Width is parent-driven.                              |
| `UnitCard`     | none                   | `style.height` (px or `auto`)   | Width is parent-driven.                              |

For every other `ComponentType`, no resize handles render.
`ResizeHandles.tsx` reads from this matrix; the matrix lives
in a const at the top of that file and is exported for the
unit test that asserts it matches §8.6 verbatim.

## Coding standards (binding subset of `PROJECT_SPEC.md` §15)

- TypeScript strict; `noUncheckedIndexedAccess`, `noImplicitAny`
  on. No `any`. If you reach for it, use `unknown` and narrow.
- One component per file. File name = export name. PascalCase
  for components; camelCase for hooks (`useThing`); kebab-case
  for filenames in non-component modules.
- Server components by default; `"use client"` on line 1 only
  when needed. Every file in
  `apps/web/components/editor/canvas/dnd/` is a client
  component (they read the Zustand store, attach pointer
  handlers, or use dnd-kit hooks). Add `"use client"` on line
  1 of every such file.
- No prop drilling deeper than two levels. Hoist to the store
  or to the dnd context.
- Use `cn(...)` for class merging.
- No commented-out code. No `console.log`. No `.skip` /
  `.only` in tests. No `@ts-ignore`. No `as any`.
- Tests live next to the file under
  `__tests__/${name}.test.tsx`. Use Vitest + Testing Library;
  reset the editor store between cases via
  `__resetEditorStoreForTests()`.
- All paths, commands, and identifiers go in backticks in any
  prose.
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`,
  `docs:`, `test:`. One concern per commit.

## Definition of Done

- [ ] **dnd-kit is installed at exact pinned versions.**
  `pnpm add -E @dnd-kit/core @dnd-kit/sortable` (and
  `@dnd-kit/utilities` only if needed for the `CSS` helper)
  succeeds without peer-conflict overrides. The installed
  versions appear in `apps/web/package.json` and in the Sprint
  Completion Report. `pnpm install --frozen-lockfile` succeeds
  cleanly afterwards.

- [ ] **Drag from the Add tab to the canvas inserts a new
  node into a valid parent.** Pointer-down on a palette card,
  drag past the 10-px activation distance, drag onto a
  rendered Section in the canvas, release. The store gains a
  new node in that Section's `children`, with the props from
  the "Default props for palette inserts" table; the new node
  becomes the selection; `saveState === "dirty"`; the Sprint-6
  autosave hook PATCHes the working version after the standard
  debounce. The DragOverlay shows the catalog icon + label
  while the drag is in progress.

- [ ] **Children policy is honored on every drop.** A drop
  onto a `none`-policy component (e.g. `Heading`,
  `Paragraph`, `Image`) is rejected: the visual indicator
  greys out, releasing produces no store mutation, and a
  `console.warn`-level message is logged ONLY in dev (the
  warning is not in committed `console.log` calls — use a
  Sprint-7 internal helper that no-ops in `process.env.NODE_ENV
  === "production"`). A drop onto a `one`-policy component
  (`Repeater`) is accepted iff the component currently has
  zero children.

- [ ] **Reorder within a parent works via drag.** Dragging
  one of a Section's children past a sibling's midpoint
  reorders them. The store's `reorderChildren` action fires
  exactly once per drop. The selection persists on the moved
  node.

- [ ] **Cross-parent move works via drag.** Dragging a node
  from Section A and dropping into Section B updates both
  parents in a single store transition (one
  `applyMoveComponent` call). The selection persists on the
  moved node. Moving a node into one of its own descendants
  is rejected.

- [ ] **Esc cancels an in-progress drag.** Pressing Escape
  while a palette card or a canvas node is being dragged
  aborts the drop: dnd-kit's `onDragCancel` fires, no store
  mutation occurs, the DragOverlay disappears, and the
  rendered tree is identical to the pre-drag tree.

- [ ] **Column right-edge resize adjusts `props.span`.**
  Selecting a `Column` reveals a right-edge handle. Dragging
  it leftward shrinks the span; rightward grows it. The span
  snaps to integers 1–12 (the column index nearest the
  pointer release). The store's `setComponentSpan` action
  fires once on `pointerup`. Esc during the drag cancels and
  reverts. The Column's `data-column-span` attribute (which
  Column already emits) updates to match.

- [ ] **Bottom-edge resize adjusts the height for the seven
  resizable types.** For `Section`, `Row`, `Column`, `Image`,
  `PropertyCard`, `UnitCard` the handle writes
  `style.height = "${px}px"`; for `Spacer` it writes
  `props.height = px` (number). Heights snap to the nearest
  multiple of 8 with a floor of 8 px (Spacer floor 0). Esc
  during the drag cancels and reverts. The handle is hidden
  on every other component type.

- [ ] **Right-click still opens the Element Edit panel.**
  Sprint 8's right-click → element-edit flow is unchanged. A
  right-click on a draggable node calls
  `enterElementEditMode(id)` exactly once and does not
  trigger a drag. The Element Edit panel shows the same
  five tabs (Content / Style / Animation / Visibility /
  Advanced).

- [ ] **Preview mode disables drag and resize.** Toggling
  preview via the topbar removes all dnd listeners and
  hides resize handles. Switching back to edit re-enables
  them. The Sprint-6 selection chrome still hides in preview.

- [ ] **Editor store actions are typed, error-coded, and
  flip `saveState`.** `addComponentChild`, `moveComponent`,
  `reorderChildren`, `setComponentSpan`,
  `setComponentDimension` each delegate to a pure helper,
  flip `saveState` to `"dirty"`, and trigger autosave via
  the existing Sprint-6 hook. Each error path throws
  `EditorActionError` with one of the new codes
  (`invalid_drop_target`, `reorder_mismatch`,
  `invalid_resize_target`) plus the existing
  `component_not_found` and `page_root_locked`.

- [ ] **No new files outside the "Owned" scope above.** No
  edits to forbidden files. No new dependencies beyond the
  dnd-kit packages. No schema changes. If you catch yourself
  wanting any of these, file a Deviation Report.

- [ ] **Coding standards (§15) honored.** No `any`. No
  `@ts-ignore`. No `.skip` / `.only` in tests. No
  commented-out code. No `console.log` in committed source
  (the dev-mode warning helper noted above is the single
  exception and lives behind a `NODE_ENV` guard).

- [ ] **Tests added.** ≥ 30 new Vitest tests across the dnd
  module, the editor-state actions extension, the editor-state
  store extension, the EditModeWrapper extension, and the
  Add-tab ComponentCard extension. Every new error-code path
  is covered by at least one test. Existing tests
  (Sprint 3 / 5 / 6 / 8) continue to pass unchanged.

- [ ] **Quality gates pass.** `pnpm test` — zero failures,
  zero skipped. `pnpm build` — zero TypeScript errors, zero
  warnings. `pnpm biome check` — zero warnings. The manual
  smoke test (next section) passes on a fresh `pnpm dev`.

- [ ] **`DECISIONS.md` updated if any deviation was approved
  during this sprint.** If no deviations were approved, write
  "None" in the Sprint Completion Report's Deviations field.

## Manual smoke test (numbered, click-by-click)

1. Run `pnpm dev` from the repo root.
2. Open `http://localhost:3000/aurora-cincy/edit` in a fresh
   incognito browser window.
3. Wait for the editor to load. Confirm the canvas shows the
   seeded Aurora home page with the hero, repeater, and
   footer.
4. In the left sidebar, click the **Add** tab.
5. Confirm the Add tab no longer shows the
   "Drag-and-drop coming in the next update." footer line.
6. Find the **Heading** card under the Content category.
   Press and hold the left mouse button on the card. Move
   the cursor at least 10 pixels to enter drag mode.
   Confirm a `DragOverlay` appears at the cursor showing
   the Heading icon and label "Heading".
7. Drag the cursor over the canvas. Confirm a Section in
   the canvas highlights with a blue accent bar at the
   intended drop position. Drag over a `Heading` already
   in the canvas; confirm its highlight is greyed out
   (children policy `none`).
8. Release over a Section. Confirm a new "New heading"
   `<h2>` appears in the canvas at the drop position. The
   left sidebar shows it as the new selection. The
   Sprint-6 SaveIndicator briefly reads "Saving…" and
   then "Saved Xs ago".
9. Right-click the new heading. Confirm the LeftSidebar
   swaps to Element Edit mode and the panel title reads
   "Heading". Click the back arrow to exit.
10. Click the new heading once to select it. With it
    selected, drag it past the next sibling. Release.
    Confirm the order changed in the rendered DOM.
11. Drag the new heading from its current Section into a
    different Section on the page. Release. Confirm both
    Sections updated.
12. Locate a `Column` in the canvas (the seeded Aurora
    page has multiple). Click to select it. A right-edge
    handle appears. Press the handle, drag left a few
    columns' width, release. Confirm the Column's
    `data-column-span` attribute decreased and the
    rendered width shrank. Press Cmd/Ctrl+Z does NOT need
    to work this sprint — undo lands later. Just confirm
    the new span persists.
13. Locate the seeded `Spacer`. Click to select it.
    Drag the bottom-edge handle downward by ~80 px.
    Release. Inspect the rendered `<div data-component-type="Spacer">` —
    its `style.height` should be the new value in px.
14. Locate a `Section`. Click to select it. Drag its
    bottom-edge handle downward by ~120 px. Release. The
    Section's height grows. Re-select it and drag the
    handle back to its original position.
15. Drag a palette card (any) and press **Esc** mid-drag.
    Confirm the drop is cancelled — no new node appears,
    the DragOverlay disappears, and the SaveIndicator
    does NOT change to "Saving…".
16. Toggle **Preview** in the topbar. Confirm: the
    Add-tab cards still render but cannot be dragged onto
    the canvas (try it — nothing happens); resize handles
    do not appear on selected components; selection chrome
    is hidden. Toggle Preview off; confirm everything
    re-enables.
17. With drag and resize working, click around the page,
    confirm the Sprint-6 selection chrome and the
    Sprint-8 right-click panel both still work without
    regressions. Refresh the browser; confirm the new
    nodes and resized values persist (Sprint-6 autosave
    + initial-load round-trip).
18. Open the browser DevTools Console. There should be no
    `console.log`, `console.warn`, or `console.error`
    output during normal use.
19. Stop the dev server. Run `pnpm test`, `pnpm build`,
    and `pnpm biome check`. All three pass with zero
    failures and zero warnings.

If any step fails, treat it as a Deviation per the protocol
below.

## Known risks & failure modes

- **dnd-kit React 19 peer-dependency conflict.** `@dnd-kit/core`
  historically pegs to React 16/17/18. If `pnpm install`
  rejects the install or warns about peer deps, STOP and emit
  a Deviation Report — do NOT use `--legacy-peer-deps`, do
  NOT downgrade React, do NOT pin to an older dnd-kit major
  without approval. Likelihood: medium. Mitigation: Sprint 7
  is the first time dnd-kit appears in this codebase; its
  React-19 compatibility is the most likely point of friction.

- **Click vs. drag activation on palette cards.** Without an
  activation distance, every click on a palette card would
  start a drag and prevent the Sprint-6 selection chrome from
  firing. Mitigation: configure the dnd-kit pointer sensor
  with `activationConstraint: { distance: 10 }`. Tested in
  `DndCanvasProvider.test.tsx` case (g).

- **Right-click triggering drag.** dnd-kit's pointer sensor
  listens to the primary button only by default; a `button:
  2` (right-click) on a draggable element should not start a
  drag. Verify in the smoke test step 9 — if the Element
  Edit panel does not open on right-click of a draggable
  node, treat it as a Deviation and emit a report.

- **`useSortable` stripping `EditModeWrapper`'s click
  handler.** Spreading dnd-kit listeners last would
  shadow the click handler. Mitigation: spread
  `attributes` and `listeners` BEFORE `onClick` /
  `onContextMenu` / `onKeyDown` in EditModeWrapper, so the
  Sprint-6/8 handlers win. Tested in
  `EditModeWrapper.test.tsx` extension cases.

- **ResizeHandles aligning to the wrong DOM node after a
  drop.** The handle queries by `data-edit-id`. If the
  selected node is removed mid-render (e.g. by a sibling
  drop op), the query returns null. Mitigation:
  ResizeHandles renders nothing when the query returns
  null and re-runs on every store transition. Tested.

- **Drop onto a `Repeater` template child.** Sprint 9 will
  introduce row context; Sprint 7 must NOT special-case
  Repeater children beyond the `one`-policy gate. If a
  user drops a Heading inside an empty Repeater, the
  template position is filled — this is correct Sprint-7
  behavior. Sprint 9 will then resolve `{{ row.* }}`
  tokens on render. Document this in the
  `dropTargetPolicy.test.ts` file's header comment.

- **Resize math drifting under nested transforms.** If a
  parent applies `transform: scale(...)` (none currently
  do, but a Section could via a future style), the
  pointer delta would not match pixel delta. Sprint 7
  uses `getBoundingClientRect()` for span snap and
  pointer delta for height, both unaffected by transforms
  applied to ancestors of `document.body`. Document this
  in `ResizeHandles.tsx`'s file header.

## Notes & hints (non-binding context)

- dnd-kit's `useSortable` returns a `transform` matrix that
  must be stringified via `CSS.Transform.toString(transform)`.
  Import `CSS` from `@dnd-kit/utilities` (preferred) or from
  `@dnd-kit/sortable` if Sprint 7 chooses to skip the
  `utilities` package.
- The 10-px activation constraint is a dnd-kit config:
  `useSensor(PointerSensor, { activationConstraint: { distance: 10 } })`.
- Vitest can drive dnd-kit drags with synthetic
  `pointerdown`/`pointermove`/`pointerup` events on the
  rendered card; see the dnd-kit docs' "Testing" page for
  the exact event sequence. If a test consistently fails to
  observe a drag, switch to manual `dispatchEvent` calls on
  the actual DOM node returned by the sensor's ref.
- The `ResizeObserver` global is available in jsdom 26
  (already a dev dependency) — no polyfill needed.
- `crypto.randomUUID` is available in jsdom 26 too; the new
  node id helper does not need a polyfill.
- The `componentRegistry`'s `meta.childrenPolicy` is the
  authoritative source for drop-target validity. Do NOT
  duplicate the policy in Sprint 7. Do NOT teach Sprint 7
  about per-component prop shapes — `createDefaultNode`
  uses the explicit table above and the runtime `safeParse`
  is the only validator.

## Definition of "done" gating

A sprint is not done until all of the following pass with no
warnings:

- `pnpm test`
- `pnpm build`
- `pnpm biome check`
- The manual smoke test above.

If any check fails, treat it as a Deviation. Do not commit.
Do not declare the sprint complete.

## Useful local commands

- `pnpm dev` — local dev server (against the hosted Supabase
  project).
- `pnpm test` — Vitest.
- `pnpm test:e2e` — Playwright (only the demo flow; not
  required for Sprint 7).
- `pnpm seed` — `supabase db reset --linked`; reloads the
  hosted Aurora seed.
- `pnpm db:push` — apply pending migrations against the hosted
  Supabase project. **Sprint 7 should not touch the DB and
  should not run this.**
- `pnpm db:types` — regenerate `apps/web/types/database.ts`
  after any schema change. **Sprint 7 should not need this.**

## Deviation Protocol (mandatory — do not modify)

If you (Claude Code) discover during this sprint that ANY part
of the plan cannot be implemented exactly as written, you MUST
stop and emit a Deviation Report in the format below. You MUST
NOT proceed with an alternative until the user has explicitly
approved it with the words "Approved" or equivalent.

A "deviation" includes: missing/broken/incompatible libraries,
impossible function signatures, scope additions, file additions
outside the declared scope, test plans that cannot be executed
as written, and any case where you catch yourself thinking
"I'll just do it slightly differently."

### Deviation Report (emit verbatim)

```