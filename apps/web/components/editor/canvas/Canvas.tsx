"use client";

import { Renderer } from "@/components/renderer";
import { selectCurrentPage, useEditorStore } from "@/lib/editor-state";
import { useEffect } from "react";
import { SelectionBreadcrumb } from "./SelectionBreadcrumb";
import { CanvasDropOverlay } from "./dnd/CanvasDropOverlay";
import { ResizeHandles } from "./dnd/ResizeHandles";

export function Canvas() {
  const draftConfig = useEditorStore((s) => s.draftConfig);
  const currentPage = useEditorStore(selectCurrentPage);
  const previewMode = useEditorStore((s) => s.previewMode);
  const selectedComponentId = useEditorStore((s) => s.selectedComponentId);
  const selectComponent = useEditorStore((s) => s.selectComponent);
  const enterElementEditMode = useEditorStore((s) => s.enterElementEditMode);

  // Esc clears the selection. Skip when focus is in an input/textarea so
  // dialog forms (AddPageDialog, RenamePageDialog, SiteNameInput) can use Esc
  // for their own purposes.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const target = document.activeElement;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      selectComponent(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectComponent]);

  if (!currentPage) {
    return (
      <main
        data-testid="editor-canvas"
        className="relative flex flex-1 items-center justify-center bg-zinc-900 text-sm text-zinc-500"
      >
        No page selected.
      </main>
    );
  }

  // The canvas-background onClick is a mouse-only convenience; the
  // keyboard-equivalent deselect is the global Esc handler in the
  // useEffect above. We add an onKeyDown that mirrors the click for
  // Space/Enter to satisfy a11y/useKeyWithClickEvents.
  return (
    <main
      data-testid="editor-canvas"
      className="relative flex-1 overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] [background-size:16px_16px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          selectComponent(null);
        }
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          selectComponent(null);
        }
      }}
    >
      {!previewMode ? <CanvasDropOverlay /> : null}
      <div className="mx-auto my-6 w-full max-w-[1280px] rounded-lg border border-zinc-800 bg-white text-zinc-900 shadow-2xl">
        <Renderer
          config={draftConfig}
          page={currentPage.slug}
          mode={previewMode ? "preview" : "edit"}
          selection={selectedComponentId ? [selectedComponentId] : undefined}
          onSelect={(id) => selectComponent(id)}
          onContextMenu={(id) => enterElementEditMode(id)}
        />
      </div>
      {!previewMode ? <SelectionBreadcrumb /> : null}
      {!previewMode ? <ResizeHandles /> : null}
    </main>
  );
}
