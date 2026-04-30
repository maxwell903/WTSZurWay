# Section Free Placement — Design

**Status:** Draft
**Date:** 2026-04-30
**Owner:** Max
**Supersedes:** the Approach-B implementation of `Section.props.fitToContents` shipped earlier today. The prop is **renamed** to `freePlacement` and its semantics are extended from "suppress auto-flex" to "render direct children in absolute layout (snapshot on toggle-on)."

---

## Problem

Today the page-root Section auto-switches to `display: flex; flex-wrap: wrap` the moment any direct child has an explicit `style.width`. That made resizing one child reflow its siblings. We shipped a `freePlacement` toggle that suppressed the auto-flex — but with the toggle on, children that relied on the flex layout for side-by-side placement collapsed into a single column, and AI inserts still nudged the visual stack around because the renderer was still using normal block flow.

The actual user need is **free placement of direct children**: each child has an absolute (x, y) inside the Section, resizing or moving one child cannot affect any sibling, and AI inserts append below the current stack without touching what's already there.

## Goal

When `Section.props.freePlacement === true`, the Section's *direct* children render in absolute layout. Toggling the prop on captures the children's current visual rects and writes them to the schema, so the visual layout is preserved at the moment of toggle. Toggling off leaves the captured coordinates in place; the renderer simply ignores them and falls back to today's flow/auto-flex behavior.

Out of scope:
- Site-wide free placement (this is per-Section, opt-in).
- Recursion: children of children are not affected.
- Responsive variants (mobile vs desktop coordinates) — single set of coords for now.
- Rotation, z-index controls (z-order = sibling order in `children[]`, same as today).

---

## Schema changes

`apps/web/lib/site-config/schema.ts`:

```ts
export const componentPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type ComponentPosition = z.infer<typeof componentPositionSchema>;

export type ComponentNode = {
  id: string;
  type: ComponentType;
  props: Record<string, unknown>;
  style: StyleConfig;
  position?: ComponentPosition;   // <-- new, optional
  animation?: AnimationConfig;
  visibility?: "always" | "desktop" | "mobile";
  children?: ComponentNode[];
  dataBinding?: DataBinding;
};
```

`position` lives on `ComponentNode` (not inside `style`) because it's parent-relative coordinate data, not a CSS style. It's `undefined` for every existing node and only meaningful when the node's *parent* is a Section with `freePlacement === true`. The renderer ignores it otherwise.

Width and height in absolute mode reuse the existing `style.width` / `style.height` fields — these are already px-or-CSS-string values populated by `ResizeHandles`, and they already render correctly.

Schema migration: none. `position` is optional; existing configs parse unchanged. The seed data in `apps/web/lib/seed/` is untouched.

**Prop rename — `fitToContents` → `freePlacement`.** The Approach-B prop shipped earlier today is renamed. The Section's runtime `sectionPropsSchema` reads only `freePlacement`. To avoid losing the user's in-flight working draft (where they may have flipped the old toggle), the Section render and EditPanel both read `props.freePlacement ?? props.fitToContents` for one transitional read; on the next write through `setComponentProps`, the panel writes the new name and drops the old one. After the user has interacted with the toggle once post-rename, the legacy name is gone from their config. No global codemod or DB migration is required because the field is per-component and only opt-in.

The earlier `Section.test.tsx` cases describing the Approach-B "suppress auto-flex" behavior are deleted in this work — those semantics are subsumed by the new render path. The rest of the existing Section test cases (HTML tag selection, default block layout, auto-flex when no toggle is set) remain valid.

---

## Render-side: `apps/web/components/site-components/Section/index.tsx`

When `parsed.data.freePlacement === true`:

1. Section element gets `position: relative` (so absolute children are positioned relative to it).
2. Each direct child is wrapped in a positioning div:
   ```tsx
   <div style={{
     position: "absolute",
     left: `${child.position?.x ?? 0}px`,
     top: `${child.position?.y ?? 0}px`,
     width: child.style.width ?? "auto",
     height: child.style.height ?? "auto",
   }}>{renderedChild}</div>
   ```
