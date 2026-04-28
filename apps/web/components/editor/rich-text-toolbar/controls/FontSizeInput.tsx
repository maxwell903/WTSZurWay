"use client";

// Font size combobox: preset dropdown (Word/Excel-style) plus free-form
// text entry. Preset items and the chevron use `onMouseDown.preventDefault`
// so opening the menu and clicking a preset never steals focus from the
// editor — the user's text-selection highlight stays visible while they
// pick a size.

import type { ToolbarCommands } from "@/components/editor/rich-text-toolbar/hooks/useToolbarCommands";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const PRESET_SIZES_PX = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

// Bare numbers (e.g. "20") get a "px" suffix; values that already carry a
// CSS unit pass through verbatim ("1.25em", "120%", "1.5rem"). Anything
// non-numeric is left alone so users can paste odd values they want to try.
function normalizeSize(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  if (/^\d+(\.\d+)?$/.test(trimmed)) return `${trimmed}px`;
  return trimmed;
}

export function FontSizeInput({ commands }: { commands: ToolbarCommands }) {
  const disabled = !commands.active;
  const live = commands.getMarkAttr("textStyle", "fontSize") ?? "";
  const [draft, setDraft] = useState(live);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Reset the draft when the caret moves to a span with a different size
  // (single mode) — broadcast keeps the draft empty since values may
  // diverge across docs.
  useEffect(() => {
    setDraft(live);
  }, [live]);

  // Close the preset panel on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const apply = (raw: string) => {
    if (!commands.active) return;
    const value = normalizeSize(raw);
    if (value === "") {
      commands.unsetMarkAttr("textStyle", "fontSize");
    } else {
      commands.setMarkAttr("textStyle", { fontSize: value });
    }
    setDraft(value);
  };

  return (
    <div ref={wrapperRef} className="relative inline-flex items-stretch">
      <input
        type="text"
        aria-label="Font size"
        title="Font size (e.g. 16, 16px, 1.25em, 120%)"
        placeholder="size"
        disabled={disabled}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => apply(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply(draft);
          }
        }}
        className={cn(
          "h-7 w-14 rounded-l border border-r-0 border-zinc-700 bg-zinc-900 px-1.5 text-xs text-zinc-200",
          disabled && "cursor-not-allowed opacity-40",
        )}
      />
      <button
        type="button"
        aria-label="Font size presets"
        aria-expanded={open}
        title="Pick a preset size"
        disabled={disabled}
        // preventDefault on mousedown keeps DOM focus on the editor so the
        // user's selection highlight stays painted while the panel opens.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-7 w-5 items-center justify-center rounded-r border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800",
          disabled && "cursor-not-allowed opacity-40",
        )}
      >
        <ChevronDown size={12} />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label="Font size presets"
          className="absolute left-0 top-full z-50 mt-1 max-h-64 w-20 overflow-y-auto rounded border border-zinc-700 bg-zinc-900 py-1 shadow-lg"
        >
          {PRESET_SIZES_PX.map((px) => {
            const value = `${px}px`;
            const active = live === value;
            return (
              <button
                key={px}
                type="button"
                role="option"
                aria-selected={active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  apply(value);
                  setOpen(false);
                }}
                className={cn(
                  "block w-full px-2 py-1 text-left text-xs",
                  active ? "bg-orange-400/20 text-orange-300" : "text-zinc-200 hover:bg-zinc-800",
                )}
              >
                {px}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
