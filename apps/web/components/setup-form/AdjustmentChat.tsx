"use client";

// AdjustmentChat -- Element 1's "Request adjustments" chat. Mounted
// directly under the preview iframe in PreviewPanel's generated state
// (PROJECT_SPEC.md §2.2 item 6 / §7.5). Each successful turn applies a
// diff of operations to the working-version SiteConfig, PATCHes the new
// full config back to Supabase, and asks PreviewPanel to remount the
// iframe via `onConfigUpdated`.
//
// Element 1's loop is intentionally simpler than Element 2's
// (apps/web/components/editor/ai-chat/useAiEditChat.ts): no selection,
// no history window, no Accept / Discard. Auto-apply per §7.5. The
// useAiEditChat hook is reference reading only -- this file does not
// import from the editor tree.
//
// State machine (explicit, no ad-hoc booleans):
//   hydrating       -- GET /api/sites/[siteId]/working-version in flight
//   hydrate-error   -- GET failed; chat is permanently disabled, copy
//                      surfaced from §9.6 keyed on error category
//   idle            -- ready for input
//   thinking        -- a POST /ai-edit, PATCH /working-version, or
//                      attachment upload is in flight
//
// Errors during send are treated as transient: a transcript entry is
// appended, the state returns to idle, and the user can retry with a
// new prompt.

import type { AiError, AiErrorKind } from "@/lib/ai/errors";
import { type SiteConfig, safeParseSiteConfig } from "@/lib/site-config";
import { type Operation, OperationInvalidError, applyOperations } from "@/lib/site-config/ops";
import { uploadAttachment } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ERROR_COPY } from "./error-copy";

const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const HYDRATE_ERROR_COPY: Record<"server_error" | "not_found", string> = {
  server_error: ERROR_COPY.auth_error,
  not_found: "Couldn't load your site preview. Try refreshing the page.",
};

const ATTACHMENT_ERROR_COPY = {
  tooMany: "You can attach up to 4 images per message.",
  tooLarge: "Each image must be 5 MB or smaller.",
  notImage: "Only image files are supported.",
} as const;

type ChatState = "hydrating" | "hydrate-error" | "idle" | "thinking";

type Attachment = { url: string; name: string };

type UserTurn = {
  id: string;
  role: "user";
  content: string;
  attachments: Attachment[];
};

// Sprint 14 DoD-11: assistant turns gain an optional `aiSource` carried
// from the dev-only `x-ai-source` header. Renders a `[live]`/`[fixture]`
// badge when set and not in production. Error turns by definition were
// not served by a fixture (a fixture is a known-good response), so the
// badge only ever appears on summary / clarify rows.
type AssistantSummary = {
  id: string;
  role: "assistant";
  kind: "summary";
  text: string;
  aiSource?: "live" | "fixture";
};

type AssistantClarification = {
  id: string;
  role: "assistant";
  kind: "clarify";
  text: string;
  aiSource?: "live" | "fixture";
};

type AssistantError = {
  id: string;
  role: "assistant";
  kind: "error";
  text: string;
  errorKind: AiErrorKind;
};

type Turn = UserTurn | AssistantSummary | AssistantClarification | AssistantError;

export type AdjustmentChatProps = {
  siteId: string;
  versionId: string;
  onConfigUpdated: () => void;
};

