"use client";

// Mounts the floating rich-text toolbar at the top of the canvas viewport
// when `textEditingScope` is active. Fixed-position so it doesn't push
// canvas content; renders nothing when no scope is set.
//
// Mounted unconditionally inside the Canvas (it self-hides via the scope
// check) so the underlying components don't need to know whether a
// toolbar is active.

import { useEditorStore } from "@/lib/editor-state";
import { RichTextToolbar } from "./RichTextToolbar";

export function RichTextToolbarPortal() {
  const scope = useEditorStore((s) => s.textEditingScope);
  if (!scope) return null;
  return (
    <div
      data-testid="rich-text-toolbar-portal"
      className="pointer-events-none fixed left-1/2 top-2 z-50 -translate-x-1/2"
    >
      <RichTextToolbar />
    </div>
  );
}
