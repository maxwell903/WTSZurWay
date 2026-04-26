"use client";

import { MessageSquare } from "lucide-react";

export function RightSidebar() {
  return (
    <aside
      data-testid="right-sidebar"
      className="flex w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950"
    >
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <MessageSquare className="h-8 w-8 text-zinc-500" />
        <p className="text-sm text-zinc-400">
          Select a component to edit it, or chat with the AI assistant (coming soon).
        </p>
      </div>
    </aside>
  );
}
