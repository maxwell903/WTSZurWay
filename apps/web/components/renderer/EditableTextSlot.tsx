"use client";

// The single wrapper every text-bearing component (Heading, Paragraph,
// Button, NavBar links, Footer column titles, …) renders for its text
// content. Branches on render mode and editor state:
//
//   - mode != "edit"          → RichTextRenderer (visitor / preview)
//   - mode == "edit", inactive → RichTextRenderer (the user has not opened
//                                  the toolbar on this field yet)
//   - mode == "edit", active   → TipTapEditableSlot (caret + toolbar live)
//
// `@tiptap/react` is loaded only on the active branch, via next/dynamic.
// The visitor bundle never resolves it because mode "public"/"preview"
// short-circuits before TipTapEditableSlot can be referenced.
//
// Phase 4.5 — when in edit mode, the slot captures its own right-click
// and dispatches `enterTextEditing(nodeId, propKey)` directly, then stops
// propagation. This lets array-item slots (e.g., NavBar link N) open the
// toolbar for THAT link rather than the surrounding NavBar wrapper. As a
// trade-off, double-right-click broadcast can't be triggered from inside
// a link — the user double-right-clicks the NavBar's surrounding area
// instead. `buildWritePatch` lets array-item slots form a deep patch
// (e.g., write to `links[2]`) instead of the default flat write.

import { useRenderMode } from "@/components/renderer/RenderModeContext";
import { RichTextRenderer } from "@/components/renderer/RichTextRenderer";
import { useEditorStore } from "@/lib/editor-state";
import type { RichTextProfile } from "@/lib/rich-text/extensions";
import type { RichTextDoc } from "@/lib/site-config";
import dynamic from "next/dynamic";
import { type CSSProperties, type ElementType, type MouseEvent, useCallback } from "react";

const TipTapEditableSlot = dynamic(
  () => import("@/components/renderer/TipTapEditableSlot").then((m) => m.TipTapEditableSlot),
  {
    ssr: false,
    loading: () => null,
  },
);

export type EditableTextSlotProps = {
  nodeId: string;
  // Path-style for array items (e.g. "links.2.label"); flat key for
  // top-level fields ("text", "label").
  propKey: string;
  richKey: string;
  doc: RichTextDoc | undefined;
  fallback: string;
  fullProps: Record<string, unknown>;
  profile?: RichTextProfile;
  as?: ElementType;
  style?: CSSProperties;
  className?: string;
  passthroughAttrs?: Record<string, unknown>;
  // For array items, callers form the deep patch themselves so the editor's
  // onUpdate writes into the correct array index.
  buildWritePatch?: (json: RichTextDoc, plain: string) => Record<string, unknown>;
};

export function EditableTextSlot({
  nodeId,
  propKey,
  richKey,
  doc,
  fallback,
  fullProps,
  profile = "block",
  as,
  style,
  className,
  passthroughAttrs,
  buildWritePatch,
}: EditableTextSlotProps) {
  const mode = useRenderMode();
  const enterTextEditing = useEditorStore((s) => s.enterTextEditing);
  // `useEditorStore` is read unconditionally to satisfy hook rules. On the
  // visitor site it returns the empty default state (`textEditingScope:
  // null`) so this branch always picks the read-only renderer.
  const isActive = useEditorStore((s) => {
    const scope = s.textEditingScope;
    if (!scope) return false;
    if (scope.mode === "single") {
      return scope.id === nodeId && scope.propKey === propKey;
    }
    if (scope.mode === "broadcast") {
      // Broadcast highlights nodes but doesn't put a caret in any of them.
      return false;
    }
    return false;
  });

  // Inner right-click handler. Wins over the outer EditModeWrapper so
  // clicking a specific NavBar link / Footer column title opens the
  // toolbar for THAT field rather than the parent component.
  const handleContextMenu = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (mode !== "edit") return;
      e.preventDefault();
      e.stopPropagation();
      enterTextEditing(nodeId, propKey);
    },
    [mode, nodeId, propKey, enterTextEditing],
  );

  // Augment passthroughAttrs with our right-click handler when in edit
  // mode. Visitor renders skip the handler entirely so the public bundle
  // sees a clean read-only element.
  const editAwareAttrs =
    mode === "edit"
      ? { ...(passthroughAttrs ?? {}), onContextMenu: handleContextMenu }
      : passthroughAttrs;

  if (mode !== "edit" || !isActive) {
    return (
      <RichTextRenderer
        doc={doc}
        fallback={fallback}
        as={as}
        style={style}
        className={className}
        passthroughAttrs={editAwareAttrs}
        profile={profile}
      />
    );
  }

  return (
    <TipTapEditableSlot
      nodeId={nodeId}
      propKey={propKey}
      richKey={richKey}
      doc={doc}
      fallback={fallback}
      profile={profile}
      fullProps={fullProps}
      style={style}
      className={className}
      passthroughAttrs={editAwareAttrs}
      buildWritePatch={buildWritePatch}
    />
  );
}
