"use client";

// Reads the editor instance currently being edited (single-mode only;
// broadcast mode resolves to `null` because no editor is mounted there).
// Subscribes to the editor-registry so the toolbar re-renders when the
// active editor mounts/unmounts.

import {
  getEditor,
  getEditorRegistryVersion,
  makeEditorKey,
  subscribeEditors,
} from "@/components/renderer/editor-registry";
import { useEditorStore } from "@/lib/editor-state";
import type { Editor } from "@tiptap/react";
import { useSyncExternalStore } from "react";

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

  if (!scope || scope.mode !== "single") return null;
  const key = makeEditorKey(scope.id, scope.propKey);
  return getEditor(key) ?? null;
}
