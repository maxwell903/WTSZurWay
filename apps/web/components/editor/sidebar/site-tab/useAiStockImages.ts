"use client";

import type { StockImageRow } from "@/lib/ai/prompts/snippets/stock-images";
import { useCallback, useEffect, useRef, useState } from "react";

export type AiStockImagesState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; defaults: StockImageRow[]; perSite: StockImageRow[] };

const GENERIC_ERROR = "Couldn't load stock images.";

export function useAiStockImages(siteId: string | null): {
  state: AiStockImagesState;
  refetch: () => void;
  uploadAndRegister: (args: {
    storage_path: string;
    public_url: string;
    description: string;
  }) => Promise<void>;
  updateDescription: (id: number, description: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
} {
  const [state, setState] = useState<AiStockImagesState>({ status: "loading" });
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const load = useCallback(() => {
    cancelRef.current.cancelled = true;
    const token = { cancelled: false };
    cancelRef.current = token;

    if (!siteId) {
      setState({ status: "ready", defaults: [], perSite: [] });
      return;
    }
    setState({ status: "loading" });

    void (async () => {
      try {
        const res = await fetch(`/api/ai-stock-images?siteId=${encodeURIComponent(siteId)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!token.cancelled) setState({ status: "error", message: GENERIC_ERROR });
          return;
        }
        const body = (await res.json()) as {
          defaults: StockImageRow[];
          perSite: StockImageRow[];
        };
        if (!token.cancelled) {
          setState({ status: "ready", defaults: body.defaults, perSite: body.perSite });
        }
      } catch {
        if (!token.cancelled) setState({ status: "error", message: GENERIC_ERROR });
      }
    })();
  }, [siteId]);

  useEffect(() => {
    load();
    return () => {
      cancelRef.current.cancelled = true;
    };
  }, [load]);

  const uploadAndRegister = useCallback(
    async (args: { storage_path: string; public_url: string; description: string }) => {
      if (!siteId) throw new Error("No siteId");
      const res = await fetch("/api/ai-stock-images", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteId, ...args }),
      });
      if (!res.ok) throw new Error(`Register failed: ${res.status}`);
      load();
    },
    [siteId, load],
  );

  const updateDescription = useCallback(
    async (id: number, description: string) => {
      const res = await fetch(`/api/ai-stock-images/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      load();
    },
    [load],
  );

  const remove = useCallback(
    async (id: number) => {
      const res = await fetch(`/api/ai-stock-images/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      load();
    },
    [load],
  );

  return { state, refetch: load, uploadAndRegister, updateDescription, remove };
}
