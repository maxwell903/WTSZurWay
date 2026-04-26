"use client";

import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/lib/editor-state";
import { Database } from "lucide-react";
import { useState } from "react";
import { SubmissionsModal } from "./SubmissionsModal";
import { useSubmissionsList } from "./useSubmissionsList";

const EMPTY_COPY =
  "No form submissions yet. Drop a Form, name it, and publish to start collecting.";
const ERROR_COPY = "Couldn't load submissions. Retry.";

export function DataTab() {
  const siteId = useEditorStore((s) => s.siteId);
  const { state, refetch } = useSubmissionsList(siteId);
  const [openFormId, setOpenFormId] = useState<string | null>(null);

  return (
    <div data-testid="data-tab" className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2 text-zinc-200">
        <Database className="h-4 w-4 text-zinc-400" />
        <h2 className="text-sm font-medium">Form submissions</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {state.status === "loading" ? (
          <SkeletonRow />
        ) : state.status === "error" ? (
          <ErrorView onRetry={refetch} />
        ) : state.forms.length === 0 ? (
          <p data-testid="data-tab-empty" className="text-sm leading-relaxed text-zinc-400">
            {EMPTY_COPY}
          </p>
        ) : (
          <ul data-testid="data-tab-list" className="space-y-1">
            {state.forms.map((entry) => (
              <li key={entry.formId}>
                <button
                  type="button"
                  data-testid={`data-tab-row-${entry.formId}`}
                  onClick={() => setOpenFormId(entry.formId)}
                  className="flex w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-left text-zinc-100 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
                >
                  <span className="text-sm font-medium">{entry.formId}</span>
                  <span className="text-[11px] text-zinc-400">
                    {entry.count === 1 ? "1 submission" : `${entry.count} submissions`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <SubmissionsModal
        open={openFormId !== null}
        siteId={siteId}
        formId={openFormId}
        onClose={() => setOpenFormId(null)}
      />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div
      data-testid="data-tab-skeleton"
      aria-busy="true"
      className="h-10 animate-pulse rounded-md bg-zinc-900"
    />
  );
}

function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <div data-testid="data-tab-error" className="space-y-2">
      <p className="text-sm text-zinc-300">{ERROR_COPY}</p>
      <Button data-testid="data-tab-retry" onClick={onRetry} size="sm">
        Retry
      </Button>
    </div>
  );
}