export function AdjustmentChat({ siteId, versionId, onConfigUpdated }: AdjustmentChatProps) {
  const [state, setState] = useState<ChatState>("hydrating");
  const [hydrateErrorCopy, setHydrateErrorCopy] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const configRef = useRef<SiteConfig | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hydrate the working-version SiteConfig on mount. Re-runs only if the
  // siteId prop ever changes (the parent caches it across renders, so in
  // practice this fires exactly once per generated session).
  useEffect(() => {
    let cancelled = false;
    setState("hydrating");
    setHydrateErrorCopy(null);

    const run = async () => {
      let response: Response;
      try {
        response = await fetch(`/api/sites/${siteId}/working-version`, { method: "GET" });
      } catch {
        if (cancelled) return;
        configRef.current = null;
        setHydrateErrorCopy(HYDRATE_ERROR_COPY.server_error);
        setState("hydrate-error");
        return;
      }

      if (!response.ok) {
        let category: "server_error" | "not_found" = "server_error";
        try {
          const body = (await response.json()) as { category?: string } | null;
          if (body?.category === "not_found") category = "not_found";
        } catch {
          // fall through with default category
        }
        if (cancelled) return;
        configRef.current = null;
        setHydrateErrorCopy(HYDRATE_ERROR_COPY[category]);
        setState("hydrate-error");
        return;
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        if (cancelled) return;
        configRef.current = null;
        setHydrateErrorCopy(HYDRATE_ERROR_COPY.server_error);
        setState("hydrate-error");
        return;
      }

      const rawConfig =
        body && typeof body === "object" && "config" in body
          ? (body as { config: unknown }).config
          : null;
      const parsed = safeParseSiteConfig(rawConfig);
      if (!parsed.success) {
        if (cancelled) return;
        configRef.current = null;
        setHydrateErrorCopy(HYDRATE_ERROR_COPY.server_error);
        setState("hydrate-error");
        return;
      }

      if (cancelled) return;
      configRef.current = parsed.data;
      setState("idle");
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  const handleAttachClick = () => {
    setAttachmentError(null);
    fileInputRef.current?.click();
  };

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList);

      // Validate. The DoD requires a single rejection copy at a time --
      // surface the first violated rule and abort the whole batch.
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          setAttachmentError(ATTACHMENT_ERROR_COPY.notImage);
          return;
        }
        if (file.size > MAX_ATTACHMENT_BYTES) {
          setAttachmentError(ATTACHMENT_ERROR_COPY.tooLarge);
          return;
        }
      }
      if (attachments.length + files.length > MAX_ATTACHMENTS) {
        setAttachmentError(ATTACHMENT_ERROR_COPY.tooMany);
        return;
      }

      setAttachmentError(null);
      // Mark the chat as busy during upload so Send is disabled (DoD-13).
      setState((prev) => (prev === "idle" ? "thinking" : prev));
      try {
        const uploaded: Attachment[] = [];
        for (const file of files) {
          const result = await uploadAttachment(file);
          uploaded.push({ url: result.url, name: file.name });
        }
        setAttachments((prev) => [...prev, ...uploaded]);
      } catch (e) {
        setAttachmentError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setState((prev) => (prev === "thinking" ? "idle" : prev));
      }
    },
    [attachments.length],
  );

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = useCallback(async () => {
    const trimmed = prompt.trim();
    if (trimmed.length === 0) return;
    if (state !== "idle") return;
    const config = configRef.current;
    if (!config) return;

    // Local helpers that close over setTranscript (a stable React setter,
    // so it does not need to live in the useCallback dep list).
    const append = (turn: Turn) => setTranscript((prev) => [...prev, turn]);
    const appendError = (error: AiError) =>
      append({
        id: makeTurnId(),
        role: "assistant",
        kind: "error",
        text: ERROR_COPY[error.kind],
        errorKind: error.kind,
      });

    const userTurn: UserTurn = {
      id: makeTurnId(),
      role: "user",
      content: trimmed,
      attachments: [...attachments],
    };
    append(userTurn);
    setPrompt("");
    setState("thinking");

    const requestBody: Record<string, unknown> = {
      siteId,
      currentVersionId: versionId,
      prompt: trimmed,
    };
    if (attachments.length > 0) {
      requestBody.attachments = attachments.map((a) => ({ url: a.url }));
    }

    let editResponse: Response;
    try {
      editResponse = await fetch("/api/ai-edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody),
      });
    } catch (e) {
      appendError({
        kind: "network_error",
        message: e instanceof Error ? e.message : "Network request failed",
      });
      setState("idle");
      return;
    }

    let editBody: unknown;
    try {
      editBody = await editResponse.json();
    } catch {
      appendError({
        kind: "invalid_output",
        message: `Bad response shape (HTTP ${editResponse.status})`,
      });
      setState("idle");
      return;
    }

    // Sprint 14 DoD-11: capture the dev-only header for the assistant turn
    // about to be appended. Undefined in production (server omits it).
    const turnAiSource = narrowAiSource(editResponse.headers.get("x-ai-source"));

    const interpreted = interpretAiEditResponse(editBody);

    if (interpreted.kind === "error") {
      appendError(interpreted.error);
      setState("idle");
      return;
    }

    if (interpreted.kind === "clarify") {
      append({
        id: makeTurnId(),
        role: "assistant",
        kind: "clarify",
        text: interpreted.question,
        aiSource: turnAiSource,
      });
      setState("idle");
      // Attachments are kept on clarify so the user can retry the same
      // prompt + images after answering the question.
      return;
    }

    // ok branch: dry-run apply locally, then PATCH the full config back.
    let nextConfig: SiteConfig;
    try {
      nextConfig = applyOperations(config, interpreted.operations);
    } catch (e) {
      const detail = e instanceof OperationInvalidError ? e.opId : undefined;
      appendError({
        kind: "operation_invalid",
        message: e instanceof Error ? e.message : "applyOperations threw a non-Error",
        details: detail,
      });
      setState("idle");
      return;
    }

    let patchResponse: Response;
    try {
      patchResponse = await fetch(`/api/sites/${siteId}/working-version`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: nextConfig }),
      });
    } catch (e) {
      appendError({
        kind: "network_error",
        message: e instanceof Error ? e.message : "Network request failed",
      });
      setState("idle");
      return;
    }

    if (patchResponse.status !== 204) {
      // Non-204 from the working-version PATCH maps to auth_error to match
      // PreviewPanel's server-error treatment per DoD-11.
      let message = `Working-version PATCH returned HTTP ${patchResponse.status}`;
      try {
        const body = (await patchResponse.json()) as { message?: string } | null;
        if (typeof body?.message === "string" && body.message.length > 0) {
          message = body.message;
        }
      } catch {
        // ignore parse failures, keep the default message
      }
      appendError({ kind: "auth_error", message });
      setState("idle");
      return;
    }

    configRef.current = nextConfig;
    append({
      id: makeTurnId(),
      role: "assistant",
      kind: "summary",
      text: interpreted.summary,
      aiSource: turnAiSource,
    });
    setAttachments([]);
    onConfigUpdated();
    setState("idle");
  }, [attachments, onConfigUpdated, prompt, siteId, state, versionId]);

  const sendDisabled = state !== "idle" || prompt.trim().length === 0 || configRef.current === null;
  const inputDisabled = state !== "idle" || configRef.current === null;
  const busy = state === "hydrating" || state === "thinking";

  return (
    <section
      data-testid="adjustment-chat"
      data-chat-state={state}
      aria-busy={busy}
      aria-label="Request adjustments"
      className="flex flex-col gap-2"
    >
      <div
        data-testid="adjustment-chat-transcript"
        className="flex max-h-64 flex-col gap-2 overflow-y-auto"
      >
        {transcript.length === 0 && state !== "hydrate-error" && (
          <p data-testid="adjustment-chat-empty" className="text-xs text-zinc-500">
            Want to adjust something? Ask the AI.
          </p>
        )}
        {state === "hydrate-error" && hydrateErrorCopy && (
          <p data-testid="adjustment-chat-hydrate-error" className="text-xs text-amber-300">
            {hydrateErrorCopy}
          </p>
        )}
        {transcript.map((turn) => (
          <TranscriptRow key={turn.id} turn={turn} />
        ))}
        {state === "thinking" && (
          <p data-testid="adjustment-chat-thinking" className="text-xs text-zinc-400">
            Thinking…
          </p>
        )}
      </div>

      {attachments.length > 0 && (
        <div data-testid="adjustment-chat-attachments" className="flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <span
              key={attachment.url}
              data-testid={`adjustment-chat-attachment-${index}`}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-200"
            >
              {attachment.name}
              <button
                type="button"
                aria-label={`Remove ${attachment.name}`}
                data-testid={`adjustment-chat-attachment-remove-${index}`}
                onClick={() => removeAttachment(index)}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}

      {attachmentError && (
        <p
          data-testid="adjustment-chat-attachment-error"
          role="alert"
          className="text-xs text-amber-300"
        >
          {attachmentError}
        </p>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          data-testid="adjustment-chat-file-input"
          onChange={(event) => {
            void handleFiles(event.target.files);
            // Reset so selecting the same file again still fires change.
            event.target.value = "";
          }}
        />
        <button
          type="button"
          aria-label="Attach images"
          data-testid="adjustment-chat-attach"
          disabled={inputDisabled}
          onClick={handleAttachClick}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 transition hover:bg-zinc-900",
            inputDisabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
          )}
        >
          <Paperclip className="h-4 w-4" aria-hidden />
        </button>
        <label htmlFor="adjustment-chat-input" className="sr-only">
          Adjustment prompt
        </label>
        <textarea
          id="adjustment-chat-input"
          data-testid="adjustment-chat-input"
          rows={2}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!sendDisabled) void handleSend();
            }
          }}
          disabled={inputDisabled}
          placeholder="Request an adjustment…"
          className="min-h-[2.25rem] flex-1 resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="button"
          aria-label="Send adjustment"
          data-testid="adjustment-chat-send"
          disabled={sendDisabled}
          onClick={() => void handleSend()}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-600 text-white transition hover:bg-sky-500",
            sendDisabled && "cursor-not-allowed bg-zinc-800 text-zinc-500 hover:bg-zinc-800",
          )}
        >
          {state === "thinking" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    </section>
  );
}

