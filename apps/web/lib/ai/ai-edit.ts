/**
 * AI Edit orchestrator.
 *
 * Mirrors `generate-initial-site.ts` (Sprint 4) -- builds the system prompt,
 * attaches up to 4 image content blocks, calls Claude with the §9.7 AI Edit
 * parameters (claude-sonnet-4-5, max_tokens 8000, temperature 0.2), parses
 * the JSON response, validates against the AI Edit response schema, and on
 * parse / validation failure retries ONCE with a follow-up message
 * including the validation issues. Every failure path maps to a categorized
 * `AiError` via `categorizeAiError`.
 *
 * The response is a discriminated union -- the model may either propose a
 * diff (`kind: "ok"`) or ask a clarifying question (`kind: "clarify"`). The
 * caller is responsible for surfacing each shape; this orchestrator only
 * validates and forwards.
 *
 * Sprint 14 wraps the orchestrator's outermost return path with a
 * fixture-fallback lookup (PROJECT_SPEC.md §9.10). After both retries are
 * exhausted, `lookupAiEditFixture` consults `demo_fixtures` keyed on the
 * canonical hash of the input. On a hit the orchestrator returns the
 * stored response tagged `source: "fixture"`; on a miss it returns the
 * original error envelope tagged `source: "live"`. The §9.9 per-site edit
 * cap stays at the route layer (`apps/web/app/api/ai-edit/route.ts`) per
 * Sprint 11 -- this file does not duplicate the guard.
 */

import { createAnthropicClient } from "@/lib/ai/client";
import { type AiError, categorizeAiError } from "@/lib/ai/errors";
import { type FixtureAiEditInput, lookupAiEditFixture } from "@/lib/ai/fixtures";
import {
  type AiEditPromptInput,
  type AiEditSelection,
  buildAiEditSystemPrompt,
} from "@/lib/ai/prompts/ai-edit";
import type { StockImageRow } from "@/lib/ai/prompts/snippets/stock-images";
import type { SiteConfig } from "@/lib/site-config";
import { type Operation, operationSchema } from "@/lib/site-config/ops";
import type Anthropic from "@anthropic-ai/sdk";
import type {
  ImageBlockParam,
  MessageParam,
  TextBlockParam,
} from "@anthropic-ai/sdk/resources/messages";
import type { ZodIssue } from "zod";
import { z } from "zod";

const MODEL = "claude-sonnet-4-5";
// Hotfix 2026-04-30: bumped 6_000 -> 8_000 (max under the demo Claude plan
// output cap). Multi-component AI Edit prompts (testimonials grid, etc.)
// were truncating mid-JSON because the post-Sprint-15 prompt embeds the
// stock-images catalog and the model's operations grew. See
// DECISIONS.md 2026-04-30.
const MAX_TOKENS = 8_000;
const TEMPERATURE = 0.2;
const MAX_IMAGES = 4;

export type AiEditAttachment = { url: string };

export type AiEditHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

// Hotfix 2026-04-30: surface Anthropic's per-call token usage so the
// right-sidebar chat can render a "<input>/<output>" badge on each
// assistant turn. Keeps the demo operator informed about how close each
// prompt is to the 30k input / 8k output plan caps.
export type AiEditUsage = {
  inputTokens: number;
  outputTokens: number;
};

/**
 * Sprint 14 widens the input with optional `siteId` / `currentVersionId`.
 * The route layer (which already knows them per request) forwards them so
 * the fixture hash can include them -- without these, two distinct sites
 * issuing identical prompts would collide on a single fixture row.
 * Existing callers that pre-date Sprint 14 (the unit test file) keep
 * working because both new fields are optional.
 */
export type AiEditInput = {
  prompt: string;
  config: SiteConfig;
  selection: AiEditSelection | null;
  attachments?: AiEditAttachment[];
  history?: AiEditHistoryTurn[];
  siteId?: string;
  currentVersionId?: string;
  stockImages?: StockImageRow[];
  // Hotfix 2026-04-30: extra page slugs the user pinned in the chat panel
  // so the model sees those pages' subtrees in addition to the currently
  // edited page. Empty / undefined => only the currently edited page is
  // sent in full; everything else collapses to a {slug,name,kind}
  // skeleton.
  referencedPageSlugs?: string[];
  // Hotfix 2026-04-30 (rev 2): the slug of the page the user has open in
  // the editor. Sent independently of `selection` because the user can
  // be editing the whole page with nothing selected; without this the
  // focused config has no signal for which page is "current" and elides
  // it.
  currentPageSlug?: string;
};

