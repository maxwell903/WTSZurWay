"use client";

import { resizeImage } from "@/lib/setup-form/resize-image";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

export type AttachedImage = {
  name: string;
  url: string;
};

export type ImageAttachmentInputHandle = {
  openFileDialog: () => void;
};

type Props = {
  value: AttachedImage[];
  onChange: (next: AttachedImage[]) => void;
  max?: number;
  className?: string;
  thumbnailsClassName?: string;
};

export const ImageAttachmentInput = React.forwardRef<ImageAttachmentInputHandle, Props>(
  function ImageAttachmentInput({ value, onChange, max = 4, className, thumbnailsClassName }, ref) {
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(
      ref,
      () => ({
        openFileDialog: () => inputRef.current?.click(),
      }),
      [],
    );

    // We intentionally hold a ref to the latest value so the unmount cleanup
    // can revoke blob URLs without re-running on every change.
    const valueRef = React.useRef(value);
    React.useEffect(() => {
      valueRef.current = value;
    }, [value]);
    React.useEffect(() => {
      return () => {
        for (const item of valueRef.current) {
          if (item.url.startsWith("blob:")) {
            URL.revokeObjectURL(item.url);
          }
        }
      };
    }, []);

    const handleFiles = async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const remaining = max - value.length;
      const incoming = Array.from(files);

      if (remaining <= 0) {
        toast(`Max ${max} images`);
        return;
      }

      const accepted = incoming.slice(0, remaining);
      const dropped = incoming.length - accepted.length;

      const resized = await Promise.all(
        accepted.map(async (file) => {
          const r = await resizeImage(file);
          return { name: r.name, url: r.url };
        }),
      );

      onChange([...value, ...resized]);

      if (dropped > 0) {
        toast(`Max ${max} images`);
      }
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      void handleFiles(event.target.files);
      // Reset so selecting the same file twice still fires change.
      event.target.value = "";
    };

    const removeAt = (index: number) => {
      const removed = value[index];
      if (removed?.url.startsWith("blob:")) {
        URL.revokeObjectURL(removed.url);
      }
      onChange(value.filter((_, i) => i !== index));
    };

    return (
      <div className={cn("contents", className)} data-testid="image-attachment-input">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          data-testid="image-attachment-file-input"
          onChange={handleChange}
        />
        {value.length > 0 ? (
          <div
            data-testid="image-attachment-thumbnails"
            className={cn("flex flex-wrap gap-2", thumbnailsClassName)}
          >
            {value.map((item, index) => (
              <div
                key={item.url}
                data-testid={`image-attachment-thumbnail-${index}`}
                className="relative h-16 w-16 overflow-hidden rounded-md border border-zinc-700 bg-zinc-950"
              >
                <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  data-testid={`image-attachment-remove-${index}`}
                  onClick={() => removeAt(index)}
                  className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900/80 text-white hover:bg-zinc-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  },
);
