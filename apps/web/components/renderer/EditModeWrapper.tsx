"use client";

import { DropZoneIndicator } from "@/components/editor/canvas/dnd/DropZoneIndicator";
import { useNodeSortable } from "@/components/editor/canvas/dnd/SortableNodeContext";
import { SideDropZones } from "@/components/editor/canvas/dnd/sideDropZones";
import { componentRegistry } from "@/components/site-components/registry";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentType } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from "react";

type Props = {
  id: string;
  type: ComponentType;
  mode: "edit" | "preview" | "public";
  selected?: boolean;
  onSelect?: (id: string) => void;
  onContextMenu?: (id: string) => void;
  children: ReactNode;
};

export function EditModeWrapper({
  id,
  type,
  mode,
  selected,
  onSelect,
  onContextMenu,
  children,
}: Props) {
  // Sprint 7: when wrapped in a DndCanvasProvider, this returns dnd-kit's
  // sortable state for this node id. Otherwise (preview mode, standalone
  // tests, public site) it returns null and the wrapper behaves exactly
  // as it did in Sprints 6 and 8.
  const sortable = useNodeSortable(id);
  const showComponentTypes = useEditorStore((s) => s.showComponentTypes);

  // Show the dashed outline + type label when: edit mode, overlay toggled on,
  // and the component is not FlowGroup (engine-internal, invisible to users).
  // Uses CSS outline (not border) so toggling never shifts layout.
  // When the component is selected, the blue selection outline takes priority.
  const showOverlay = mode === "edit" && showComponentTypes && type !== "FlowGroup";

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    // Anchor clicks must bubble up to the canvas-level link interceptor
    // so it can preventDefault + swap the page. If we stopPropagation here,
    // the browser still executes the <a>'s default navigation (404 on
    // root-relative slugs that don't exist as top-level routes).
    if (e.target instanceof Element && e.target.closest("a")) return;
    e.stopPropagation();
    onSelect?.(id);
  };

  const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(id);
  };

  // Keyboard parity for the click handler so the selection model is reachable
  // without a mouse. Enter selects; Shift+F10 / ContextMenu key opens the
  // context menu (matches OS conventions).
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(id);
      return;
    }
    if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.(id);
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

  // Sprint 7 "Known risks": dnd-kit's listeners spread BEFORE the explicit
  // onClick / onContextMenu / onKeyDown so the Sprint-6/8 handlers win the
  // dispatch race. The pointer sensor's 10-px activation distance keeps
  // single clicks from being interpreted as drags.
  return (
    <div
      ref={sortable?.setNodeRef ?? undefined}
      {...(sortable?.attributes ?? {})}
      {...(sortable?.listeners ?? {})}
      data-edit-id={id}
      data-edit-selected={selected ? "true" : undefined}
      // biome-ignore lint/a11y/useSemanticElements: a real <button> cannot legally contain block-level children (sections, paragraphs, etc.) — EditModeWrapper makes those interactive in edit mode only.
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      style={sortableStyle}
      className={cn(
        "relative outline-offset-2",
        selected
          ? "outline outline-2 outline-blue-500"
          : "hover:outline hover:outline-1 hover:outline-blue-300",
        // Show Component Types overlay — outline wins over hover-outline but
        // blue selection outline takes highest priority (gated on !selected).
        showOverlay && !selected && "outline outline-1 outline-dashed outline-zinc-400/70",
      )}
    >
      {showOverlay ? (
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
