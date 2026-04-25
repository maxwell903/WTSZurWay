/**
 * Application-level (camelCase) types for the mock Rent Manager domain.
 *
 * These are the shapes the renderer and editor consume; the helpers in
 * `lib/rm-api/` translate snake_case DB rows into these at the boundary
 * (PROJECT_SPEC.md §15.3). Per PROJECT_SPEC.md §5.3, "These helpers wrap
 * Supabase queries today. Tomorrow they become real Rent Manager API calls.
 * Same signatures." So the surface declared here is the contract -- treat
 * it like a public API.
 */

export type PropertyType = "Residential" | "Commercial" | "ManufacturedHousing";

export type Company = {
  id: number;
  name: string;
  legalName: string | null;
  primaryPhone: string | null;
  email: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  logoUrl: string | null;
};

export type Property = {
  id: number;
  name: string;
  shortName: string | null;
  propertyType: PropertyType | null;
  email: string | null;
  primaryPhone: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  heroImageUrl: string | null;
  amenities: string[];
};

export type UnitImage = {
  id: number;
  unitId: number;
  imageUrl: string;
  displayOrder: number;
};

export type Unit = {
  id: number;
  propertyId: number | null;
  unitName: string;
  squareFootage: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  currentMarketRent: number | null;
  isAvailable: boolean;
  availableDate: string | null;
  primaryImageUrl: string | null;
  description: string | null;
  amenities: string[];
  images: UnitImage[];
};

/**
 * PROJECT_SPEC.md §5.3 declares `PropertyFilters` and `UnitFilters` exist
 * but does not enumerate their fields. The shapes below are the minimum
 * needed by the demo (per CLAUDE.md "Notes and hints"). Adding new fields
 * here is a sprint-scope change -- raise it via the Deviation Protocol.
 */
export type PropertyFilters = {
  /** Restrict to properties with this property_type. */
  propertyType?: PropertyType;
  /** Exact-match city filter. */
  city?: string;
  /** Case-insensitive partial match against the property name. */
  searchText?: string;
};

export type UnitFilters = {
  /** Only units belonging to this property. */
  propertyId?: number;
  /** Exact bedroom count. 0 matches studios. */
  bedrooms?: number;
  /** Upper bound (inclusive) on current_market_rent. */
  maxRent?: number;
  /** Show only available (true) or only unavailable (false) units. */
  available?: boolean;
  /** Case-insensitive partial match against unit_name or description. */
  searchText?: string;
};
