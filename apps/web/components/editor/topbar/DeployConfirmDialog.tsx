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

export type DeployConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeploying: boolean;
};

export function DeployConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeploying,
}: DeployConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="deploy-confirm-dialog">
        <DialogHeader>
          <DialogTitle>Deploy current version to your live site?</DialogTitle>
          <DialogDescription>
            Snapshot the current working draft as the live deployed version. This replaces the
            previously deployed snapshot, if any.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isDeploying}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={isDeploying}
            data-testid="deploy-confirm-button"
          >
            {isDeploying ? "Deploying…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
