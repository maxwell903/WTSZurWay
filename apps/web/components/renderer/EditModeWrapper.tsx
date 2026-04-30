"use client";

import { DropZoneIndicator } from "@/components/editor/canvas/dnd/DropZoneIndicator";
import { useNodeSortable } from "@/components/editor/canvas/dnd/SortableNodeContext";
import { SideDropZones } from "@/components/editor/canvas/dnd/sideDropZones";
import { componentRegistry } from "@/components/site-components/registry";
import { findComponentById, selectCurrentPage, useEditorStore } from "@/lib/editor-state";
import type { ComponentType } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { CSS } from "@dnd-kit/utilities";
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from "react";

// Drag-to-reposition activation: only start a real drag once the cursor
// moves more than this many CSS px from the pointer-down point. Below the
// threshold we let normal click-through happen (so a quick click still
// selects the component without nudging it).
const FREE_PLACEMENT_DRAG_THRESHOLD_PX = 5;
// Snap step for free-placement drags. Hold Shift to escape the snap and
// move at 1-px resolution. Mirrors ResizeHandles' PX_SNAP.
const FREE_PLACEMENT_SNAP_PX = 8;

function snapToStep(px: number, step: number, snap: boolean): number {
  return snap ? Math.round(px / step) * step : Math.round(px);
}

function readNodePosition(nodeId: string): { x: number; y: number } {
  const page = selectCurrentPage(useEditorStore.getState());
  if (!page) return { x: 0, y: 0 };
  const node = findComponentById(page.rootComponent, nodeId);
  return { x: node?.position?.x ?? 0, y: node?.position?.y ?? 0 };
}

// Tag names + selectors that should NOT initiate a free-placement drag —
// the user is interacting with something inside the component (a resize
// handle, a button, a link, a text field, contenteditable). Without this
// guard a click on a NavBar link or a contenteditable heading would start
// dragging the whole component.
const FREE_PLACEMENT_DRAG_IGNORE_SELECTOR =
  "[data-resize-axis],[contenteditable=true],[contenteditable=plaintext-only],a,button,input,textarea,select";

// Rich-text Phase 1 — browsers don't fire `dblcontextmenu`. Track the last
// right-click per node and treat a second right-click on the same id within
// this many ms as a "double". 400ms matches the standard double-click
// threshold in Chromium UI tests.
const DOUBLE_RIGHT_CLICK_MS = 400;

export type ContextMenuMeta = { isDouble: boolean };

type Props = {
  id: string;
  type: ComponentType;
  mode: "edit" | "preview" | "public";
  selected?: boolean;
  onSelect?: (id: string) => void;
  onContextMenu?: (id: string, meta: ContextMenuMeta) => void;
  // Layout-affecting style values that need to be on the OUTER (wrapper)
  // element so the parent's flex / grid container sees them — NOT on the
  // inner rendered component. Computed by `ComponentRenderer` per node:
  // see `computeWrapperPassthroughStyle` for the rules. Without this, a
  // Column's `flex: <span>` lands on the inner div but the wrapper sits
  // between it and the parent Row, breaking the flex chain.
  passthroughStyle?: CSSProperties;
  // True when this node's direct parent is a Section in free-placement
  // mode. Switches the wrapper to use a custom pointer-drag handler that
  // updates `position.{x,y}` instead of dnd-kit's sortable reorder.
  parentIsFreePlacement?: boolean;
  children: ReactNode;
};

