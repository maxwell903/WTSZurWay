# X-Axis Resize, Side-by-Side Layout, and Edit-Mode Overlays — Design

- **Date:** 2026-04-27
- **Status:** Approved (brainstorm complete; awaiting implementation plan)
- **Owner:** Max
- **Related code:**
  - [apps/web/components/editor/canvas/dnd/ResizeHandles.tsx](../../../apps/web/components/editor/canvas/dnd/ResizeHandles.tsx)
  - [apps/web/components/editor/canvas/dnd/BetweenDropZone.tsx](../../../apps/web/components/editor/canvas/dnd/BetweenDropZone.tsx)
  - [apps/web/components/editor/canvas/dnd/DropZoneIndicator.tsx](../../../apps/web/components/editor/canvas/dnd/DropZoneIndicator.tsx)
  - [apps/web/components/editor/canvas/dnd/DndCanvasProvider.tsx](../../../apps/web/components/editor/canvas/dnd/DndCanvasProvider.tsx)
  - [apps/web/components/editor/canvas/Canvas.tsx](../../../apps/web/components/editor/canvas/Canvas.tsx)
  - [apps/web/components/editor/topbar/TopBar.tsx](../../../apps/web/components/editor/topbar/TopBar.tsx)
  - [apps/web/components/renderer/ComponentRenderer.tsx](../../../apps/web/components/renderer/ComponentRenderer.tsx)
  - [apps/web/lib/editor-state/actions.ts](../../../apps/web/lib/editor-state/actions.ts)
  - [apps/web/lib/editor-state/store.ts](../../../apps/web/lib/editor-state/store.ts)
  - [apps/web/lib/site-config/schema.ts](../../../apps/web/lib/site-config/schema.ts)

---

## 1. Goal

Make the editor's layout model two-dimensional and self-explanatory:

- The user can resize any component on **both axes** (currently only Y).
- The user can place components **side by side**, including at the page root, by dropping on the right or left edge of an existing component.
- Child components are **bounded by their parent**: a child cannot be resized past its parent's edge, and shrinking a parent automatically shrinks any clipped children.
- The editor's drop targets are **always visible** as semi-transparent dotted grey overlays (no need to start a drag to see where things can go), and the same overlays serve as the drop-snap indicator during a drag.
- A new TopBar toggle (**Show Component Types**, on by default) wraps every component in a dashed grey outline with a centered type label, so users can distinguish parent and child when they share a colour.

The drag-and-drop model itself is **not** changing — only resizing is bounded by parents. A child can still be dragged in and out of any container that accepts its type.

## 2. Non-Goals

- No new component types beyond an internal `FlowGroup` layout primitive (see §4).
- No multi-select or group resize.
- No keyboard shortcut for the new toggle (avoiding conflicts; can be added later).
- No persistence of the toggle state across page refreshes.
- No change to AI-edit operations beyond what the new actions naturally extend.
- No mobile / responsive editor — the editor canvas remains desktop-only as today.

---

## 3. Architectural Overview

Five interlocking changes ship as one feature set:

