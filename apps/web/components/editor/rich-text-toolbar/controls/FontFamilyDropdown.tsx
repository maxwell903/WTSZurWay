"use client";

import type { ToolbarCommands } from "@/components/editor/rich-text-toolbar/hooks/useToolbarCommands";
import { cn } from "@/lib/utils";

// Grouped font list rendered as <optgroup> blocks. Each option's `value`
// is what TipTap writes inline as `font-family`. Web-font entries
// reference the CSS variable defined by `next/font/google` in
// app/layout.tsx — keeping the variable + a system fallback stack means
// the editor and the rendered site share a single load path.
const FONT_GROUPS: Array<{
  label: string;
  fonts: Array<{ label: string; value: string }>;
}> = [
  {
    label: "System",
    fonts: [
      { label: "Default", value: "" },
      { label: "Arial", value: "Arial, sans-serif" },
      { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
      { label: "Inter", value: "Inter, sans-serif" },
      { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
      { label: "Georgia", value: "Georgia, serif" },
      { label: "Courier New", value: '"Courier New", monospace' },
      { label: "Verdana", value: "Verdana, sans-serif" },
    ],
  },
  {
    label: "Serif",
    fonts: [
      { label: "Cormorant Garamond", value: "var(--font-cormorant), Georgia, serif" },
      { label: "Libre Baskerville", value: "var(--font-baskerville), Georgia, serif" },
      { label: "Source Serif 4", value: "var(--font-source-serif), Georgia, serif" },
      { label: "Roboto Slab", value: "var(--font-roboto-slab), Georgia, serif" },
      { label: "Bitter", value: "var(--font-bitter), Georgia, serif" },
    ],
  },
  {
    label: "Display",
    fonts: [
      { label: "Playfair Display", value: "var(--font-playfair), Georgia, serif" },
      { label: "DM Serif Display", value: "var(--font-dm-serif), Georgia, serif" },
      { label: "Abril Fatface", value: "var(--font-abril), Georgia, serif" },
      { label: "Bebas Neue", value: "var(--font-bebas), Impact, sans-serif" },
      { label: "Oswald", value: "var(--font-oswald), Impact, sans-serif" },
      { label: "Anton", value: "var(--font-anton), Impact, sans-serif" },
      { label: "Archivo Black", value: "var(--font-archivo-black), Impact, sans-serif" },
    ],
  },
  {
    label: "Sans",
    fonts: [
      { label: "Poppins", value: "var(--font-poppins), Inter, sans-serif" },
      { label: "Montserrat", value: "var(--font-montserrat), Inter, sans-serif" },
      { label: "Manrope", value: "var(--font-manrope), Inter, sans-serif" },
      { label: "Inter Tight", value: "var(--font-inter-tight), Inter, sans-serif" },
      { label: "Quicksand", value: "var(--font-quicksand), Inter, sans-serif" },
      { label: "Space Grotesk", value: "var(--font-space-grotesk), Inter, sans-serif" },
    ],
  },
  {
    label: "Script",
    fonts: [
      { label: "Caveat", value: "var(--font-caveat), cursive" },
      { label: "Pacifico", value: "var(--font-pacifico), cursive" },
      { label: "Dancing Script", value: "var(--font-dancing-script), cursive" },
      { label: "Lobster", value: "var(--font-lobster), cursive" },
      { label: "Permanent Marker", value: "var(--font-permanent-marker), cursive" },
    ],
  },
  {
    label: "Mono",
    fonts: [
      { label: "JetBrains Mono", value: "var(--font-jetbrains-mono), monospace" },
      { label: "Fira Mono", value: "var(--font-fira-mono), monospace" },
    ],
  },
];

export function FontFamilyDropdown({ commands }: { commands: ToolbarCommands }) {
  const disabled = !commands.active;
  // In broadcast mode getMarkAttr returns undefined (docs may disagree);
  // dropdown shows "Default" as a neutral starting point.
  const current = commands.getMarkAttr("textStyle", "fontFamily") ?? "";

  return (
    <select
      aria-label="Font family"
      title="Font family"
      disabled={disabled}
      value={current}
      onChange={(e) => {
        const value = e.target.value;
        if (value === "") {
          commands.unsetMarkAttr("textStyle", "fontFamily");
        } else {
          commands.setMarkAttr("textStyle", { fontFamily: value });
        }
      }}
      className={cn(
        "h-7 max-w-[10rem] rounded border border-zinc-700 bg-zinc-900 px-1.5 text-xs text-zinc-200",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {FONT_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.fonts.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
