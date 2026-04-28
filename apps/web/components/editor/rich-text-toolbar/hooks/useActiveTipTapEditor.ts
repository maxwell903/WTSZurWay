"use client";

// Reads the editor instance currently being edited (single-mode only;
// broadcast mode resolves to `null` because no editor is mounted there).
// Subscribes to the editor-registry so the toolbar re-renders when the
// active editor mounts/unmounts. ALSO subscribes to the active editor's
// own transaction stream so toolbar controls (font dropdown, color
// picker, mark buttons, etc.) re-read state on every keystroke /
// selection change — without this the dropdown lags one keystroke behind
// the actual editor state because TipTap's mark commands take effect
// immediately on the editor but our toolbar only reads on render.

import {
  getEditor,
  getEditorRegistryVersion,
  makeEditorKey,
  subscribeEditors,
} from "@/components/renderer/editor-registry";
import { useEditorStore } from "@/lib/editor-state";
import type { Editor } from "@tiptap/react";
import { useEffect, useState, useSyncExternalStore } from "react";

export function useActiveTipTapEditor(): Editor | null {
  const scope = useEditorStore((s) => s.textEditingScope);
  // Subscribe to registry mount/unmount events so we re-render when the
  // editor we want appears or disappears. The version number is a stable
  // snapshot that changes only when the registry actually mutates.
  useSyncExternalStore(
    (cb) => subscribeEditors(cb),
    getEditorRegistryVersion,
    () => 0,
  );

  const editor =
    scope && scope.mode === "single"
      ? (getEditor(makeEditorKey(scope.id, scope.propKey)) ?? null)
      : null;

  // Force a re-render on every editor transaction (insert, delete, mark
  // change, selection change, stored-mark update). The toolbar reads
  // `editor.getAttributes(...)` and `editor.isActive(...)` on render;
  // without this hook, picking a font from the dropdown updates the
  // editor's stored mark but the dropdown's own DOM stays on the old
  // value until something else triggers a re-render. Increment a tick
  // counter on `transaction` and React schedules the re-render.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const onTransaction = () => setTick((n) => n + 1);
    editor.on("transaction", onTransaction);
    return () => {
      editor.off("transaction", onTransaction);
    };
  }, [editor]);

  return editor;
}
