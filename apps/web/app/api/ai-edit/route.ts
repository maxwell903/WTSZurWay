/**
 * POST /api/ai-edit
 *
 * The Element 2 right-sidebar chat (Sprint 11) and the future Element 1
 * adjustment chat (Sprint 12) both POST here. The handler validates the
 * request body, loads the site's working version row from Supabase, applies
 * the §9.9 cost guardrail, calls the orchestrator, dry-runs the proposed
 * operations against the loaded SiteConfig (so a bad batch surfaces as an
 * `operation_invalid` error instead of a poisoned client state), and
 * returns the §9.6 discriminated-union response.
 *
 * The endpoint NEVER applies operations to the database -- the client owns
 * that step via `commitAiEditOperations` + the topbar Save action's PATCH.
 * We only validate, route, and reply.
 *
 * Mirrors `apps/web/app/api/generate-initial-site/route.ts`'s module shape
 * (Sprint 4) including the `runtime = "nodejs"` declaration and the
 * `httpStatusForError` policy. Sprint 14 will fold a fixture-fallback
 * `try/catch` into the orchestrator call without changing this file's
 * external contract.
 */

import { aiEdit } from "@/lib/ai/ai-edit";
import type { AiError } from "@/lib/ai/errors";
import type { StockImageRow } from "@/lib/ai/prompts/snippets/stock-images";
import { type SiteConfig, safeParseSiteConfig } from "@/lib/site-config";
import { type Operation, OperationInvalidError, applyOperations } from "@/lib/site-config/ops";
import { createServiceSupabaseClient } from "@/lib/supabase";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PROJECT_SPEC.md §9.9: 200 edits per site soft cap. Counted against the
// `site_versions` table where `source = 'ai_edit'`. Until Sprint 13's Deploy
// produces these rows the count is always 0; Sprint 11 wires the guardrail
// so the row count drives the guard once the rows exist.
const EDIT_LIMIT_PER_SITE = 200;

const attachmentSchema = z.object({
  url: z.string().url(),
});

const selectionSchema = z.object({
  componentIds: z.array(z.string().min(1)),
  pageSlug: z.string().min(1),
  pageKind: z.enum(["static", "detail"]),
});

const historyTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const requestBodySchema = z.object({
  siteId: z.string().uuid(),
  currentVersionId: z.string().uuid(),
  prompt: z.string().min(1, "Prompt must not be empty"),
  attachments: z.array(attachmentSchema).max(4).optional(),
  selection: selectionSchema.nullable().optional(),
  history: z.array(historyTurnSchema).optional(),
  // Hotfix 2026-04-30: extra page slugs the user pinned in the chat
  // panel. The orchestrator includes their full subtrees in the prompt
  // so the model can copy structure / styling cues from them.
  referencedPageSlugs: z.array(z.string().min(1)).max(8).optional(),
  // Hotfix 2026-04-30 (rev 2): slug of the page the user has open in
  // the editor. Used by the orchestrator when `selection` is null
  // (whole-page edit) to keep the current page un-elided in the
  // focused config.
  currentPageSlug: z.string().min(1).optional(),
});

type UsagePayload = { inputTokens: number; outputTokens: number };

type SuccessResponseBody =
  | { kind: "ok"; summary: string; operations: Operation[]; usage?: UsagePayload }
  | { kind: "clarify"; question: string; usage?: UsagePayload };

type ErrorResponseBody = { error: AiError; usage?: UsagePayload };

// Hotfix 2026-04-30: cap to 20 rows so the catalog can't blow past the
// demo Claude plan's 30k input cap. Per-site uploads come first
// (`site_id` non-null sorts above null in Postgres ASC by default for
// non-null columns; we use NULLS LAST explicitly to be sure) so the
// user's own pictures survive the cap.
const STOCK_IMAGES_LIMIT = 20;

