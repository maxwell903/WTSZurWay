"use client";

import { EditPanelShell } from "@/components/editor/edit-panels/EditPanelShell";
import { selectIsElementEditMode, useEditorStore } from "@/lib/editor-state";
import type { LeftSidebarTab } from "@/lib/editor-state";
import { cn } from "@/lib/utils";
import { Database, FileText, Layers, Palette } from "lucide-react";
import { AddTab } from "./add-tab/AddTab";
import { DataTab } from "./data-tab/DataTab";
import { PagesTab } from "./pages-tab/PagesTab";
import { SiteTab } from "./site-tab/SiteTab";

// Sprint 6 deviation: shadcn Tabs is not installed (see DECISIONS.md
// 2026-04-25 Sprint 6 entry). The four-tab list is composed inline with
// role="tab" / aria-selected so the a11y semantics still hold.

const TAB_TRIGGERS: Array<{ id: LeftSidebarTab; label: string; icon: typeof Palette }> = [
  { id: "site", label: "Site", icon: Palette },
  { id: "pages", label: "Pages", icon: FileText },
  { id: "add", label: "Add", icon: Layers },
  { id: "data", label: "Data", icon: Database },
];

export function LeftSidebar() {
  const tab = useEditorStore((s) => s.leftSidebarTab);
  const setTab = useEditorStore((s) => s.setLeftSidebarTab);
  const isElementEdit = useEditorStore(selectIsElementEditMode);

  if (isElementEdit) {
    return (
      <aside
        data-testid="left-sidebar"
        data-mode="element-edit"
        className="flex w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950"
      >
        <EditPanelShell />
      </aside>
    );
  }

  return (
    <aside
      data-testid="left-sidebar"
      data-mode="primary"
      className="flex w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950"
    >
      <div
        role="tablist"
        aria-label="Editor sidebar"
        className="grid grid-cols-4 border-b border-zinc-800"
      >
        {TAB_TRIGGERS.map((t) => {
          const selected = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              data-testid={`left-sidebar-tab-${t.id}`}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2 text-[11px] text-zinc-400 transition-colors",
                selected
                  ? "border-b-2 border-orange-400 text-zinc-100"
                  : "border-b-2 border-transparent hover:text-zinc-200",
              )}
              onClick={() => setTab(t.id)}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1">
        {tab === "site" && <SiteTab />}
        {tab === "pages" && <PagesTab />}
        {tab === "add" && <AddTab />}
        {tab === "data" && <DataTab />}
      </div>
    </aside>
  );
}
