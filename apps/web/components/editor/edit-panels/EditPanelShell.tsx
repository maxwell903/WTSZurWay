"use client";

import {
  selectElementEditTab,
  selectSelectedComponentNode,
  useEditorStore,
} from "@/lib/editor-state";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { DeleteComponentButton } from "./DeleteComponentButton";
import { EditPanelTabs } from "./EditPanelTabs";
import { AdvancedTab } from "./tabs/AdvancedTab";
import { AnimationTab } from "./tabs/AnimationTab";
import { ContentTabHost } from "./tabs/ContentTabHost";
import { StyleTab } from "./tabs/StyleTab";
import { VisibilityTab } from "./tabs/VisibilityTab";

export function EditPanelShell() {
  const node = useEditorStore(selectSelectedComponentNode);
  const tab = useEditorStore(selectElementEditTab);
  const setElementEditTab = useEditorStore((s) => s.setElementEditTab);
  const exitElementEditMode = useEditorStore((s) => s.exitElementEditMode);

  // Selection vanished mid-flight (e.g. AI op deleted the node). Bail out.
  useEffect(() => {
    if (node === null) {
      exitElementEditMode();
    }
  }, [node, exitElementEditMode]);

  if (!node) return null;

  return (
    <div className="flex h-full flex-col" data-testid="edit-panel-shell">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-2 py-2">
        <button
          type="button"
          aria-label="Back to primary sidebar"
          data-testid="edit-panel-back"
          onClick={() => exitElementEditMode()}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Editing</span>
          <span data-testid="edit-panel-title" className="text-sm text-zinc-100">
            {node.type}
          </span>
        </div>
      </div>

      <EditPanelTabs activeTab={tab} onSelect={setElementEditTab} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "content" && <ContentTabHost node={node} />}
        {tab === "style" && <StyleTab node={node} />}
        {tab === "animation" && <AnimationTab node={node} />}
        {tab === "visibility" && <VisibilityTab node={node} />}
        {tab === "advanced" && <AdvancedTab />}
      </div>

      <div className="border-t border-zinc-800 p-2">
        <DeleteComponentButton />
      </div>
    </div>
  );
}
