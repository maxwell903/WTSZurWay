"use client";

/**
 * The chat input. Holds (a) the prompt text, (b) up to 4 image attachments
 * resized client-side per §9.8, (c) the Send button. Files larger than 5 MB
 * are rejected before the resize step (no doomed network round-trips).
 *
 * The resize uses a canvas: load the file into an Image, draw it into a
 * canvas at the smaller of (original size, 1568px on the long edge), and
 * read back a JPEG data URL. The resulting URL is what the route handler
 * forwards to Anthropic as a `type: "image"` content block; data URLs are
 * accepted by the API the same way HTTPS URLs are.
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageIcon, SendHorizonal, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Attachment } from "./types";

const MAX_ATTACHMENTS = 4;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_LONG_EDGE_PX = 1568;
const JPEG_QUALITY = 0.9;

export type ComposerProps = {
  disabled?: boolean;
  onSend: (prompt: string, attachments: Attachment[]) => void;
  prefill?: string;
  onPrefillConsumed?: () => void;
  className?: string;
};

export function Composer({
  disabled = false,
  onSend,
  prefill,
  onPrefillConsumed,
  className,
}: ComposerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  // Pull the next prefill into local text exactly once. The parent passes a
  // changing non-empty string each time the user clicks a chip; we sync via
  // useEffect so render stays pure.
  // biome-ignore lint/correctness/useExhaustiveDependencies: onPrefillConsumed is stable from the parent
  useEffect(() => {
    if (prefill) {
      setText(prefill);
      onPrefillConsumed?.();
    }
  }, [prefill]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, attachments);
    setText("");
    setAttachments([]);
    setError(null);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const next: Attachment[] = [...attachments];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_ATTACHMENTS) {
        setError(`At most ${MAX_ATTACHMENTS} images per message.`);
        break;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError("That image is too large; max 5 MB.");
        continue;
      }
      try {
        const url = await resizeToDataUrl(file);
        next.push({ url });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read that image.");
      }
    }
    setAttachments(next);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form
      data-testid="ai-edit-composer"
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-2", className)}
    >
      {attachments.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {attachments.map((att, i) => (
            <li
              key={`${att.url.slice(0, 32)}_${i}`}
              className="group relative h-12 w-12 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900"
            >
              {/* Image previews use the same data URL the request will send. */}
              <img src={att.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Remove attachment"
                onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}
                className="absolute right-0.5 top-0.5 rounded-full bg-zinc-950/80 p-0.5 text-zinc-300 opacity-0 transition group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p data-testid="composer-error" className="text-xs text-red-400">
          {error}
        </p>
      )}
      <div className="flex items-end gap-2">
        <label htmlFor={inputId} className="sr-only">
          Prompt
        </label>
        <textarea
          id={inputId}
          data-testid="composer-textarea"
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Ask anything about this site…"
          rows={2}
          className="min-h-[2.5rem] flex-1 resize-y rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none disabled:opacity-50"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-label="Attach images"
          data-testid="composer-file-input"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Attach images"
          disabled={disabled || attachments.length >= MAX_ATTACHMENTS}
          onClick={() => fileRef.current?.click()}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="submit"
          variant="default"
          size="icon"
          aria-label="Send"
          disabled={disabled || text.trim().length === 0}
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

async function resizeToDataUrl(file: File): Promise<string> {
  // Read as a data URL first so the Image element has a stable source. Using
  // URL.createObjectURL would be marginally faster but requires manual revoke
  // bookkeeping; the demo's max-4-images-of-5MB ceiling makes data URL the
  // simpler choice.
  const sourceDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(sourceDataUrl);

  const longEdge = Math.max(img.width, img.height);
  if (longEdge <= MAX_LONG_EDGE_PX) {
    // Already small; skip the canvas roundtrip.
    return sourceDataUrl;
  }
  const scale = MAX_LONG_EDGE_PX / longEdge;
  const targetW = Math.max(1, Math.round(img.width * scale));
  const targetH = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");
  ctx.drawImage(img, 0, 0, targetW, targetH);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("FileReader produced a non-string result."));
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image."));
    img.src = src;
  });
}
