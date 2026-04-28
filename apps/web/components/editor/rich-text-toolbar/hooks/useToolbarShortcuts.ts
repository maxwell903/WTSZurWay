"use client";

// Global Ctrl/Cmd + B / I / U / K shortcuts. Active whenever the floating
// rich-text toolbar is visible (single or broadcast mode); routes through
// the unified ToolbarCommands so broadcast scope works without special
// casing.

import type { ToolbarCommands } from "@/components/editor/rich-text-toolbar/hooks/useToolbarCommands";
import { useEffect } from "react";

export function useToolbarShortcuts(commands: ToolbarCommands): void {
  useEffect(() => {
    if (!commands.active) return;
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      // Don't intercept when the user is typing in a non-rich-text input
      // (e.g., the Heading level select). The TipTap editor's content area
      // is contenteditable, not <input>, so single-mode events still reach
      // here.
      const tag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "select") return;

      const key = e.key.toLowerCase();
      if (key === "b") {
        e.preventDefault();
        commands.toggleMark("bold");
      } else if (key === "i") {
        e.preventDefault();
        commands.toggleMark("italic");
      } else if (key === "u") {
        e.preventDefault();
        commands.toggleMark("underline");
      } else if (key === "k") {
        if (!commands.supportsLink) return;
        e.preventDefault();
        if (commands.isMarkActive("link")) {
          commands.setLink(null);
          return;
        }
        const previous = commands.getMarkAttr("link", "href");
        const href = window.prompt("Link URL", previous ?? "https://");
        if (href === null) return;
        if (href === "") {
          commands.setLink(null);
          return;
        }
        commands.setLink(href);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commands]);
}
