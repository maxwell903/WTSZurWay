/**
 * rm_properties helpers (list + by-id).
 * See company.ts for the rationale behind using the service-role client.
 */

import { createServiceSupabaseClient } from "@/lib/supabase";
import type { Property, PropertyFilters, PropertyType } from "@/types/rm";

const PROPERTY_SELECT = "*, amenities:rm_property_amenities(amenity)";

type PropertyAmenityRow = { amenity: string | null };

type PropertyRow = {
  id: number | string;
  name: string;
  short_name: string | null;
  property_type: string | null;
  email: string | null;
  primary_phone: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  hero_image_url: string | null;
  amenities: PropertyAmenityRow[] | null;
};

const PROPERTY_TYPES: ReadonlySet<PropertyType> = new Set([
  "Residential",
  "Commercial",
  "ManufacturedHousing",
]);

function toPropertyType(value: string | null): PropertyType | null {
  if (value === null) return null;
  return PROPERTY_TYPES.has(value as PropertyType) ? (value as PropertyType) : null;
}

function toProperty(row: PropertyRow): Property {
  return {
    id: Number(row.id),
    name: row.name,
    shortName: row.short_name,
    propertyType: toPropertyType(row.property_type),
    email: row.email,
    primaryPhone: row.primary_phone,
    street: row.street,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    heroImageUrl: row.hero_image_url,
    amenities: (row.amenities ?? []).map((a) => a.amenity).filter((a): a is string => a !== null),
  };
}

export async function getProperties(filters?: PropertyFilters): Promise<Property[]> {
  const supabase = createServiceSupabaseClient();
  let query = supabase.from("rm_properties").select(PROPERTY_SELECT);

  if (filters?.propertyType) {
    query = query.eq("property_type", filters.propertyType);
  }
  if (filters?.city) {
    query = query.eq("city", filters.city);
  }
  if (filters?.searchText) {
    query = query.ilike("name", `%${filters.searchText}%`);
  }

  const { data, error } = await query.order("id", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as unknown as PropertyRow[];
  return rows.map(toProperty);
}

export async function getPropertyById(id: number): Promise<Property | null> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("rm_properties")
    .select(PROPERTY_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return toProperty(data as unknown as PropertyRow);
}
