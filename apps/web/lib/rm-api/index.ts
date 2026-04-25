/**
 * Typed mock-Rent-Manager API surface.
 *
 * The signatures below are the contract from PROJECT_SPEC.md §5.3 ("These
 * helpers wrap Supabase queries today. Tomorrow they become real Rent Manager
 * API calls. Same signatures."). Do not change them without amending the
 * spec; widening or narrowing this surface ripples into the renderer.
 */

export { getCompany } from "./company";
export { getProperties, getPropertyById } from "./properties";
export { getUnits, getUnitById } from "./units";
