"use client";

// PreviewPanel -- the fake-browser-chrome host for Element 1's preview.
// Owns the four panel states from PROJECT_SPEC.md §7.3 + §9.6: empty,
// generating, generated, and error. The state itself is owned by
// SetupExperience and passed in.
//
// Empty state: file icon + the §7.3 hint copy.
// Generating state: the LoadingNarration with the seven §9.5 messages.
// Generated state: an iframe pointing at /{slug}/preview?v={versionId}.
// Error state: §9.6 user-facing copy keyed on error.kind, plus a Retry
// button (when retryable) and a Copy details button (always).

import type { AiError, AiErrorKind } from "@/lib/ai/errors";
import { formatErrorReport } from "@/lib/ai/errors";
import { Copy, File as FileIcon, RotateCcw } from "lucide-react";
import { LoadingNarration } from "./LoadingNarration";

export type PanelState =
  | { kind: "empty" }
  | { kind: "generating" }
  | { kind: "generated"; previewUrl: string; siteSlug: string }
  | { kind: "error"; error: AiError };

export type PreviewPanelProps = {
  state: PanelState;
  onRetry?: () => void;
};

export function PreviewPanel({ state, onRetry }: PreviewPanelProps) {
  const slug = state.kind === "generated" ? state.siteSlug : undefined;
  const isLive = state.kind === "generated";

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
        <span
          data-testid="preview-panel-pill"
          className={
            isLive
              ? "rounded-full bg-emerald-900/50 px-2 py-0.5 text-xs font-medium text-emerald-300"
              : "rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400"
          }
        >
          {isLive ? "Live" : "Pending"}
        </span>
      </header>

      <div className="relative aspect-video w-full">
        {state.kind === "empty" && <EmptyState />}
        {state.kind === "generating" && <GeneratingState />}
        {state.kind === "generated" && <GeneratedState previewUrl={state.previewUrl} />}
        {state.kind === "error" && <ErrorState error={state.error} onRetry={onRetry} />}
      </div>
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

function GeneratedState({ previewUrl }: { previewUrl: string }) {
  return (
    <iframe
      data-testid="preview-panel-iframe"
      title="Generated site preview"
      src={previewUrl}
      sandbox="allow-scripts allow-same-origin"
      loading="eager"
      className="absolute inset-0 h-full w-full border-0 bg-white"
    />
  );
}

const ERROR_COPY: Record<AiErrorKind, string> = {
  network_error: "We couldn't reach our AI service. Check your connection and try again.",
  timeout: "The AI took too long to respond. Try a shorter or more specific prompt.",
  model_clarification: "The AI needs more information to continue.",
  invalid_output: "The AI returned something we couldn't parse. Try rephrasing your request.",
  operation_invalid:
    "One of the AI's suggested changes wouldn't work on this page. The change was discarded.",
  over_quota: "Service unavailable, please try again later.",
  auth_error: "Service unavailable, please try again later.",
};

const RETRYABLE_KINDS: ReadonlySet<AiErrorKind> = new Set([
  "network_error",
  "timeout",
  "over_quota",
]);

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
