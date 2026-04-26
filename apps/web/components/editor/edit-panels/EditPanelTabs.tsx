"use client";

import type { ElementEditTab } from "@/lib/editor-state";
import { cn } from "@/lib/utils";
import { Eye, Layers, Settings, Sliders, Sparkles } from "lucide-react";
import type { KeyboardEvent } from "react";

const TABS: Array<{ id: ElementEditTab; label: string; icon: typeof Layers }> = [
  { id: "content", label: "Content", icon: Layers },
  { id: "style", label: "Style", icon: Sliders },
  { id: "animation", label: "Animation", icon: Sparkles },
  { id: "visibility", label: "Visibility", icon: Eye },
  { id: "advanced", label: "Advanced", icon: Settings },
];

export type EditPanelTabsProps = {
  activeTab: ElementEditTab;
  onSelect: (tab: ElementEditTab) => void;
};

export function EditPanelTabs({ activeTab, onSelect }: EditPanelTabsProps) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const idx = TABS.findIndex((t) => t.id === activeTab);
    if (idx === -1) return;
    const delta = e.key === "ArrowRight" ? 1 : -1;
    const nextIdx = (idx + delta + TABS.length) % TABS.length;
    const next = TABS[nextIdx];
    if (next) onSelect(next.id);
  };

  return (
    <div
      role="tablist"
      aria-label="Element edit"
      onKeyDown={onKeyDown}
      className="grid grid-cols-5 border-b border-zinc-800"
    >
      {TABS.map((t) => {
        const selected = activeTab === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            data-testid={`element-edit-tab-${t.id}`}
            tabIndex={selected ? 0 : -1}
            className={cn(
              "flex flex-col items-center gap-1 px-1 py-2 text-[10px] text-zinc-400 transition-colors",
              selected
                ? "border-b-2 border-orange-400 text-zinc-100"
                : "border-b-2 border-transparent hover:text-zinc-200",
            )}
            onClick={() => onSelect(t.id)}
          >
            <Icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
