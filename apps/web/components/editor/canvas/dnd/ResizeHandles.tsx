"use client";

// Sprint 7 ResizeHandles — overlays a right-edge and/or bottom-edge handle on
// the selected component based on the registry-driven isResizableOnAxis rule.
//
// Coordinate model: each handle reads `getBoundingClientRect()` for its
// target element (and for Column, its parent Row) and positions itself in
// viewport coordinates via `position: fixed`. This is unaffected by
// transforms applied to ancestors of `document.body` (none currently apply
// any, but the canvas may grow them in a later sprint per CLAUDE.md
// "Known risks").
//
// Snap rules (per CLAUDE.md "Definition of Done"):
//   - Column right-edge: span snaps to integer 1..12 nearest the pointer
//     release column inside the parent Row's bounding rect.
//   - Bottom-edge height: snaps to the nearest 8-px multiple, floor 8 px.
//     Spacer floor is 0 px and writes through `setComponentProps`
//     (numeric) instead of `setComponentDimension` (CSS string).
//   - Esc during a resize cancels and reverts (no store mutation).

import {
  findComponentById,
  findComponentParentId,
  getMaxAllowedDimension,
  selectCurrentPage,
  selectSelectedComponentNode,
  useEditorStore,
} from "@/lib/editor-state";
import type { ComponentNode, ComponentType } from "@/lib/site-config";
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";

type ResizeMatrixEntry = {
  // Whether the right-edge handle renders (Column.span only).
  right: boolean;
  // Whether the bottom-edge handle renders (height).
  bottom: boolean;
};

// Every registered component is resizable on both axes by default.
// Components that must opt out can do so via this set; today, none do.
const NON_RESIZABLE_TYPES: ReadonlySet<ComponentType> = new Set();

export function isResizableOnAxis(type: ComponentType, _axis: "width" | "height"): boolean {
  if (NON_RESIZABLE_TYPES.has(type)) return false;
  return true;
}

const HEIGHT_SNAP = 8;
const HEIGHT_MIN_DEFAULT = 8;
const HEIGHT_MIN_SPACER = 0;
const SPAN_MIN = 1;
const SPAN_MAX = 12;

type Span = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

function snapHeight(px: number, isSpacer: boolean): number {
  const min = isSpacer ? HEIGHT_MIN_SPACER : HEIGHT_MIN_DEFAULT;
  const snapped = Math.round(px / HEIGHT_SNAP) * HEIGHT_SNAP;
  return Math.max(min, snapped);
}

function snapSpan(fraction: number): Span {
  const raw = Math.round(fraction * SPAN_MAX);
  const clamped = Math.max(SPAN_MIN, Math.min(SPAN_MAX, raw));
  return clamped as Span;
}

type ViewportRect = { top: number; left: number; width: number; height: number };

function rectOf(id: string): ViewportRect | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(`[data-edit-id="${id}"]`);
  if (!el) return null;
  const r = (el as HTMLElement).getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function ResizeHandles() {
  const previewMode = useEditorStore((s) => s.previewMode);
  const selectedNode = useEditorStore(selectSelectedComponentNode);

  if (previewMode || !selectedNode) return null;
  const right = isResizableOnAxis(selectedNode.type, "width");
  const bottom = isResizableOnAxis(selectedNode.type, "height");
  if (!right && !bottom) return null;

  return <ResizeHandlesActive node={selectedNode} matrix={{ right, bottom }} />;
}

function ResizeHandlesActive({
  node,
  matrix,
}: {
  node: ComponentNode;
  matrix: ResizeMatrixEntry;
}) {
  const [rect, setRect] = useState<ViewportRect | null>(() => rectOf(node.id));

  useEffect(() => {
    function update(): void {
      setRect(rectOf(node.id));
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(update);
      const el = document.querySelector(`[data-edit-id="${node.id}"]`);
      if (el) observer.observe(el);
    }
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
  }, [node.id]);

  if (!rect) return null;

  return (
    <>
      {matrix.right ? <RightEdgeHandle node={node} rect={rect} /> : null}
      {matrix.bottom ? <BottomEdgeHandle node={node} rect={rect} /> : null}
      {matrix.right && matrix.bottom ? <CornerHandle node={node} rect={rect} /> : null}
    </>
  );
}

