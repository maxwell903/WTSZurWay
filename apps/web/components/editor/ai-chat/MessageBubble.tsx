"use client";

/**
 * Renders a single user / assistant turn. Assistant turns branch on
 * `kind`:
 *   - "ok"      -> summary + bulleted operations list + Accept/Discard
 *                  buttons. After Accept, buttons are replaced with a
 *                  small "Applied" tag (mirrors §8.7's bullet 7-8).
 *   - "clarify" -> the clarifying question only, no buttons.
 *   - "error"   -> §9.6 user-facing copy + Retry (when applicable) +
 *                  Copy details (always).
 */

import { Button } from "@/components/ui/button";
import { type AiError, formatErrorReport } from "@/lib/ai/errors";
import { cn } from "@/lib/utils";
import { Check, Clipboard, RotateCw, X } from "lucide-react";
import { useState } from "react";
import type { AssistantMessage, Message } from "./types";

export type MessageBubbleProps = {
  message: Message;
  onAccept: (messageId: string) => void;
  onDiscard: (messageId: string) => void;
  onRetry: () => void;
};

export function MessageBubble({ message, onAccept, onDiscard, onRetry }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div data-testid="user-message" className="flex justify-end">
        <div className="max-w-[85%] rounded-lg bg-blue-600/20 px-3 py-2 text-sm text-zinc-100">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <AssistantBubble
      message={message}
      onAccept={onAccept}
      onDiscard={onDiscard}
      onRetry={onRetry}
    />
  );
}

function AssistantBubble({
  message,
  onAccept,
  onDiscard,
  onRetry,
}: {
  message: AssistantMessage;
  onAccept: (id: string) => void;
  onDiscard: (id: string) => void;
  onRetry: () => void;
}) {
  if (message.kind === "ok") {
    return (
      <div data-testid="assistant-ok" className="flex justify-start">
        <div className="max-w-[90%] space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
          <p>{message.summary}</p>
          <AiSourceBadge aiSource={message.aiSource} />
          {message.operations.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-zinc-400">
              {message.operations.map((op, i) => (
                <li key={op.id ?? `${op.type}-${i}`}>{describeOperation(op)}</li>
              ))}
            </ul>
          )}
          {message.status === "pending" && (
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="default"
                size="sm"
                data-testid="accept-button"
                onClick={() => onAccept(message.id)}
              >
                <Check className="mr-1 h-3.5 w-3.5" /> Accept
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-testid="discard-button"
                onClick={() => onDiscard(message.id)}
              >
                <X className="mr-1 h-3.5 w-3.5" /> Discard
              </Button>
            </div>
          )}
          {message.status === "accepted" && (
            <span
              data-testid="applied-tag"
              className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300"
            >
              <Check className="h-3 w-3" /> Applied
            </span>
          )}
          {message.status === "discarded" && (
            <span
              data-testid="discarded-tag"
              className="inline-flex items-center gap-1 rounded-md bg-zinc-700/40 px-2 py-0.5 text-xs text-zinc-400"
            >
              <X className="h-3 w-3" /> Discarded
            </span>
          )}
        </div>
      </div>
    );
  }

  if (message.kind === "clarify") {
    return (
      <div data-testid="assistant-clarify" className="flex justify-start">
        <div className="max-w-[90%] space-y-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
          <p>{message.question}</p>
          <AiSourceBadge aiSource={message.aiSource} />
        </div>
      </div>
    );
  }

  // kind === "error"
  return <ErrorBubble error={message.error} aiSource={message.aiSource} onRetry={onRetry} />;
}

// Sprint 14 DoD-13: dev-only `[live]`/`[fixture]` badge under the assistant
// turn body. Production hides the element entirely. Sits inside the same
// bubble div so the existing chip / suggested-prompts / accept-discard
// wiring is undisturbed.
function AiSourceBadge({ aiSource }: { aiSource: "live" | "fixture" | undefined }) {
  if (!aiSource || process.env.NODE_ENV === "production") return null;
  return (
    <span
      data-testid="ai-chat-turn-ai-source"
      className="block text-[10px] uppercase tracking-wide text-zinc-500"
    >
      [{aiSource}]
    </span>
  );
}

