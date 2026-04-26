"use client";

import { Database } from "lucide-react";

export function DataTab() {
  return (
    <div
      data-testid="data-tab"
      className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center"
    >
      <Database className="h-8 w-8 text-zinc-500" />
      <p className="text-sm text-zinc-400">
        Form submissions will appear here once Sprint 10 ships.
      </p>
    </div>
  );
}