function RightEdgeHandle({ node, rect }: { node: ComponentNode; rect: ViewportRect }) {
  const setComponentSpan = useEditorStore((s) => s.setComponentSpan);
  const setComponentDimensionWithCascade = useEditorStore((s) => s.setComponentDimensionWithCascade);
  // parentRect generalises the old rowRect — the parent could be any container.
  const dragRef = useRef<{ parentRect: DOMRect; shiftHeld: boolean } | null>(null);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();

    const page = selectCurrentPage(useEditorStore.getState());
    if (!page) return;
    const parentId = findComponentParentId(page.rootComponent, node.id);
    if (!parentId) return;
    const parentEl = document.querySelector(`[data-edit-id="${parentId}"]`);
    if (!parentEl) return;
    const parentRect = (parentEl as HTMLElement).getBoundingClientRect();

    dragRef.current = { parentRect, shiftHeld: e.shiftKey };

    function handlePointerUp(ev: PointerEvent): void {
      const drag = dragRef.current;
      cleanup();
      if (!drag) return;
      const fraction = (ev.clientX - drag.parentRect.left) / drag.parentRect.width;
      const clampedFraction = Math.max(0.04, Math.min(1, fraction));

      try {
        if (node.type === "Column" && !drag.shiftHeld) {
          // Legacy Column-grid snap (1/12). Shift escapes to free percent.
          // Column span is implicitly bounded to 1..12 — no parent clamp needed.
          setComponentSpan(node.id, snapSpan(clampedFraction));
        } else {
          // 5% snap for free-percent storage.
          const percent = Math.max(5, Math.round((clampedFraction * 100) / 5) * 5);
          // Task 3.5: cap at the parent's remaining headroom (siblings' explicit widths
          // already consumed). Snap the cap DOWN to the nearest 5% grid step so the
          // bounded value sits on the same grid as the drag.
          const max = getMaxAllowedDimension(useEditorStore.getState().draftConfig, node.id, "width");
          let bounded = percent;
          if (max !== null) {
            const cappedAtSnap = Math.floor(max / 5) * 5;
            bounded = Math.min(bounded, Math.max(5, cappedAtSnap));
          }
          setComponentDimensionWithCascade(node.id, "width", `${bounded}%`);
        }
      } catch {
        // Apply layer rejected (e.g. node disappeared mid-drag); silent no-op.
      }
    }

    function handleKeyDown(ev: KeyboardEvent): void {
      if (ev.key === "Escape") {
        cleanup();
      }
    }

    function cleanup(): void {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("keydown", handleKeyDown);
      dragRef.current = null;
    }

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("keydown", handleKeyDown);
  }

  return (
    <div
      data-testid={`resize-handle-right-${node.id}`}
      data-resize-axis="right"
      onPointerDown={handlePointerDown}
      style={{
        position: "fixed",
        top: rect.top,
        left: rect.left + rect.width - 4,
        width: 8,
        height: rect.height,
        cursor: "ew-resize",
        background: "rgba(59, 130, 246, 0.55)",
        zIndex: 50,
      }}
    />
  );
}