function TranscriptRow({ turn }: { turn: Turn }) {
  if (turn.role === "user") {
    return (
      <div data-testid="adjustment-chat-turn-user" className="self-end">
        <p className="rounded-md bg-sky-900/40 px-3 py-1.5 text-xs text-sky-100">{turn.content}</p>
        {turn.attachments.length > 0 && (
          <p className="mt-1 text-right text-[10px] text-zinc-500">
            {turn.attachments.length} attachment{turn.attachments.length === 1 ? "" : "s"}
          </p>
        )}
      </div>
    );
  }
  if (turn.kind === "summary") {
    return (
      <div data-testid="adjustment-chat-turn-summary" className="flex flex-col self-start">
        <p className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200">{turn.text}</p>
        <AssistantTurnAiSourceBadge aiSource={turn.aiSource} />
      </div>
    );
  }
  if (turn.kind === "clarify") {
    return (
      <div data-testid="adjustment-chat-turn-clarify" className="flex flex-col self-start">
        <p className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200">{turn.text}</p>
        <AssistantTurnAiSourceBadge aiSource={turn.aiSource} />
      </div>
    );
  }
  return (
    <p
      data-testid="adjustment-chat-turn-error"
      data-error-kind={turn.errorKind}
      className="self-start rounded-md bg-amber-900/30 px-3 py-1.5 text-xs text-amber-200"
    >
      {turn.text}
    </p>
  );
}

