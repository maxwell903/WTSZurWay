"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { selectCurrentPage, useEditorStore } from "@/lib/editor-state";
import { Trash2 } from "lucide-react";
import { useState } from "react";

const DISABLED_TOOLTIP =
  "The page root cannot be deleted; switch to the Pages tab to delete the page itself.";

export function DeleteComponentButton() {
  const [open, setOpen] = useState(false);
  const selectedComponentId = useEditorStore((s) => s.selectedComponentId);
  const currentPage = useEditorStore(selectCurrentPage);
  const removeComponent = useEditorStore((s) => s.removeComponent);
  const exitElementEditMode = useEditorStore((s) => s.exitElementEditMode);

  const isPageRoot =
    selectedComponentId !== null &&
    currentPage !== undefined &&
    currentPage.rootComponent.id === selectedComponentId;

  const onConfirm = () => {
    if (!selectedComponentId) return;
    removeComponent(selectedComponentId);
    exitElementEditMode();
    setOpen(false);
  };

  if (isPageRoot) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block w-full">
              <Button
                type="button"
                variant="outline"
                disabled
                data-testid="delete-component-button"
                className="w-full cursor-not-allowed border-zinc-800 text-zinc-500"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete component
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent
            data-testid="delete-component-button-tooltip"
            side="top"
            className="max-w-xs"
          >
            {DISABLED_TOOLTIP}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          data-testid="delete-component-button"
          className="w-full border-red-700/40 bg-red-950/20 text-red-300 hover:bg-red-950/40 hover:text-red-200"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete component
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent data-testid="delete-component-confirm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this component?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="delete-component-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction
            data-testid="delete-component-confirm-button"
            onClick={onConfirm}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