function CornerHandle({ node, rect }: { node: ComponentNode; rect: ViewportRect }) {
  const setComponentDimension = useEditorStore((s) => s.setComponentDimension);
  const setComponentDimensionWithCascade = useEditorStore((s) => s.setComponentDimensionWithCascade);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    parentRect: DOMRect;
  } | null>(null);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    const page = selectCurrentPage(useEditorStore.getState());
    if (!page) return;
    const parentId = findComponentParentId(page.rootComponent, node.id);
    const parentEl = parentId ? document.querySelector(`[data-edit-id="${parentId}"]`) : null;
    const parentRect =
      parentEl instanceof HTMLElement ? parentEl.getBoundingClientRect() : new DOMRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: rect.width,
      startH: rect.height,
      parentRect,
    };

    function handlePointerUp(ev: PointerEvent | MouseEvent): void {
      const drag = dragRef.current;
      cleanup();
      if (!drag) return;
      const newW = drag.startW + (ev.clientX - drag.startX);
      const newH = snapHeight(drag.startH + (ev.clientY - drag.startY), node.type === "Spacer");
      const fraction = drag.parentRect.width
        ? Math.max(0.04, Math.min(1, newW / drag.parentRect.width))
        : 1;
      const percent = Math.max(5, Math.round((fraction * 100) / 5) * 5);
      // Task 3.5: cap width at the parent's remaining headroom.
      const max = getMaxAllowedDimension(useEditorStore.getState().draftConfig, node.id, "width");
      let bounded = percent;
      if (max !== null) {
        const cappedAtSnap = Math.floor(max / 5) * 5;
        bounded = Math.min(bounded, Math.max(5, cappedAtSnap));
      }
      try {
        setComponentDimensionWithCascade(node.id, "width", `${bounded}%`);
        if (node.type !== "Spacer") {
          setComponentDimension(node.id, "height", `${newH}px`);
        }
      } catch {
        // Apply layer rejected; silent no-op.
      }
    }

    function handleKeyDown(ev: KeyboardEvent): void {
      if (ev.key === "Escape") cleanup();
    }

    function cleanup(): void {
      window.removeEventListener("pointerup", handlePointerUp as EventListener);
      window.removeEventListener("keydown", handleKeyDown);
      dragRef.current = null;
    }

    window.addEventListener("pointerup", handlePointerUp as EventListener);
    window.addEventListener("keydown", handleKeyDown);
  }

  return (
    <div
      data-testid={`resize-handle-corner-${node.id}`}
      data-resize-axis="corner"
      onPointerDown={handlePointerDown}
      style={{
        position: "fixed",
        top: rect.top + rect.height - 6,
        left: rect.left + rect.width - 6,
        width: 12,
        height: 12,
        cursor: "nwse-resize",
        background: "rgba(59, 130, 246, 0.85)",
        borderRadius: 2,
        zIndex: 51,
      }}
    />
  );
}

function BottomEdgeHandle({ node, rect }: { node: ComponentNode; rect: ViewportRect }) {
  const setComponentDimension = useEditorStore((s) => s.setComponentDimension);
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const isSpacer = node.type === "Spacer";

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { startY: e.clientY, startHeight: rect.height };

    function handlePointerUp(ev: PointerEvent): void {
      const drag = dragRef.current;
      cleanup();
      if (!drag) return;
      const delta = ev.clientY - drag.startY;
      const newHeight = snapHeight(drag.startHeight + delta, isSpacer);
      try {
        if (isSpacer) {
          // Spacer height lives in props (numeric), per Spacer/SPEC.md.
          // Pull the freshest props from the store so a concurrent edit
          // doesn't get clobbered.
          const page = selectCurrentPage(useEditorStore.getState());
          const fresh = page ? findComponentById(page.rootComponent, node.id) : null;
          const props = fresh?.props ?? node.props;
          setComponentProps(node.id, { ...props, height: newHeight });
        } else {
          setComponentDimension(node.id, "height", `${newHeight}px`);
        }
      } catch {
        // Apply layer rejected; silent no-op.
      }
    }

    function handleKeyDown(ev: KeyboardEvent): void {
      if (ev.key === "Escape") {
        cleanup();
      }
    }

    function cleanup(): void {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("keydown", handleKeyDown);
      dragRef.current = null;
    }

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("keydown", handleKeyDown);
  }

  return (
    <div
      data-testid={`resize-handle-bottom-${node.id}`}
      data-resize-axis="bottom"
      onPointerDown={handlePointerDown}
      style={{
        position: "fixed",
        top: rect.top + rect.height - 4,
        left: rect.left,
        width: rect.width,
        height: 8,
        cursor: "ns-resize",
        background: "rgba(59, 130, 246, 0.55)",
        zIndex: 50,
      }}
    />
  );
}
