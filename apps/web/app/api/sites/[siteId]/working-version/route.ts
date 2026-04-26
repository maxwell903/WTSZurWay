// `server-only` is the canonical way to guard a module from accidental
// client imports, but the package isn't installed in this repo (matches the
// Sprint 4 generate-initial-site/route.ts pattern). Server-only-ness is
// enforced via `runtime = "nodejs"` + the service-role client's own
// browser-execution guard.

import { siteConfigSchema } from "@/lib/site-config";
import { createServiceSupabaseClient } from "@/lib/supabase";
import type { Json } from "@/types/database";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestBodySchema = z.object({
  config: siteConfigSchema,
});

type RouteContext = { params: Promise<{ siteId: string }> };

type ErrorBody = {
  category: "validation_error" | "not_found" | "server_error";
  message: string;
  details?: unknown;
};

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { siteId } = await context.params;

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("site_versions")
    .select("id, config")
    .eq("site_id", siteId)
    .eq("is_working", true)
    .maybeSingle();

  if (error) {
    return jsonError(500, { category: "server_error", message: error.message });
  }
  if (!data) {
    return jsonError(404, {
      category: "not_found",
      message: "No working version found for this site.",
    });
  }

  return new Response(JSON.stringify({ versionId: data.id, config: data.config }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const { siteId } = await context.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(400, {
      category: "validation_error",
      message: "Request body is not valid JSON.",
    });
  }

  const parsed = requestBodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, {
      category: "validation_error",
      message: "Config failed schema validation.",
      details: parsed.error.issues,
    });
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("site_versions")
    .update({ config: parsed.data.config as unknown as Json })
    .eq("site_id", siteId)
    .eq("is_working", true)
    .select("id")
    .maybeSingle();

  if (error) {
    // Never leak the service-role key or a stack trace; surface the bare
    // message Postgres returns.
    return jsonError(500, { category: "server_error", message: error.message });
  }
  if (!data) {
    return jsonError(404, {
      category: "not_found",
      message: "No working version found for this site.",
    });
  }

  return new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  });
}

function jsonError(status: number, body: ErrorBody): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
