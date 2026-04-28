// Module-scoped registry of mounted TipTap Editor instances, keyed by
// "<nodeId>::<propKey>". Maintained by TipTapEditableSlot's mount/unmount
// effect; consumed by the rich-text toolbar which lives as a sibling of
// the canvas (not an ancestor), so React Context isn't a viable channel.
//
// The toolbar calls `getActiveEditor()` on each render to find the editor
// that should receive its commands. Subscribers are notified when the set
// changes so the toolbar can re-render when an editor mounts/unmounts.

import type { Editor } from "@tiptap/react";

export type EditorKey = string; // `${nodeId}::${propKey}`

const editors = new Map<EditorKey, Editor>();
const listeners = new Set<() => void>();
// Monotonic version counter so `useSyncExternalStore` callers can return a
// stable snapshot value that changes only when the registry mutates.
let version = 0;

export function makeEditorKey(nodeId: string, propKey: string): EditorKey {
  return `${nodeId}::${propKey}`;
}

export function registerEditor(key: EditorKey, editor: Editor): void {
  editors.set(key, editor);
  version++;
  for (const fn of listeners) fn();
}

export function unregisterEditor(key: EditorKey): void {
  editors.delete(key);
  version++;
  for (const fn of listeners) fn();
}

export function getEditorRegistryVersion(): number {
  return version;
}

export function getEditor(key: EditorKey): Editor | undefined {
  return editors.get(key);
}

export function subscribeEditors(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// Test helper.
export function __resetEditorRegistryForTests(): void {
  editors.clear();
  listeners.clear();
  version = 0;
}
