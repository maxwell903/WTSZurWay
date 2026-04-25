/**
 * rm_units helpers (list + by-id), with nested amenities and images.
 * See company.ts for the rationale behind using the service-role client.
 */

import { createServiceSupabaseClient } from "@/lib/supabase";
import type { Unit, UnitFilters, UnitImage } from "@/types/rm";

const UNIT_SELECT =
  "*, amenities:rm_unit_amenities(amenity), images:rm_unit_images(id, unit_id, image_url, display_order)";

type UnitAmenityRow = { amenity: string | null };
type UnitImageRow = {
  id: number | string;
  unit_id: number | string;
  image_url: string;
  display_order: number | null;
};

type UnitRow = {
  id: number | string;
  property_id: number | string | null;
  unit_name: string;
  square_footage: number | null;
  bedrooms: number | null;
  bathrooms: number | string | null;
  current_market_rent: number | string | null;
  is_available: boolean | null;
  available_date: string | null;
  primary_image_url: string | null;
  description: string | null;
  amenities: UnitAmenityRow[] | null;
  images: UnitImageRow[] | null;
};

function toNullableNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function toUnitImage(row: UnitImageRow): UnitImage {
  return {
    id: Number(row.id),
    unitId: Number(row.unit_id),
    imageUrl: row.image_url,
    displayOrder: row.display_order ?? 0,
  };
}

function toUnit(row: UnitRow): Unit {
  const images = (row.images ?? [])
    .map(toUnitImage)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return {
    id: Number(row.id),
    propertyId: row.property_id === null ? null : Number(row.property_id),
    unitName: row.unit_name,
    squareFootage: row.square_footage,
    bedrooms: row.bedrooms,
    bathrooms: toNullableNumber(row.bathrooms),
    currentMarketRent: toNullableNumber(row.current_market_rent),
    isAvailable: row.is_available ?? false,
    availableDate: row.available_date,
    primaryImageUrl: row.primary_image_url,
    description: row.description,
    amenities: (row.amenities ?? []).map((a) => a.amenity).filter((a): a is string => a !== null),
    images,
  };
}

export async function getUnits(filters?: UnitFilters): Promise<Unit[]> {
  const supabase = createServiceSupabaseClient();
  let query = supabase.from("rm_units").select(UNIT_SELECT);

  if (filters?.propertyId !== undefined) {
    query = query.eq("property_id", filters.propertyId);
  }
  if (filters?.bedrooms !== undefined) {
    query = query.eq("bedrooms", filters.bedrooms);
  }
  if (filters?.maxRent !== undefined) {
    query = query.lte("current_market_rent", filters.maxRent);
  }
  if (filters?.available !== undefined) {
    query = query.eq("is_available", filters.available);
  }
  if (filters?.searchText) {
    const pattern = `%${filters.searchText}%`;
    query = query.or(`unit_name.ilike.${pattern},description.ilike.${pattern}`);
  }

  const { data, error } = await query.order("id", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as unknown as UnitRow[];
  return rows.map(toUnit);
}

export async function getUnitById(id: number): Promise<Unit | null> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("rm_units")
    .select(UNIT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return toUnit(data as unknown as UnitRow);
}
