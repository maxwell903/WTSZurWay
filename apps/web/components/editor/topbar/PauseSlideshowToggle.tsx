"use client";

import { useEditorStore } from "@/lib/editor-state";
import { cn } from "@/lib/utils";
import { Pause, Play } from "lucide-react";

// Editor-only slideshow pause toggle. When ON, every HeroBanner on the
// canvas freezes on its current slide — useful when editing a slide's
// text without it cycling away. Defaults OFF each editor load (no
// persistence), mirrors ShowComponentTypesToggle's shape.
export function PauseSlideshowToggle() {
  const paused = useEditorStore((s) => s.slideshowPaused);
  const toggle = useEditorStore((s) => s.toggleSlideshowPaused);
  const label = paused ? "Resume slideshow" : "Pause slideshow";
  const Icon = paused ? Play : Pause;
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={paused}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        paused
          ? "bg-zinc-800 text-orange-400"
          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
