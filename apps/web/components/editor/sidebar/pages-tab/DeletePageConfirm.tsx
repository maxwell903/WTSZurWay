"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditorActionError, useEditorStore } from "@/lib/editor-state";
import type { Page } from "@/lib/site-config";
import { toast } from "sonner";

// Sprint 6 deviation: AlertDialog is not installed (see DECISIONS.md
// 2026-04-25 Sprint 6 entry). Dialog is functionally equivalent for a
// single-button "Are you sure?" confirm modal.

export type DeletePageConfirmProps = {
  page: Page | null;
  onClose: () => void;
};

export function DeletePageConfirm({ page, onClose }: DeletePageConfirmProps) {
  const deletePage = useEditorStore((s) => s.deletePage);
  if (!page) return null;

  const submit = () => {
    try {
      deletePage(page.slug, page.kind);
      onClose();
    } catch (e) {
      const msg =
        e instanceof EditorActionError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not delete page.";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={!!page} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete page?</DialogTitle>
          <DialogDescription>
            This removes <span className="font-semibold">{page.name}</span> (/{page.slug}) from the
            site. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button data-testid="delete-page-confirm" variant="destructive" onClick={submit}>
            Delete page
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
