# Deselect on Background Click — Design

**Date:** 2026-04-28
**Status:** Proposed
**Owner:** max

## Problem

In edit mode, clicking on a "background" surface should fully disengage the editor: clear the selected component, exit any rich-text editing scope (single or broadcast), and return the left sidebar to its primary mode. Today, the canvas-bg click only clears `selectedComponentId` — the rich-text toolbar (especially in broadcast mode) and the element-edit sidebar both stick around.

Additionally, the existing radial-gradient dot pattern on the editor's dotted canvas is barely visible (1px-radius dots at ~4% opacity); the dots should be roughly 3× larger so the surface reads as a deliberate dotted backdrop.

## Goals

- Clicking any of the four "background" surfaces in edit mode clears all currently engaged editor state in a single store transition.
- The fix covers broadcast text-editing, which today does not exit on background click.
- The dotted canvas's dots are visibly larger.

## Non-goals

- Changing the Esc-key behavior. Esc keeps its intentional two-stage unwind (close toolbar first, then deselect).
- Adding "click background" handling in preview mode. Preview has nothing to deselect.
- Visual redesign of the dotted canvas beyond the dot-size bump.
- Reworking the renderer's surface hierarchy or the Site Settings → Background controls.

## Background surfaces

The DOM hierarchy from outermost to innermost in edit mode:

```
<main>                           ← dotted canvas (Canvas.tsx)
  └─ <div white-card>            ← Canvas.tsx wrapper
      └─ <div pageStyle>         ← Renderer pageBackground (Site Settings)
          └─ <div data-canvas>   ← Renderer canvasBackground (Site Settings)
              └─ component tree
```

All four are "background" for the purposes of this feature: clicking directly on any of them — i.e., not on a descendant component — deselects.

## Approach

A single new editor-store action, `deselectAll()`, performs all five field updates in one transaction:

| Field | Cleared to |
| --- | --- |
| `selectedComponentId` | `null` |
| `hoveredComponentId` | `null` |
| `textEditingScope` | `null` |
| `leftSidebarMode` | `"primary"` |
| `elementEditTab` | `"content"` |

The trigger uses a `data-canvas-bg-surface` HTML attribute placed on the four background DOM nodes. The existing `<main onClick>` handler in `Canvas.tsx` checks `e.target` against the attribute and calls `deselectAll()` when the click landed directly on a marked surface. Renderer stays mode-agnostic — the marker is inert in preview because no listener exists there.

### Why one action, not two

Calling `selectComponent(null)` and `exitTextEditing()` separately produces two store updates and two re-renders. A single `deselectAll()` is one atomic transition and is the unit the test suite asserts against.

### Why a marker attribute, not `e.target === e.currentTarget`

The current code only matches the outermost `<main>` because that's the element with the listener. With the marker, the same delegated listener can recognize clicks on the white card, the page-background div, and the canvas-background div without each surface needing its own handler — and Renderer doesn't have to import editor state.

## File changes

### Modified

**`apps/web/lib/editor-state/types.ts`**
Add `deselectAll: () => void` to `EditorActions`.

**`apps/web/lib/editor-state/store.ts`**
Implement `deselectAll` as a single `set({...})` clearing the five fields above.

**`apps/web/components/editor/canvas/Canvas.tsx`**
- Subscribe to `deselectAll`.
- Replace the `e.target === e.currentTarget` branch in the `<main onClick>` with a `target.matches?.("[data-canvas-bg-surface]")` check that calls `deselectAll()`.
- Add `data-canvas-bg-surface` to the `<main>` and to the inner white-card `<div>`.
- Mirror the change in the existing `onKeyDown` (Space/Enter equivalent for a11y).
- Update the dotted-background CSS: change the radial-gradient from `circle_at_1px_1px,...,1px,...` to `circle_at_3px_3px,...,3px,...`. Grid spacing stays `16px_16px`.
- Keep the Esc handler in `useEffect` unchanged.

**`apps/web/components/renderer/Renderer.tsx`**
Add `data-canvas-bg-surface` to the `pageStyle` `<div>` and the `data-canvas` `<div>`.

### New files

None.

## Event flow

1. Click lands somewhere in the editor.
2. The delegated `<main onClick>` runs `handlePreviewLinkClick(...)`. If the click was an internal-slug or external `<a>`, return early — links never deselect.
3. Otherwise, if `e.target.matches("[data-canvas-bg-surface]")`, call `deselectAll()`.
4. Otherwise (click on a component, sidebar, etc.), do nothing — existing behavior.

## Edge cases

- **Mid-text-edit click** — the click blurs the contenteditable naturally; `deselectAll` clears `textEditingScope` → toolbar disappears. No explicit `blur()` call.
- **Right-click on bg** — fires `onContextMenu`, not `onClick`. Unchanged.
- **Dialogs** (AddPage, RenamePage) — portaled outside `<main>`. Clicks don't reach the handler.
- **Rich-text toolbar / popovers** — portaled. Clicks on the toolbar don't carry the marker and don't bubble through `<main>`.
- **DnD overlays inside the canvas** (`CanvasDropOverlay`, `EmptyContainerOverlay`, `BetweenDropZone`) — children of `<main>` / `data-canvas` but they do NOT carry the marker. Clicks on them don't trigger deselect.
- **Drag end** — dnd-kit doesn't synthesize a click after a real drag; existing canvas-bg deselect already coexists with dnd.
- **Preview mode** — the editor `<main>` doesn't render; markers in Renderer are inert.

## Testing

### Unit — store actions

`apps/web/lib/editor-state/__tests__/actions.test.ts` (or matching convention):

- `deselectAll` from a "fully engaged" state (selected + broadcast scope + element-edit mode + element-edit tab `"style"`) clears all five fields in one transition.
- `deselectAll` from a clean state leaves the shape unchanged.

### Component — canvas

`apps/web/components/editor/canvas/__tests__/canvas.test.tsx`:

- Click directly on `<main>` (dotted bg) → `deselectAll` invoked.
- Click on the inner white-card wrapper → invoked.
- Click on Renderer's `pageStyle` div → invoked.
- Click on Renderer's `data-canvas` div → invoked.
- Click on a component → NOT invoked.
- Click on an internal-slug `<a>` → NOT invoked (link interception wins).
- **Broadcast regression**: `textEditingScope.mode === "broadcast"`, click bg → `textEditingScope` becomes `null` and `selectedComponentId` becomes `null`.

### Manual smoke (sprint completion)

1. Dots on the dotted canvas are visibly larger than before (~3× radius).
2. Select a component → click dotted bg → component deselected, edit panel closed.
3. Right-click a text component to enter single-mode → click bg → toolbar closes.
4. Double-right-click a section to enter broadcast → click bg → toolbar closes, `textEditingScope` cleared.
5. Click on the page-background area of the rendered page (between page edges and the canvas surface) → deselects.
6. Click on a section gap on the canvas surface → deselects.
7. Click on a NavBar internal-page link → page swaps, no deselect blow-back.

## Open questions

None.

## Out of scope / future work

- A consolidated "click outside any chrome to deselect" model that covers sidebar empty space, top-bar empty space, etc. Today's design intentionally restricts to the four canvas-side surfaces the user named.
