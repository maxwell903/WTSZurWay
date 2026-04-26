/**
 * Initial Generation orchestrator.
 *
 * Builds the system prompt, attaches up to 4 image content blocks, calls
 * Claude with the §9.7 parameters, parses the JSON response, validates it
 * against `siteConfigSchema`, and -- on parse or validation failure --
 * retries ONCE with the schema and Zod issue list re-attached. Every
 * failure path is mapped to a categorized `AiError` so the route handler
 * can pick an HTTP status without a second try/catch.
 *
 * Sprint 4 explicitly does NOT enforce the §9.9 soft per-site limit
 * (20 generations / 200 edits). Sprint 14 owns that. The TODO below
 * marks the integration point.
 */

import type { SiteConfig } from "@/lib/site-config";
import { safeParseSiteConfig } from "@/lib/site-config";
import type { SetupFormValues } from "@/lib/setup-form/types";
import type Anthropic from "@anthropic-ai/sdk";
import type { ImageBlockParam, MessageParam, TextBlockParam } from "@anthropic-ai/sdk/resources/messages";
import type { ZodIssue } from "zod";
import { createAnthropicClient } from "./client";
import { type AiError, categorizeAiError } from "./errors";
import { buildInitialGenerationSystemPrompt } from "./prompts/initial-generation";

const MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 16_000;
const TEMPERATURE = 0.4;
const MAX_IMAGES = 4;

export type InspirationImage = { url: string };

export type InitialGenerationInput = {
  form: SetupFormValues;
  inspirationImages?: InspirationImage[];
};

export type GenerateInitialSiteResult =
  | { kind: "ok"; config: SiteConfig }
  | { kind: "error"; error: AiError };

// TODO(sprint-14): per-site soft-limit per §9.9 -- consult the in-flight
// usage counter before calling messages.create and short-circuit with an
// `over_quota` AiError when exceeded.

export async function generateInitialSite(
  input: InitialGenerationInput,
  // The client is injected to keep the orchestrator unit-testable without a
  // real Anthropic instance. The default constructs a real client; tests
  // pass a mock.
  client: Pick<Anthropic, "messages"> = createAnthropicClient(),
): Promise<GenerateInitialSiteResult> {
  const systemPrompt = buildInitialGenerationSystemPrompt(input);
  const userInstruction = buildUserInstruction(input.form);
  const imageBlocks = buildImageBlocks(input.inspirationImages);

  const initialMessages: MessageParam[] = [
    {
      role: "user",
      content: [{ type: "text", text: userInstruction }, ...imageBlocks],
    },
  ];

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
      return { kind: "ok", config: parsed.config };
    }
    firstZodIssues = parsed.issues;
  } catch (e) {
    return { kind: "error", error: categorizeAiError(e) };
  }

  // Retry: include the original assistant output and the validation issues
  // so the model can correct itself in one round-trip.
  const retryMessages: MessageParam[] = [
    ...initialMessages,
    {
      role: "assistant",
      content: [{ type: "text", text: firstAttemptText }],
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: buildRetryInstruction(firstZodIssues ?? []),
        },
      ],
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
      return { kind: "ok", config: parsed.config };
    }
    return {
      kind: "error",
      error: {
        kind: "invalid_output",
        message: "Validation failed against SiteConfig schema",
        details: JSON.stringify(parsed.issues),
      },
    };
  } catch (e) {
    return { kind: "error", error: categorizeAiError(e) };
  }
}

function buildUserInstruction(form: SetupFormValues): string {
  // The user-message half of the prompt -- per-request payload that varies
  // per generation. The system prompt stays identical across requests so
  // future prompt caching (Sprint 14) can hit consistently.
  const lines: string[] = [
    `Generate a SiteConfig for the following property management business.`,
    "",
    `Company name: ${form.companyName}`,
    form.tagline ? `Tagline: ${form.tagline}` : "",
    form.targetAudience ? `Target audience: ${form.targetAudience}` : "",
    form.currentWebsiteUrl ? `Current website: ${form.currentWebsiteUrl}` : "",
    "",
    `Palette: ${form.palette}`,
    form.tone ? `Tone: ${form.tone}` : "",
    form.primaryCta ? `Primary CTA: ${form.primaryCta}` : "",
    form.brandVoiceNotes ? `Brand voice notes: ${form.brandVoiceNotes}` : "",
    "",
    form.propertyTypesFeatured && form.propertyTypesFeatured.length > 0
      ? `Property types featured: ${form.propertyTypesFeatured.join(", ")}`
      : "",
    form.pagesToInclude && form.pagesToInclude.length > 0
      ? `Pages to include: ${form.pagesToInclude.join(", ")}`
      : "",
    "",
    form.customInstructions ? `Custom instructions: ${form.customInstructions}` : "",
    "",
    form.logoPrimary?.url ? `Primary logo URL: ${form.logoPrimary.url}` : "",
    form.logoSecondary?.url ? `Secondary logo URL: ${form.logoSecondary.url}` : "",
    "",
    form.phoneNumber ? `Phone: ${form.phoneNumber}` : "",
    form.email ? `Email: ${form.email}` : "",
    form.serviceArea ? `Service area: ${form.serviceArea}` : "",
    form.hoursOfOperation ? `Hours: ${form.hoursOfOperation}` : "",
    "",
    `Set meta.siteName to the company name and meta.siteSlug to a slugified form.`,
    `Apply the chosen palette consistently across all components.`,
  ];
  return lines.filter((l) => l !== "").join("\n");
}

function buildImageBlocks(images: InspirationImage[] | undefined): ImageBlockParam[] {
  // PROJECT_SPEC.md §9.8: max 4 images per request. Cap silently on the
  // server even though the form schema already caps at 4 -- belt and braces.
  const capped = (images ?? []).slice(0, MAX_IMAGES);
  return capped.map((img) => ({
    type: "image",
    source: { type: "url", url: img.url },
  }));
}

function buildRetryInstruction(issues: ZodIssue[]): string {
  return [
    "Your previous output failed validation. Re-emit a valid SiteConfig",
    "JSON object. Validation errors:",
    JSON.stringify(issues, null, 2),
    "",
    "Return only the corrected JSON object. No prose, no markdown fences.",
  ].join("\n");
}

function extractText(response: { content: Anthropic.Messages.ContentBlock[] }): string {
  // The Messages API returns an array of content blocks. We expect exactly
  // one text block (the §9.7 contract is one-shot, structured JSON), but
  // tolerate extras by concatenating text-typed blocks in order.
  const parts: string[] = [];
  for (const block of response.content) {
    if (block.type === "text") {
      parts.push(block.text);
    }
  }
  return parts.join("");
}

type ParseAndValidateResult =
  | { success: true; config: SiteConfig }
  | { success: false; issues: ZodIssue[] };

function parseAndValidate(text: string): ParseAndValidateResult {
  // Some models occasionally wrap JSON in a code fence despite the prompt
  // instructions. Strip a single leading ```json (or ```) and trailing ```
  // before parsing -- documented behavior in the orchestrator contract.
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
  const result = safeParseSiteConfig(value);
  if (result.success) {
    return { success: true, config: result.data };
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

// Internal helpers exported for unit tests only. Not intended as a public
// surface -- prefix with underscore so consumers see the intent.
export const _internal = {
  buildUserInstruction,
  buildImageBlocks,
  buildRetryInstruction,
  stripCodeFence,
};

// Re-export the AiError type for consumers that mainly import from this
// module so they don't have to know about the errors.ts neighbor.
export type { AiError } from "./errors";
