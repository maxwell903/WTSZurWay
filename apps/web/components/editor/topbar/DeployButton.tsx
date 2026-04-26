"use client";

import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/lib/editor-state";
import { Rocket } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DeployConfirmDialog } from "./DeployConfirmDialog";

type DeployErrorBody = { error?: { kind?: string; message?: string } };
type DeploySuccessBody = { versionId: string; deployedUrl: string };

export function DeployButton() {
  const siteId = useEditorStore((s) => s.siteId);
  const siteSlug = useEditorStore((s) => s.siteSlug);
  const saveState = useEditorStore((s) => s.saveState);

  const [open, setOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  // Per PROJECT_SPEC.md §8.2 the Deploy button is greyed out when there are
  // unsaved changes. Sprint 13 implements the simpler save-state gate
  // (saved/idle = enabled; dirty/saving/error = disabled). A diff-based
  // gate is a Sprint 15 polish item.
  const isSaveBlocked = saveState !== "saved" && saveState !== "idle";
  const disabledReason =
    saveState === "saving"
      ? "Save in progress…"
      : saveState === "dirty"
        ? "Saving…"
        : saveState === "error"
          ? "Save failed; cannot deploy"
          : undefined;

  async function handleConfirm() {
    if (!siteId) return;
    setIsDeploying(true);
    try {
      const response = await fetch(`/api/sites/${siteId}/deploy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      if (!response.ok) {
        let message = "Unknown error";
        try {
          const body = (await response.json()) as DeployErrorBody;
          if (body.error?.message) message = body.error.message;
        } catch {
          // Body wasn't JSON; fall through with the generic copy.
        }
        toast.error(`Deploy failed: ${message}`);
        return;
      }
      const body = (await response.json()) as DeploySuccessBody;
      // Server-side `deployedUrl` is the canonical display string per
      // PROJECT_SPEC.md §17. Fall back to the locally-derived URL only if
      // the server omitted it -- the demo never hits this branch.
      const url = body.deployedUrl ?? `https://www.${siteSlug}.com`;
      toast.success(`Deployed. Your site is live at ${url}`, {
        action: {
          label: "Copy",
          onClick: () => {
            void navigator.clipboard.writeText(url);
          },
        },
      });
      setOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Network error";
      toast.error(`Deploy failed: ${message}`);
    } finally {
      setIsDeploying(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        data-testid="deploy-button"
        size="sm"
        className="h-9 gap-2"
        disabled={isSaveBlocked || isDeploying || !siteId}
        title={isSaveBlocked ? disabledReason : undefined}
        onClick={() => setOpen(true)}
      >
        <Rocket className="h-4 w-4" />
        {isDeploying ? "Deploying…" : "Deploy"}
      </Button>
      <DeployConfirmDialog
        open={open}
        onOpenChange={(next) => {
          // While a deploy is in flight, ignore Cancel / outside clicks --
          // the user cannot cancel the in-flight POST.
          if (isDeploying && !next) return;
          setOpen(next);
        }}
        onConfirm={handleConfirm}
        isDeploying={isDeploying}
      />
    </>
  );
}
