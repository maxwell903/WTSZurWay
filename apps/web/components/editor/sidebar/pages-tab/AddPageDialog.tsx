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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditorActionError, useEditorStore } from "@/lib/editor-state";
import type { DetailDataSource, PageKind } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type AddPageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SLUG_REGEX = /^[a-z0-9-]+$/;

export function AddPageDialog({ open, onOpenChange }: AddPageDialogProps) {
  const addPage = useEditorStore((s) => s.addPage);
  const pages = useEditorStore((s) => s.draftConfig.pages);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [kind, setKind] = useState<PageKind>("static");
  const [detailDataSource, setDetailDataSource] = useState<DetailDataSource>("properties");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setSlug("");
      setKind("static");
      setDetailDataSource("properties");
      setError(null);
    }
  }, [open]);

  const trimmedName = name.trim();
  const slugValid = slug.length > 0 && SLUG_REGEX.test(slug);

  // Per-kind slug uniqueness check, mirrored client-side from the schema.
  const slugConflict = pages.some((p) => p.kind === kind && p.slug === slug);

  const canSubmit =
    trimmedName.length > 0 &&
    slugValid &&
    !slugConflict &&
    (kind === "static" || !!detailDataSource);

  const submit = () => {
    setError(null);
    try {
      addPage({
        name: trimmedName,
        slug,
        kind,
        detailDataSource: kind === "detail" ? detailDataSource : undefined,
      });
      onOpenChange(false);
    } catch (e) {
      const msg =
        e instanceof EditorActionError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not add page.";
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add page</DialogTitle>
          <DialogDescription>
            Pages appear in the page selector. Detail pages render a per-row template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="add-page-name">Name</Label>
            <Input
              id="add-page-name"
              data-testid="add-page-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-page-slug">Slug</Label>
            <Input
              id="add-page-slug"
              data-testid="add-page-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              maxLength={60}
              placeholder="lowercase-with-hyphens"
            />
            {slug.length > 0 && !slugValid ? (
              <p className="text-xs text-red-400">
                Slug must be lowercase letters, digits, and hyphens.
              </p>
            ) : null}
            {slug.length > 0 && slugValid && slugConflict ? (
              <p className="text-xs text-red-400" data-testid="add-page-slug-conflict">
                Another {kind} page already uses this slug.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>Page kind</Label>
            <div
              aria-label="Page kind"
              className="inline-flex h-9 items-center rounded-md border bg-background p-0.5 text-xs"
            >
              <button
                type="button"
                aria-pressed={kind === "static"}
                data-testid="add-page-kind-static"
                className={cn(
                  "rounded px-3 py-1 text-foreground transition-colors",
                  kind === "static" && "bg-foreground text-background",
                )}
                onClick={() => setKind("static")}
              >
                Static
              </button>
              <button
                type="button"
                aria-pressed={kind === "detail"}
                data-testid="add-page-kind-detail"
                className={cn(
                  "rounded px-3 py-1 text-foreground transition-colors",
                  kind === "detail" && "bg-foreground text-background",
                )}
                onClick={() => setKind("detail")}
              >
                Detail
              </button>
            </div>
          </div>

          {kind === "detail" ? (
            <div className="space-y-1.5">
              <Label htmlFor="add-page-data-source">Detail data source</Label>
              <select
                id="add-page-data-source"
                data-testid="add-page-data-source"
                value={detailDataSource}
                onChange={(e) => setDetailDataSource(e.target.value as DetailDataSource)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="properties">properties</option>
                <option value="units">units</option>
              </select>
            </div>
          ) : null}

          {error ? <p className="text-xs text-red-400">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button data-testid="add-page-submit" disabled={!canSubmit} onClick={submit}>
            Add page
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
