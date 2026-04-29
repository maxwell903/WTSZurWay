"use client";

import { Label } from "@/components/ui/label";
import { uploadSiteMedia } from "@/lib/storage";
import { CloudUpload, Loader2, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { WithTooltip } from "./with-tooltip";

export type MediaUploadProps = {
  id?: string;
  label?: string;
  accept: string;
  maxSizeMb?: number;
  value?: string;
  onUploaded: (url: string) => void;
  onCleared: () => void;
  disabled?: boolean;
  testId?: string;
  tooltip?: string;
};

const DEFAULT_MAX_SIZE_MB = 50;

export function MediaUpload({
  id,
  label,
  accept,
  maxSizeMb = DEFAULT_MAX_SIZE_MB,
  value,
  onUploaded,
  onCleared,
  disabled,
  testId,
  tooltip,
}: MediaUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [sizeError, setSizeError] = React.useState<string | null>(null);

  const onPick = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setSizeError(null);
    if (!file) return;

    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      const message = `File is ${Math.ceil(file.size / 1024 / 1024)} MB; max is ${maxSizeMb} MB.`;
      setSizeError(message);
      toast.error("File too large", { description: message });
      return;
    }

    setUploading(true);
    try {
      const { url } = await uploadSiteMedia(file);
      onUploaded(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      toast.error("Upload failed", { description: message });
    } finally {
      setUploading(false);
    }
  };

  const isVideo = accept.includes("video");

  return (
    <WithTooltip tooltip={tooltip} testId={testId}>
      <div className="space-y-1.5" data-testid={testId}>
        {label ? (
          <Label htmlFor={id} className="text-xs text-zinc-300">
            {label}
          </Label>
        ) : null}
        {value ? (
          <div
            data-testid={testId ? `${testId}-preview` : undefined}
            className="relative overflow-hidden rounded-md border border-zinc-800 bg-zinc-950"
          >
            {isVideo ? (
              <video
                src={value}
                muted
                playsInline
                className="block max-h-32 w-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLVideoElement).style.display = "none";
                }}
              />
            ) : (
              <img
                src={value}
                alt=""
                className="block max-h-32 w-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <button
              type="button"
              onClick={onCleared}
              aria-label="Replace media"
              data-testid={testId ? `${testId}-clear` : undefined}
              className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md border border-zinc-700 bg-zinc-950/80 text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            id={id}
            onClick={onPick}
            disabled={disabled || uploading}
            aria-busy={uploading}
            data-testid={testId ? `${testId}-upload` : undefined}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-700 bg-zinc-900 px-3 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Uploading…</span>
              </>
            ) : (
              <>
                <CloudUpload className="h-3.5 w-3.5" />
                <span>Upload</span>
              </>
            )}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          data-testid={testId ? `${testId}-file-input` : undefined}
          onChange={onFileChange}
        />
        {sizeError ? (
          <p
            data-testid={testId ? `${testId}-size-error` : undefined}
            className="text-[11px] text-red-400"
          >
            {sizeError}
          </p>
        ) : null}
      </div>
    </WithTooltip>
  );
}
