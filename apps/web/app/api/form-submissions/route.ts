// Sprint 10 — Forms + submissions (PROJECT_SPEC.md §8.10).
//
// POST: anonymous submission from a public-facing Form. The Form component
//   posts FormData-derived JSON; we resolve siteSlug -> siteId, capture the
//   submitter's IP / user agent, and append a row to `form_submissions`.
// GET:  editor-only read path. Two shapes:
//     - ?siteId=<uuid>           -> per-form aggregate `{ formId, count }[]`.
//     - ?siteId=<uuid>&formId=.. -> the rows table for one form (cap 200).
//   The endpoint uses the service-role client; auth is a placeholder per
//   PROJECT_SPEC.md §17.
//
// Mirrors the response-shape and runtime conventions established by
// `/api/sites/[siteId]/working-version/route.ts`: nodejs runtime,
// dynamic = "force-dynamic", structured `{ category, message, details? }`
// error bodies, and never leaking stack traces or the service-role key.

import { createServiceSupabaseClient } from "@/lib/supabase";
import type { Json } from "@/types/database";
import { type ZodIssue, z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const submissionPayloadSchema = z.object({
  siteSlug: z.string().min(1),
  formId: z.string().min(1),
  pageSlug: z.string().min(1).nullable().optional(),
  submittedData: z.record(z.string(), z.string()),
});

const listQuerySchema = z.object({
  siteId: z.string().uuid(),
});

const rowsQuerySchema = z.object({
  siteId: z.string().uuid(),
  formId: z.string().min(1),
});

type ErrorBody = {
  category: "validation_error" | "not_found" | "server_error";
  message: string;
  details?: ZodIssue[];
};

const ROWS_LIMIT = 200;

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(400, {
      category: "validation_error",
      message: "Request body is not valid JSON.",
    });
  }

  const parsed = submissionPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, {
      category: "validation_error",
      message: "Submission payload failed validation.",
      details: parsed.error.issues,
    });
  }

  const { siteSlug, formId, pageSlug, submittedData } = parsed.data;
  const supabase = createServiceSupabaseClient();

  const siteLookup = await supabase.from("sites").select("id").eq("slug", siteSlug).maybeSingle();

  if (siteLookup.error) {
    return jsonError(500, { category: "server_error", message: siteLookup.error.message });
  }
  if (!siteLookup.data) {
    return jsonError(404, { category: "not_found", message: "Site not found." });
  }

  const insert = await supabase
    .from("form_submissions")
    .insert({
      site_id: siteLookup.data.id,
      form_id: formId,
      page_slug: pageSlug ?? null,
      submitted_data: submittedData as unknown as Json,
      submitter_ip: parseSubmitterIp(request),
      user_agent: request.headers.get("user-agent"),
    })
    .select("id, created_at")
    .maybeSingle();

  if (insert.error) {
    return jsonError(500, { category: "server_error", message: insert.error.message });
  }
  if (!insert.data || insert.data.created_at === null) {
    // The DEFAULT now() column should always populate; treat the absence as
    // a server-side fault rather than silently returning null.
    return jsonError(500, {
      category: "server_error",
      message: "Submission insert returned no row.",
    });
  }

  return jsonResponse(201, { id: insert.data.id, createdAt: insert.data.created_at });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const siteIdParam = url.searchParams.get("siteId");
  const formIdParam = url.searchParams.get("formId");

  const supabase = createServiceSupabaseClient();

  if (formIdParam !== null) {
    const parsed = rowsQuerySchema.safeParse({ siteId: siteIdParam, formId: formIdParam });
    if (!parsed.success) {
      return jsonError(400, {
        category: "validation_error",
        message: "Query parameters failed validation.",
        details: parsed.error.issues,
      });
    }

    const result = await supabase
      .from("form_submissions")
      .select("id, page_slug, submitted_data, created_at")
      .eq("site_id", parsed.data.siteId)
      .eq("form_id", parsed.data.formId)
      .order("created_at", { ascending: false })
      .limit(ROWS_LIMIT);

    if (result.error) {
      return jsonError(500, { category: "server_error", message: result.error.message });
    }

    const submissions = (result.data ?? []).map((row) => ({
      id: row.id,
      pageSlug: row.page_slug,
      submittedData: coerceSubmittedData(row.submitted_data),
      createdAt: row.created_at ?? "",
    }));

    return jsonResponse(200, { submissions });
  }

  const parsed = listQuerySchema.safeParse({ siteId: siteIdParam });
  if (!parsed.success) {
    return jsonError(400, {
      category: "validation_error",
      message: "Query parameters failed validation.",
      details: parsed.error.issues,
    });
  }

  const result = await supabase
    .from("form_submissions")
    .select("form_id")
    .eq("site_id", parsed.data.siteId);

  if (result.error) {
    return jsonError(500, { category: "server_error", message: result.error.message });
  }

  const counts = new Map<string, number>();
  for (const row of result.data ?? []) {
    counts.set(row.form_id, (counts.get(row.form_id) ?? 0) + 1);
  }

  const forms = Array.from(counts, ([formId, count]) => ({ formId, count })).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.formId.localeCompare(b.formId);
  });

  return jsonResponse(200, { forms });
}

function parseSubmitterIp(request: Request): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = request.headers.get("x-real-ip");
  if (xri) return xri;
  return null;
}

function coerceSubmittedData(value: Json): Record<string, string> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string") out[k] = v;
    else if (v !== null && v !== undefined) out[k] = String(v);
  }
  return out;
}

function jsonError(status: number, body: ErrorBody): Response {
  return jsonResponse(status, body);
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
