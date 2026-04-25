"use client";

// LogoUpload renders the dashed drop-zone visual for the Brand section and
// pushes the chosen file to Supabase Storage via uploadLogo. The component
// must remain renderable WITHOUT a wrapping <FormProvider> so that
// brand-section.tsx (and its Sprint-2a-owned test) keeps working — we only
// touch form context inside event handlers via optional chaining.

import type { SetupFormValues } from "@/lib/setup-form/types";
import { uploadLogo } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { CloudUpload, ImageIcon, Loader2 } from "lucide-react";
import * as React from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";

const ACCEPTED_MIME_TYPES = ["image/png", "image/svg+xml", "image/jpeg"] as const;
const ACCEPT_ATTR = ACCEPTED_MIME_TYPES.join(",");

type LogoState = { name: string; url: string };

export function LogoUpload() {
  // useFormContext is typed as non-null but returns null at runtime when
  // there is no <FormProvider> ancestor. We must support both cases so the
  // Sprint-2a-owned brand-section test (which renders <BrandSection /> with
  // no provider) keeps passing.
  const formContext = useFormContext<SetupFormValues>();
  const form = formContext as typeof formContext | null;
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [logo, setLogo] = React.useState<LogoState | null>(() => {
    const seed = form?.getValues("logoPrimary");
    return seed ? { name: seed.name, url: seed.url } : null;
  });
  const [uploading, setUploading] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false);

  const handleFiles = React.useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file) return;

      if (!(ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)) {
        toast.error("Unsupported file type", {
          description: "Please upload a PNG, SVG, or JPG image.",
        });
        return;
      }

      setUploading(true);
      try {
        const { url } = await uploadLogo(file);
        const next: LogoState = { name: file.name, url };
        setLogo(next);
        form?.setValue("logoPrimary", next, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed.";
        toast.error("Logo upload failed", { description: message });
      } finally {
        setUploading(false);
      }
    },
    [form],
  );

  const onDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragActive(false);
    void handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => {
    setDragActive(false);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void handleFiles(e.target.files);
    // Reset so re-selecting the same file still triggers change.
    e.target.value = "";
  };

  const onZoneClick = () => {
    fileInputRef.current?.click();
  };

  const onReplace = () => {
    setLogo(null);
    form?.setValue("logoPrimary", undefined, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    fileInputRef.current?.click();
  };

  return (
    <div data-testid="logo-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        data-testid="logo-upload-file-input"
        onChange={onChange}
      />

      {logo ? (
        <div
          data-testid="logo-upload-preview"
          className="flex items-center gap-4 rounded-md border border-zinc-700 bg-zinc-950 p-4"
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-900">
            <img
              src={logo.url}
              alt={logo.name}
              className="h-full w-full object-contain"
              data-testid="logo-upload-preview-image"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-medium text-white"
              data-testid="logo-upload-filename"
            >
              {logo.name}
            </p>
            <p className="text-xs text-zinc-500">Logo uploaded</p>
          </div>
          <button
            type="button"
            data-testid="logo-upload-replace"
            onClick={onReplace}
            className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          type="button"
          aria-label="Upload company logo"
          aria-busy={uploading}
          data-testid="logo-upload-dropzone"
          data-drag-active={dragActive ? "true" : "false"}
          onClick={onZoneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={cn(
            "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed bg-zinc-950 px-6 py-10 text-center text-sm transition",
            dragActive
              ? "border-sky-400 bg-sky-950/30 text-white"
              : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200",
          )}
        >
          {uploading ? (
            <>
              <Loader2
                className="h-6 w-6 animate-spin text-zinc-300"
                data-testid="logo-upload-spinner"
              />
              <span data-testid="logo-upload-status">Uploading…</span>
            </>
          ) : (
            <>
              {dragActive ? (
                <ImageIcon className="h-6 w-6 text-sky-300" />
              ) : (
                <CloudUpload className="h-6 w-6 text-zinc-500" />
              )}
              <span className="font-medium">Drop your logo here</span>
              <span className="text-xs">or click to browse &mdash; PNG, SVG, JPG</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
