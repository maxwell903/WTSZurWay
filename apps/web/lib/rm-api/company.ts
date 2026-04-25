/**
 * rm_company helper -- the property manager's tenant info.
 *
 * Why createServiceSupabaseClient (and not createServerSupabaseClient)?
 * The cookie-based server client requires next/headers, which restricts it
 * to Next.js server contexts (RSC, route handlers, server actions). These
 * helpers also need to run from Vitest integration tests and from any future
 * server-side scripts (e.g. nightly jobs). The service-role client works in
 * every server context. RLS on rm_company is permissive in this sprint (auth
 * is a placeholder per PROJECT_SPEC.md §17), so bypassing RLS via the service
 * role does not change observable behavior. When real auth lands, swap to
 * createServerSupabaseClient for per-user code paths.
 */

import { createServiceSupabaseClient } from "@/lib/supabase";
import type { Company } from "@/types/rm";

type CompanyRow = {
  id: number | string;
  name: string;
  legal_name: string | null;
  primary_phone: string | null;
  email: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  logo_url: string | null;
};

function toCompany(row: CompanyRow): Company {
  return {
    id: Number(row.id),
    name: row.name,
    legalName: row.legal_name,
    primaryPhone: row.primary_phone,
    email: row.email,
    street: row.street,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    logoUrl: row.logo_url,
  };
}

export async function getCompany(): Promise<Company> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("rm_company")
    .select("*")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("rm_company is empty -- run `pnpm seed` against the linked Supabase project.");
  }
  return toCompany(data as unknown as CompanyRow);
}