export type AiEditOk = {
  kind: "ok";
  summary: string;
  operations: Operation[];
  source: "live" | "fixture";
  usage?: AiEditUsage;
};
export type AiEditClarify = {
  kind: "clarify";
  question: string;
  source: "live" | "fixture";
  usage?: AiEditUsage;
};
export type AiEditError = {
  kind: "error";
  error: AiError;
  source: "live" | "fixture";
  usage?: AiEditUsage;
};
export type AiEditResult = AiEditOk | AiEditClarify | AiEditError;

const okResponseSchema = z.object({
  kind: z.literal("ok"),
  summary: z.string().min(1),
  operations: z.array(operationSchema),
});

const clarifyResponseSchema = z.object({
  kind: z.literal("clarify"),
  question: z.string().min(1),
});

const aiEditResponseSchema = z.discriminatedUnion("kind", [
  okResponseSchema,
  clarifyResponseSchema,
]);

type AiEditResponse = z.infer<typeof aiEditResponseSchema>;

export async function aiEdit(
  input: AiEditInput,
  client: Pick<Anthropic, "messages"> = createAnthropicClient(),
): Promise<AiEditResult> {
  const promptInput: AiEditPromptInput = {
    config: input.config,
    selection: input.selection,
    stockImages: input.stockImages,
    referencedPageSlugs: input.referencedPageSlugs,
    currentPageSlug: input.currentPageSlug,
  };
  const systemPrompt = buildAiEditSystemPrompt(promptInput);

  const initialMessages = buildMessages(input);

  let firstAttemptText: string | undefined;
  let firstZodIssues: ZodIssue[] | undefined;
  let lastUsage: AiEditUsage | undefined;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: systemPrompt,
      messages: initialMessages,
    });
    lastUsage = extractUsage(response);
    const text = extractText(response);
    firstAttemptText = text;
    const parsed = parseAndValidate(text);
    if (parsed.success) {
      return resultFromResponse(parsed.value, "live", lastUsage);
    }
    firstZodIssues = parsed.issues;
  } catch (e) {
    return withFixtureFallback(input, categorizeAiError(e), lastUsage);
  }

  // Single retry per §9.7.
  const retryMessages: MessageParam[] = [
    ...initialMessages,
    {
      role: "assistant",
      content: [{ type: "text", text: firstAttemptText }],
    },
    {
      role: "user",
      content: [{ type: "text", text: buildRetryInstruction(firstZodIssues ?? []) }],
    },
  ];

  try {
    const retryResponse = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: systemPrompt,
      messages: retryMessages,
    });
    lastUsage = extractUsage(retryResponse);
    const text = extractText(retryResponse);
    const parsed = parseAndValidate(text);
    if (parsed.success) {
      return resultFromResponse(parsed.value, "live", lastUsage);
    }
    return withFixtureFallback(
      input,
      {
        kind: "invalid_output",
        message: "AI Edit response failed validation",
        details: JSON.stringify(parsed.issues),
      },
      lastUsage,
    );
  } catch (e) {
    return withFixtureFallback(input, categorizeAiError(e), lastUsage);
  }
}

// Single chokepoint for "the live call failed -- try a fixture before
// surfacing the error". Mirrors generate-initial-site.ts's helper of the
// same shape. The fixture hash includes siteId + currentVersionId, so the
// orchestrator forwards whatever the route handed it; tests that omit
// these (Sprint 11's existing suite) still work because the lookup just
// hashes `null` for missing fields and misses the fixture row, falling
// through to the original error envelope.
async function withFixtureFallback(
  input: AiEditInput,
  error: AiError,
  usage: AiEditUsage | undefined,
): Promise<AiEditResult> {
  const lookupInput: FixtureAiEditInput = {
    prompt: input.prompt,
    siteId: input.siteId,
    currentVersionId: input.currentVersionId,
    selection: input.selection,
  };
  const fixture = await lookupAiEditFixture(lookupInput);
  if (fixture) {
    // Fixture hits don't have live usage stats; if a live attempt
    // happened first we still report its usage so the demo operator can
    // see how close the truncated request was to the cap.
    return usage ? { ...fixture, usage } : fixture;
  }
  return { kind: "error", error, source: "live", usage };
}