3. Section auto-height = `max(y + parsedHeight)` across children with `position` set. If `cssStyle.height` is defined, leave it alone (user override wins, children may overflow). If `cssStyle.height` is undefined, set `min-height: <computed>px`. Width is unchanged from today.
4. The existing auto-flex-row-wrap branch (current `if (hasExplicitWidthChild)` block) stays gated behind `!freePlacement` exactly as it is now.

Children without `position` set (children that existed before the toggle was first turned on, or children inserted into the schema by some path that didn't set defaults) are still rendered absolutely with default `(0, 0)` — but the snapshot path described below ensures every child has `position` set the moment the toggle goes on.

Edit-mode wrapper interaction: `EditModeWrapper` already passes through `width`/`height`/`margin` via `computeWrapperPassthroughStyle` ([renderer/ComponentRenderer.tsx:31](apps/web/components/renderer/ComponentRenderer.tsx#L31)). For free-placement children we want the OUTER positioning div to receive `position: absolute; left; top` — but the wrapper sits between Section and its child. The cleanest fix: Section itself emits the absolute-positioning div as the child wrapper instead of relying on `EditModeWrapper`. The `EditModeWrapper` then renders inside it normally. Width/height continue to flow through `EditModeWrapper` as today.

---

## Snapshot: capturing rects when the toggle goes ON

A new store action `snapshotChildPositions(sectionId: string)` lives in `apps/web/lib/editor-state/store.ts`. The Section EditPanel calls it inside the `onChange` handler whenever the user flips `freePlacement` from `false` to `true` *and* at least one direct child does not yet have `position` set:

```ts
onChange={(next) => {
  setComponentProps(node.id, { ...node.props, freePlacement: next });
  if (next === true && needsSnapshot(node)) {
    // RAF so the DOM has rendered with the new prop before we read rects.
    requestAnimationFrame(() => snapshotChildPositions(node.id));
  }
}}
```

`snapshotChildPositions(sectionId)`:

1. Reads `getBoundingClientRect()` for the Section (`[data-edit-id="${sectionId}"]`) and for each direct child (`[data-edit-id="${childId}"]` — these data attrs already exist on `EditModeWrapper`).
2. For each child, computes `x = childRect.left - sectionRect.left + section.scrollLeft`, `y = childRect.top - sectionRect.top + section.scrollTop`. Rounds to integer pixels.
3. Writes back via a single store mutation that, for each child, sets `child.position = { x, y }` and — only if `child.style.width` or `child.style.height` is unset — sets them to `${childRect.width}px` / `${childRect.height}px` (so the snapshot fully pins the box).
4. Pushed as one undo entry so toggle is reversible.

Children that already have `position` set are skipped. Children that fail to resolve to a DOM element (rare; lazy renders) are also skipped silently.

The snapshot only fires on `false → true` transitions when at least one child lacks `position`. Subsequent on/off cycles are pure render-mode flips: the captured coords stick (per Q5 decision (a)).

A small "Recapture positions from current layout" button lives in the Section EditPanel below the toggle. Pressing it forces a fresh snapshot regardless of existing `position` data — useful when the user turns the toggle off, lets the layout reflow, then wants to re-pin from the new visual state.

---

## Move interaction: dragging a child body

Q1 decision: drag-to-reposition + numeric inputs.

**Drag.** When a free-placement Section's child is grabbed for drag:

- The dnd-kit sortable behavior used today for "many"-policy parents is **bypassed** for children whose parent has `freePlacement === true`. Reordering still works — but only via the keyboard / Pages-tab tree — because spatial order is now decoupled from `children[]` order.
- A new lightweight pointer-drag handler is attached to each free-placement child's `EditModeWrapper`. It listens on `pointerdown` (after click selection has resolved), captures the starting cursor + starting `position`, and updates `position` via `setComponentPosition(id, { x, y })` on `pointermove`.
  - Throttled to `requestAnimationFrame` (mirrors `ResizeHandles`).
  - Default 8px snap; hold Shift for 1px resolution (mirrors `ResizeHandles`).
  - Esc cancels and reverts to the start position (mirrors `ResizeHandles`).
- Existing palette → canvas drag from outside (`PaletteDraggable` / `CanvasDropOverlay`) keeps using dnd-kit, but the drop into a free-placement Section computes a default `(x, y)` per the AI-insert rule below instead of inserting at an index.

**Numeric inputs.** When the *parent* of the selected component has `freePlacement === true`, the StyleTab gains an "X" / "Y" `NumberInput` row above the existing Width/Height inputs. They write to `node.position`. They're hidden when the parent is in flow mode (no need to clutter the panel with a coordinate that's not used).

**Resize handles.** The existing `ResizeHandles` still work in absolute mode. The right and bottom edges and the corner already write `style.width` / `style.height` — those keep working unchanged because absolute-positioned children still respect `width`/`height`. The left and top edges currently anchor by writing a compensating `margin` ([ResizeHandles.tsx:567-770](apps/web/components/editor/canvas/dnd/ResizeHandles.tsx#L567-L770)). When the parent is free-placement, those handles instead update `position.x` / `position.y` by the negative width/height delta (so the right/bottom edges visually stay put while x or y changes). That's a small conditional inside `LeftEdgeHandle` / `TopEdgeHandle`.

---

## AI insert defaults

`addComponent` in [apps/web/lib/site-config/ops.ts](apps/web/lib/site-config/ops.ts) — and any palette-drop path that ends up calling it — needs to know about free-placement.

When `addComponent({ parentId, child, index })` runs and the resolved parent has `props.freePlacement === true`:

1. Compute `defaultY = max(0, ...siblings.map(s => (s.position?.y ?? 0) + (parsePxOrZero(s.style.height) ?? 0))) + 16` (16px gap, rounded).
2. Compute `defaultX = 0`.
3. If `child.position` is undefined, set it to `{ x: defaultX, y: defaultY }`. If the caller already supplied a `position`, respect it (e.g., a future drag-from-palette-with-coords flow).
4. The `index` parameter still controls where the new node goes in `children[]` (z-order), but it does not affect visual position.

The AI itself doesn't need to be aware of free-placement — the op patches in defaults. The AI editor's `addComponent` op-shape stays the same.

---

## EditPanel UI changes

`apps/web/components/site-components/Section/EditPanel.tsx`:

- Existing toggle stays. Tooltip wording updated:
  > "When on, children stay in fixed positions. Resizing or adding a child won't move the others."
- Below the toggle, when `freePlacement === true`, render a small secondary action:
  > **Recapture positions from current layout** — runs `snapshotChildPositions` regardless of existing `position` data.
- The toggle's `onChange` is the place that fires the *first* snapshot (when at least one child has no `position`).

`apps/web/components/editor/edit-panels/tabs/StyleTab.tsx`:

- When the selected node's parent has `freePlacement === true`, render a new "Position" row with X / Y `NumberInput`s above the existing "Width / Height" row. Wires through a new store action `setComponentPosition(id, { x, y })`.

---

## Store changes

`apps/web/lib/editor-state/store.ts`:

```ts
type EditorActions = {
  // ...existing actions
  setComponentPosition: (id: string, position: ComponentPosition) => void;
  snapshotChildPositions: (sectionId: string) => void;
};
```

`setComponentPosition` is a plain immer-style update that finds the node by id and sets `node.position = { ...position }` (or omits the key if both x and y are 0 and the parent is in flow mode — minor: keep the key for simplicity).

`snapshotChildPositions` is the only action with DOM-read coupling. It calls `document.querySelector` to read rects, then performs one batched mutation across all direct children of the target Section. Implementation note: it must be a no-op when SSR / non-browser (guard with `typeof document === "undefined"`).

Both actions feed the existing undo stack so the snapshot is reversible as a single user step.

---

## Testing

Unit tests:
- **Section render.** New describe block "free-placement absolute layout":
  - Children with `position` render at the expected absolute coords.
  - `cssStyle.height` undefined → section gets `min-height: max(y + h)` of children.
  - `cssStyle.height` defined → section keeps user's height; no min-height applied.
  - Auto-flex-row-wrap branch is suppressed when freePlacement=true (the test we already wrote stays valid).
- **Snapshot action.** Mock `getBoundingClientRect` on a fake DOM:
  - Toggle on → each child gets `position` plus `style.width` / `style.height` if missing.
  - Toggle on when all children already have `position` → no-op.
  - "Recapture" button → forces re-snapshot regardless.
- **Position store action.** `setComponentPosition` sets the field; undo reverts.
- **Op layer.** `addComponent` into a free-placement parent fills in default `(x, y)` when caller doesn't supply one; `(x, 0)` when the parent has no children yet.
- **StyleTab.** When parent is free-placement, X/Y NumberInputs render and write through `setComponentPosition`. When not, they don't render.
- **ResizeHandles.** Left edge in free-placement mode writes `position.x` instead of `margin.left`; top edge writes `position.y` instead of `margin.top`.

Targeted Playwright path (sprint-level, optional now): toggle on a page-root Section, verify three direct children's screen positions are unchanged ±1px after the toggle.

---

## Phasing

This is bigger than one commit. Suggested order (each step independently shippable):

1. **Phase 1 — schema + render + snapshot.** Add `position` to schema; Section absolute-mode rendering; snapshot store action; toggle wiring; numeric X/Y in StyleTab. AI inserts still go to (0, 0) — known limitation called out in the EditPanel.
2. **Phase 2 — AI insert defaults.** Update `addComponent` to compute default y. Tests.
3. **Phase 3 — drag-to-reposition.** Pointer-drag handler on free-placement children, dnd-kit bypass logic. Tests.
4. **Phase 4 — resize-handle rewire.** Left/top edges write position instead of margin when parent is free-placement. Tests.

Phase 1 is the largest single chunk and is what unblocks "I can toggle the toggle without my page exploding" — that's the immediate user pain. Phases 2-4 are quality-of-life and can land separately.

---

## Risks

- **DOM-coupling in the store.** `snapshotChildPositions` reads `getBoundingClientRect`, which means the store action only works in the browser. SSR-time mutation paths can't trigger it; guarded by a `typeof document === "undefined"` early return. The toggle is editor-only, so this is fine in practice — flagging because most existing store actions are pure.
- **Children that haven't rendered yet.** If a child is conditionally hidden (visibility, etc.) at the moment of snapshot, it won't have a rect and gets skipped. Subsequent toggle-on may snapshot it later. Acceptable.
- **Width/height capture during snapshot.** Children with `width: 50%` get captured as the rendered px width. If the section width later changes, the snapshotted px value won't track. The user can hit "Recapture positions" to refresh. Acceptable.
- **dnd-kit bypass.** Disabling sortable behavior for free-placement children means the existing palette-drop-between-children visual indicators (`BetweenDropZone`) become misleading. They should be hidden inside free-placement Sections; the empty-container drop overlay (`EmptyContainerOverlay`) keeps showing on truly-empty sections. Caught by the dnd-kit bypass logic in Phase 3.
- **Tests touching ResizeHandles.** That file is dense ([ResizeHandles.tsx](apps/web/components/editor/canvas/dnd/ResizeHandles.tsx)) and its tests are correspondingly tricky. Phase 4's modifications need to thread the parent-freePlacement state through; expect this phase to take longer per LOC than the others.
