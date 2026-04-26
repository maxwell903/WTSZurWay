"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditorActionError, useEditorStore } from "@/lib/editor-state";
import type { Page } from "@/lib/site-config";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const SLUG_REGEX = /^[a-z0-9-]+$/;

export type RenamePageDialogProps = {
  page: Page | null;
  onClose: () => void;
};

export function RenamePageDialog({ page, onClose }: RenamePageDialogProps) {
  const renamePage = useEditorStore((s) => s.renamePage);
  const pages = useEditorStore((s) => s.draftConfig.pages);

  const [name, setName] = useState(page?.name ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [error, setError] = useState<string | null>(null);

  const isHome = page?.slug === "home" && page.kind === "static";

  useEffect(() => {
    setName(page?.name ?? "");
    setSlug(page?.slug ?? "");
    setError(null);
  }, [page]);

  if (!page) return null;

  const trimmedName = name.trim();
  const slugValid = slug.length > 0 && SLUG_REGEX.test(slug);
  const slugConflict =
    slug !== page.slug &&
    pages.some((p) => p.kind === page.kind && p.slug === slug && p.id !== page.id);
  const canSubmit = trimmedName.length > 0 && slugValid && !slugConflict;

  const submit = () => {
    setError(null);
    try {
      renamePage({
        currentSlug: page.slug,
        currentKind: page.kind,
        name: trimmedName,
        slug,
      });
      onClose();
    } catch (e) {
      const msg =
        e instanceof EditorActionError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not rename page.";
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <Dialog open={!!page} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename page</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rename-page-name">Name</Label>
            <Input
              id="rename-page-name"
              data-testid="rename-page-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rename-page-slug">Slug</Label>
            <Input
              id="rename-page-slug"
              data-testid="rename-page-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              maxLength={60}
              disabled={isHome}
              title={isHome ? "The home page slug is fixed." : undefined}
            />
            {slug.length > 0 && !slugValid ? (
              <p className="text-xs text-red-400">
                Slug must be lowercase letters, digits, and hyphens.
              </p>
            ) : null}
            {slugConflict ? (
              <p className="text-xs text-red-400">
                Another {page.kind} page already uses this slug.
              </p>
            ) : null}
          </div>
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button data-testid="rename-page-submit" disabled={!canSubmit} onClick={submit}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
