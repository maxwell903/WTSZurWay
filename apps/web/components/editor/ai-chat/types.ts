/**
 * Local types for the right-sidebar AI chat (Sprint 11). Shared across the
 * sub-components so the wire shapes stay aligned with the route handler at
 * apps/web/app/api/ai-edit/route.ts.
 */

import type { AiError } from "@/lib/ai/errors";
import type { Operation } from "@/lib/site-config/ops";

export type Attachment = { url: string };

export type UserMessage = {
  id: string;
  role: "user";
  content: string;
  attachments: Attachment[];
};

export type AssistantOkMessage = {
  id: string;
  role: "assistant";
  kind: "ok";
  summary: string;
  operations: Operation[];
  status: "pending" | "accepted" | "discarded";
};

export type AssistantClarifyMessage = {
  id: string;
  role: "assistant";
  kind: "clarify";
  question: string;
};

export type AssistantErrorMessage = {
  id: string;
  role: "assistant";
  kind: "error";
  error: AiError;
};

export type AssistantMessage = AssistantOkMessage | AssistantClarifyMessage | AssistantErrorMessage;

export type Message = UserMessage | AssistantMessage;

export type LoadingState = { kind: "idle" } | { kind: "loading" };

export type ProposedDiff = {
  summary: string;
  operations: Operation[];
};
