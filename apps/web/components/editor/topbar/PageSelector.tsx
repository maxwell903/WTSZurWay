"use client";

import { AddPageDialog } from "@/components/editor/sidebar/pages-tab/AddPageDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEditorStore } from "@/lib/editor-state";
import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";

export function PageSelector() {
  const pages = useEditorStore((s) => s.draftConfig.pages);
  const currentPageSlug = useEditorStore((s) => s.currentPageSlug);
  const setCurrentPageSlug = useEditorStore((s) => s.setCurrentPageSlug);

  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // The trigger label shows the *currently displayed* page. Multiple pages
  // may share a slug across kinds (U2 routing) -- prefer the static one for
  // /{slug} URLs, fall back to whichever matches.
  const activePage =
    pages.find((p) => p.slug === currentPageSlug && p.kind === "static") ??
    pages.find((p) => p.slug === currentPageSlug);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            data-testid="topbar-page-selector"
            className="h-9 gap-2 border-zinc-700 bg-transparent text-sm text-zinc-100 hover:bg-zinc-800"
          >
            <span className="truncate max-w-[160px]">{activePage?.name ?? "Select page"}</span>
            {activePage?.kind === "detail" ? (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                DETAIL
              </Badge>
            ) : null}
            <ChevronDown className="ml-auto h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-72 border-zinc-700 bg-zinc-900 p-1 text-sm text-zinc-100"
        >
          <ul className="max-h-72 overflow-y-auto py-1">
            {pages.map((page) => {
              const selected = page.slug === currentPageSlug && page.kind === activePage?.kind;
              return (
                <li key={page.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    data-testid={`page-selector-option-${page.kind}-${page.slug}`}
                    className="flex w-full items-center gap-2 rounded px-2 py-2 text-left hover:bg-zinc-800 aria-[pressed=true]:bg-zinc-800"
                    onClick={() => {
                      setCurrentPageSlug(page.slug);
                      setOpen(false);
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{page.name}</div>
                      <div className="truncate text-xs text-zinc-400">/{page.slug}</div>
                    </div>
                    {page.kind === "detail" ? (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        DETAIL
                      </Badge>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-zinc-800" />
          <button
            type="button"
            data-testid="page-selector-add"
            className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
            onClick={() => {
              setOpen(false);
              setAddOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add page
          </button>
        </PopoverContent>
      </Popover>

      <AddPageDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
