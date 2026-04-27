/**
 * Demo-fallback fixtures (PROJECT_SPEC.md §9.10).
 *
 * Both AI surfaces wrap their orchestrator's outermost return path with a
 * lookup against `demo_fixtures` keyed on a deterministic hash of the
 * caller's input. On a live failure (any non-success path), the orchestrator
 * consults the fixture store; on a hit the stage demo continues with a
 * known-good response and no one notices the outage.
 *
 * This module owns:
 *   1. `hashGenerationInput` / `hashAiEditInput` -- deterministic SHA256
 *      digests over a canonical-normalized projection of the caller's input.
 *      The projection EXCLUDES image attachments, history turns, and
 *      per-request noise (Date.now() prefixes in upload URLs) so the same
 *      prompt with or without inspiration screenshots maps to the same
 *      fixture. See §9.8 (image attachments excluded) and the Sprint 14
 *      "Canonical hashing" section.
 *   2. `lookupGenerationFixture` / `lookupAiEditFixture` -- head-only reads
 *      against demo_fixtures, validating the stored JSON before returning.
 *      A row whose stored response no longer parses (post-schema-evolution)
 *      is treated as a miss so the original error envelope still surfaces.
 *   3. `recordGenerationFixture` / `recordAiEditFixture` -- UPSERTs keyed on
 *      (surface, input_hash). The recording script is the sole production
 *      caller; tests stub `createServiceSupabaseClient`.
 *
 * Pure Node -- uses `crypto.createHash` (built-in). Do NOT import this
 * module from client code.
 */

import { createHash } from "node:crypto";
import { z } from "zod";

import type { SetupFormValues } from "@/lib/setup-form/types";
import { type SiteConfig, safeParseSiteConfig } from "@/lib/site-config";
import { operationSchema } from "@/lib/site-config/ops";
import { createServiceSupabaseClient } from "@/lib/supabase";
import type { Json } from "@/types/database";

// Type-only imports keep the module direction one-way: ai-edit.ts imports
// from fixtures.ts at runtime; fixtures.ts only borrows ai-edit.ts's types.
import type {
  AiEditAttachment,
  AiEditClarify,
  AiEditHistoryTurn,
  AiEditOk,
  AiEditResult,
} from "./ai-edit";
import type { AiEditSelection } from "./prompts/ai-edit";

const SURFACE_GENERATION = "initial_generation";
const SURFACE_AI_EDIT = "ai_edit";

/**
 * Local hash-input shape for the AI Edit surface. Defined here -- rather
 * than widened on `AiEditInput` -- so the canonical projection (which fields
 * are part of the cache key vs. which are excluded) lives next to the hash
 * function. `siteId` and `currentVersionId` are forwarded from the route
 * layer (which knows them per request) and included in the hash so two
 * distinct sites cannot collide on identical prompts.
 */
export type FixtureAiEditInput = {
  prompt: string;
  siteId?: string;
  currentVersionId?: string;
  selection: AiEditSelection | null;
  // Accepted but EXCLUDED from the hash. Kept on the type so callers may
  // forward the same object they hand to `aiEdit` without re-shaping.
  attachments?: AiEditAttachment[];
  history?: AiEditHistoryTurn[];
};

/**
 * SHA256 hex of the canonical-normalized projection of the setup-form
 * payload. Inputs that differ only in excluded fields hash identically --
 * by design: a stage operator may or may not drop the inspiration
 * screenshot, both code paths land on the same fixture.
 */
export function hashGenerationInput(form: SetupFormValues): string {
  const projection = {
    companyName: form.companyName.trim().toLowerCase(),
    customInstructions: (form.customInstructions ?? "").trim(),
    pagesToInclude: [...(form.pagesToInclude ?? [])].sort(),
    palette: form.palette,
    propertyTypesFeatured: [...(form.propertyTypesFeatured ?? [])].sort(),
    targetAudience: (form.targetAudience ?? "").trim(),
    templateStart: form.templateStart,
  };
  return sha256Hex(stableStringify(projection));
}

/**
 * SHA256 hex of the canonical-normalized projection of the AI-edit input.
 * Attachments and history are excluded; the prompt is trimmed and lowered
 * so casual punctuation drift between recorded and live calls still hits.
 */
