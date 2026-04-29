"use client";

// The floating rich-text toolbar. Reads a unified ToolbarCommands object
// (single or broadcast mode), wires button clicks through it, and
// registers the global Ctrl/Cmd + B/I/U/K keyboard shortcuts.

import { useToolbarCommands } from "@/components/editor/rich-text-toolbar/hooks/useToolbarCommands";
import { useToolbarShortcuts } from "@/components/editor/rich-text-toolbar/hooks/useToolbarShortcuts";
import {
  Bold,
  Italic,
  Strikethrough,
  Subscript,
  Superscript,
  Underline as UnderlineIcon,
} from "lucide-react";
import { AlignmentGroup } from "./controls/AlignmentGroup";
import { CasePopover } from "./controls/CasePopover";
import { ColorPicker } from "./controls/ColorPicker";
import { DirectionToggle } from "./controls/DirectionToggle";
import { FontFamilyDropdown } from "./controls/FontFamilyDropdown";
import { FontSizeInput } from "./controls/FontSizeInput";
import { IndentButtons } from "./controls/IndentButtons";
import { LinkButton } from "./controls/LinkButton";
import { ListButtons } from "./controls/ListButtons";
import { MarkButton } from "./controls/MarkButton";
import { SpacingPopover } from "./controls/SpacingPopover";

function Divider() {
  return <span aria-hidden="true" className="h-4 w-px shrink-0 bg-zinc-700" />;
}

export function RichTextToolbar() {
  const commands = useToolbarCommands();
  useToolbarShortcuts(commands);

  return (
    <div
      data-testid="rich-text-toolbar"
      data-toolbar-mode={commands.mode ?? ""}
      role="toolbar"
      aria-label="Text formatting"
      className="pointer-events-auto flex flex-nowrap items-center gap-2 whitespace-nowrap rounded-md border border-zinc-700 bg-zinc-900/95 px-2 py-1 shadow-lg backdrop-blur"
    >
      {commands.mode === "broadcast" ? (
        <span
          data-testid="rich-text-toolbar-broadcast-badge"
          aria-live="polite"
          className="inline-flex items-center rounded bg-orange-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-300"
        >
          Broadcasting to {commands.broadcastCount}{" "}
          {commands.broadcastCount === 1 ? "element" : "elements"}
        </span>
      ) : null}
      <FontFamilyDropdown commands={commands} />
      <FontSizeInput commands={commands} />
      <Divider />
      <div className="flex items-center gap-0.5">
        <MarkButton commands={commands} markName="bold" ariaLabel="Bold" shortcut="Ctrl+B">
          <Bold size={14} />
        </MarkButton>
        <MarkButton commands={commands} markName="italic" ariaLabel="Italic" shortcut="Ctrl+I">
          <Italic size={14} />
        </MarkButton>
        <MarkButton
          commands={commands}
          markName="underline"
          ariaLabel="Underline"
          shortcut="Ctrl+U"
        >
          <UnderlineIcon size={14} />
        </MarkButton>
        <MarkButton commands={commands} markName="strike" ariaLabel="Strikethrough">
          <Strikethrough size={14} />
        </MarkButton>
      </div>
      <Divider />
      <ColorPicker commands={commands} variant="text" />
      <ColorPicker commands={commands} variant="highlight" />
      <Divider />
      <div className="flex items-center gap-0.5">
        <MarkButton commands={commands} markName="subscript" ariaLabel="Subscript">
          <Subscript size={14} />
        </MarkButton>
        <MarkButton commands={commands} markName="superscript" ariaLabel="Superscript">
          <Superscript size={14} />
        </MarkButton>
      </div>
      <LinkButton commands={commands} />
      <Divider />
      <AlignmentGroup commands={commands} />
      <Divider />
      <ListButtons commands={commands} />
      <IndentButtons commands={commands} />
      <Divider />
      <SpacingPopover commands={commands} />
      <CasePopover commands={commands} />
      <DirectionToggle commands={commands} />
    </div>
  );
}
