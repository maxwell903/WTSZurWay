"use client";

// ResizeHandles — overlays a right-edge, bottom-edge, and bottom-right corner
// handle on the selected component. All three write **pixel** dimensions to
// `style.width` / `style.height` via `setComponentDimension`. The 1–12 grid
// `Column.span` system is no longer driven from drag (the `span` field stays
// in the schema as a fallback for Columns without an explicit width — see
// `Column/index.tsx`).
//
// Coordinate model: each handle reads `getBoundingClientRect()` for its
// target element (and for parent-bound clamp, its parent's rect) and
// positions itself in viewport coordinates via `position: fixed`. This is
// unaffected by transforms applied to ancestors of `document.body`.
//
// Snap rules (post-2026-04-28 redesign):
//   - All widths and heights snap to 8-px multiples; min 8 px.
//   - Spacer height floors at 0 px and writes through `setComponentProps`
//     (numeric) instead of `setComponentDimension` (CSS string).
//   - Holding Shift escapes the 8-px snap (free 1-px resolution).
//   - Esc during a resize cancels and reverts (no store mutation).

import {
  findComponentById,
  findComponentParentId,
  selectCurrentPage,
  selectSelectedComponentNode,
  useEditorStore,
} from "@/lib/editor-state";
import type { ComponentNode, ComponentType, StyleConfig } from "@/lib/site-config";
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { BoundedByParentTooltip } from "./BoundedByParentTooltip";

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

const PX_SNAP = 8;
const HEIGHT_MIN_DEFAULT = 8;
const HEIGHT_MIN_SPACER = 0;
const WIDTH_MIN = 8;

function snapPx(px: number, min: number, snap: boolean): number {
  const v = snap ? Math.round(px / PX_SNAP) * PX_SNAP : Math.round(px);
  return Math.max(min, v);
}

function snapHeight(px: number, isSpacer: boolean, snap = true): number {
  const min = isSpacer ? HEIGHT_MIN_SPACER : HEIGHT_MIN_DEFAULT;
  return snapPx(px, min, snap);
}

function snapWidth(px: number, snap = true): number {
  return snapPx(px, WIDTH_MIN, snap);
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
      {matrix.right ? <LeftEdgeHandle node={node} rect={rect} /> : null}
      {matrix.bottom ? <BottomEdgeHandle node={node} rect={rect} /> : null}
      {matrix.bottom ? <TopEdgeHandle node={node} rect={rect} /> : null}
      {matrix.right && matrix.bottom ? <CornerHandle node={node} rect={rect} /> : null}
    </>
  );
}

