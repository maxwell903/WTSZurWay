"use client";

import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/lib/editor-state";
import type { Page } from "@/lib/site-config";
import { Plus } from "lucide-react";
import { useState } from "react";
import { AddPageDialog } from "./AddPageDialog";
import { DeletePageConfirm } from "./DeletePageConfirm";
import { PageRow } from "./PageRow";
import { RenamePageDialog } from "./RenamePageDialog";

export function PagesTab() {
  const pages = useEditorStore((s) => s.draftConfig.pages);
  const [addOpen, setAddOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Page | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Page | null>(null);

  // The home page is locked at the top; the "first non-home" boundary is used
  // to disable the Up arrow on the first reorderable row.
  const firstNonHomeIndex = pages.findIndex((p) => !(p.kind === "static" && p.slug === "home"));

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Pages</h2>
        <span className="text-xs text-zinc-500">{pages.length}</span>
      </div>

      <ul className="flex flex-col gap-2 overflow-y-auto" data-testid="pages-tab-list">
        {pages.map((page, idx) => (
          <li key={page.id}>
            <PageRow
              page={page}
              isFirstNonHome={idx === firstNonHomeIndex}
              isLast={idx === pages.length - 1}
              onRename={(p) => setRenameTarget(p)}
              onDelete={(p) => setDeleteTarget(p)}
            />
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid="pages-tab-add"
        onClick={() => setAddOpen(true)}
        className="mt-auto h-9 gap-2"
      >
        <Plus className="h-4 w-4" />
        Add page
      </Button>

      <AddPageDialog open={addOpen} onOpenChange={setAddOpen} />
      <RenamePageDialog page={renameTarget} onClose={() => setRenameTarget(null)} />
      <DeletePageConfirm page={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}