function buildMessages(input: AiEditInput): MessageParam[] {
  const messages: MessageParam[] = [];
  for (const turn of input.history ?? []) {
    messages.push({
      role: turn.role,
      content: [{ type: "text", text: turn.content }],
    });
  }
  messages.push({
    role: "user",
    content: buildUserContent(input),
  });
  return messages;
}

function buildUserContent(input: AiEditInput): Array<TextBlockParam | ImageBlockParam> {
  const imageBlocks: ImageBlockParam[] = (input.attachments ?? [])
    .slice(0, MAX_IMAGES)
    .map((att) => ({
      type: "image",
      source: { type: "url", url: att.url },
    }));
  const text: TextBlockParam = {
    type: "text",
    text: buildUserInstruction(input),
  };
  return [...imageBlocks, text];
}

function buildUserInstruction(input: AiEditInput): string {
  const lines: string[] = [
    "User request:",
    input.prompt.trim(),
    "",
    'Return a single JSON object matching either { kind: "ok", summary, operations } or { kind: "clarify", question }. No prose, no markdown fences.',
  ];
  return lines.join("\n");
}

function buildRetryInstruction(issues: ZodIssue[]): string {
  return [
    "Your previous output failed validation. Re-emit a valid AI Edit response",
    "matching the contract from the system prompt. Validation issues:",
    JSON.stringify(issues, null, 2),
    "",
    "Return only the corrected JSON object. No prose, no markdown fences.",
  ].join("\n");
}

function extractText(response: { content: Anthropic.Messages.ContentBlock[] }): string {
  const parts: string[] = [];
  for (const block of response.content) {
    if (block.type === "text") parts.push(block.text);
  }
  return parts.join("");
}

function extractUsage(response: {
  usage?: { input_tokens?: number; output_tokens?: number } | null;
}): AiEditUsage | undefined {
  // The SDK shape includes cache_* fields too; we only surface the two
  // numbers the demo operator cares about. If either is missing we drop
  // the whole object rather than report half-truths.
  const u = response.usage;
  if (!u || typeof u.input_tokens !== "number" || typeof u.output_tokens !== "number") {
    return undefined;
  }
  return { inputTokens: u.input_tokens, outputTokens: u.output_tokens };
}

type ParseAndValidateResult =
  | { success: true; value: AiEditResponse }
  | { success: false; issues: ZodIssue[] };

function parseAndValidate(text: string): ParseAndValidateResult {
  const stripped = stripCodeFence(text.trim());
  let value: unknown;
  try {
    value = JSON.parse(stripped);
  } catch (e) {
    return {
      success: false,
      issues: [
        {
          code: "custom",
          path: [],
          message: e instanceof Error ? e.message : "JSON parse error",
        } as ZodIssue,
      ],
    };
  }
  const result = aiEditResponseSchema.safeParse(value);
  if (result.success) {
    return { success: true, value: result.data };
  }
  return { success: false, issues: result.error.issues };
}

function stripCodeFence(text: string): string {
  const fenceMatch = text.match(/^```(?:json)?\n([\s\S]*?)\n```$/);
  if (fenceMatch && fenceMatch[1] !== undefined) {
    return fenceMatch[1].trim();
  }
  return text;
}

function resultFromResponse(
  response: AiEditResponse,
  source: "live" | "fixture",
  usage: AiEditUsage | undefined,
): AiEditResult {
  if (response.kind === "ok") {
    return {
      kind: "ok",
      summary: response.summary,
      operations: response.operations,
      source,
      usage,
    };
  }
  return { kind: "clarify", question: response.question, source, usage };
}

// Internal helpers exported for unit tests only.
export const _internal = {
  buildUserInstruction,
  buildRetryInstruction,
  stripCodeFence,
};

export type { AiError } from "@/lib/ai/errors";
