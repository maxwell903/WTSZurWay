/**
 * AI Edit orchestrator.
 *
 * Mirrors `generate-initial-site.ts` (Sprint 4) -- builds the system prompt,
 * attaches up to 4 image content blocks, calls Claude with the §9.7 AI Edit
 * parameters (claude-sonnet-4-5, max_tokens 6000, temperature 0.2), parses
 * the JSON response, validates against the AI Edit response schema, and on
 * parse / validation failure retries ONCE with a follow-up message
 * including the validation issues. Every failure path maps to a categorized
 * `AiError` via `categorizeAiError`.
 *
 * The response is a discriminated union -- the model may either propose a
 * diff (`kind: "ok"`) or ask a clarifying question (`kind: "clarify"`). The
 * caller is responsible for surfacing each shape; this orchestrator only
 * validates and forwards.
 */

import { createAnthropicClient } from "@/lib/ai/client";
import { type AiError, categorizeAiError } from "@/lib/ai/errors";
import {
  type AiEditPromptInput,
  type AiEditSelection,
  buildAiEditSystemPrompt,
} from "@/lib/ai/prompts/ai-edit";
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
const MAX_TOKENS = 6_000;
const TEMPERATURE = 0.2;
const MAX_IMAGES = 4;

export type AiEditAttachment = { url: string };

export type AiEditHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

export type AiEditInput = {
  prompt: string;
  config: SiteConfig;
  selection: AiEditSelection | null;
  attachments?: AiEditAttachment[];
  history?: AiEditHistoryTurn[];
};

export type AiEditOk = { kind: "ok"; summary: string; operations: Operation[] };
export type AiEditClarify = { kind: "clarify"; question: string };
export type AiEditError = { kind: "error"; error: AiError };
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
  };
  const systemPrompt = buildAiEditSystemPrompt(promptInput);

  const initialMessages = buildMessages(input);

  let firstAttemptText: string | undefined;
  let firstZodIssues: ZodIssue[] | undefined;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: systemPrompt,
      messages: initialMessages,
    });
    const text = extractText(response);
    firstAttemptText = text;
    const parsed = parseAndValidate(text);
    if (parsed.success) {
      return resultFromResponse(parsed.value);
    }
    firstZodIssues = parsed.issues;
  } catch (e) {
    return { kind: "error", error: categorizeAiError(e) };
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
    const text = extractText(retryResponse);
    const parsed = parseAndValidate(text);
    if (parsed.success) {
      return resultFromResponse(parsed.value);
    }
    return {
      kind: "error",
      error: {
        kind: "invalid_output",
        message: "AI Edit response failed validation",
        details: JSON.stringify(parsed.issues),
      },
    };
  } catch (e) {
    return { kind: "error", error: categorizeAiError(e) };
  }
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

function resultFromResponse(response: AiEditResponse): AiEditResult {
  if (response.kind === "ok") {
    return {
      kind: "ok",
      summary: response.summary,
      operations: response.operations,
    };
  }
  return { kind: "clarify", question: response.question };
}

// Internal helpers exported for unit tests only.
export const _internal = {
  buildUserInstruction,
  buildRetryInstruction,
  stripCodeFence,
};

export type { AiError } from "@/lib/ai/errors";
