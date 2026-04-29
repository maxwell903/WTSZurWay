/**
 * GET  /api/ai-stock-images?siteId=<uuid>
 *   → { defaults: StockImageRow[], perSite: StockImageRow[] }
 *
 * POST /api/ai-stock-images
 *   body: { siteId: string, storage_path: string, public_url: string, description: string }
 *   → inserted row (StockImageRow)
 *
 * Browser direct-uploads the file to the bucket via lib/storage helpers,
 * then POSTs here to register the description + DB row. Service-role
 * client is used so the table doesn't need a permissive write RLS path
 * for the anon role (matches the route-vs-storage split used elsewhere
 * in the demo).
 */

import type { StockImageRow } from "@/lib/ai/prompts/snippets/stock-images";
import { createServiceSupabaseClient } from "@/lib/supabase";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const postSchema = z.object({
  siteId: z.string().uuid(),
  storage_path: z.string().min(1),
  public_url: z.string().url(),
  description: z.string().min(1, "description is required"),
});

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId");
  if (!siteId) {
    return jsonError(400, "siteId query param is required");
  }
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("ai_stock_images")
    .select("id, site_id, storage_path, public_url, category, description")
    .or(`site_id.is.null,site_id.eq.${siteId}`)
    .order("category", { ascending: true })
    .order("id", { ascending: true });
  if (error) {
    return jsonError(503, error.message);
  }
  const rows = (data ?? []) as StockImageRow[];
  const defaults = rows.filter((r) => r.site_id === null);
  const perSite = rows.filter((r) => r.site_id !== null);
  return json(200, { defaults, perSite });
}

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(400, "Body is not valid JSON");
  }
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, JSON.stringify(parsed.error.issues));
  }
  const supabase = createServiceSupabaseClient();
  // The Supabase generated types in apps/web/types/database.ts don't yet
  // include `ai_stock_images` (regenerate after `pnpm db:types`). Casting
  // the payload to `never` is the existing escape hatch for tables that
  // aren't in the generated types — drop the cast once db:types runs.
  const { data, error } = await supabase
    .from("ai_stock_images")
    .insert({
      site_id: parsed.data.siteId,
      storage_path: parsed.data.storage_path,
      public_url: parsed.data.public_url,
      category: null,
      description: parsed.data.description,
    } as never)
    .select("id, site_id, storage_path, public_url, category, description")
    .single();
  if (error || !data) {
    return jsonError(503, error?.message ?? "insert returned no row");
  }
  return json(200, data);
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
