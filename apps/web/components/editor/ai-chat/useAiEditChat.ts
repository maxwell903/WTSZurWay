"use client";

/**
 * State machine for the right-sidebar chat. Owns the message transcript and
 * the loading flag; exposes `send`, `accept`, `discard`, `retry`. All
 * network access goes through `fetch("/api/ai-edit")` -- the hook NEVER
 * imports `@/lib/ai/client`. Tests mock fetch via `vi.stubGlobal`.
 *
 * Per §8.7 and the Sprint 11 working agreement, Accept is the only commit
 * path; Discard simply tags the message. Errors retain the user-facing copy
 * so the error category tag (network_error etc.) drives the §9.6 layout in
 * MessageBubble.
 */

import type { AiError } from "@/lib/ai/errors";
import { useEditorStore } from "@/lib/editor-state";
import { selectSelectedComponentNode } from "@/lib/editor-state/selectors";
import type { Operation } from "@/lib/site-config/ops";
import { useCallback, useMemo, useRef, useState } from "react";
import type { AiTurnUsage, AssistantMessage, Attachment, Message, UserMessage } from "./types";

const HISTORY_TURNS_KEPT = 6;

type LastSend = {
  prompt: string;
  attachments: Attachment[];
  referencedPageSlugs: string[];
} | null;

export type UseAiEditChat = {
  messages: Message[];
  loading: boolean;
  send: (
    prompt: string,
    attachments?: Attachment[],
    referencedPageSlugs?: string[],
  ) => Promise<void>;
  accept: (messageId: string) => void;
  discard: (messageId: string) => void;
  retry: () => Promise<void>;
};

export function useAiEditChat(): UseAiEditChat {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const lastSendRef = useRef<LastSend>(null);

  const siteId = useEditorStore((s) => s.siteId);
  const currentVersionId = useEditorStore((s) => s.workingVersionId);
  const currentPageSlug = useEditorStore((s) => s.currentPageSlug);
  const draftConfig = useEditorStore((s) => s.draftConfig);
  const selected = useEditorStore(selectSelectedComponentNode);
  const commitAiEditOperations = useEditorStore((s) => s.commitAiEditOperations);

  // Page kind for the selection payload; default to static when the slug is
  // unknown. Only the static/detail discriminator matters server-side.
  const pageKind: "static" | "detail" = useMemo(() => {
    const page = draftConfig.pages.find((p) => p.slug === currentPageSlug);
    return page?.kind ?? "static";
  }, [draftConfig.pages, currentPageSlug]);

  const buildSelectionPayload = useCallback(() => {
    if (!selected) return null;
    return {
      componentIds: [selected.id],
      pageSlug: currentPageSlug,
      pageKind,
    };
  }, [selected, currentPageSlug, pageKind]);

  const buildHistoryPayload = useCallback(
    (current: Message[]): { role: "user" | "assistant"; content: string }[] => {
      // §8.7 + the Sprint 11 hint: cap to last 6 turns and drop ops payloads
      // (only summary strings ride along).
      const tail = current.slice(-HISTORY_TURNS_KEPT);
      return tail
        .map((m) => historyTurnFor(m))
        .filter((t): t is { role: "user" | "assistant"; content: string } => t !== null);
    },
    [],
  );

  const performSend = useCallback(
    async (prompt: string, attachments: Attachment[], referencedPageSlugs: string[]) => {
      const userMsg: UserMessage = {
        id: `m_${Math.random().toString(36).slice(2, 10)}`,
        role: "user",
        content: prompt,
        attachments,
      };
      lastSendRef.current = { prompt, attachments, referencedPageSlugs };
      setLoading(true);

      // Snapshot the transcript BEFORE appending the new user turn so the
      // history payload doesn't echo it back.
      const historyTurns = buildHistoryPayload(messages);
      setMessages((prev) => [...prev, userMsg]);

      const requestBody = {
        siteId,
        currentVersionId,
        prompt,
        attachments: attachments.length > 0 ? attachments : undefined,
        selection: buildSelectionPayload(),
        history: historyTurns.length > 0 ? historyTurns : undefined,
        referencedPageSlugs: referencedPageSlugs.length > 0 ? referencedPageSlugs : undefined,
        // Hotfix 2026-04-30 (rev 2): always send the editor's current
        // page so the orchestrator keeps it un-elided in the focused
        // config, even when nothing is selected.
        currentPageSlug,
      };

      let response: Response;
      try {
        response = await fetch("/api/ai-edit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(requestBody),
        });
      } catch (e) {
        const err: AiError = {
          kind: "network_error",
          message: e instanceof Error ? e.message : "Network request failed",
        };
        // No response means no x-ai-source header, so the error message
        // gets aiSource: "live" by definition (a fixture would have served).
        appendAssistantError(setMessages, err, "live");
        setLoading(false);
        return;
      }

      // Sprint 14 DoD-12: capture the dev-only `x-ai-source` header for the
      // assistant turn about to be appended. Undefined in production where
      // the route omits the header.
      const turnAiSource = narrowAiSource(response.headers.get("x-ai-source"));

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        const err: AiError = {
          kind: "invalid_output",
          message: `Bad response shape (HTTP ${response.status})`,
        };
        appendAssistantError(setMessages, err, "live");
        setLoading(false);
        return;
      }

      const result = interpretResponse(body);
      if (result.kind === "ok") {
        const assistant: AssistantMessage = {
          id: `m_${Math.random().toString(36).slice(2, 10)}`,
          role: "assistant",
          kind: "ok",
          summary: result.summary,
          operations: result.operations,
          status: "pending",
          aiSource: turnAiSource,
          usage: result.usage,
        };
        setMessages((prev) => [...prev, assistant]);
      } else if (result.kind === "clarify") {
        const assistant: AssistantMessage = {
          id: `m_${Math.random().toString(36).slice(2, 10)}`,
          role: "assistant",
          kind: "clarify",
          question: result.question,
          aiSource: turnAiSource,
          usage: result.usage,
        };
        setMessages((prev) => [...prev, assistant]);
      } else {
        // An error envelope from the route means the live call failed AND
        // the fixture lookup also missed -- so the error itself was served
        // live (no fixture was involved).
        appendAssistantError(setMessages, result.error, "live", result.usage);
      }
      setLoading(false);
    },
    [
      messages,
      siteId,
      currentVersionId,
      currentPageSlug,
      buildSelectionPayload,
      buildHistoryPayload,
    ],
  );

  const send = useCallback(
    async (prompt: string, attachments: Attachment[] = [], referencedPageSlugs: string[] = []) => {
      await performSend(prompt, attachments, referencedPageSlugs);
    },
    [performSend],
  );

  const retry = useCallback(async () => {
    const last = lastSendRef.current;
    if (!last) return;
    await performSend(last.prompt, last.attachments, last.referencedPageSlugs);
  }, [performSend]);

  const accept = useCallback(
    (messageId: string) => {
      // Read the message via the current closure rather than the updater
      // function so the commit fires regardless of how React batches the
      // setMessages call.
      const target = messages.find((m) => m.id === messageId);
      if (!target || target.role !== "assistant" || target.kind !== "ok") return;
      if (target.status !== "pending") return;
      const ops = target.operations;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.role === "assistant" && m.kind === "ok" && m.status === "pending"
            ? { ...m, status: "accepted" }
            : m,
        ),
      );
      commitAiEditOperations(ops);
    },
    [messages, commitAiEditOperations],
  );

  const discard = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        if (m.role !== "assistant" || m.kind !== "ok") return m;
        if (m.status !== "pending") return m;
        return { ...m, status: "discarded" };
      }),
    );
  }, []);

  return { messages, loading, send, accept, discard, retry };
}

