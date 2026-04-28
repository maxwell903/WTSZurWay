"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditorStore } from "./store";

type ZodIssue = { path?: Array<string | number>; message?: string };
type ValidationErrorBody = { category?: string; message?: string; details?: ZodIssue[] };

async function formatSaveError(res: Response): Promise<string> {
  // The server's 400 carries `{category, message, details: ZodIssue[]}`. Surface
  // the first issue's path + message so the user can see WHICH field failed —
  // a bare "Save failed (400)" is unactionable. Log the full payload so the
  // dev console has the complete list when there are several issues.
  try {
    const body = (await res.clone().json()) as ValidationErrorBody;
    if (res.status === 400 && body.details && body.details.length > 0) {
      console.error("[saveDraft] config validation failed", body.details);
      const first = body.details[0];
      const path = first?.path?.join(".") ?? "<root>";
      const msg = first?.message ?? "invalid";
      const more = body.details.length > 1 ? ` (+${body.details.length - 1} more)` : "";
      return `Save failed: ${path} — ${msg}${more}`;
    }
    if (body.message) return `Save failed: ${body.message}`;
  } catch {
    // Body wasn't JSON; fall through to the bare status.
  }
  return `Save failed (${res.status})`;
}

export type UseSaveDraftOptions = {
  // Override the fetcher in tests; defaults to global `fetch`.
  fetcher?: typeof fetch;
};

export type SaveDraftFn = () => Promise<void>;

export function useSaveDraft(options?: UseSaveDraftOptions): SaveDraftFn {
  const fetcher = options?.fetcher;
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  return useCallback(async () => {
    const { siteId, draftConfig, saveState, markSaving, markSaved, markError } =
      useEditorStore.getState();
    if (!siteId) return;
    // A click while a save is already in flight is a no-op; the dirty
    // button is disabled in that branch so this is a defense-in-depth check.
    if (saveState === "saving") return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    markSaving();
    try {
      const f = fetcher ?? globalThis.fetch;
      const res = await f(`/api/sites/${siteId}/working-version`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: draftConfig }),
        signal: controller.signal,
      });
      if (!res.ok) {
        markError(await formatSaveError(res));
        return;
      }
      markSaved(Date.now());
    } catch (err) {
      if (controller.signal.aborted) return;
      markError(err instanceof Error ? err.message : "Save failed");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [fetcher]);
}
