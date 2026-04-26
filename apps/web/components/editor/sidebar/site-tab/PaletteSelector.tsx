"use client";

import { useEditorStore } from "@/lib/editor-state";
import { PALETTE_LIST } from "@/lib/setup-form/palettes";
import { cn } from "@/lib/utils";

export function PaletteSelector() {
  const palette = useEditorStore((s) => s.draftConfig.brand.palette);
  const setPalette = useEditorStore((s) => s.setPalette);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        Color palette
      </h3>
      <div className="grid grid-cols-2 gap-2" aria-label="Color palette">
        {PALETTE_LIST.map((p) => {
          const selected = p.id === palette;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={selected}
              data-testid={`palette-card-${p.id}`}
              className={cn(
                "flex flex-col gap-1 rounded-md border p-2 text-left transition-colors",
                selected
                  ? "border-orange-400 bg-zinc-900"
                  : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700",
              )}
              onClick={() => setPalette(p.id)}
            >
              <div className="flex h-6 overflow-hidden rounded">
                {p.swatches.map((color, idx) => (
                  <div
                    // The order of swatches is intrinsic to the palette;
                    // index is a stable identifier here.
                    // biome-ignore lint/suspicious/noArrayIndexKey: stable swatch order
                    key={idx}
                    className="flex-1"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="text-xs text-zinc-200">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
