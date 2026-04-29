"use client";

import type { StockImageRow } from "@/lib/ai/prompts/snippets/stock-images";
import { useState } from "react";

type Props = {
  row: StockImageRow;
  editable: boolean;
  onUpdateDescription?: (id: number, description: string) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
};

export function AiStockImageRow({ row, editable, onUpdateDescription, onDelete }: Props) {
  const [draft, setDraft] = useState(row.description);
  const [busy, setBusy] = useState(false);

  async function handleBlur() {
    if (!editable || !onUpdateDescription || draft === row.description) return;
    setBusy(true);
    try {
      await onUpdateDescription(row.id, draft);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!editable || !onDelete) return;
    if (!window.confirm("Delete this image? The AI won't see it anymore.")) return;
    setBusy(true);
    try {
      await onDelete(row.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-start gap-2 py-1">
      <img src={row.public_url} alt="" className="h-12 w-12 flex-shrink-0 rounded object-cover" />
      {editable ? (
        <input
          className="flex-1 rounded border border-neutral-300 px-2 py-1 text-xs"
          value={draft}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
        />
      ) : (
        <p className="flex-1 text-xs text-neutral-700">{row.description}</p>
      )}
      {editable && (
        <button
          type="button"
          aria-label="Delete image"
          className="text-neutral-400 hover:text-red-600 disabled:opacity-50"
          disabled={busy}
          onClick={handleDelete}
        >
          ×
        </button>
      )}
    </div>
  );
}
