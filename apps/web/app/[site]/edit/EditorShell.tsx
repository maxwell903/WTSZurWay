"use client";

import { Canvas } from "@/components/editor/canvas/Canvas";
import { DndCanvasProvider } from "@/components/editor/canvas/dnd/DndCanvasProvider";
import { LeftSidebar } from "@/components/editor/sidebar/LeftSidebar";
import { RightSidebar } from "@/components/editor/sidebar/RightSidebar";
import { TopBar } from "@/components/editor/topbar/TopBar";
import { Toaster } from "@/components/ui/sonner";
import { useEditorStore } from "@/lib/editor-state";
import type { SiteConfig } from "@/lib/site-config";
import { useEffect } from "react";

export type EditorShellProps = {
  siteId: string;
  siteSlug: string;
  workingVersionId: string;
  initialConfig: SiteConfig;
};

export function EditorShell({
  siteId,
  siteSlug,
  workingVersionId,
  initialConfig,
}: EditorShellProps) {
  const hydrate = useEditorStore((s) => s.hydrate);

  useEffect(() => {
    hydrate({ siteId, siteSlug, workingVersionId, initialConfig });
  }, [hydrate, siteId, siteSlug, workingVersionId, initialConfig]);

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <TopBar />
      <DndCanvasProvider>
        <div className="flex flex-1 overflow-hidden">
          <LeftSidebar />
          <Canvas />
          <RightSidebar />
        </div>
      </DndCanvasProvider>
      <Toaster />
    </div>
  );
}