function RightEdgeHandle({ node, rect }: { node: ComponentNode; rect: ViewportRect }) {
  const setComponentDimension = useEditorStore((s) => s.setComponentDimension);
  // Pixel-mode drag: capture starting cursor X and starting width, then write
  // `${px}px` directly. The parent rect is captured for the "exceeded parent"
  // tooltip only; it does not constrain the write — flexbox / overflow on the
  // parent decides what visibly happens past the cap.
  const dragRef = useRef<{
    startClientX: number;
    startWidth: number;
    parentMaxWidth: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; top: number; left: number }>({
    visible: false,
    top: rect.top + rect.height / 2,
    left: rect.left + rect.width,
  });

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();

    // Parent rect is used only for the "Bounded by parent" tooltip. We don't
    // need the parent for the write itself — width is now an absolute pixel
    // value, not a fraction of parent.
    const page = selectCurrentPage(useEditorStore.getState());
    let parentMaxWidth = Number.POSITIVE_INFINITY;
    if (page) {
      const parentId = findComponentParentId(page.rootComponent, node.id);
      const parentEl = parentId ? document.querySelector(`[data-edit-id="${parentId}"]`) : null;
      if (parentEl instanceof HTMLElement) {
        parentMaxWidth = parentEl.getBoundingClientRect().width;
      }
    }

    dragRef.current = {
      startClientX: e.clientX,
      startWidth: rect.width,
      parentMaxWidth,
    };

    // Shared width computation and write — called on both pointermove and pointerup.
    function computeAndWrite(clientX: number, shiftHeld: boolean): void {
      const drag = dragRef.current;
      if (!drag) return;
      const raw = drag.startWidth + (clientX - drag.startClientX);
      const snapped = snapWidth(raw, !shiftHeld);
      try {
        setComponentDimension(node.id, "width", `${snapped}px`);
      } catch {
        // Apply layer rejected; silent no-op.
      }
    }

    function handlePointerMove(ev: PointerEvent | MouseEvent): void {
      const drag = dragRef.current;
      if (!drag) return;
      const shiftHeld = "shiftKey" in ev ? ev.shiftKey : false;
      // Live preview, throttled to animation frames.
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          computeAndWrite(ev.clientX, shiftHeld);
        });
      }
      // Tooltip when the user drags past the parent's right edge.
      if (!Number.isFinite(drag.parentMaxWidth)) return;
      const candidate = drag.startWidth + (ev.clientX - drag.startClientX);
      // Tiny epsilon prevents flicker at the exact boundary.
      const pushingPast = candidate > drag.parentMaxWidth + 0.5;
      if (pushingPast) {
        if (hideTimerRef.current !== null) {
          window.clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        setTooltip((current) => {
          if (!current.visible && showTimerRef.current === null) {
            showTimerRef.current = window.setTimeout(() => {
              setTooltip({ visible: true, top: ev.clientY, left: ev.clientX });
              showTimerRef.current = null;
            }, 150);
          } else if (current.visible) {
            return { visible: true, top: ev.clientY, left: ev.clientX };
          }
          return current;
        });
      } else {
        if (showTimerRef.current !== null) {
          window.clearTimeout(showTimerRef.current);
          showTimerRef.current = null;
        }
        setTooltip((current) => {
          if (current.visible && hideTimerRef.current === null) {
            hideTimerRef.current = window.setTimeout(() => {
              setTooltip((t) => ({ ...t, visible: false }));
              hideTimerRef.current = null;
            }, 800);
          }
          return current;
        });
      }
    }

    function handlePointerUp(ev: PointerEvent | MouseEvent): void {
      if (!dragRef.current) return;
      const shiftHeld = "shiftKey" in ev ? ev.shiftKey : false;
      // Final write at exact cursor position (no rAF throttle on release).
      computeAndWrite(ev.clientX, shiftHeld);
      cleanup();
    }

    function handleKeyDown(ev: KeyboardEvent): void {
      if (ev.key === "Escape") {
        cleanup();
      }
    }

    function cleanup(): void {
      window.removeEventListener("pointermove", handlePointerMove as EventListener);
      window.removeEventListener("pointerup", handlePointerUp as EventListener);
      window.removeEventListener("keydown", handleKeyDown);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (showTimerRef.current !== null) {
        window.clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      // Hide the tooltip on release.
      setTooltip((t) => ({ ...t, visible: false }));
      dragRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove as EventListener);
    window.addEventListener("pointerup", handlePointerUp as EventListener);
    window.addEventListener("keydown", handleKeyDown);
  }

  return (
    <>
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
      <BoundedByParentTooltip visible={tooltip.visible} top={tooltip.top} left={tooltip.left} />
    </>
  );
}