function appendAssistantError(
  setMessages: (updater: (prev: Message[]) => Message[]) => void,
  error: AiError,
  aiSource: "live" | "fixture",
  usage?: AiTurnUsage,
): void {
  const msg: AssistantMessage = {
    id: `m_${Math.random().toString(36).slice(2, 10)}`,
    role: "assistant",
    kind: "error",
    error,
    aiSource,
    usage,
  };
  setMessages((prev) => [...prev, msg]);
}

function narrowAiSource(value: string | null): "live" | "fixture" | undefined {
  if (value === "live" || value === "fixture") return value;
  return undefined;
}

type Interpreted =
  | { kind: "ok"; summary: string; operations: Operation[]; usage?: AiTurnUsage }
  | { kind: "clarify"; question: string; usage?: AiTurnUsage }
  | { kind: "error"; error: AiError; usage?: AiTurnUsage };

function interpretResponse(body: unknown): Interpreted {
  if (typeof body !== "object" || body === null) {
    return {
      kind: "error",
      error: { kind: "invalid_output", message: "Response was not an object" },
    };
  }
  const obj = body as Record<string, unknown>;
  const usage = readUsage(obj.usage);
  if (typeof obj.error === "object" && obj.error !== null) {
    const err = obj.error as Partial<AiError>;
    if (typeof err.kind === "string" && typeof err.message === "string") {
      return {
        kind: "error",
        error: { kind: err.kind as AiError["kind"], message: err.message, details: err.details },
        usage,
      };
    }
    return {
      kind: "error",
      error: { kind: "invalid_output", message: "Malformed error envelope" },
      usage,
    };
  }
  if (obj.kind === "ok" && typeof obj.summary === "string" && Array.isArray(obj.operations)) {
    return {
      kind: "ok",
      summary: obj.summary,
      operations: obj.operations as Operation[],
      usage,
    };
  }
  if (obj.kind === "clarify" && typeof obj.question === "string") {
    return { kind: "clarify", question: obj.question, usage };
  }
  return {
    kind: "error",
    error: { kind: "invalid_output", message: "Unknown response shape" },
    usage,
  };
}

function readUsage(value: unknown): AiTurnUsage | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const v = value as Record<string, unknown>;
  if (typeof v.inputTokens === "number" && typeof v.outputTokens === "number") {
    return { inputTokens: v.inputTokens, outputTokens: v.outputTokens };
  }
  return undefined;
}

function historyTurnFor(m: Message): { role: "user" | "assistant"; content: string } | null {
  if (m.role === "user") return { role: "user", content: m.content };
  if (m.kind === "ok") return { role: "assistant", content: m.summary };
  if (m.kind === "clarify") return { role: "assistant", content: m.question };
  // Drop error turns from the history window -- they would only confuse the
  // model and burn tokens.
  return null;
}
