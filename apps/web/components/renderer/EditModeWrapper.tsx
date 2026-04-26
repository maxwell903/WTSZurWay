"use client";

import { cn } from "@/lib/utils";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

type Props = {
  id: string;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onContextMenu?: (id: string) => void;
  children: ReactNode;
};

export function EditModeWrapper({ id, selected, onSelect, onContextMenu, children }: Props) {
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onSelect?.(id);
  };

  const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(id);
  };

  // Keyboard parity for the click handler so the selection model is reachable
  // without a mouse. Enter selects; Shift+F10 / ContextMenu key opens the
  // context menu (matches OS conventions).
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(id);
      return;
    }
    if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.(id);
    }
  };

  return (
    <div
      data-edit-id={id}
      data-edit-selected={selected ? "true" : undefined}
      // biome-ignore lint/a11y/useSemanticElements: a real <button> cannot legally contain block-level children (sections, paragraphs, etc.) — EditModeWrapper makes those interactive in edit mode only.
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      className={cn(
        "outline-offset-2",
        selected
          ? "outline outline-2 outline-blue-500"
          : "hover:outline hover:outline-1 hover:outline-blue-300",
      )}
    >
      {children}
    </div>
  );
}