function ErrorBubble({
  error,
  aiSource,
  onRetry,
}: {
  error: AiError;
  aiSource: "live" | "fixture" | undefined;
  onRetry: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const showRetry = error.kind === "network_error" || error.kind === "over_quota";
  const copy = userFacingCopyForError(error);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatErrorReport(error));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Older browsers / sandboxed iframes may reject clipboard writes; the
      // text stays on the bubble so the user can read it manually.
    }
  }

  return (
    <div data-testid="assistant-error" data-error-kind={error.kind} className="flex justify-start">
      <div
        className={cn(
          "max-w-[90%] space-y-2 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm",
          "text-red-100",
        )}
      >
        <p>{copy}</p>
        <AiSourceBadge aiSource={aiSource} />
        <div className="flex gap-2 pt-1">
          {showRetry && (
            <Button
              type="button"
              variant="default"
              size="sm"
              data-testid="retry-button"
              onClick={() => onRetry()}
            >
              <RotateCw className="mr-1 h-3.5 w-3.5" /> Retry
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="copy-details-button"
            onClick={handleCopy}
          >
            <Clipboard className="mr-1 h-3.5 w-3.5" /> {copied ? "Copied" : "Copy details"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// PROJECT_SPEC.md §9.6 verbatim. The fallback covers `model_clarification`
// even though it is normally surfaced as a clarify message rather than an
// error -- belt and braces in case a future surface routes it through here.
function userFacingCopyForError(error: AiError): string {
  switch (error.kind) {
    case "network_error":
      return "We couldn't reach our AI service. Check your connection and try again.";
    case "timeout":
      return "The AI took too long to respond. Try a shorter or more specific prompt.";
    case "invalid_output":
      return "The AI returned something we couldn't parse. Try rephrasing your request.";
    case "operation_invalid":
      return "One of the AI's suggested changes wouldn't work on this page (e.g., it tried to put a NavBar inside a Button). The change was discarded.";
    case "over_quota":
    case "auth_error":
      return "Service unavailable, please try again later.";
    case "model_clarification":
      return "The AI asked a clarifying question. Please rephrase your request.";
    default: {
      const _exhaustive: never = error.kind;
      void _exhaustive;
      return "Something went wrong.";
    }
  }
}

function describeOperation(op: { type: string }): string {
  // Plain-English one-liner per op type. The summary text is the model's
  // narrative; this list is the structural diff. Keep entries short --
  // anything the user wants in detail can hit the Copy details path.
  switch (op.type) {
    case "addComponent":
      return "Add a component";
    case "removeComponent":
      return "Remove a component";
    case "moveComponent":
      return "Move a component";
    case "setProp":
      return "Set a component prop";
    case "setStyle":
      return "Set a component style";
    case "setAnimation":
      return "Set an animation";
    case "setVisibility":
      return "Set visibility";
    case "setText":
      return "Set text";
    case "bindRMField":
      return "Bind to a Rent Manager field";
    case "addPage":
      return "Add a page";
    case "removePage":
      return "Remove a page";
    case "renamePage":
      return "Rename a page";
    case "setSiteSetting":
      return "Update a site setting";
    case "setPalette":
      return "Switch the palette";
    case "setLinkMode":
      return "Set the button link mode";
    case "setDetailPageSlug":
      return "Set the detail-page link target";
    case "setQueryParamDefault":
      return "Bind an input to a query parameter";
    case "duplicateComponent":
      return "Duplicate a component";
    case "wrapComponent":
      return "Wrap a component";
    case "unwrapComponent":
      return "Unwrap a component";
    case "reorderChildren":
      return "Reorder children";
    case "setRepeaterDataSource":
      return "Switch the Repeater's data source";
    case "setRepeaterFilters":
      return "Update Repeater filters";
    case "setRepeaterSort":
      return "Update Repeater sort";
    case "connectInputToRepeater":
      return "Connect an input to a Repeater";
    default:
      return op.type;
  }
}