export function hashAiEditInput(input: FixtureAiEditInput): string {
  const projection = {
    currentVersionId: input.currentVersionId ?? null,
    prompt: input.prompt.trim().toLowerCase(),
    selection: input.selection
      ? {
          componentIds: [...input.selection.componentIds].sort(),
          pageKind: input.selection.pageKind,
          pageSlug: input.selection.pageSlug,
        }
      : null,
    siteId: input.siteId ?? null,
  };
  return sha256Hex(stableStringify(projection));
}

// Validator for the stored ai-edit response. Mirrors ai-edit.ts's internal
// schema but is defined here to keep the module-import direction one-way
// (no runtime imports from ai-edit.ts -- it imports from us).
const aiEditFixtureSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ok"),
    summary: z.string().min(1),
    operations: z.array(operationSchema),
  }),
  z.object({
    kind: z.literal("clarify"),
    question: z.string().min(1),
  }),
]);

export async function lookupGenerationFixture(form: SetupFormValues): Promise<SiteConfig | null> {
  const hash = hashGenerationInput(form);
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("demo_fixtures")
    .select("response")
    .eq("surface", SURFACE_GENERATION)
    .eq("input_hash", hash)
    .maybeSingle();
  if (error || !data) return null;

  const parsed = safeParseSiteConfig(data.response);
  if (!parsed.success) return null;
  return parsed.data;
}

export async function lookupAiEditFixture(input: FixtureAiEditInput): Promise<AiEditResult | null> {
  const hash = hashAiEditInput(input);
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("demo_fixtures")
    .select("response")
    .eq("surface", SURFACE_AI_EDIT)
    .eq("input_hash", hash)
    .maybeSingle();
  if (error || !data) return null;

  const parsed = aiEditFixtureSchema.safeParse(data.response);
  if (!parsed.success) return null;
  if (parsed.data.kind === "ok") {
    const result: AiEditOk = {
      kind: "ok",
      summary: parsed.data.summary,
      operations: parsed.data.operations,
      source: "fixture",
    };
    return result;
  }
  const result: AiEditClarify = {
    kind: "clarify",
    question: parsed.data.question,
    source: "fixture",
  };
  return result;
}

export async function recordGenerationFixture(
  form: SetupFormValues,
  config: SiteConfig,
): Promise<void> {
  const hash = hashGenerationInput(form);
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("demo_fixtures").upsert(
    {
      surface: SURFACE_GENERATION,
      input_hash: hash,
      response: config as unknown as Json,
    },
    { onConflict: "surface,input_hash" },
  );
  if (error) {
    throw new Error(`Failed to record generation fixture: ${error.message}`);
  }
}

export async function recordAiEditFixture(
  input: FixtureAiEditInput,
  result: AiEditOk | AiEditClarify,
): Promise<void> {
  const hash = hashAiEditInput(input);
  const supabase = createServiceSupabaseClient();
  // Strip the `source` field before storing -- fixtures are the canonical
  // responses; `source: "fixture"` is stamped by the lookup path.
  const stored: Json =
    result.kind === "ok"
      ? {
          kind: "ok",
          summary: result.summary,
          operations: result.operations as unknown as Json,
        }
      : {
          kind: "clarify",
          question: result.question,
        };
  const { error } = await supabase.from("demo_fixtures").upsert(
    {
      surface: SURFACE_AI_EDIT,
      input_hash: hash,
      response: stored,
    },
    { onConflict: "surface,input_hash" },
  );
  if (error) {
    throw new Error(`Failed to record ai-edit fixture: ${error.message}`);
  }
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

// Deterministic JSON stringifier with alphabetically-sorted keys at every
// nesting level. Mirrors `json-stable-stringify`'s behavior without the
// dependency. Undefined values inside objects are dropped (matching
// JSON.stringify); undefined values inside arrays are emitted as null.
function stableStringify(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const items = value.map((v) => (v === undefined ? "null" : stableStringify(v)));
    return `[${items.join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  const entries = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
  return `{${entries.join(",")}}`;
}

// Internal helpers exported for unit tests only.
export const _internal = {
  stableStringify,
};
