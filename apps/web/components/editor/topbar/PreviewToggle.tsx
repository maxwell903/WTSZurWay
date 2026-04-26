"use client";

import { useEditorStore } from "@/lib/editor-state";
import { cn } from "@/lib/utils";

export function PreviewToggle() {
  const previewMode = useEditorStore((s) => s.previewMode);
  const setPreviewMode = useEditorStore((s) => s.setPreviewMode);

  return (
    <div
      role="group"
      aria-label="Editor mode"
      className="inline-flex h-9 items-center rounded-md border border-zinc-700 bg-transparent p-0.5 text-xs"
    >
      <button
        type="button"
        data-testid="preview-toggle-edit"
        aria-pressed={!previewMode}
        className={cn(
          "rounded px-3 py-1 text-zinc-300 transition-colors",
          !previewMode && "bg-zinc-100 text-zinc-900",
        )}
        onClick={() => setPreviewMode(false)}
      >
        Edit
      </button>
      <button
        type="button"
        data-testid="preview-toggle-preview"
        aria-pressed={previewMode}
        className={cn(
          "rounded px-3 py-1 text-zinc-300 transition-colors",
          previewMode && "bg-zinc-100 text-zinc-900",
        )}
        onClick={() => setPreviewMode(true)}
      >
        Preview
      </button>
    </div>
  );
}
