"use client";

import { uploadStockImage } from "@/lib/storage";
import { useState } from "react";

type Props = {
  siteId: string;
  onClose: () => void;
  onUploaded: (args: {
    storage_path: string;
    public_url: string;
    description: string;
  }) => Promise<void>;
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function AiStockImageUploadModal({ siteId, onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    if (next && !ACCEPTED_TYPES.includes(next.type)) {
      setError("File must be JPG, PNG, WEBP, or AVIF.");
      setFile(null);
      return;
    }
    setError(null);
    setFile(next);
  }

  async function handleUpload() {
    if (!file || description.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const { url, path } = await uploadStockImage(file, siteId);
      await onUploaded({
        storage_path: path,
        public_url: url,
        description: description.trim(),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      // biome-ignore lint/a11y/useSemanticElements: native <dialog> is positioned by the user agent and bypasses the fixed-overlay backdrop layout; role="dialog" + aria-modal carries the same a11y semantics.
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl">
        <h2 className="text-base font-semibold">Upload stock image</h2>

        <input
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileChange}
          disabled={busy}
          className="mt-3 block w-full text-sm"
        />

        {file && (
          <img
            src={URL.createObjectURL(file)}
            alt=""
            className="mt-3 h-32 w-full rounded object-cover"
          />
        )}

        <textarea
          className="mt-3 block w-full rounded border border-neutral-300 px-2 py-1 text-sm"
          rows={3}
          placeholder="Describe what's in this image (used by the AI to choose it)"
          value={description}
          disabled={busy}
          onChange={(e) => setDescription(e.target.value)}
        />

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded border border-neutral-300 px-3 py-1 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={busy || !file || description.trim().length === 0}
            className="rounded bg-neutral-900 px-3 py-1 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
