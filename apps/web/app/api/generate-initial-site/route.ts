/**
 * POST /api/generate-initial-site
 *
 * Element 1's Save button POSTs the validated setup-form payload here. The
 * route validates the body server-side (defense in depth even though the
 * form already validated client-side), derives a unique slug, calls the
 * Anthropic orchestrator, persists `sites` + `site_versions` (version 1,
 * is_working=true, source="initial_generation", created_by="ai"), and
 * returns the data the PreviewPanel needs to load the iframe at
 * `/{slug}/preview?v={versionId}`.
 *
 * Auth is a placeholder per PROJECT_SPEC.md §17 -- the demo writes via
 * the service-role client. Replace with audience-scoped policies when real
 * auth lands.
 *
 * The Anthropic SDK uses Node-only APIs (Buffer, native fetch headers),
 * so the route runs on the Node runtime. Edge runtime would error at
 * build time.
 */

import type { AiError } from "@/lib/ai/errors";
import { generateInitialSite } from "@/lib/ai/generate-initial-site";
import { deriveSiteSlug, ensureUniqueSlug } from "@/lib/ai/slug";
import { setupFormSchema } from "@/lib/setup-form/schema";
import { createServiceSupabaseClient } from "@/lib/supabase";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

type ErrorResponseBody = { error: AiError };
type SuccessResponseBody = {
  siteId: string;
  slug: string;
  versionId: string;
  previewUrl: string;
};

export async function POST(request: Request): Promise<Response> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError(400, { kind: "invalid_output", message: "Request body is not valid JSON" });
  }

  const parsed = setupFormSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError(400, {
      kind: "invalid_output",
      message: "Setup form payload failed validation",
      details: JSON.stringify(parsed.error.issues),
    });
  }

  const form = parsed.data;
  const inspirationImages = form.inspirationImages.map((img) => ({ url: img.url }));

  const baseSlug = deriveSiteSlug({
    companyName: form.companyName,
    currentWebsiteUrl: form.currentWebsiteUrl || undefined,
  });

  let uniqueSlug: string;
  try {
    uniqueSlug = await ensureUniqueSlug(baseSlug);
  } catch (e) {
    // Slug uniqueness lookup failed (Supabase down, env unset). Surface as
    // a generic auth_error -- the user can retry.
    return jsonError(503, {
      kind: "auth_error",
      message: e instanceof Error ? e.message : "Failed to derive unique slug",
    });
  }

  const generation = await generateInitialSite({ form, inspirationImages });
  if (generation.kind === "error") {
    return jsonError(httpStatusForError(generation.error), generation.error);
  }

  const supabase = createServiceSupabaseClient();
  const { data: siteRow, error: siteInsertError } = await supabase
    .from("sites")
    .insert({ slug: uniqueSlug, name: form.companyName })
    .select("id, slug")
    .single();
  if (siteInsertError || !siteRow) {
    // 23505 is Postgres unique-violation -- TOCTOU race on slug. Mapped to
    // auth_error per the Sprint 4 plan; user can retry.
    return jsonError(503, {
      kind: "auth_error",
      message: siteInsertError?.message ?? "Failed to insert site row",
    });
  }

  const { data: versionRow, error: versionInsertError } = await supabase
    .from("site_versions")
    .insert({
      site_id: siteRow.id,
      config: generation.config as unknown as Json,
      created_by: "ai",
      source: "initial_generation",
      is_working: true,
      is_deployed: false,
      parent_version_id: null,
    })
    .select("id")
    .single();
  if (versionInsertError || !versionRow) {
    return jsonError(503, {
      kind: "auth_error",
      message: versionInsertError?.message ?? "Failed to insert site_versions row",
    });
  }

  const body: SuccessResponseBody = {
    siteId: siteRow.id,
    slug: siteRow.slug,
    versionId: versionRow.id,
    previewUrl: `/${siteRow.slug}/preview?v=${versionRow.id}`,
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function jsonError(status: number, error: AiError): Response {
  const body: ErrorResponseBody = { error };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function httpStatusForError(error: AiError): number {
  // Per the Sprint 4 plan: 5xx for network/timeout/auth/over_quota; 502 for
  // invalid_output (we got a response from Claude but it wasn't usable).
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
      // Not reachable from initial generation -- if it ever surfaces here,
      // 502 keeps the contract intact.
      return 502;
    default: {
      const _exhaustive: never = error.kind;
      void _exhaustive;
      return 500;
    }
  }
}
