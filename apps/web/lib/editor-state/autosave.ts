"use client";

import type { SiteConfig } from "@/lib/site-config";
import { useEffect, useRef } from "react";
import { useEditorStore } from "./store";

export type UseAutosaveOptions = {
  debounceMs?: number;
  // Override the fetcher in tests; defaults to global `fetch`.
  fetcher?: typeof fetch;
};

const DEFAULT_DEBOUNCE_MS = 1000;

export function useAutosave(options?: UseAutosaveOptions): void {
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const fetcher = options?.fetcher;

  const siteId = useEditorStore((s) => s.siteId);
  const draftConfig = useEditorStore((s) => s.draftConfig);
  const saveState = useEditorStore((s) => s.saveState);

  // Long-lived refs survive every re-render so the timer and AbortController
  // remain consistent as draftConfig changes.
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingFollowUpRef = useRef(false);
  const latestConfigRef = useRef<SiteConfig>(draftConfig);

  useEffect(() => {
    latestConfigRef.current = draftConfig;
  }, [draftConfig]);

  useEffect(() => {
    if (saveState !== "dirty") return;
    if (!siteId) return;

    // If a save is already in flight, queue exactly one follow-up; the
    // in-flight save's `finally` block will re-flip saveState to "dirty"
    // when it completes, which re-enters this effect.
    if (abortRef.current) {
      pendingFollowUpRef.current = true;
      return;
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void runSave();
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };

    async function runSave(): Promise<void> {
      const snapshotAtStart = latestConfigRef.current;
      const controller = new AbortController();
      abortRef.current = controller;

      const { markSaving, markSaved, markError } = useEditorStore.getState();
      markSaving();

      try {
        const f = fetcher ?? globalThis.fetch;
        const res = await f(`/api/sites/${siteId}/working-version`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ config: snapshotAtStart }),
          signal: controller.signal,
        });
        if (!res.ok) {
          markError(`Save failed (${res.status})`);
          return;
        }
        markSaved(Date.now());
      } catch (err) {
        if (controller.signal.aborted) return;
        markError(err instanceof Error ? err.message : "Save failed");
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        // If a mutation arrived while we were saving, kick the effect back
        // into motion by flipping saveState to "dirty" again. The pending
        // flag is only ever set when a mutator ran during the save, so the
        // config is guaranteed to differ from snapshotAtStart.
        if (pendingFollowUpRef.current) {
          pendingFollowUpRef.current = false;
          useEditorStore.setState({ saveState: "dirty" });
        }
        // snapshotAtStart is read above so the linter sees it as used; the
        // ref is the closure capture, not the inspected value.
        void snapshotAtStart;
      }
    }
  }, [saveState, siteId, debounceMs, fetcher]);

  // Abort any in-flight request when the hook unmounts.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);
}
