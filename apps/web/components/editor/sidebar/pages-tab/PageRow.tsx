"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { selectIsHomePage, useEditorStore } from "@/lib/editor-state";
import type { Page } from "@/lib/site-config";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type PageRowProps = {
  page: Page;
  isFirstNonHome: boolean;
  isLast: boolean;
  onRename: (page: Page) => void;
  onDelete: (page: Page) => void;
};

export function PageRow({ page, isFirstNonHome, isLast, onRename, onDelete }: PageRowProps) {
  const reorderPages = useEditorStore((s) => s.reorderPages);
  const isHome = selectIsHomePage(page);

  const move = (direction: "up" | "down") => {
    try {
      reorderPages({ slug: page.slug, kind: page.kind, direction });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not reorder page.";
      toast.error(msg);
    }
  };

  return (
    <div
      data-testid={`page-row-${page.kind}-${page.slug}`}
      className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-sm"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{page.name}</span>
          {page.kind === "detail" ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              DETAIL
            </Badge>
          ) : null}
        </div>
        <div className="truncate text-xs text-zinc-500">/{page.slug}</div>
      </div>
      <div className="flex items-center">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Move up"
          disabled={isHome || isFirstNonHome}
          onClick={() => move("up")}
          className="h-7 w-7"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Move down"
          disabled={isHome || isLast}
          onClick={() => move("down")}
          className="h-7 w-7"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Rename page"
          data-testid={`page-row-rename-${page.kind}-${page.slug}`}
          onClick={() => onRename(page)}
          className="h-7 w-7"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Delete page"
          data-testid={`page-row-delete-${page.kind}-${page.slug}`}
          disabled={isHome}
          title={isHome ? "The home page cannot be deleted." : undefined}
          onClick={() => onDelete(page)}
          className="h-7 w-7"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
