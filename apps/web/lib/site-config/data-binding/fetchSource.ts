"use server";

// Sprint 9: this module is a Next.js Server Action (per DECISIONS.md
// 2026-04-26 entry "fetchSource is a Server Action"). The Repeater
// (a `"use client"` component) calls `fetchSource(...)` directly, but
// Next.js routes the call through its built-in RPC layer so
// `lib/rm-api/`'s service-role Supabase client only ever runs
// server-side. Server-Action files may only export async functions —
// the `UnitWithProperty` type alias lives in `./types.ts` instead.

import { getCompany, getProperties, getUnits } from "@/lib/rm-api";
import type { DataBindingSource } from "./types";

export async function fetchSource(source: DataBindingSource): Promise<unknown[]> {
  switch (source) {
    case "properties":
      return getProperties();
    case "units":
      return getUnits();
    case "units_with_property": {
      const [units, properties] = await Promise.all([getUnits(), getProperties()]);
      // Aurora has ~10 properties and ~50 units, so the O(units ×
      // properties) join cost is trivial. The helper is inlined because
      // a Server-Action file cannot export non-async values.
      const byId = new Map<number, (typeof properties)[number]>();
      for (const p of properties) byId.set(p.id, p);
      return units.map((u) => {
        const p = u.propertyId !== null ? (byId.get(u.propertyId) ?? null) : null;
        return {
          ...u,
          property_name: p?.name ?? null,
          property_city: p?.city ?? null,
          property_state: p?.state ?? null,
          property_propertyType: p?.propertyType ?? null,
          property_heroImageUrl: p?.heroImageUrl ?? null,
          property_email: p?.email ?? null,
          property_primaryPhone: p?.primaryPhone ?? null,
          property_street: p?.street ?? null,
          property_postalCode: p?.postalCode ?? null,
        };
      });
    }
    case "company": {
      const company = await getCompany();
      return [company];
    }
    default: {
      // Defensive default per Sprint 9 contract: unknown source → empty list.
      // The Repeater treats this as a missing binding and renders the empty
      // wrapper.
      return [];
    }
  }
}
