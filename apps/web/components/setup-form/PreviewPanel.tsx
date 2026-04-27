"use client";

// PreviewPanel -- the fake-browser-chrome host for Element 1's preview.
// Owns the four panel states from PROJECT_SPEC.md §7.3 + §9.6: empty,
// generating, generated, and error. The state itself is owned by
// SetupExperience and passed in.
//
// Empty state: file icon + the §7.3 hint copy.
// Generating state: the LoadingNarration with the seven §9.5 messages.
// Generated state: an iframe pointing at /{slug}/preview?v={versionId}
// plus the Sprint 12 <AdjustmentChat> mounted directly under the iframe
// in the same card. A generation-token counter remounts the iframe on
// every successful adjustment so the new working-version config is
// re-fetched without relying on browser cache invalidation.
// Error state: §9.6 user-facing copy keyed on error.kind, plus a Retry
// button (when retryable) and a Copy details button (always).

import type { AiError } from "@/lib/ai/errors";
import { formatErrorReport } from "@/lib/ai/errors";
import { Copy, File as FileIcon, RotateCcw } from "lucide-react";
import { useState } from "react";
import { AdjustmentChat } from "./AdjustmentChat";
import { LoadingNarration } from "./LoadingNarration";
import { ERROR_COPY, RETRYABLE_KINDS } from "./error-copy";

export type PanelState =
  | { kind: "empty" }
  | { kind: "generating" }
  | {
      kind: "generated";
      previewUrl: string;
      siteSlug: string;
      siteId: string;
      versionId: string;
      // Sprint 14 DoD-9: which path served the generation. Forwarded from
      // SetupExperience after reading the dev-only `x-ai-source` header on
      // /api/generate-initial-site. Undefined in production builds where
      // the header is omitted.
      aiSource?: "live" | "fixture";
    }
  | { kind: "error"; error: AiError };

export type PreviewPanelProps = {
  state: PanelState;
  onRetry?: () => void;
};

export function PreviewPanel({ state, onRetry }: PreviewPanelProps) {
  const slug = state.kind === "generated" ? state.siteSlug : undefined;
  const isLive = state.kind === "generated";
  const aiSource = state.kind === "generated" ? state.aiSource : undefined;

  return (
    <section
      data-testid="preview-panel"
      data-panel-state={state.kind}
      className="mx-auto flex w-full max-w-4xl flex-col rounded-lg border border-zinc-800 bg-zinc-950"
    >
      <header className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <span aria-hidden className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500" />
          <span className="h-3 w-3 rounded-full bg-yellow-500" />
          <span className="h-3 w-3 rounded-full bg-green-500" />
        </span>
        <div
          aria-hidden
          className="ml-2 flex items-center gap-1 text-zinc-600"
          data-testid="preview-panel-nav"
        >
          <span className="text-sm">←</span>
          <span className="text-sm">→</span>
          <span className="text-sm">↻</span>
        </div>
        <div
          data-testid="preview-panel-url"
          className="ml-2 flex-1 truncate rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400"
        >
          {slug ? `https://www.${slug}.com` : "—"}
        </div>
        {isLive && slug ? (
          <a
            data-testid="preview-panel-pill"
            href={`/${slug}/preview`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-emerald-900/50 px-2 py-0.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-800/60"
          >
            Live
          </a>
        ) : (
          <span
            data-testid="preview-panel-pill"
            className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400"
          >
            Pending
          </span>
        )}
        {/* Sprint 14 DoD-9: dev-only `[live]`/`[fixture]` badge next to the
            existing pill. Hidden in production builds; the orchestrator's
            source field is internal-only when NODE_ENV === "production". */}
        {aiSource && process.env.NODE_ENV !== "production" && (
          <span
            data-testid="preview-panel-ai-source"
            className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400"
          >
            [{aiSource}]
          </span>
        )}
      </header>

      {state.kind === "generated" ? (
        <GeneratedView
          siteId={state.siteId}
          versionId={state.versionId}
          previewUrl={state.previewUrl}
        />
      ) : (
        <div className="relative aspect-video w-full">
          {state.kind === "empty" && <EmptyState />}
          {state.kind === "generating" && <GeneratingState />}
          {state.kind === "error" && <ErrorState error={state.error} onRetry={onRetry} />}
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div
      data-testid="preview-panel-empty"
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-500"
    >
      <FileIcon className="h-10 w-10" aria-hidden />
      <p className="text-sm">Fill in your details above to see a live preview of your site.</p>
    </div>
  );
}

function GeneratingState() {
  return (
    <div
      data-testid="preview-panel-generating"
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950"
    >
      <div className="h-2 w-32 overflow-hidden rounded-full bg-zinc-800">
        <span className="block h-full w-full animate-pulse bg-sky-500" />
      </div>
      <LoadingNarration />
    </div>
  );
}

// GeneratedView owns the local generation-token counter that drives both
// the iframe cache-buster (`&t=N`) and the iframe's `key` (forces a real
// React unmount/remount even if the server route ignores `t`). The chat
// shares the same parent so its onConfigUpdated callback can bump the
// token without prop drilling through unrelated levels.
function GeneratedView({
  siteId,
  versionId,
  previewUrl,
}: {
  siteId: string;
  versionId: string;
  previewUrl: string;
}) {
  const [token, setToken] = useState(0);
  const separator = previewUrl.includes("?") ? "&" : "?";
  const src = `${previewUrl}${separator}t=${token}`;
  const bumpToken = () => setToken((t) => t + 1);

  return (
    <>
      <div className="relative aspect-video w-full">
        <iframe
          key={token}
          data-testid="preview-panel-iframe"
          title="Generated site preview"
          src={src}
          sandbox="allow-scripts allow-same-origin"
          loading="eager"
          className="absolute inset-0 h-full w-full border-0 bg-white"
        />
      </div>
      <div className="border-t border-zinc-800 p-3">
        <AdjustmentChat siteId={siteId} versionId={versionId} onConfigUpdated={bumpToken} />
      </div>
    </>
  );
}

function ErrorState({ error, onRetry }: { error: AiError; onRetry?: () => void }) {
  const copy = ERROR_COPY[error.kind];
  const retryable = RETRYABLE_KINDS.has(error.kind);

  const handleCopy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(formatErrorReport(error));
  };

  return (
    <div
      data-testid="preview-panel-error"
      className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <p data-testid="preview-panel-error-copy" className="text-sm text-zinc-300">
        {copy}
      </p>
      <div className="flex items-center gap-2">
        {retryable && onRetry && (
          <button
            type="button"
            data-testid="preview-panel-retry"
            onClick={onRetry}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-700 bg-transparent px-3 text-sm font-medium text-white transition hover:bg-zinc-900"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Retry
          </button>
        )}
        <button
          type="button"
          data-testid="preview-panel-copy-details"
          onClick={handleCopy}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-700 bg-transparent px-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900"
        >
          <Copy className="h-4 w-4" aria-hidden />
          Copy details
        </button>
      </div>
    </div>
  );
}
