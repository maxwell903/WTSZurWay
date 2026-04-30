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

// Sprint 14 DoD-12: assistant messages gain an optional `aiSource` carried
// from the dev-only `x-ai-source` header. Renders a `[live]`/`[fixture]`
// badge when set and not in production. Error messages by definition were
// not served by a fixture (a fixture is a known-good response), so they
// always carry `aiSource: "live"` -- the badge surfaces explicitly so
// dev-mode debugging is consistent across all three message kinds.
// Hotfix 2026-04-30: per-call token usage so the right-sidebar chat can
// render an "in/out" badge on each assistant turn. Optional because
// fixtures and pre-flight errors don't carry it.
export type AiTurnUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type AssistantOkMessage = {
  id: string;
  role: "assistant";
  kind: "ok";
  summary: string;
  operations: Operation[];
  status: "pending" | "accepted" | "discarded";
  aiSource?: "live" | "fixture";
  usage?: AiTurnUsage;
};

export type AssistantClarifyMessage = {
  id: string;
  role: "assistant";
  kind: "clarify";
  question: string;
  aiSource?: "live" | "fixture";
  usage?: AiTurnUsage;
};

export type AssistantErrorMessage = {
  id: string;
  role: "assistant";
  kind: "error";
  error: AiError;
  aiSource?: "live" | "fixture";
  usage?: AiTurnUsage;
};

export type AssistantMessage = AssistantOkMessage | AssistantClarifyMessage | AssistantErrorMessage;

export type Message = UserMessage | AssistantMessage;

export type LoadingState = { kind: "idle" } | { kind: "loading" };

export type ProposedDiff = {
  summary: string;
  operations: Operation[];
};