function CornerHandle({ node, rect }: { node: ComponentNode; rect: ViewportRect }) {
  const setComponentDimension = useEditorStore((s) => s.setComponentDimension);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    parentMaxWidth: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [tooltip, setTooltip] = useState<{ visible: boolean; top: number; left: number }>({
    visible: false,
    top: rect.top + rect.height,
    left: rect.left + rect.width,
  });

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    const page = selectCurrentPage(useEditorStore.getState());
    let parentMaxWidth = Number.POSITIVE_INFINITY;
    if (page) {
      const parentId = findComponentParentId(page.rootComponent, node.id);
      const parentEl = parentId ? document.querySelector(`[data-edit-id="${parentId}"]`) : null;
      if (parentEl instanceof HTMLElement) {
        parentMaxWidth = parentEl.getBoundingClientRect().width;
      }
    }
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: rect.width,
      startH: rect.height,
      parentMaxWidth,
    };

    // Shared width+height computation and write — called on both pointermove and pointerup.
    function computeAndWrite(clientX: number, clientY: number, shiftHeld: boolean): void {
      const drag = dragRef.current;
      if (!drag) return;
      const newW = snapWidth(drag.startW + (clientX - drag.startX), !shiftHeld);
      const newH = snapHeight(
        drag.startH + (clientY - drag.startY),
        node.type === "Spacer",
        !shiftHeld,
      );
      try {
        setComponentDimension(node.id, "width", `${newW}px`);
        if (node.type !== "Spacer") {
          setComponentDimension(node.id, "height", `${newH}px`);
        }
      } catch {
        // Apply layer rejected; silent no-op.
      }
    }

    function handlePointerMove(ev: PointerEvent | MouseEvent): void {
      const drag = dragRef.current;
      if (!drag) return;
      const shiftHeld = "shiftKey" in ev ? ev.shiftKey : false;
      // Live preview, throttled to animation frames.
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          computeAndWrite(ev.clientX, ev.clientY, shiftHeld);
        });
      }
      // "Bounded by parent" tooltip when width exceeds parent's right edge.
      if (!Number.isFinite(drag.parentMaxWidth)) return;
      const candidate = drag.startW + (ev.clientX - drag.startX);
      const pushingPast = candidate > drag.parentMaxWidth + 0.5;
      if (pushingPast) {
        if (hideTimerRef.current !== null) {
          window.clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        setTooltip((current) => {
          if (!current.visible && showTimerRef.current === null) {
            showTimerRef.current = window.setTimeout(() => {
              setTooltip({ visible: true, top: ev.clientY, left: ev.clientX });
              showTimerRef.current = null;
            }, 150);
          } else if (current.visible) {
            return { visible: true, top: ev.clientY, left: ev.clientX };
          }
          return current;
        });
      } else {
        if (showTimerRef.current !== null) {
          window.clearTimeout(showTimerRef.current);
          showTimerRef.current = null;
        }
        setTooltip((current) => {
          if (current.visible && hideTimerRef.current === null) {
            hideTimerRef.current = window.setTimeout(() => {
              setTooltip((t) => ({ ...t, visible: false }));
              hideTimerRef.current = null;
            }, 800);
          }
          return current;
        });
      }
    }

    function handlePointerUp(ev: PointerEvent | MouseEvent): void {
      if (!dragRef.current) return;
      const shiftHeld = "shiftKey" in ev ? ev.shiftKey : false;
      // Final write at exact cursor position (no rAF throttle on release).
      computeAndWrite(ev.clientX, ev.clientY, shiftHeld);
      cleanup();
    }

    function handleKeyDown(ev: KeyboardEvent): void {
      if (ev.key === "Escape") cleanup();
    }

    function cleanup(): void {
      window.removeEventListener("pointermove", handlePointerMove as EventListener);
      window.removeEventListener("pointerup", handlePointerUp as EventListener);
      window.removeEventListener("keydown", handleKeyDown);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (showTimerRef.current !== null) {
        window.clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      // Hide the tooltip on release.
      setTooltip((t) => ({ ...t, visible: false }));
      dragRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove as EventListener);
    window.addEventListener("pointerup", handlePointerUp as EventListener);
    window.addEventListener("keydown", handleKeyDown);
  }

  return (
    <>
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
      <BoundedByParentTooltip visible={tooltip.visible} top={tooltip.top} left={tooltip.left} />
    </>
  );
}