async function fetchStockImagesForSite(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  siteId: string,
): Promise<StockImageRow[]> {
  const { data, error } = await supabase
    .from("ai_stock_images")
    .select("id, site_id, storage_path, public_url, category, description")
    .or(`site_id.is.null,site_id.eq.${siteId}`)
    .order("site_id", { ascending: false, nullsFirst: false })
    .order("category", { ascending: true })
    .order("id", { ascending: true })
    .limit(STOCK_IMAGES_LIMIT);
  if (error) {
    console.warn(`[ai-edit] stock-images fetch failed: ${error.message}`);
    return [];
  }
  return (data ?? []) as StockImageRow[];
}

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(400, {
      kind: "invalid_output",
      message: "Request body is not valid JSON.",
    });
  }

  const parsed = requestBodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, {
      kind: "invalid_output",
      message: "Request body failed validation.",
      details: JSON.stringify(parsed.error.issues),
    });
  }

  const body = parsed.data;
  const supabase = createServiceSupabaseClient();

  // Cost guardrail (§9.9). Use head-only count to avoid pulling rows.
  const { count, error: countError } = await supabase
    .from("site_versions")
    .select("id", { count: "exact", head: true })
    .eq("site_id", body.siteId)
    .eq("source", "ai_edit");
  if (countError) {
    return jsonError(503, {
      kind: "auth_error",
      message: countError.message,
    });
  }
  if ((count ?? 0) >= EDIT_LIMIT_PER_SITE) {
    return jsonError(503, {
      kind: "over_quota",
      message: "Demo edit limit reached for this site.",
    });
  }

  const { data: versionRow, error: versionError } = await supabase
    .from("site_versions")
    .select("id, config")
    .eq("id", body.currentVersionId)
    .eq("site_id", body.siteId)
    .maybeSingle();
  if (versionError) {
    return jsonError(503, { kind: "auth_error", message: versionError.message });
  }
  if (!versionRow) {
    return jsonError(404, {
      kind: "auth_error",
      message: "No site version found for the given siteId + currentVersionId.",
    });
  }

  const configParse = safeParseSiteConfig(versionRow.config);
  if (!configParse.success) {
    return jsonError(502, {
      kind: "invalid_output",
      message: "Stored SiteConfig failed validation.",
      details: JSON.stringify(configParse.error.issues),
    });
  }
  const config: SiteConfig = configParse.data;

  const stockImages = await fetchStockImagesForSite(supabase, body.siteId);
  const orchestrator = await aiEdit({
    prompt: body.prompt,
    config,
    selection: body.selection ?? null,
    attachments: body.attachments,
    history: body.history,
    // Sprint 14: forward so the fixture hash includes them. The orchestrator
    // does not otherwise read these fields.
    siteId: body.siteId,
    currentVersionId: body.currentVersionId,
    stockImages,
    referencedPageSlugs: body.referencedPageSlugs,
    currentPageSlug: body.currentPageSlug,
  });

  if (orchestrator.kind === "error") {
    return jsonError(
      httpStatusForError(orchestrator.error),
      orchestrator.error,
      orchestrator.usage,
    );
  }

  if (orchestrator.kind === "clarify") {
    return json(
      200,
      { kind: "clarify", question: orchestrator.question, usage: orchestrator.usage },
      orchestrator.source,
    );
  }

  // Dry-run the proposed operations to guarantee the client receives only
  // batches that will apply cleanly. A throw here translates to the §9.6
  // operation_invalid copy.
  try {
    applyOperations(config, orchestrator.operations);
  } catch (e) {
    if (e instanceof OperationInvalidError) {
      return jsonError(
        502,
        {
          kind: "operation_invalid",
          message: e.message,
          details: e.opId,
        },
        orchestrator.usage,
      );
    }
    return jsonError(
      502,
      {
        kind: "operation_invalid",
        message: e instanceof Error ? e.message : "applyOperations threw a non-Error",
      },
      orchestrator.usage,
    );
  }

  return json(
    200,
    {
      kind: "ok",
      summary: orchestrator.summary,
      operations: orchestrator.operations,
      usage: orchestrator.usage,
    },
    orchestrator.source,
  );
}

function json(
  status: number,
  body: SuccessResponseBody,
  // Sprint 14 DoD-8: dev-mode `x-ai-source` header on every non-error 200
  // (both `ok` and `clarify`). Production omits it entirely.
  source?: "live" | "fixture",
): Response {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "cache-control": "no-store",
  };
  if (source !== undefined && process.env.NODE_ENV !== "production") {
    headers["x-ai-source"] = source;
  }
  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

function jsonError(status: number, error: AiError, usage?: UsagePayload): Response {
  const body: ErrorResponseBody = usage ? { error, usage } : { error };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function httpStatusForError(error: AiError): number {
  // Mirrors apps/web/app/api/generate-initial-site/route.ts's
  // httpStatusForError table verbatim. Sprint 11 reuses the policy as the
  // single source of truth.
  switch (error.kind) {
    case "network_error":
      return 502;
    case "timeout":
      return 504;
    case "over_quota":
      return 503;
    case "auth_error":
      return 503;
    case "invalid_output":
      return 502;
    case "operation_invalid":
      return 502;
    case "model_clarification":
      return 200;
    default: {
      const _exhaustive: never = error.kind;
      void _exhaustive;
      return 500;
    }
  }
}
