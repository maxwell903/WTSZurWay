"use client";

import { RichTextToolbarPortal } from "@/components/editor/rich-text-toolbar/RichTextToolbarPortal";
import { Renderer } from "@/components/renderer";
import { getTextFields } from "@/components/site-components/registry";
import { selectCurrentPage, useEditorStore } from "@/lib/editor-state";
import { findComponentById } from "@/lib/editor-state/store";
import { getTextBearingDescendants } from "@/lib/editor-state/text-tree";
import type { ComponentType } from "@/lib/site-config";
import { useEffect, useMemo } from "react";
import { SelectionBreadcrumb } from "./SelectionBreadcrumb";
import { CanvasDropOverlay } from "./dnd/CanvasDropOverlay";
import { ResizeHandles } from "./dnd/ResizeHandles";
import { handlePreviewLinkClick } from "./previewLinkClick";

function findNodeType(
  config: ReturnType<typeof useEditorStore.getState>["draftConfig"],
  id: string,
): ComponentType | null {
  // Local walk; lib/editor-state already exports findComponentById but we
  // want the type only so we avoid the extra null-check rituals.
  function visit(node: {
    id: string;
    type: ComponentType;
    children?: unknown;
  }): ComponentType | null {
    if (node.id === id) return node.type;
    const children =
      (node.children as { id: string; type: ComponentType; children?: unknown }[] | undefined) ??
      [];
    for (const child of children) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  }
  for (const page of config.pages) {
    const found = visit(page.rootComponent);
    if (found) return found;
  }
  return null;
}

export function Canvas() {
  const draftConfig = useEditorStore((s) => s.draftConfig);
  const currentPage = useEditorStore(selectCurrentPage);
  const previewMode = useEditorStore((s) => s.previewMode);
  const selectedComponentId = useEditorStore((s) => s.selectedComponentId);
  const textEditingScope = useEditorStore((s) => s.textEditingScope);
  const selectComponent = useEditorStore((s) => s.selectComponent);
  const deselectAll = useEditorStore((s) => s.deselectAll);
  const enterElementEditMode = useEditorStore((s) => s.enterElementEditMode);
  const enterTextEditing = useEditorStore((s) => s.enterTextEditing);
  const enterBroadcastTextEditing = useEditorStore((s) => s.enterBroadcastTextEditing);
  const exitTextEditing = useEditorStore((s) => s.exitTextEditing);
  const setCurrentPageSlug = useEditorStore((s) => s.setCurrentPageSlug);
  // Set of static page slugs in the current draft. Passed to the link
  // interceptor so retroactive NavBar links (legacy `/<slug>` hrefs without
  // `data-internal-page-slug`) still resolve to in-canvas page swaps.
  const knownPageSlugs = useMemo(
    () => new Set(draftConfig.pages.filter((p) => p.kind === "static").map((p) => p.slug)),
    [draftConfig.pages],
  );

  // Esc unwinds in two stages:
  //   1) Close the rich-text toolbar (if it is open) -- the user is most
  //      likely escaping from the editing surface they are looking at.
  //   2) Otherwise clear the selection.
  // Skip both when focus is in an input/textarea so dialog forms
  // (AddPageDialog, RenamePageDialog, SiteNameInput) can use Esc for their
  // own purposes. The TipTap editor itself sits inside a contenteditable
  // <div>, not a real <input>, so it does not match the tag check below;
  // pressing Esc while typing into a heading exits text-editing first.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const target = document.activeElement;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (textEditingScope) {
        exitTextEditing();
        return;
      }
      selectComponent(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectComponent, textEditingScope, exitTextEditing]);

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
  //
  // Anchor-click interception: a delegated handler walks up from the
  // click target to find an <a> element. Internal-page-slug links always
  // swap the canvas page (in both edit and preview modes) so clicking a
  // NavBar label never navigates the browser away from the editor.
  // External http(s) links only open in a new tab while in preview mode;
  // in edit mode they're prevented (a click does nothing) so the editor
  // stays put.
  return (
    <main
      data-testid="editor-canvas"
      data-canvas-bg-surface
      className="relative flex-1 overflow-y-auto bg-[radial-gradient(circle_at_3px_3px,rgba(255,255,255,0.04)_3px,transparent_0)] [background-size:16px_16px]"
      onClick={(e) => {
        const outcome = handlePreviewLinkClick(
          e.target,
          {
            preventDefault: () => e.preventDefault(),
            setCurrentPageSlug,
            openExternal: (href) => {
              if (previewMode) window.open(href, "_blank", "noopener,noreferrer");
            },
          },
          knownPageSlugs,
        );
        if (outcome === "internal" || outcome === "external") return;
        const target = e.target as HTMLElement;
        if (target.matches?.("[data-canvas-bg-surface]")) {
          deselectAll();
        }
      }}
      onKeyDown={(e) => {
        const target = e.target as HTMLElement;
        if (!target.matches?.("[data-canvas-bg-surface]")) return;
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          deselectAll();
        }
      }}
    >
      {!previewMode ? <CanvasDropOverlay /> : null}
      <div
        data-canvas-bg-surface
        className="mx-auto my-6 w-full max-w-[1280px] rounded-lg border border-zinc-800 bg-white text-zinc-900 shadow-2xl"
      >
        <Renderer
          config={draftConfig}
          page={currentPage.slug}
          mode={previewMode ? "preview" : "edit"}
          selection={selectedComponentId ? [selectedComponentId] : undefined}
          onSelect={(id) => selectComponent(id)}
          onContextMenu={(id, meta) => {
            // Single right-click: enter element edit + open the toolbar
            //   on the right-clicked text-bearing component.
            // Double right-click: enter BROADCAST mode — collect every
            //   text-bearing descendant of this node (including itself if
            //   it has text fields) and put them all in scope. The
            //   toolbar shows "Broadcasting to N elements" and applies
            //   transforms to every selected doc at once.
            enterElementEditMode(id);
            const type = findNodeType(draftConfig, id);
            if (type === null) return;

            if (meta.isDouble) {
              // Locate the actual node so we can walk its subtree.
              let root: { id: string; type: ComponentType; children?: unknown } | null = null;
              for (const page of draftConfig.pages) {
                root = findComponentById(page.rootComponent, id);
                if (root) break;
              }
              if (!root) return;
              const descendants = getTextBearingDescendants(
                // The cast is safe — findComponentById returns a typed
                // ComponentNode but the local helper signature widened it.
                root as Parameters<typeof getTextBearingDescendants>[0],
              );
              if (descendants.length === 0) return;
              enterBroadcastTextEditing(
                id,
                descendants.map((n) => n.id),
              );
              return;
            }

            // Open the toolbar for the first FLAT text field on this
            // component. For NavBar/Footer (which have only array text
            // fields) we skip — the user opens the toolbar by right-
            // clicking a specific link/title (handled by the inner
            // EditableTextSlot's own onContextMenu).
            const fields = getTextFields(type);
            const firstFlat = fields.find(
              (f) => (f.kind ?? "flat") === "flat" && f.kind !== "array",
            );
            if (firstFlat && firstFlat.kind !== "array") {
              enterTextEditing(id, firstFlat.propKey);
            }
          }}
        />
      </div>
      {!previewMode ? <SelectionBreadcrumb /> : null}
      {!previewMode ? <ResizeHandles /> : null}
      {!previewMode ? <RichTextToolbarPortal /> : null}
    </main>
  );
}
