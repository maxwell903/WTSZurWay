// @vitest-environment node

import {
  APIConnectionError,
  APIConnectionTimeoutError,
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
} from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { type AiError, categorizeAiError, formatErrorReport } from "../errors";

describe("categorizeAiError", () => {
  it("maps APIConnectionError to network_error", () => {
    const err = new APIConnectionError({ message: "ECONNREFUSED" });
    const result = categorizeAiError(err);
    expect(result.kind).toBe("network_error");
    expect(result.message).toContain("ECONNREFUSED");
  });

  it("maps APIConnectionTimeoutError to timeout", () => {
    const err = new APIConnectionTimeoutError({ message: "Request timed out" });
    const result = categorizeAiError(err);
    expect(result.kind).toBe("timeout");
  });

  it("maps AuthenticationError (401) to auth_error", () => {
    const err = new AuthenticationError(401, undefined, "Invalid API key", new Headers());
    const result = categorizeAiError(err);
    expect(result.kind).toBe("auth_error");
    expect(result.message).toContain("Invalid API key");
  });

  it("maps PermissionDeniedError (403) to auth_error", () => {
    const err = new PermissionDeniedError(403, undefined, "Forbidden", new Headers());
    const result = categorizeAiError(err);
    expect(result.kind).toBe("auth_error");
  });

  it("maps RateLimitError (429) to over_quota", () => {
    const err = new RateLimitError(429, undefined, "Rate limit exceeded", new Headers());
    const result = categorizeAiError(err);
    expect(result.kind).toBe("over_quota");
  });

  it("maps ZodError to invalid_output with the issue list in details", () => {
    const schema = z.object({ name: z.string() });
    const parsed = schema.safeParse({ name: 42 });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const result = categorizeAiError(parsed.error);
    expect(result.kind).toBe("invalid_output");
    expect(result.details).toBeDefined();
    expect(JSON.parse(result.details ?? "[]")).toEqual(parsed.error.issues);
  });

  it("maps an AbortError-named Error to network_error", () => {
    const err = new Error("Aborted");
    err.name = "AbortError";
    expect(categorizeAiError(err).kind).toBe("network_error");
  });

  it("maps an Error whose message mentions 'fetch failed' to network_error", () => {
    const err = new Error("fetch failed: getaddrinfo ENOTFOUND");
    expect(categorizeAiError(err).kind).toBe("network_error");
  });

  it("falls back to auth_error for any other Error", () => {
    const err = new Error("Something unexpected");
    const result = categorizeAiError(err);
    expect(result.kind).toBe("auth_error");
    expect(result.message).toBe("Something unexpected");
  });

  it("falls back to auth_error with stringified details for non-Error throws", () => {
    const result = categorizeAiError({ weird: "thing" });
    expect(result.kind).toBe("auth_error");
    expect(result.details).toContain("weird");
  });

  // operation_invalid and model_clarification are constructed directly --
  // Sprint 4's initial generation does not surface either category. Sprint 11
  // (AI Edit) uses operation_invalid; Sprint 12 (clarify) uses
  // model_clarification. Test direct construction here so the category list
  // stays exhaustive.
  it("supports direct construction of operation_invalid", () => {
    const err: AiError = { kind: "operation_invalid", message: "bad op" };
    expect(err.kind).toBe("operation_invalid");
  });

  it("supports direct construction of model_clarification", () => {
    const err: AiError = { kind: "model_clarification", message: "Which page?" };
    expect(err.kind).toBe("model_clarification");
  });
});

describe("formatErrorReport", () => {
  it("produces JSON parseable back to the same AiError", () => {
    const err: AiError = {
      kind: "invalid_output",
      message: "Validation failed",
      details: '[{"path":["meta"],"message":"required"}]',
    };
    const report = formatErrorReport(err);
    const parsed = JSON.parse(report);
    expect(parsed.kind).toBe(err.kind);
    expect(parsed.message).toBe(err.message);
    expect(parsed.details).toBe(err.details);
  });

  it("omits details when undefined (key present, value undefined ⇒ stripped)", () => {
    const err: AiError = { kind: "auth_error", message: "Service unavailable" };
    const report = formatErrorReport(err);
    const parsed = JSON.parse(report);
    expect(parsed.kind).toBe("auth_error");
    expect("details" in parsed).toBe(false);
  });
});
