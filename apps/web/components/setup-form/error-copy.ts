// PROJECT_SPEC.md §9.6 user-facing error copy table for the Element 1
// preview panel. Sprint 4 created this table inline in PreviewPanel.tsx;
// Sprint 12 extracted it so AdjustmentChat can render the same strings the
// user has already seen on the panel itself. Both consumers import from
// here so the copy stays in lockstep.

import type { AiErrorKind } from "@/lib/ai/errors";

export const ERROR_COPY: Record<AiErrorKind, string> = {
  network_error: "We couldn't reach our AI service. Check your connection and try again.",
  timeout: "The AI took too long to respond. Try a shorter or more specific prompt.",
  model_clarification: "The AI needs more information to continue.",
  invalid_output: "The AI returned something we couldn't parse. Try rephrasing your request.",
  operation_invalid:
    "One of the AI's suggested changes wouldn't work on this page. The change was discarded.",
  over_quota: "Service unavailable, please try again later.",
  auth_error: "Service unavailable, please try again later.",
};

export const RETRYABLE_KINDS: ReadonlySet<AiErrorKind> = new Set([
  "network_error",
  "timeout",
  "over_quota",
]);
