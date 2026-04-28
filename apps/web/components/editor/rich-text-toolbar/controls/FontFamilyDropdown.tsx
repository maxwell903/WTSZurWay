"use client";

import type { ToolbarCommands } from "@/components/editor/rich-text-toolbar/hooks/useToolbarCommands";
import { cn } from "@/lib/utils";

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier New", value: '"Courier New", monospace' },
  { label: "Verdana", value: "Verdana, sans-serif" },
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
        "h-7 max-w-[8rem] rounded border border-zinc-700 bg-zinc-900 px-1.5 text-xs text-zinc-200",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {FONT_FAMILIES.map((f) => (
        <option key={f.label} value={f.value}>
          {f.label}
        </option>
      ))}
    </select>
  );
}
