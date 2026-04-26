// `server-only` is the canonical way to guard a module from accidental
// client imports, but the package isn't installed in this repo (matches the
// Sprint 4/6 pattern). Server-only-ness is enforced via `runtime = "nodejs"`
// + the service-role client's own browser-execution guard.

import type { AiError } from "@/lib/ai/errors";
import { safeParseSiteConfig } from "@/lib/site-config";
import { createServiceSupabaseClient } from "@/lib/supabase";
import type { Json } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ siteId: string }> };
type ErrorResponseBody = { error: AiError };
type SuccessResponseBody = { versionId: string; deployedUrl: string };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { siteId } = await context.params;

  // Deploy takes no body. Accept empty or `{}`; reject anything else with 400.
  const bodyText = await request.text();
  const trimmed = bodyText.trim();
  if (trimmed.length > 0) {
    let raw: unknown;
    try {
      raw = JSON.parse(trimmed);
    } catch {
      return jsonError(400, {
        kind: "invalid_output",
        message: "Request body must be empty or {}.",
      });
    }
    const isEmptyObject =
      raw !== null &&
      typeof raw === "object" &&
      !Array.isArray(raw) &&
      Object.keys(raw as Record<string, unknown>).length === 0;
    if (!isEmptyObject) {
      return jsonError(400, {
        kind: "invalid_output",
        message: "Request body must be empty or {}.",
      });
    }
  }

  const supabase = createServiceSupabaseClient();

  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id, slug, name")
    .eq("id", siteId)
    .maybeSingle();
  if (siteError) {
    return jsonError(500, { kind: "auth_error", message: siteError.message });
  }
  if (!site) {
    return jsonError(404, { kind: "invalid_output", message: "Site not found." });
  }

  const { data: workingVersion, error: workingError } = await supabase
    .from("site_versions")
    .select("id, config")
    .eq("site_id", siteId)
    .eq("is_working", true)
    .maybeSingle();
  if (workingError) {
    return jsonError(500, { kind: "auth_error", message: workingError.message });
  }
  if (!workingVersion) {
    return jsonError(404, {
      kind: "invalid_output",
      message: "No working version found for this site.",
    });
  }

  // Deploy gate per PROJECT_SPEC.md §11: the working config is re-validated
  // before snapshotting. An invalid config cannot be deployed even if it
  // somehow slipped past earlier writes.
  const parsed = safeParseSiteConfig(workingVersion.config);
  if (!parsed.success) {
    return jsonError(400, {
      kind: "invalid_output",
      message: "Working config failed schema validation.",
      details: JSON.stringify(parsed.error.issues),
    });
  }

  // Flip-then-insert: the partial unique index `site_versions_one_deployed_
  // per_site` permits at most one row per site with `is_deployed = true`. If
  // we INSERT before flipping, the index throws on the second-and-later
  // deploy. The reverse order is safe: the first UPDATE may match zero rows
  // (initial deploy) or exactly one (subsequent deploy); the INSERT then
  // claims the unique slot.
  const { error: flipError } = await supabase
    .from("site_versions")
    .update({ is_deployed: false })
    .eq("site_id", siteId)
    .eq("is_deployed", true);
  if (flipError) {
    return jsonError(500, { kind: "auth_error", message: flipError.message });
  }

  const { data: insertedRow, error: insertError } = await supabase
    .from("site_versions")
    .insert({
      site_id: siteId,
      config: parsed.data as unknown as Json,
      is_working: false,
      is_deployed: true,
      source: "deploy",
      parent_version_id: workingVersion.id,
      created_by: null,
    })
    .select("id")
    .single();
  if (insertError || !insertedRow) {
    return jsonError(500, {
      kind: "auth_error",
      message: insertError?.message ?? "Failed to insert deployed site_versions row.",
    });
  }

  const body: SuccessResponseBody = {
    versionId: insertedRow.id,
    deployedUrl: `https://www.${site.slug}.com`,
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function jsonError(status: number, error: AiError): Response {
  const body: ErrorResponseBody = { error };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