function AssistantTurnAiSourceBadge({ aiSource }: { aiSource: "live" | "fixture" | undefined }) {
  // Sprint 14 DoD-11: dev-only `[live]`/`[fixture]` badge under the
  // assistant turn body. Production hides the element entirely.
  if (!aiSource || process.env.NODE_ENV === "production") return null;
  return (
    <span
      data-testid="adjustment-chat-turn-ai-source"
      className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-500"
    >
      [{aiSource}]
    </span>
  );
}

function narrowAiSource(value: string | null): "live" | "fixture" | undefined {
  if (value === "live" || value === "fixture") return value;
  return undefined;
}

type Interpreted =
  | { kind: "ok"; summary: string; operations: Operation[] }
  | { kind: "clarify"; question: string }
  | { kind: "error"; error: AiError };

function interpretAiEditResponse(body: unknown): Interpreted {
  if (typeof body !== "object" || body === null) {
    return {
      kind: "error",
      error: { kind: "invalid_output", message: "Response was not an object" },
    };
  }
  const obj = body as Record<string, unknown>;
  if (typeof obj.error === "object" && obj.error !== null) {
    const err = obj.error as Partial<AiError>;
    if (typeof err.kind === "string" && typeof err.message === "string") {
      return {
        kind: "error",
        error: {
          kind: err.kind as AiError["kind"],
          message: err.message,
          details: typeof err.details === "string" ? err.details : undefined,
        },
      };
    }
    return {
      kind: "error",
      error: { kind: "invalid_output", message: "Error envelope was not an AiError" },
    };
  }
  if (obj.kind === "ok" && typeof obj.summary === "string" && Array.isArray(obj.operations)) {
    return { kind: "ok", summary: obj.summary, operations: obj.operations as Operation[] };
  }
  if (obj.kind === "clarify" && typeof obj.question === "string") {
    return { kind: "clarify", question: obj.question };
  }
  return {
    kind: "error",
    error: { kind: "invalid_output", message: "Unexpected response shape" },
  };
}

function makeTurnId(): string {
  return `t_${Math.random().toString(36).slice(2, 10)}`;
}
