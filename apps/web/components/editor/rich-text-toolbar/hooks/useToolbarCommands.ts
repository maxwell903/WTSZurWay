"use client";

// Unified command interface every toolbar control consumes. Branches
// internally on `textEditingScope.mode`:
//
//   "single"     → dispatches against the active TipTap Editor instance
//                  (caret-aware; queries return the mark/attr at the
//                   current selection)
//   "broadcast"  → walks every node in `scope.ids`, transforms each doc
//                  via the pure JSON helpers in `lib/rich-text/broadcast.ts`,
//                  and writes back through `setComponentProps`. State
//                  queries return "active" only when the answer is uniform
//                  across every selected doc (Google-Docs multi-cell
//                  semantics).
//
// Toolbar controls take `ToolbarCommands` instead of an Editor reference,
// so the same UI works in either mode.

import {
  broadcastBlockAttr,
  broadcastList,
  broadcastMarkToggle,
  collectBroadcastDocs,
} from "@/components/editor/rich-text-toolbar/broadcast/applyMarkBroadcast";
import { useActiveTipTapEditor } from "@/components/editor/rich-text-toolbar/hooks/useActiveTipTapEditor";
import { useEditorStore } from "@/lib/editor-state";
import { isBlockAttrUniformAcrossDocs, isMarkActiveAcrossDocs } from "@/lib/rich-text/broadcast";
import { useMemo } from "react";

export type ToolbarMode = "single" | "broadcast";

export type ToolbarCommands = {
  active: boolean;
  mode: ToolbarMode | null;
  broadcastCount: number;
  // capability flags — link needs caret position, so it's broadcast-disabled
  supportsLink: boolean;

  // -------- state queries --------
  isMarkActive: (markName: string, attrs?: Record<string, unknown>) => boolean;
  getMarkAttr: (markName: string, attrKey: string) => string | undefined;
  isBlockAttrUniform: (blockTypes: string[], attrKey: string, value: unknown) => boolean;
  getBlockAttr: (blockTypes: string[], attrKey: string) => string | undefined;
  isListActive: (listType: "bulletList" | "orderedList") => boolean;

  // -------- commands --------
  toggleMark: (markName: string, attrs?: Record<string, unknown>) => void;
  // For TextStyle attribute marks (color, fontFamily, fontSize, etc.).
  setMarkAttr: (markName: string, attrs: Record<string, unknown>) => void;
  unsetMarkAttr: (markName: string, attrKey: string) => void;
  setBlockAttr: (blockTypes: string[], attrKey: string, value: unknown) => void;
  unsetBlockAttr: (blockTypes: string[], attrKey: string) => void;
  toggleList: (listType: "bulletList" | "orderedList") => void;
  setLink: (href: string | null) => void;
};

const NOOP_COMMANDS: ToolbarCommands = {
  active: false,
  mode: null,
  broadcastCount: 0,
  supportsLink: false,
  isMarkActive: () => false,
  getMarkAttr: () => undefined,
  isBlockAttrUniform: () => false,
  getBlockAttr: () => undefined,
  isListActive: () => false,
  toggleMark: () => {},
  setMarkAttr: () => {},
  unsetMarkAttr: () => {},
  setBlockAttr: () => {},
  unsetBlockAttr: () => {},
  toggleList: () => {},
  setLink: () => {},
};

