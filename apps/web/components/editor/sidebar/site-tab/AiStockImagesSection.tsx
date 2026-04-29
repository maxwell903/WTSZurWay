"use client";

import { useState } from "react";
import { AiStockImageRow } from "./AiStockImageRow";
import { AiStockImageUploadModal } from "./AiStockImageUploadModal";
import { useAiStockImages } from "./useAiStockImages";

type Props = {
  siteId: string | null;
};

export function AiStockImagesSection({ siteId }: Props) {
  const { state, uploadAndRegister, updateDescription, remove } = useAiStockImages(siteId);
  const [modalOpen, setModalOpen] = useState(false);

  if (!siteId) return null;

  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">AI Stock Images</h3>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded bg-neutral-900 px-2 py-1 text-xs text-white"
        >
          + Upload image
        </button>
      </header>

      {state.status === "loading" && <p className="text-xs text-neutral-500">Loading…</p>}
      {state.status === "error" && <p className="text-xs text-red-600">{state.message}</p>}
      {state.status === "ready" && (
        <>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Default</p>
            {state.defaults.map((row) => (
              <AiStockImageRow key={row.id} row={row} editable={false} />
            ))}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Yours</p>
            {state.perSite.length === 0 ? (
              <p className="py-2 text-xs text-neutral-500">
                Upload images to expand the AI's library.
              </p>
            ) : (
              state.perSite.map((row) => (
                <AiStockImageRow
                  key={row.id}
                  row={row}
                  editable
                  onUpdateDescription={updateDescription}
                  onDelete={remove}
                />
              ))
            )}
          </div>
        </>
      )}

      {modalOpen && (
        <AiStockImageUploadModal
          siteId={siteId}
          onClose={() => setModalOpen(false)}
          onUploaded={uploadAndRegister}
        />
      )}
    </section>
  );
}