1. **X-axis resize handles** on every component, with hybrid units (% for containers, px for leaves). § 4.
2. **Side-by-side layout** at any depth via "drop on right edge" — implemented by an internal `FlowGroup` wrapper that the engine creates and dissolves automatically. § 5.
3. **Parent-bound resize** — hard clamp + brief "Bounded by parent" tooltip on a child resize; auto-shrink on a parent resize. § 6.
4. **Always-visible dotted-grey dropzones** that double as the drag-snap indicator (replacing today's blue accent line); 2× larger; only in valid drop areas. § 7.
5. **Show Component Types** toggle in the TopBar — defaults ON, transient. § 8.

Cross-cutting:

- All five features are **edit-mode only**. Preview and deployed renders are unchanged: overlays are gone, outlines are gone, FlowGroups still render as flex rows but the user can't see them as such.
- All five features keep using the **single-source-of-truth** model: the site-config JSON drives everything, and `applyOperations` (in [ops.ts](../../../apps/web/lib/site-config/ops.ts)) remains the only path that mutates the draft config.

---

## 4. Sizing Model and Resize Handles

### 4.1 Width as a first-class style property

Every node in the registry gains a meaningful `style.width` value:

- **Container types** (`Section`, `Row`, `Column`, `FlowGroup`) store width as a **percentage of parent**, e.g. `"50%"`. They participate in a flex layout — siblings inside a horizontal group fill the parent proportionally. A `FlowGroup`'s own default width is `"100%"` (it spans whatever space its parent gives it); only the children of a `FlowGroup` express percentages that sum to ≤ 100.
- **Leaf types** (everything else: `Image`, `Heading`, `Paragraph`, `Button`, `Logo`, `Divider`, `NavBar`, `Footer`, `HeroBanner`, `Repeater`, `InputField`, `Form`, `MapEmbed`, `Gallery`, `PropertyCard`, `UnitCard`, `Spacer`) store width in **pixels**, e.g. `"320px"`. They are clamped by their parent's content box.
- **`Column.span` (1–12) is preserved** as the legacy storage format. The existing right-edge handle keeps its 1/12 snap behaviour. New: holding **Shift** while dragging escapes the snap and writes a free percentage instead. Old configs continue to render with `span`; new resizes can promote the value to a `width` percentage.

### 4.2 Resize handle UI

Today only `Section`, `Row`, `Column`, `Image`, `Spacer`, `PropertyCard`, `UnitCard` expose handles, and only `Column` has a right-edge one. After this change:

- Every component type gets:
  - A **right-edge handle** (8 px wide, full component height, `cursor: ew-resize`) — same blue-translucent style as today's Column right handle.
  - The existing **bottom-edge handle**, unchanged.
  - A **bottom-right corner handle** (12 × 12 px, `cursor: nwse-resize`) that drives both axes simultaneously.
- The `RESIZE_MATRIX` table in [ResizeHandles.tsx](../../../apps/web/components/editor/canvas/dnd/ResizeHandles.tsx) is replaced by a registry-derived rule: every component is resizable on both axes by default; the few that aren't (e.g. `Spacer` is height-only by definition) opt out via the registry meta.

### 4.3 Snap and minimums

- **Pixel widths** snap to 8-px multiples (matches the existing height-snap rule). Minimum 8 px (or 0 for `Spacer`).
- **Percent widths** snap to 5% increments by default. Holding **Shift** disables the snap. `Column` keeps its 1/12 grid snap on top of the % snap.
- Pixel **heights** retain today's behaviour: 8-px snap, 8-px floor, 0-px floor for `Spacer`.

### 4.4 Action layer changes

In [actions.ts](../../../apps/web/lib/editor-state/actions.ts):

- `applySetComponentDimension(id, "width" | "height", value)` already exists and works for both axes uniformly — no change to its signature, only callers expand.
- `applySetComponentSpan(id, span)` stays as-is for Column-grid mode.
- New helpers:
  - `applyResizeWithCascade(id, axis, value)` — sets a dimension AND recursively clamps any descendants that no longer fit (used by §6).
  - `getMaxAllowedDimension(id, axis)` — pure read function used by the live drag math; returns the cap for clamping.

---

## 5. Side-by-Side Layout via Auto-Inserted FlowGroup

### 5.1 The wrapper

Add one new component type to the registry: `FlowGroup`. It is a **horizontal flex container**.

- The user **never sees** it in the layer tree, layer picker, breadcrumb, or AI-chat selection chip. It is an internal layout primitive — analogous to a React `<Fragment>`.
- Schema (`ComponentType` enum in [schema.ts](../../../apps/web/lib/site-config/schema.ts)) gains the value `"FlowGroup"`.
- Drop policy (`canAcceptChild` in [dropTargetPolicy.ts](../../../apps/web/components/editor/canvas/dnd/dropTargetPolicy.ts)) allows any non-page-root component inside a `FlowGroup`, and `FlowGroup` inside any container that accepts its children.

### 5.2 Engine-managed lifecycle

- When the user drops a draggable on the **right** or **left** edge overlay of an existing component, the engine wraps the existing component and the new one in a `FlowGroup` (preserving order based on the side that was dropped on).
- When a `FlowGroup` ends up with **only one child** (e.g. user deletes one side, or drags one out), the engine **dissolves** it — the surviving child is reparented to the `FlowGroup`'s parent at the `FlowGroup`'s index.
- A `FlowGroup` can sit anywhere in the tree — at the page root, inside another Section, inside a Row, etc.

### 5.3 Why a wrapper instead of a sibling-relative property

Storing direction on each child (e.g. `Section2.layoutDirection: "right-of-prev"`) was rejected because:

- Reordering siblings silently breaks adjacency.
- AI-edit operations would have to track sibling-relative state.
- The schema would constantly need to reconcile orphaned references.

The wrapper makes the structure local and self-describing — every node's layout is fully determined by its immediate parent.

### 5.4 Drop-zone geometry

Each component in edit mode is surrounded by **four thin drop affordances**:

- **Top** & **Bottom** → vertical sibling. (Existing behaviour.)
- **Left** & **Right** → horizontal sibling. (New — triggers the FlowGroup wrap-or-insert.)

When the parent is already a horizontal `FlowGroup`, the four sides invert their meaning naturally:

- **Top/Bottom** drop **outside** the FlowGroup (above/below the whole horizontal strip).
- **Left/Right** insert as new horizontal siblings **inside** the FlowGroup at the appropriate index.

This matches Wix and Notion behaviour.

### 5.5 New actions

In [actions.ts](../../../apps/web/lib/editor-state/actions.ts):

- `applyWrapInFlowGroup(targetId, newSibling, side: "left" | "right")` — wraps the existing node + new sibling in a FlowGroup at the target's current location.
- `applyDissolveFlowGroup(flowGroupId)` — invariant-restoring helper invoked automatically whenever a mutation leaves a FlowGroup with ≤ 1 child.

### 5.6 Renderer impact

`ComponentRenderer` recognises `FlowGroup` and renders a `<div style={{display:'flex', flexDirection:'row', width:'100%'}}>`. Selection helpers (`SelectionBreadcrumb`, AI-chat selection chip) skip past FlowGroups when walking ancestors so the user never sees one.

### 5.7 Backward compatibility

Existing configs have no FlowGroups → render identically to today. The first time the user drops on a right-edge overlay, the engine inserts one. Old AI-edit fixtures (Sprint 14) continue to apply because no existing `Operation` references `FlowGroup`.

---

## 6. Parent-Bound Resize

Two enforcement points: **during** a child resize, and **after** a parent resize.

### 6.1 During child resize — hard clamp + tooltip

- The drag math computes a candidate width from the cursor delta.
- We compute `maxAllowedWidth = parentContentBox - sumOfFixedSiblings - childOuterMargins`. For percentage-sized children, `maxAllowedPercent = 100 - sumOfSiblingPercents`.
- The handle visually stops at the parent's edge — the cursor can keep moving outside, but the candidate width caps at `maxAllowed`.
- When the user pushes against the cap continuously for **> 150 ms**, a small **tooltip** ("Bounded by parent") appears anchored to the handle. It fades out **800 ms** after the cursor stops pushing, or immediately on drag end. Same fade animation as the existing component-selection ring.

### 6.2 After parent resize — auto-shrink children

- When the user resizes a parent and the new dimension would clip any child, those children are **silently shrunk** to fit. No tooltip, no error — the user explicitly asked for the parent to be smaller.
- This applies to **both axes**: shrinking a parent's width clamps wider children's widths; shrinking its height clamps taller children's heights. `applyResizeWithCascade(id, axis, value)` takes the axis as a parameter.
- The shrink is **proportional** for percent-sized children (e.g. two 60% / 40% siblings stay at 60 / 40 inside the smaller parent).
- For pixel-sized children, each clipped child is set to the new max for that axis.
- Implemented as a **single batched store update**: parent dimension change + cascade child clamp = one `applyOperations` call so undo/redo works as a single step.

### 6.3 Drag-and-drop is untouched

Clamping logic only fires inside the resize-handle code paths in [ResizeHandles.tsx](../../../apps/web/components/editor/canvas/dnd/ResizeHandles.tsx). The DnD flow in [DndCanvasProvider.tsx](../../../apps/web/components/editor/canvas/dnd/DndCanvasProvider.tsx) and the `applyMoveComponent` / `applyAddComponentChild` actions are not modified — a child can still be *dragged* anywhere it can validly drop, regardless of size. If the dragged child is wider than its new parent, it is clamped on drop using the same cascade logic from §6.2.

---

## 7. Always-Visible Dotted Dropzones (and Drag-Snap Indicator)

This rebuilds two existing pieces — [BetweenDropZone.tsx](../../../apps/web/components/editor/canvas/dnd/BetweenDropZone.tsx) and [DropZoneIndicator.tsx](../../../apps/web/components/editor/canvas/dnd/DropZoneIndicator.tsx) — into a single visual system.

### 7.1 Visual spec

- **Style:** `1px dashed rgba(120,120,120,0.35)` border + `rgba(120,120,120,0.08)` fill. Dotted-grey, semi-transparent.
- **Idle state:** visible at all times in edit mode.
- **Drag-hover state** (cursor is over a dropzone with a draggable that can validly drop there): fill animates up to `rgba(59,130,246,0.18)` (subtle blue tint) and border to `rgba(59,130,246,0.6)` solid, over **120 ms**.
- **Drag-hover invalid** (drop is rejected by `canAcceptChild`): fill animates to `rgba(239,68,68,0.12)` (subtle red).
- **The existing 4-px solid blue accent line** from `DropZoneIndicator` is **removed** — the overlay's hover state replaces it.

### 7.2 Where overlays appear (only in valid drop areas — not the whole page)

1. **Between siblings** — existing between-zones, **doubled in size**: 16 px tall (was ~ 8 px) for vertical neighbours, 16 px wide for horizontal neighbours inside a `FlowGroup`.
2. **Side dropzones around each component** — 12 px wide vertical strips on the left/right edges and 12 px tall horizontal strips on the top/bottom (these are the "drop on right edge → side-by-side" affordances from §5). These wrap **every** component, leaves included — dropping a Heading on the right edge of an existing Heading wraps both in a `FlowGroup` exactly the same way it does for Sections.
3. **Empty container slots** — when a `Section` / `Row` / `Column` / `FlowGroup` has zero children, the entire interior gets the overlay with a centered "Drop a component here" hint label.
4. **Tail of the page root** — after the last top-level child, a generous (≥ 48 px tall) overlay so users see "more goes here."
5. **Open canvas around the page** — the empty space surrounding the 1280-px page frame in the canvas viewport gets the same overlay so users can tell "this isn't a section, it's just empty canvas."

### 7.3 Visibility rules

| Mode | Overlays |
|---|---|
| Edit | Always visible (independent of the Show Component Types toggle). |
| Preview | Hidden; between-zones collapse to 0; layout matches deployed exactly. |
| Public / deployed | Same as preview. |

### 7.4 Interaction

- Overlays are `pointer-events: none` for normal clicks (so they don't block component selection) — but they remain hit-testable during a drag via dnd-kit's collision detection (the existing `useDroppable` registration on each zone is preserved).
- Tab / keyboard navigation skips them.

### 7.5 Performance

This adds ~ 4 overlay divs per component plus container/canvas overlays. For a 50-component page that is ~ 200 extra DOM nodes — fine. They render via the same `EditModeWrapper` that already exists, so no new render passes.

---

## 8. "Show Component Types" Toggle

### 8.1 TopBar placement

Add a new icon button in the right-side cluster of [TopBar.tsx](../../../apps/web/components/editor/topbar/TopBar.tsx), positioned **immediately before** `<PreviewToggle />`:

```
[ SaveIndicator ] [ ShowComponentTypesToggle ] [ PreviewToggle ] [ DeployButton ]
```

- **Icon:** `LayoutGrid` from lucide-react.
- **Behaviour:** standard toggle button. Active state uses the same `text-orange-400` highlight as the brand mark for visual consistency.
- **Tooltip:** `"Show component types"` when off, `"Hide component types"` when on.
- **Keyboard shortcut:** none (avoids conflicts; can add later if requested).

### 8.2 State

Lives in [editor-state/store.ts](../../../apps/web/lib/editor-state/store.ts):

- New field `showComponentTypes: boolean`.
- Default `true` on store initialisation.
- **No persistence** — not written to localStorage, not in the Supabase site config. Each fresh editor load starts with it ON.
- New action `toggleShowComponentTypes()`.

### 8.3 Visual when ON (in edit mode only)

- Each rendered component gets a **1-px dashed grey outline** (CSS `outline:`, not `border:`, so it doesn't shift layout — important because borders push siblings around and would change the page geometry depending on toggle state).
- Outline colour: `rgba(120, 120, 120, 0.7)` — same grey family as the dropzone overlays for visual cohesion.
- A small **type label** is positioned at `top: 0; left: 50%; transform: translate(-50%, -100%)` — so it floats just above the component's top edge.
  - Background `bg-zinc-800/90`, white text, `text-[10px]`, `px-1.5 py-0.5`, `rounded-sm`, `pointer-events: none`.
- Label text is the component type from the registry: `"Section"`, `"Row"`, `"Column"`, `"PropertyCard"`, etc. **`FlowGroup` is never shown** (FlowGroups are invisible to the user per §5).
- Implementation: rendered inside `EditModeWrapper`, conditional on `useEditorStore(s => s.showComponentTypes) && mode === "edit"`.

### 8.4 Disabled in preview / deployed

Same gating as the dropzone overlays — `mode !== "edit"` short-circuits the render.

---

## 9. Schema and Action-Layer Changes Summary

### 9.1 Schema ([schema.ts](../../../apps/web/lib/site-config/schema.ts))

- `ComponentType` enum gains `"FlowGroup"`.
- No new fields on `ComponentNode`. Width is already covered by `style.width` and `Column.props.span`.

### 9.2 Editor store ([store.ts](../../../apps/web/lib/editor-state/store.ts))

- New field: `showComponentTypes: boolean` (default `true`, transient).
- New action: `toggleShowComponentTypes()`.

### 9.3 Component-tree mutators ([actions.ts](../../../apps/web/lib/editor-state/actions.ts))

- New: `applyWrapInFlowGroup(targetId, newSibling, side)`.
- New: `applyDissolveFlowGroup(flowGroupId)` (invariant-restoring; auto-invoked).
- New: `applyResizeWithCascade(id, axis, value)` — wraps `applySetComponentDimension` with descendant clamping.
- New read helper: `getMaxAllowedDimension(id, axis)` — used by live drag math.
- Unchanged: `applySetComponentDimension`, `applySetComponentSpan`, `applyAddComponentChild`, `applyMoveComponent`, `applyRemoveComponent` (the move/add helpers gain a post-step that calls `applyDissolveFlowGroup` if the operation leaves a stale FlowGroup behind).

### 9.4 Drop policy ([dropTargetPolicy.ts](../../../apps/web/components/editor/canvas/dnd/dropTargetPolicy.ts))

- `canAcceptChild` returns `true` for `FlowGroup` accepting any non-page-root component.
- All existing containers accept `FlowGroup` as a child.

---

## 10. Testing Strategy (per [CLAUDE.md](../../../CLAUDE.md) §15.5 & §15.7)

### 10.1 Unit (Vitest)

- **`actions.test.ts`** — new cases:
  - `applyResizeWithCascade` clamps single child past parent edge (% and px).
  - `applyResizeWithCascade` proportionally rescales two % siblings when parent shrinks.
  - `applyWrapInFlowGroup` produces correct tree at root, nested, and inside an existing FlowGroup.
  - `applyDissolveFlowGroup` removes a 1-child FlowGroup and reparents the survivor at the right index.
  - `applyMoveComponent` post-dissolves a FlowGroup whose count drops to 1.
- **`ResizeHandles.test.tsx`** — new cases:
  - Right-edge handle present on every resizable type (parameterised over the registry).
  - Hard-clamp keeps width at parent edge when cursor moves further.
  - Tooltip appears after 150 ms of pushing against the cap; disappears 800 ms after release.
  - Corner handle drives both axes in one batched update (one undo step).
- **`dropTargetPolicy.test.ts`** — `FlowGroup` accept rules.
- **New `FlowGroup.test.tsx`** — wrap on right-edge drop; dissolve on single-child drop-out.
- **New `dropzone-overlay.test.tsx`** — overlay visibility per mode; idle/hover/invalid colour states.
- **New `show-component-types.test.tsx`** — toggle default ON; outline + label render only in edit mode; FlowGroup never labelled.

### 10.2 Build / typecheck / lint

- `pnpm build` must pass with the new `FlowGroup` type added to all exhaustive switches over `ComponentType` (enforced by `noUncheckedIndexedAccess` and the existing exhaustiveness checker pattern).
- `pnpm biome check` must pass.

### 10.3 Manual smoke (added to the sprint's smoke script)

1. Drag a Heading onto the right edge of an existing Section → side-by-side layout appears.
2. Resize a Column past its Row's right edge → handle stops at edge, "Bounded by parent" tooltip appears after a moment.
3. Shrink a Row that contains two 60% / 40% Columns → both Columns shrink proportionally, no error.
4. Drag the same wide child OUT of its parent and into a wider container → drag succeeds (no clamp during DnD).
5. Toggle Show Component Types off, then on → outlines and labels appear/disappear; layout does not shift.
6. Switch to Preview → all overlays, outlines, labels disappear; sections collapse with no gaps; deployed-mode parity confirmed.
7. Delete one half of a side-by-side pair → FlowGroup auto-dissolves; surviving child reflows as a normal vertical section.

### 10.4 Playwright

The existing demo-flow E2E test must still pass unchanged. No new E2E required for this work; the feature is exercised end-to-end by the smoke script.

---

## 11. Open Questions (none blocking)

- Should `FlowGroup` ever be exposed in the layer tree as an advanced "show internal nodes" debug view? Out of scope for this change; can be added behind a flag later.
- Should the Show Component Types toggle ever show non-visible side-effects (data-bindings, animations) as small badges? Out of scope; this design is type-label only.

---

## 12. Sequencing

This is a single, atomic feature set — none of the five pieces is independently shippable without the others (e.g. side-by-side layout without a parent-bound clamp would let users drag a 600 px Column outside a 300 px Section). The implementation plan should split it into review-checkpointed phases, but the merge unit is the whole thing.

Suggested phase boundaries for the implementation plan (not binding here):

1. Schema + `FlowGroup` type + dissolve invariant.
2. X-axis resize handle on every component (no parent clamp yet).
3. Parent-bound clamp + tooltip + cascade on parent shrink.
4. Always-visible dotted dropzones (replaces blue accent line).
5. Side-edge dropzones + auto-wrap into FlowGroup.
6. Show Component Types toggle.

Each phase ships behind a working `pnpm build` + `pnpm test` per [CLAUDE.md](../../../CLAUDE.md) §15.7.