export function EditModeWrapper({
  id,
  type,
  mode,
  selected,
  onSelect,
  onContextMenu,
  passthroughStyle,
  parentIsFreePlacement = false,
  children,
}: Props) {
  const setComponentPosition = useEditorStore((s) => s.setComponentPosition);
  // Sprint 7: when wrapped in a DndCanvasProvider, this returns dnd-kit's
  // sortable state for this node id. Otherwise (preview mode, standalone
  // tests, public site) it returns null and the wrapper behaves exactly
  // as it did in Sprints 6 and 8.
  const sortable = useNodeSortable(id);
  const showComponentTypes = useEditorStore((s) => s.showComponentTypes);
  // Rich-text Phase 3 — broadcast mode. When this node's id is in
  // `textEditingScope.ids` it gets a dashed orange ring so the user can
  // see the full broadcast set at a glance. We only subscribe to the
  // scope.ids check (not the whole scope) so single-mode toggles don't
  // re-render every wrapper on the page.
  const inBroadcastScope = useEditorStore((s) => {
    const scope = s.textEditingScope;
    if (!scope || scope.mode !== "broadcast") return false;
    return scope.ids.includes(id);
  });

  // Hover is tracked in React state (not relied on via Tailwind ":hover")
  // because the type-pill below is a sibling DOM node, not a CSS pseudo-element,
  // and JSDOM does not evaluate ":hover" — tests can only assert hover behaviour
  // via React state.
  const [hovered, setHovered] = useState(false);

  // Pill visibility (progressive disclosure — see DECISIONS.md 2026-04-27 evening):
  // shown in edit mode when the component is selected, hovered, OR X-ray is on.
  // FlowGroup never shows a pill (engine-internal, invisible to users).
  const showPill =
    mode === "edit" && type !== "FlowGroup" && (Boolean(selected) || hovered || showComponentTypes);
  // X-ray dashed outline: only when X-ray ON, not selected, not hovered (the
  // hover/selection blue rings take priority).
  const showXrayOutline =
    mode === "edit" && showComponentTypes && type !== "FlowGroup" && !selected && !hovered;
  // Broadcast outline: dashed orange ring on every node in the broadcast
  // scope. Stacks below the solid blue selection ring (selected wins on
  // the actual right-clicked root) but sits above hover and X-ray.
  const showBroadcastOutline = mode === "edit" && inBroadcastScope && !selected;

  // Free-placement drag-to-reposition. Only relevant when the parent is a
  // free-placement Section. When a real drag occurs we set this flag so the
  // subsequent click event (fired by the browser on pointerup) is suppressed
  // and doesn't get interpreted as a "select" — the drag itself was the
  // user's intent, not a click.
  const dragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startPosX: number;
    startPosY: number;
    isDragging: boolean;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const dragJustEndedRef = useRef(false);

  const handleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    // Anchor clicks must bubble up to the canvas-level link interceptor
    // so it can preventDefault + swap the page. If we stopPropagation here,
    // the browser still executes the <a>'s default navigation (404 on
    // root-relative slugs that don't exist as top-level routes).
    if (e.target instanceof Element && e.target.closest("a")) return;
    // Suppress the click that immediately follows a drag — without this the
    // user clicks-and-drags to move a component and then the trailing click
    // event re-selects it (cosmetic, but also re-triggers any selection
    // side effects like opening the edit panel).
    if (dragJustEndedRef.current) {
      dragJustEndedRef.current = false;
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    onSelect?.(id);
  };

  const handleFreePlacementPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!parentIsFreePlacement) return;
    if (mode !== "edit") return;
    if (e.button !== 0) return;
    if (e.target instanceof Element && e.target.closest(FREE_PLACEMENT_DRAG_IGNORE_SELECTOR))
      return;
    e.stopPropagation();

    const start = readNodePosition(id);
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPosX: start.x,
      startPosY: start.y,
      isDragging: false,
    };

    function applyMove(clientX: number, clientY: number, shiftHeld: boolean): void {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = clientX - drag.startClientX;
      const dy = clientY - drag.startClientY;
      const moved = Math.hypot(dx, dy);
      if (!drag.isDragging) {
        if (moved < FREE_PLACEMENT_DRAG_THRESHOLD_PX) return;
        drag.isDragging = true;
      }
      const newX = snapToStep(drag.startPosX + dx, FREE_PLACEMENT_SNAP_PX, !shiftHeld);
      const newY = snapToStep(drag.startPosY + dy, FREE_PLACEMENT_SNAP_PX, !shiftHeld);
      setComponentPosition(id, { x: newX, y: newY });
    }

    function onMove(ev: PointerEvent | MouseEvent): void {
      if (!dragRef.current) return;
      const shift = "shiftKey" in ev ? ev.shiftKey : false;
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          applyMove(ev.clientX, ev.clientY, shift);
        });
      }
    }

    function onUp(ev: PointerEvent | MouseEvent): void {
      const drag = dragRef.current;
      if (!drag) return;
      const shift = "shiftKey" in ev ? ev.shiftKey : false;
      // Final write at exact cursor position (no rAF throttle on release).
      applyMove(ev.clientX, ev.clientY, shift);
      if (drag.isDragging) {
        dragJustEndedRef.current = true;
      }
      cleanup();
    }

    function onKey(ev: KeyboardEvent): void {
      if (ev.key !== "Escape") return;
      const drag = dragRef.current;
      if (!drag) return;
      // Revert to start position. Only fire a write if we'd actually moved.
      if (drag.isDragging) {
        setComponentPosition(id, { x: drag.startPosX, y: drag.startPosY });
      }
      cleanup();
    }

    function cleanup(): void {
      window.removeEventListener("pointermove", onMove as EventListener);
      window.removeEventListener("pointerup", onUp as EventListener);
      window.removeEventListener("keydown", onKey);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      dragRef.current = null;
    }

    window.addEventListener("pointermove", onMove as EventListener);
    window.addEventListener("pointerup", onUp as EventListener);
    window.addEventListener("keydown", onKey);
  };

  const lastRightClickRef = useRef<{ id: string; t: number } | null>(null);

  const handleContextMenu = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const now = performance.now();
    const last = lastRightClickRef.current;
    const isDouble = last !== null && last.id === id && now - last.t < DOUBLE_RIGHT_CLICK_MS;
    lastRightClickRef.current = { id, t: now };
    onContextMenu?.(id, { isDouble });
  };

  // Keyboard parity for the click handler so the selection model is reachable
  // without a mouse. Enter selects; Shift+F10 / ContextMenu key opens the
  // context menu (matches OS conventions). Keyboard always emits a single
  // (non-double) context menu event — repeating Shift+F10 should not be
  // interpreted as a broadcast intent.
  //
  // CRITICAL: only handle Enter/Space when the wrapper itself has focus.
  // Without this guard, typing a space inside a TipTap contenteditable
  // child bubbles up here, gets preventDefault'd, and the user can't type
  // spaces. Same pattern Canvas.tsx uses for its global Esc handler.
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(id);
      return;
    }
    if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.(id, { isDouble: false });
    }
  };

  // CSS.Transform.toString returns a string when transform is set, or null.
  // The wrapper's caller never passes its own transform, so this is the only
  // contributor.
  const transformString = sortable ? CSS.Transform.toString(sortable.transform) : null;
  const sortableStyle: CSSProperties = sortable
    ? {
        transform: transformString ?? undefined,
        transition: sortable.transition ?? undefined,
        opacity: sortable.isDragging ? 0.5 : undefined,
      }
    : {};

  // Merge passthrough layout styles UNDER sortableStyle so that an in-flight
  // drag transform always wins. The pass-through values are layout-shaping
  // (flex / width / height) and don't conflict with transform/opacity.
  // For free-placement children, add a `grab` cursor so the wrapper signals
  // that the body is draggable.
  const wrapperStyle: CSSProperties = {
    ...passthroughStyle,
    ...sortableStyle,
    ...(parentIsFreePlacement && mode === "edit" ? { cursor: "grab" } : {}),
  };

  // Sprint 7 "Known risks": dnd-kit's listeners spread BEFORE the explicit
  // onClick / onContextMenu / onKeyDown so the Sprint-6/8 handlers win the
  // dispatch race. The pointer sensor's 10-px activation distance keeps
  // single clicks from being interpreted as drags.
  // Hover handlers — only meaningful in edit mode; preview/public renders
  // never run this branch because EditModeWrapper isn't mounted there.
  const handlePointerEnter = (_e: ReactPointerEvent<HTMLDivElement>) => {
    if (mode !== "edit") return;
    setHovered(true);
  };
  const handlePointerLeave = (_e: ReactPointerEvent<HTMLDivElement>) => {
    if (mode !== "edit") return;
    setHovered(false);
  };

  // For free-placement children, suppress dnd-kit's sortable listeners —
  // reorder-by-drop semantics are meaningless in absolute layout (z-order
  // is sibling order in `children[]` and is decoupled from spatial
  // position). Our own `handleFreePlacementPointerDown` handles drag-to-
  // reposition instead.
  const sortableListeners = parentIsFreePlacement ? undefined : sortable?.listeners;
  const sortableAttributes = parentIsFreePlacement ? undefined : sortable?.attributes;
  const sortableRef = parentIsFreePlacement ? undefined : sortable?.setNodeRef;

  return (
    <div
      ref={sortableRef ?? undefined}
      {...(sortableAttributes ?? {})}
      {...(sortableListeners ?? {})}
      data-edit-id={id}
      data-edit-selected={selected ? "true" : undefined}
      data-edit-hovered={hovered ? "true" : undefined}
      data-broadcast-target={showBroadcastOutline ? "true" : undefined}
      // biome-ignore lint/a11y/useSemanticElements: a real <button> cannot legally contain block-level children (sections, paragraphs, etc.) — EditModeWrapper makes those interactive in edit mode only.
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={parentIsFreePlacement ? handleFreePlacementPointerDown : undefined}
      style={wrapperStyle}
      className={cn(
        "relative outline-offset-2 transition-[outline-color] duration-100",
        // Visual priority: selection > broadcast > hover > x-ray > none.
        // Hover ring is driven by React state (not Tailwind ":hover") so JSDOM
        // tests can assert it; see comment on `hovered` above.
        selected && "outline outline-2 outline-blue-500",
        showBroadcastOutline && "outline outline-2 outline-dashed outline-orange-400",
        !selected && !showBroadcastOutline && hovered && "outline outline-1 outline-blue-300",
        showXrayOutline && "outline outline-1 outline-dashed outline-zinc-400/70",
      )}
    >
      {showPill ? (
        <span
          data-testid={`type-label-${id}`}
          className="pointer-events-none absolute -top-4 left-1/2 z-40 -translate-x-1/2 rounded-sm bg-zinc-800/90 px-1.5 py-0.5 text-[10px] text-white"
        >
          {componentRegistry[type].meta.displayName}
        </span>
      ) : null}
      {/* Sprint 7: 4-px accent bar drawn while a drag is in progress and this
          wrapper's id is the current drop target. Self-renders to null when
          no DndCanvasProvider is in scope, so existing Sprint 5/6/8 callers
          (preview mode, standalone tests, public site) emit identical DOM. */}
      <DropZoneIndicator id={id} />
      {sortable !== null && <SideDropZones targetId={id} />}
      {children}
    </div>
  );
}
