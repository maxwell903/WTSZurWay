"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SubmissionRow = {
  id: number;
  pageSlug: string | null;
  submittedData: Record<string, string>;
  createdAt: string;
};

export type SubmissionsRowsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; submissions: SubmissionRow[] };

const GENERIC_ERROR = "Couldn't load submissions.";

export function useSubmissionsRows(
  siteId: string,
  formId: string | null,
): { state: SubmissionsRowsState; refetch: () => void } {
  const [state, setState] = useState<SubmissionsRowsState>({ status: "loading" });
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const load = useCallback(() => {
    cancelRef.current.cancelled = true;
    const token = { cancelled: false };
    cancelRef.current = token;

    if (!siteId || !formId) {
      setState({ status: "loading" });
      return;
    }
    setState({ status: "loading" });

    void (async () => {
      try {
        const params = new URLSearchParams({ siteId, formId });
        const res = await fetch(`/api/form-submissions?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!token.cancelled) setState({ status: "error", message: GENERIC_ERROR });
          return;
        }
        const body = (await res.json()) as { submissions?: unknown };
        const submissions = parseSubmissions(body.submissions);
        if (!token.cancelled) setState({ status: "ready", submissions });
      } catch {
        if (!token.cancelled) setState({ status: "error", message: GENERIC_ERROR });
      }
    })();
  }, [siteId, formId]);

  useEffect(() => {
    load();
    return () => {
      cancelRef.current.cancelled = true;
    };
  }, [load]);

  return { state, refetch: load };
}

function parseSubmissions(raw: unknown): SubmissionRow[] {
  if (!Array.isArray(raw)) return [];
  const out: SubmissionRow[] = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;
    if (
      typeof obj.id !== "number" ||
      typeof obj.createdAt !== "string" ||
      (obj.pageSlug !== null && typeof obj.pageSlug !== "string")
    )
      continue;
    out.push({
      id: obj.id,
      pageSlug: obj.pageSlug,
      submittedData: coerceSubmittedData(obj.submittedData),
      createdAt: obj.createdAt,
    });
  }
  return out;
}

function coerceSubmittedData(value: unknown): Record<string, string> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string") out[k] = v;
    else if (v !== null && v !== undefined) out[k] = String(v);
  }
  return out;
}
