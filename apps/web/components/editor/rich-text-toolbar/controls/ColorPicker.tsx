"use client";

import type { ToolbarCommands } from "@/components/editor/rich-text-toolbar/hooks/useToolbarCommands";
import { cn } from "@/lib/utils";

export type ColorPickerVariant = "text" | "highlight";

export type ColorPickerProps = {
  commands: ToolbarCommands;
  variant: ColorPickerVariant;
};

const PRESETS = [
  null, // "no color" / unset
  "#111827",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export function ColorPicker({ commands, variant }: ColorPickerProps) {
  const disabled = !commands.active;
  const ariaLabel = variant === "text" ? "Text color" : "Highlight color";

  const current =
    variant === "text"
      ? (commands.getMarkAttr("textStyle", "color") ?? null)
      : (commands.getMarkAttr("highlight", "color") ?? null);

  const setColor = (value: string | null) => {
    if (variant === "text") {
      if (value === null) commands.unsetMarkAttr("textStyle", "color");
      else commands.setMarkAttr("textStyle", { color: value });
    } else {
      if (value === null) commands.toggleMark("highlight", { color: null });
      else commands.setMarkAttr("highlight", { color: value });
    }
  };

  return (
    <details className={cn("relative inline-block", disabled && "pointer-events-none opacity-40")}>
      <summary
        aria-label={ariaLabel}
        title={ariaLabel}
        className="inline-flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded text-zinc-300 hover:bg-zinc-800 [&::-webkit-details-marker]:hidden"
      >
        <span
          className="block h-3.5 w-3.5 rounded-sm border border-zinc-600"
          style={{
            background: current ?? "transparent",
            backgroundImage:
              current === null
                ? "linear-gradient(45deg, transparent calc(50% - 1px), #ef4444 50%, transparent calc(50% + 1px))"
                : undefined,
          }}
        />
      </summary>
      <div className="absolute left-0 top-full z-50 mt-1 grid grid-cols-5 gap-1 rounded border border-zinc-700 bg-zinc-900 p-1.5 shadow-lg">
        {PRESETS.map((color) => (
          <button
            key={color ?? "__none__"}
            type="button"
            aria-label={color === null ? "No color" : color}
            title={color === null ? "Clear" : color}
            onClick={() => setColor(color)}
            className="h-5 w-5 rounded-sm border border-zinc-700"
            style={{
              background: color ?? "transparent",
              backgroundImage:
                color === null
                  ? "linear-gradient(45deg, transparent calc(50% - 1px), #ef4444 50%, transparent calc(50% + 1px))"
                  : undefined,
            }}
          />
        ))}
      </div>
    </details>
  );
}