export function useToolbarCommands(): ToolbarCommands {
  const scope = useEditorStore((s) => s.textEditingScope);
  const editor = useActiveTipTapEditor();

  return useMemo<ToolbarCommands>(() => {
    if (!scope) return NOOP_COMMANDS;

    if (scope.mode === "single") {
      if (!editor) return NOOP_COMMANDS;
      return {
        active: true,
        mode: "single",
        broadcastCount: 0,
        supportsLink: true,
        isMarkActive: (markName, attrs) =>
          attrs ? editor.isActive(markName, attrs) : editor.isActive(markName),
        getMarkAttr: (markName, attrKey) => {
          const value = editor.getAttributes(markName)?.[attrKey];
          return typeof value === "string" ? value : undefined;
        },
        isBlockAttrUniform: (_blockTypes, attrKey, value) => {
          // Single mode: query the block at the caret. Returns true iff
          // the active block's attr matches.
          // Try both paragraph + heading; first match wins.
          const fromP = editor.getAttributes("paragraph")?.[attrKey];
          const fromH = editor.getAttributes("heading")?.[attrKey];
          return (fromP ?? fromH) === value;
        },
        getBlockAttr: (_blockTypes, attrKey) => {
          const fromP = editor.getAttributes("paragraph")?.[attrKey];
          if (typeof fromP === "string" && fromP !== "") return fromP;
          const fromH = editor.getAttributes("heading")?.[attrKey];
          return typeof fromH === "string" && fromH !== "" ? fromH : undefined;
        },
        isListActive: (listType) => editor.isActive(listType),
        toggleMark: (markName, attrs) => {
          // For attribute marks (e.g., textStyle's color/fontSize), use
          // setMark; for plain on/off marks (bold/italic/etc.), use the
          // commonName toggle if the editor has one. Falling back to
          // chain().toggleMark(markName) handles everything generically.
          if (attrs) {
            editor.chain().focus().setMark(markName, attrs).run();
            return;
          }
          editor.chain().focus().toggleMark(markName).run();
        },
        setMarkAttr: (markName, attrs) => {
          editor.chain().focus().setMark(markName, attrs).run();
        },
        unsetMarkAttr: (markName, attrKey) => {
          // Clear a single attribute on the existing mark range. We do
          // this by setting it to null, which TipTap interprets as "remove
          // this attr"; if the mark ends up with no attrs at all, callers
          // are responsible for issuing a separate unsetMark.
          editor
            .chain()
            .focus()
            .setMark(markName, { [attrKey]: null })
            .run();
        },
        setBlockAttr: (_blockTypes, attrKey, value) => {
          // Map common attr keys to TipTap commands when available; fall
          // back to updateAttributes by node type.
          if (attrKey === "textAlign") {
            editor
              .chain()
              .focus()
              .setTextAlign(value as "left" | "center" | "right" | "justify")
              .run();
            return;
          }
          if (attrKey === "lineHeight") {
            if (value === null) editor.chain().focus().unsetLineHeight().run();
            else editor.chain().focus().setLineHeight(String(value)).run();
            return;
          }
          if (attrKey === "dir") {
            if (value === null) editor.chain().focus().unsetDirection().run();
            else
              editor
                .chain()
                .focus()
                .setDirection(value as "ltr" | "rtl")
                .run();
            return;
          }
          // Generic fallback.
          editor
            .chain()
            .focus()
            .updateAttributes("paragraph", { [attrKey]: value })
            .run();
        },
        unsetBlockAttr: (blockTypes, attrKey) => {
          for (const type of blockTypes) {
            editor.chain().focus().resetAttributes(type, attrKey).run();
          }
        },
        toggleList: (listType) => {
          if (listType === "bulletList") editor.chain().focus().toggleBulletList().run();
          else editor.chain().focus().toggleOrderedList().run();
        },
        setLink: (href) => {
          if (href === null) {
            editor.chain().focus().unsetLink().run();
          } else {
            editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
          }
        },
      };
    }

    // ----- broadcast -----
    const ids = scope.ids;
    const docs = collectBroadcastDocs(ids).map((entry) => entry.doc);

    return {
      active: true,
      mode: "broadcast",
      broadcastCount: ids.length,
      supportsLink: false,
      isMarkActive: (markName) => isMarkActiveAcrossDocs(docs, markName),
      // In broadcast we can't surface a single attr value because docs
      // may disagree. Toolbar controls treat undefined as "not uniform".
      getMarkAttr: () => undefined,
      isBlockAttrUniform: (blockTypes, attrKey, value) =>
        isBlockAttrUniformAcrossDocs(docs, blockTypes, attrKey, value),
      getBlockAttr: () => undefined,
      isListActive: () => false,
      toggleMark: (markName, attrs) => {
        if (attrs) {
          broadcastMarkToggle(ids, markName, attrs, "set");
        } else {
          broadcastMarkToggle(ids, markName, undefined, "toggle");
        }
      },
      setMarkAttr: (markName, attrs) => {
        broadcastMarkToggle(ids, markName, attrs, "set");
      },
      unsetMarkAttr: (markName, attrKey) => {
        broadcastMarkToggle(ids, markName, { [attrKey]: null }, "set");
      },
      setBlockAttr: (blockTypes, attrKey, value) => {
        broadcastBlockAttr(ids, blockTypes, attrKey, value);
      },
      unsetBlockAttr: (blockTypes, attrKey) => {
        broadcastBlockAttr(ids, blockTypes, attrKey, null);
      },
      toggleList: (listType) => {
        // Wrap if at least one doc currently has no list at the top
        // level; otherwise unwrap. Symmetric with the mark-toggle
        // semantics.
        const everyAlreadyList = docs.every((doc) =>
          (doc.content ?? []).every((b) => b.type === listType),
        );
        broadcastList(ids, listType, everyAlreadyList ? "unwrap" : "wrap");
      },
      // Link is disabled in broadcast (capability flag). This stub is
      // never called because controls check supportsLink first.
      setLink: () => {},
    };
  }, [scope, editor]);
}