function BottomEdgeHandle({ node, rect }: { node: ComponentNode; rect: ViewportRect }) {
  const setComponentDimension = useEditorStore((s) => s.setComponentDimension);
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const isSpacer = node.type === "Spacer";

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { startY: e.clientY, startHeight: rect.height };

    // Shared height computation and write — called on both pointermove and pointerup.
    function computeAndWrite(clientY: number): void {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = clientY - drag.startY;
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

    function handlePointerMove(ev: PointerEvent | MouseEvent): void {
      if (!dragRef.current) return;
      // Live preview, throttled to animation frames.
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          computeAndWrite(ev.clientY);
        });
      }
    }

    function handlePointerUp(ev: PointerEvent | MouseEvent): void {
      if (!dragRef.current) return;
      // Final write at exact cursor position (no rAF throttle on release).
      computeAndWrite(ev.clientY);
      cleanup();
    }

    function handleKeyDown(ev: KeyboardEvent): void {
      if (ev.key === "Escape") {
        cleanup();
      }
    }

    function cleanup(): void {
      window.removeEventListener("pointermove", handlePointerMove as EventListener);
      window.removeEventListener("pointerup", handlePointerUp as EventListener);
      window.removeEventListener("keydown", handleKeyDown);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      dragRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove as EventListener);
    window.addEventListener("pointerup", handlePointerUp as EventListener);
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

