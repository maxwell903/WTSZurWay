"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SubmissionsListEntry = { formId: string; count: number };

export type SubmissionsListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; forms: SubmissionsListEntry[] };

const GENERIC_ERROR = "Couldn't load submissions.";

export function useSubmissionsList(siteId: string): {
  state: SubmissionsListState;
  refetch: () => void;
} {
  const [state, setState] = useState<SubmissionsListState>({ status: "loading" });
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const load = useCallback(() => {
    // Reset previous in-flight request's cancellation marker so its setState
    // calls become no-ops while we kick off a new one.
    cancelRef.current.cancelled = true;
    const token = { cancelled: false };
    cancelRef.current = token;

    if (!siteId) {
      setState({ status: "ready", forms: [] });
      return;
    }
    setState({ status: "loading" });

    void (async () => {
      try {
        const res = await fetch(`/api/form-submissions?siteId=${encodeURIComponent(siteId)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!token.cancelled) setState({ status: "error", message: GENERIC_ERROR });
          return;
        }
        const body = (await res.json()) as { forms?: unknown };
        const forms = parseForms(body.forms);
        if (!token.cancelled) setState({ status: "ready", forms });
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

  return { state, refetch: load };
}

function parseForms(raw: unknown): SubmissionsListEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: SubmissionsListEntry[] = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    if (typeof obj.formId === "string" && typeof obj.count === "number") {
      out.push({ formId: obj.formId, count: obj.count });
    }
  }
  return out;
}
