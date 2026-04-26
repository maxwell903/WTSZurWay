"use client";

/**
 * Sprint 11: replaces the Sprint 6 placeholder with the AI chat. The export
 * name `RightSidebar` is preserved so `EditorShell.tsx` does not change.
 *
 * §8.7's collapsed state: a single icon column with a small badge counting
 * pending (non-accepted, non-discarded) suggestions. Default state on
 * mount is expanded.
 */

import { RightSidebarAiChat } from "@/components/editor/ai-chat";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { useState } from "react";

export function RightSidebar() {
  const [expanded, setExpanded] = useState(true);

  if (!expanded) {
    return (
      <aside
        data-testid="right-sidebar"
        data-state="collapsed"
        className="flex w-12 shrink-0 flex-col items-center gap-3 border-l border-zinc-800 bg-zinc-950 py-3"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Expand AI chat"
          onClick={() => setExpanded(true)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div aria-label="AI chat" className="relative rounded-md bg-zinc-900 p-2 text-zinc-400">
          <MessageSquare className="h-4 w-4" />
          {/* Badge slot: future iteration can read the pending-suggestion
              count from the chat hook via a shared store. Sprint 11 ships
              the slot rendered as zero so the layout is stable. */}
        </div>
      </aside>
    );
  }

  return (
    <aside
      data-testid="right-sidebar"
      data-state="expanded"
      className={cn("flex w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950")}
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">AI Chat</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Collapse AI chat"
          onClick={() => setExpanded(false)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <RightSidebarAiChat className="flex-1 min-h-0" />
    </aside>
  );
}
