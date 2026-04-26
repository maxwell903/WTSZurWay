/**
 * AiError -- the discriminated-union failure shape every AI surface returns.
 * Categories match PROJECT_SPEC.md §9.6 verbatim. The user-facing copy lives
 * in the UI layer (PreviewPanel, AdjustmentChat). This module owns:
 *
 *   1. The type itself.
 *   2. `categorizeAiError` -- maps anything thrown by the SDK or the
 *      orchestrator into one of the seven categories. Sprint 4 only
 *      reaches `model_clarification` via direct construction (Initial
 *      Generation does not return clarifications); Sprint 11 will use
 *      it from the AI Edit response shape.
 *   3. `formatErrorReport` -- the JSON blob the "Copy details" button
 *      copies to the clipboard for support / debugging.
 */

import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
} from "@anthropic-ai/sdk";
import { ZodError } from "zod";

export type AiErrorKind =
  | "network_error"
  | "timeout"
  | "model_clarification"
  | "invalid_output"
  | "operation_invalid"
  | "over_quota"
  | "auth_error";

export type AiError = {
  kind: AiErrorKind;
  message: string;
  details?: string;
};

export function categorizeAiError(input: unknown): AiError {
  // Order matters: timeout extends APIConnectionError, AuthenticationError
  // and PermissionDeniedError extend APIError, so the more specific checks
  // come first.
  if (input instanceof APIConnectionTimeoutError) {
    return {
      kind: "timeout",
      message: input.message,
    };
  }
  if (input instanceof APIUserAbortError) {
    return {
      kind: "timeout",
      message: input.message,
    };
  }
  if (input instanceof APIConnectionError) {
    return {
      kind: "network_error",
      message: input.message,
    };
  }
  if (input instanceof AuthenticationError || input instanceof PermissionDeniedError) {
    return {
      kind: "auth_error",
      message: input.message,
    };
  }
  if (input instanceof RateLimitError) {
    return {
      kind: "over_quota",
      message: input.message,
    };
  }
  if (input instanceof APIError) {
    if (input.status === 401 || input.status === 403) {
      return { kind: "auth_error", message: input.message };
    }
    if (input.status === 429) {
      return { kind: "over_quota", message: input.message };
    }
    return { kind: "auth_error", message: input.message };
  }
  if (input instanceof ZodError) {
    return {
      kind: "invalid_output",
      message: "Validation failed against SiteConfig schema",
      details: JSON.stringify(input.issues),
    };
  }
  if (input instanceof Error) {
    if (input.name === "AbortError" || /fetch failed|network/i.test(input.message)) {
      return { kind: "network_error", message: input.message };
    }
    return { kind: "auth_error", message: input.message };
  }
  return {
    kind: "auth_error",
    message: "Unknown error",
    details: safeStringify(input),
  };
}

function safeStringify(input: unknown): string {
  // JSON.stringify is the most informative serializer for plain objects --
  // String({}) yields the unhelpful "[object Object]". Fall back to String
  // for values JSON cannot represent (BigInt, functions, circular refs).
  try {
    const json = JSON.stringify(input);
    if (json !== undefined) return json;
  } catch {
    // ignore -- fall through to String fallback
  }
  return String(input);
}

export function formatErrorReport(error: AiError): string {
  // Stable JSON shape so the support team can deserialize the clipboard
  // payload directly. JSON.stringify with 2-space indent matches what
  // browser devtools display, which makes paste-into-an-issue legible.
  return JSON.stringify(
    {
      kind: error.kind,
      message: error.message,
      details: error.details,
    },
    null,
    2,
  );
}
