"use client";

import type { ToolbarCommands } from "@/components/editor/rich-text-toolbar/hooks/useToolbarCommands";
import { selectSelectedComponentNode, useEditorStore } from "@/lib/editor-state";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

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

// Accept #fff, #ffff, #ffffff, or #ffffffff (with optional leading #).
// Anchored at start + end so partial garbage doesn't sneak through.
const HEX_RE = /^#?[0-9a-fA-F]{3,8}$/;

function normalizeHex(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  if (!HEX_RE.test(trimmed)) return null;
  return trimmed.startsWith("#") ? trimmed.toLowerCase() : `#${trimmed.toLowerCase()}`;
}

// `<input type="color">` requires exactly `#rrggbb`. Coerce the live mark
// value (which may be `null`, a 3/4/8-digit hex, or invalid) into something
// the native picker accepts; anything that can't be coerced falls back to
// black (the picker can't render "no color").
const NATIVE_HEX_RE = /^#[0-9a-fA-F]{6}$/;
function normalizeForNativePicker(input: string | null): string {
  if (input && NATIVE_HEX_RE.test(input)) return input.toLowerCase();
  return "#000000";
}

export function ColorPicker({ commands, variant }: ColorPickerProps) {
  const disabled = !commands.active;
  const ariaLabel = variant === "text" ? "Text color" : "Highlight color";

  // Read-side coordination with StyleTab. For the text-color variant, when
  // the selection has no `textStyle.color` mark we fall back to the
  // enclosing component's `style.textColor` so the toolbar swatch and the
  // StyleTab swatch describe the same scope. Writes still go through
  // `commands.setMarkAttr` (per-range mark), unchanged.
  const selectedNode = useEditorStore(selectSelectedComponentNode);
  const markColor =
    variant === "text"
      ? (commands.getMarkAttr("textStyle", "color") ?? null)
      : (commands.getMarkAttr("highlight", "color") ?? null);
  const fallback = variant === "text" ? (selectedNode?.style.textColor ?? null) : null;
  const current = markColor ?? fallback;

  // Free-form hex input. Initialized from the live value when the popover
  // opens; the user can type a custom hex like "#f0e928" and press Enter
  // (or blur the field) to commit. Invalid input is silently ignored —
  // the field shakes by reverting to the live value on blur.
  const [hexDraft, setHexDraft] = useState<string>(current ?? "");
  useEffect(() => {
    setHexDraft(current ?? "");
  }, [current]);

  const setColor = (value: string | null) => {
    if (variant === "text") {
      if (value === null) commands.unsetMarkAttr("textStyle", "color");
      else commands.setMarkAttr("textStyle", { color: value });
    } else {
      if (value === null) commands.toggleMark("highlight", { color: null });
      else commands.setMarkAttr("highlight", { color: value });
    }
  };

  const commitHex = () => {
    const normalized = normalizeHex(hexDraft);
    if (normalized === null) {
      // Revert to live value on invalid input.
      setHexDraft(current ?? "");
      return;
    }
    setColor(normalized);
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
          // Use `backgroundColor` (longhand) + `backgroundImage` (longhand)
          // rather than `background` (shorthand). React 19 warns when a
          // shorthand and a related longhand are both set on the same
          // element because the resolution order can flip across renders.
          style={{
            backgroundColor: current ?? "transparent",
            backgroundImage:
              current === null
                ? "linear-gradient(45deg, transparent calc(50% - 1px), #ef4444 50%, transparent calc(50% + 1px))"
                : undefined,
          }}
        />
      </summary>
      {/*
        Grid layout via inline styles, NOT Tailwind classes. Tailwind v4's
        on-demand class generation occasionally misses dynamically-rendered
        popover classes. Inline `gridTemplateColumns` is bulletproof.
      */}
      <div
        className="absolute left-0 top-full z-50 mt-1 rounded border border-zinc-700 bg-zinc-900 p-1.5 shadow-lg"
        style={{ width: "max-content" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1.25rem)",
            gap: "0.25rem",
          }}
        >
          {PRESETS.map((color) => (
            <button
              key={color ?? "__none__"}
              type="button"
              aria-label={color === null ? "No color" : color}
              title={color === null ? "Clear" : color}
              onClick={() => setColor(color)}
              className="rounded-sm border border-zinc-700"
              style={{
                width: "1.25rem",
                height: "1.25rem",
                padding: 0,
                backgroundColor: color ?? "transparent",
                backgroundImage:
                  color === null
                    ? "linear-gradient(45deg, transparent calc(50% - 1px), #ef4444 50%, transparent calc(50% + 1px))"
                    : undefined,
              }}
            />
          ))}
        </div>
        {/*
          Free-form hex input — supports `#f0e928`, `#fff`, `#ffffffaa`,
          and the same without the `#`. Invalid input reverts to the live
          value on blur (no toast / shake; silent revert is fine for a
          power-user field). `commands.setMarkAttr` writes through the
          unified ToolbarCommands so single + broadcast modes both work.
        */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.5rem" }}>
          <span style={{ fontSize: 11, color: "#a1a1aa" }}>Hex</span>
          <input
            type="text"
            aria-label={`${ariaLabel} (hex)`}
            placeholder="#f0e928"
            value={hexDraft}
            onChange={(e) => setHexDraft(e.target.value)}
            onBlur={commitHex}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitHex();
              }
            }}
            // Avoid shrinking smaller than 9ch. Inline width keeps the
            // popover compact regardless of CSS environment.
            style={{
              width: "9ch",
              height: "1.5rem",
              padding: "0 0.375rem",
              fontSize: 11,
              borderRadius: "0.25rem",
              border: "1px solid #3f3f46",
              background: "#09090b",
              color: "#e4e4e7",
            }}
          />
          {/*
            Native swatch — opens the OS color wheel. `<input type="color">`
            only accepts 6-digit `#rrggbb`, so when there's no current color
            the swatch shows black; users who want alpha or "no color" use
            the presets / hex field above. Each onChange fires per move of
            the OS picker; that's the same UX as the legacy StyleTab swatch.
          */}
          <input
            type="color"
            aria-label={`${ariaLabel} (picker)`}
            value={normalizeForNativePicker(current)}
            onChange={(e) => setColor(e.target.value)}
            style={{
              width: "1.5rem",
              height: "1.5rem",
              padding: 0,
              border: "1px solid #3f3f46",
              borderRadius: "0.25rem",
              background: "#09090b",
              cursor: "pointer",
            }}
          />
        </div>
      </div>
    </details>
  );
}
