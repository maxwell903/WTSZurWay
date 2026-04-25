"use client";

import { Command, CommandEmpty, CommandInput, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

const EMPTY_STATE = "No commands yet — Command Launch is coming soon.";

export function CommandLaunchPalette() {
  const [open, setOpen] = useState(false);

  // Cmd/Ctrl+K toggles the palette. Plain `keydown` listener so it works no
  // matter where focus is (the trigger is a search-styled button, not an input).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Command Launch"
        onClick={() => setOpen(true)}
        className="flex w-full max-w-md items-center gap-2 rounded-md border border-neutral-700 bg-neutral-800/60 px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-200"
      >
        <Search className="h-4 w-4" />
        <span>Command Launch</span>
        <kbd className="ml-auto hidden rounded border border-neutral-700 bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border border-neutral-800 bg-neutral-950 p-0 text-neutral-100 shadow-2xl">
          <DialogTitle className="sr-only">Command Launch</DialogTitle>
          <DialogDescription className="sr-only">
            Search and run application commands.
          </DialogDescription>
          <Command className="bg-neutral-950 text-neutral-100">
            <CommandInput placeholder="Type a command..." className="text-neutral-100" />
            <CommandList>
              <CommandEmpty className="py-6 text-center text-sm text-neutral-400">
                {EMPTY_STATE}
              </CommandEmpty>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
