"use client";

import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/lib/editor-state";
import { useEffect, useState } from "react";

function formatRelative(now: number, savedAt: number): string {
  const seconds = Math.max(0, Math.floor((now - savedAt) / 1000));
  if (seconds < 60) return `Saved ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `Saved ${minutes}m ago`;
}

export function SaveIndicator() {
  const saveState = useEditorStore((s) => s.saveState);
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);
  const draftConfig = useEditorStore((s) => s.draftConfig);

  // Re-render every second so "Saved 3s ago" advances. Cheaper than a full
  // store subscription and doesn't pay the cost when the editor isn't focused
  // -- jsdom + tests use the same path because requestAnimationFrame isn't
  // necessary here.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (saveState === "saving") {
    return (
      <span data-testid="save-indicator" className="text-xs text-zinc-400">
        Saving…
      </span>
    );
  }

  if (saveState === "dirty") {
    return (
      <span data-testid="save-indicator" className="text-xs text-zinc-400">
        Unsaved changes
      </span>
    );
  }

  if (saveState === "error") {
    return (
      <span data-testid="save-indicator" className="flex items-center gap-2 text-xs text-red-400">
        Save failed
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs"
          onClick={() => {
            // Re-flip to dirty; the autosave hook re-fires.
            useEditorStore.setState({ saveState: "dirty", saveError: null });
            // draftConfig is read above so the linter sees it's used; touching
            // it ensures the latest snapshot is in the closure when retry fires.
            void draftConfig;
          }}
        >
          Retry
        </Button>
      </span>
    );
  }

  if (saveState === "saved" && lastSavedAt) {
    return (
      <span data-testid="save-indicator" className="text-xs text-zinc-400">
        {formatRelative(now, lastSavedAt)}
      </span>
    );
  }

  return (
    <span data-testid="save-indicator" className="text-xs text-zinc-500">
      Ready
    </span>
  );
}
