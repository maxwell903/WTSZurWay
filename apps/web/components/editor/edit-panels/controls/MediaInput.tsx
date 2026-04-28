"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadSiteMedia } from "@/lib/storage";
import { CloudUpload, Loader2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

export type MediaInputProps = {
  id: string;
  label?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  helper?: string;
  disabled?: boolean;
  testId?: string;
  accept?: string;
};

const DEFAULT_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml,image/gif";

export function MediaInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  helper,
  disabled,
  testId,
  accept = DEFAULT_ACCEPT,
}: MediaInputProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const onPick = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await uploadSiteMedia(file);
      onChange(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      toast.error("Upload failed", { description: message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5" data-testid={testId}>
      {label ? (
        <Label htmlFor={id} className="text-xs text-zinc-300">
          {label}
        </Label>
      ) : null}
      <div className="flex items-center gap-2">
        <Input
          id={id}
          data-testid={testId ? `${testId}-url` : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "https://... or upload"}
          disabled={disabled || uploading}
          className="h-9 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
        />
        <button
          type="button"
          onClick={onPick}
          disabled={disabled || uploading}
          aria-label="Upload media"
          aria-busy={uploading}
          data-testid={testId ? `${testId}-upload` : undefined}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
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
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          data-testid={testId ? `${testId}-file-input` : undefined}
          onChange={onFileChange}
        />
      </div>
      {value ? (
        <div
          data-testid={testId ? `${testId}-preview` : undefined}
          className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950"
        >
          <img
            src={value}
            alt=""
            className="block max-h-32 w-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      ) : null}
      {helper ? <p className="text-[11px] text-zinc-500">{helper}</p> : null}
    </div>
  );
}
