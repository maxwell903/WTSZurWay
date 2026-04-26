/**
 * ANTHROPIC CLIENT FACTORY -- SERVER ONLY.
 *
 * Mirrors lib/supabase/service.ts: a single factory that constructs an
 * `Anthropic` instance from the `ANTHROPIC_API_KEY` env var, throws if it
 * is ever invoked from the browser, and throws if the key is unset.
 * PROJECT_SPEC.md §3.1 / §3.4 require the API key to stay server-side --
 * never import this file from a "use client" module, hook, or component
 * rendered in the browser.
 *
 * The SDK reads `ANTHROPIC_API_KEY` from `process.env` by default. We pass
 * it explicitly here so the missing-key failure surfaces with a clear
 * Sprint-4 message instead of an opaque SDK runtime error.
 */

import Anthropic from "@anthropic-ai/sdk";

export function createAnthropicClient(): Anthropic {
  if (typeof window !== "undefined") {
    throw new Error("createAnthropicClient called in browser");
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }

  return new Anthropic({ apiKey });
}