// ---------------------------------------------------------------------------
// LeftEdgeHandle — drags the W edge. Width changes inversely with cursor X
// (drag left → wider). Anchors the right edge by writing a compensating
// `style.margin.left` so the visible right edge stays put while the left
// edge follows the cursor (Figma-like). All math is computed against values
// captured at pointer-down so there is no accumulation drift across frames.
// ---------------------------------------------------------------------------
function LeftEdgeHandle({ node, rect }: { node: ComponentNode; rect: ViewportRect }) {
  const setComponentStyle = useEditorStore((s) => s.setComponentStyle);
  const dragRef = useRef<{
    startClientX: number;
    startWidth: number;
    startMarginLeft: number;
    startStyle: StyleConfig;
  } | null>(null);
  const rafRef = useRef<number | null>(null);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    e.preventDefault();
    e.stopPropagation();

    dragRef.current = {
      startClientX: e.clientX,
      startWidth: rect.width,
      startMarginLeft: node.style.margin?.left ?? 0,
      startStyle: node.style,
    };

    function computeAndWrite(clientX: number, shiftHeld: boolean): void {
      const drag = dragRef.current;
      if (!drag) return;
      const cursorDx = clientX - drag.startClientX;
      const newWidth = snapWidth(drag.startWidth - cursorDx, !shiftHeld);
      const widthDelta = newWidth - drag.startWidth;
      const newMarginLeft = drag.startMarginLeft - widthDelta;
      const newStyle: StyleConfig = {
        ...drag.startStyle,
        width: `${newWidth}px`,
        margin: { ...(drag.startStyle.margin ?? {}), left: newMarginLeft },
      };
      try {
        setComponentStyle(node.id, newStyle);
      } catch {
        // Apply layer rejected; silent no-op.
      }
    }

    function handlePointerMove(ev: PointerEvent | MouseEvent): void {
      if (!dragRef.current) return;
      const shiftHeld = "shiftKey" in ev ? ev.shiftKey : false;
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          computeAndWrite(ev.clientX, shiftHeld);
        });
      }
    }

    function handlePointerUp(ev: PointerEvent | MouseEvent): void {
      if (!dragRef.current) return;
      const shiftHeld = "shiftKey" in ev ? ev.shiftKey : false;
      computeAndWrite(ev.clientX, shiftHeld);
      cleanup();
    }

    function handleKeyDown(ev: KeyboardEvent): void {
      if (ev.key === "Escape") cleanup();
    }

    function cleanup(): void {
      window.removeEventListener("pointermove", handlePointerMove as EventListener);
      window.removeEventListener("pointerup", handlePointerUp as EventListener);
      window.removeEventListener("keydown", handleKeyDown);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      dragRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove as EventListener);
    window.addEventListener("pointerup", handlePointerUp as EventListener);
    window.addEventListener("keydown", handleKeyDown);
  }

  return (
    <div
      data-testid={`resize-handle-left-${node.id}`}
      data-resize-axis="left"
      onPointerDown={handlePointerDown}
      style={{
        position: "fixed",
        top: rect.top,
        left: rect.left - 4,
        width: 8,
        height: rect.height,
        cursor: "ew-resize",
        background: "rgba(59, 130, 246, 0.55)",
        zIndex: 50,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// TopEdgeHandle — drags the N edge. Height changes inversely with cursor Y
// (drag up → taller). Anchors the bottom edge via compensating
// `style.margin.top`. Spacer is a special case (height in props, not
// style); for now top-edge resize on Spacer is a no-op (corner / bottom
// edges remain the way to size a Spacer).
// ---------------------------------------------------------------------------
function TopEdgeHandle({ node, rect }: { node: ComponentNode; rect: ViewportRect }) {
  const setComponentStyle = useEditorStore((s) => s.setComponentStyle);
  const isSpacer = node.type === "Spacer";
  const dragRef = useRef<{
    startClientY: number;
    startHeight: number;
    startMarginTop: number;
    startStyle: StyleConfig;
  } | null>(null);
  const rafRef = useRef<number | null>(null);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    if (isSpacer) return;
    e.preventDefault();
    e.stopPropagation();

    dragRef.current = {
      startClientY: e.clientY,
      startHeight: rect.height,
      startMarginTop: node.style.margin?.top ?? 0,
      startStyle: node.style,
    };

    function computeAndWrite(clientY: number, shiftHeld: boolean): void {
      const drag = dragRef.current;
      if (!drag) return;
      const cursorDy = clientY - drag.startClientY;
      const newHeight = snapHeight(drag.startHeight - cursorDy, false, !shiftHeld);
      const heightDelta = newHeight - drag.startHeight;
      const newMarginTop = drag.startMarginTop - heightDelta;
      const newStyle: StyleConfig = {
        ...drag.startStyle,
        height: `${newHeight}px`,
        margin: { ...(drag.startStyle.margin ?? {}), top: newMarginTop },
      };
      try {
        setComponentStyle(node.id, newStyle);
      } catch {
        // Apply layer rejected; silent no-op.
      }
    }

    function handlePointerMove(ev: PointerEvent | MouseEvent): void {
      if (!dragRef.current) return;
      const shiftHeld = "shiftKey" in ev ? ev.shiftKey : false;
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          computeAndWrite(ev.clientY, shiftHeld);
        });
      }
    }

    function handlePointerUp(ev: PointerEvent | MouseEvent): void {
      if (!dragRef.current) return;
      const shiftHeld = "shiftKey" in ev ? ev.shiftKey : false;
      computeAndWrite(ev.clientY, shiftHeld);
      cleanup();
    }

    function handleKeyDown(ev: KeyboardEvent): void {
      if (ev.key === "Escape") cleanup();
    }

    function cleanup(): void {
      window.removeEventListener("pointermove", handlePointerMove as EventListener);
      window.removeEventListener("pointerup", handlePointerUp as EventListener);
      window.removeEventListener("keydown", handleKeyDown);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      dragRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove as EventListener);
    window.addEventListener("pointerup", handlePointerUp as EventListener);
    window.addEventListener("keydown", handleKeyDown);
  }

  if (isSpacer) return null;

  return (
    <div
      data-testid={`resize-handle-top-${node.id}`}
      data-resize-axis="top"
      onPointerDown={handlePointerDown}
      style={{
        position: "fixed",
        top: rect.top - 4,
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
