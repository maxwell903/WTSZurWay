"use client";

// The Sprint 6 plan asks for separate Heading + Body font dropdowns when the
// schema supports them, and a single dropdown when the schema only has a
// `fontFamily` field. The current site-config schema (Sprint 3) exposes only
// `brand.fontFamily`, so this component renders a single dropdown. When the
// schema gains separate fields, add the second dropdown here without
// changing the action contract.

import { Label } from "@/components/ui/label";
import { useEditorStore } from "@/lib/editor-state";

const FONT_OPTIONS = [
  "Inter",
  "Manrope",
  "Source Sans 3",
  "Lora",
  "Merriweather",
  "Playfair Display",
] as const;

export function FontSelector() {
  const fontFamily = useEditorStore((s) => s.draftConfig.brand.fontFamily);
  const setFontFamily = useEditorStore((s) => s.setFontFamily);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Font</h3>
      <div className="space-y-1.5">
        <Label htmlFor="font-family" className="text-xs text-zinc-300">
          Font family
        </Label>
        <select
          id="font-family"
          data-testid="font-family-select"
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-100"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
