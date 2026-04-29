/**
 * PATCH  /api/ai-stock-images/[id]   body: { description: string }
 * DELETE /api/ai-stock-images/[id]
 *
 * Both reject (403) when the target row has site_id IS NULL — globals
 * are read-only from the editor surface and managed via migration.
 * DELETE removes the storage object first (best-effort) then the DB row.
 */

import { createServiceSupabaseClient } from "@/lib/supabase";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AI_STOCK_BUCKET = "ai-stock-images";

const patchSchema = z.object({
  description: z.string().min(1, "description is required"),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: RouteContext): Promise<Response> {
  const { id } = await ctx.params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId)) return jsonError(400, "id must be numeric");

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(400, "Body is not valid JSON");
  }
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, JSON.stringify(parsed.error.issues));
  }

  const supabase = createServiceSupabaseClient();
  const { data: existing, error: fetchError } = await supabase
    .from("ai_stock_images")
    .select("id, site_id")
    .eq("id", numericId)
    .single();
  if (fetchError || !existing) return jsonError(404, "row not found");
  if ((existing as { site_id: string | null }).site_id === null) {
    return jsonError(403, "globals cannot be edited from the editor");
  }

  // The Supabase generated types in apps/web/types/database.ts don't yet
  // include `ai_stock_images` (regenerate after `pnpm db:types`). Casting
  // the payload to `never` is the existing escape hatch for tables that
  // aren't in the generated types — drop the cast once db:types runs.
  const { data: updated, error: updateError } = await supabase
    .from("ai_stock_images")
    .update({ description: parsed.data.description } as never)
    .eq("id", numericId)
    .select("id, site_id, storage_path, public_url, category, description")
    .single();
  if (updateError || !updated) return jsonError(503, updateError?.message ?? "update failed");

  return json(200, updated);
}

export async function DELETE(_request: Request, ctx: RouteContext): Promise<Response> {
  const { id } = await ctx.params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId)) return jsonError(400, "id must be numeric");

  const supabase = createServiceSupabaseClient();
  const { data: existing, error: fetchError } = await supabase
    .from("ai_stock_images")
    .select("id, site_id, storage_path")
    .eq("id", numericId)
    .single();
  if (fetchError || !existing) return jsonError(404, "row not found");
  const row = existing as { site_id: string | null; storage_path: string };
  if (row.site_id === null) {
    return jsonError(403, "globals cannot be deleted from the editor");
  }

  // Best-effort storage cleanup. If it fails, log and continue — the DB
  // delete is the source of truth for AI visibility.
  const { error: storageError } = await supabase.storage
    .from(AI_STOCK_BUCKET)
    .remove([row.storage_path]);
  if (storageError) {
    console.warn(
      `[ai-stock-images] storage cleanup failed for ${row.storage_path}: ${storageError.message}`,
    );
  }

  const { error: dbError } = await supabase.from("ai_stock_images").delete().eq("id", numericId);
  if (dbError) return jsonError(503, dbError.message);

  return new Response(null, { status: 204 });
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
