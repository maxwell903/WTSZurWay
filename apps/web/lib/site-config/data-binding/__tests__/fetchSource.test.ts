import type { Company, Property, Unit } from "@/types/rm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeProperties: Property[] = [
  {
    id: 10,
    name: "Aurora Heights",
    shortName: "Aurora",
    propertyType: "Residential",
    email: "leasing@aurora.example",
    primaryPhone: "555-0001",
    street: "1 Main St",
    city: "Cincinnati",
    state: "OH",
    postalCode: "45202",
    heroImageUrl: "https://example.com/hero.jpg",
    amenities: ["Pool"],
  },
];

const fakeUnits: Unit[] = [
  {
    id: 1,
    propertyId: 10,
    unitName: "Apt 101",
    squareFootage: 800,
    bedrooms: 1,
    bathrooms: 1,
    currentMarketRent: 1200,
    isAvailable: true,
    availableDate: null,
    primaryImageUrl: "https://example.com/u1.jpg",
    description: "Sunny",
    amenities: [],
    images: [],
  },
  {
    id: 2,
    propertyId: null,
    unitName: "Floating",
    squareFootage: null,
    bedrooms: null,
    bathrooms: null,
    currentMarketRent: null,
    isAvailable: false,
    availableDate: null,
    primaryImageUrl: null,
    description: null,
    amenities: [],
    images: [],
  },
];

const fakeCompany: Company = {
  id: 1,
  name: "Aurora Property Group",
  legalName: "Aurora LLC",
  primaryPhone: "555-9999",
  email: "hello@aurora.example",
  street: "1 Main St",
  city: "Cincinnati",
  state: "OH",
  postalCode: "45202",
  logoUrl: null,
};

vi.mock("@/lib/rm-api", () => ({
  getProperties: vi.fn(async () => fakeProperties),
  getUnits: vi.fn(async () => fakeUnits),
  getCompany: vi.fn(async () => fakeCompany),
  getUnitById: vi.fn(),
  getPropertyById: vi.fn(),
}));

import { fetchSource } from "../fetchSource";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchSource", () => {
  it("returns properties when source is 'properties'", async () => {
    const out = await fetchSource("properties");
    expect(out).toEqual(fakeProperties);
  });

  it("returns units when source is 'units'", async () => {
    const out = await fetchSource("units");
    expect(out).toEqual(fakeUnits);
  });

  it("returns a one-row list when source is 'company'", async () => {
    const out = await fetchSource("company");
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual(fakeCompany);
  });

  it("joins units with properties for 'units_with_property'", async () => {
    const out = (await fetchSource("units_with_property")) as Array<
      Unit & {
        property_name: string | null;
        property_city: string | null;
        property_state: string | null;
        property_propertyType: string | null;
        property_heroImageUrl: string | null;
      }
    >;
    expect(out).toHaveLength(2);
    expect(out[0]?.property_name).toBe("Aurora Heights");
    expect(out[0]?.property_city).toBe("Cincinnati");
    expect(out[0]?.property_propertyType).toBe("Residential");
    // Unit 2 has propertyId=null → all property_* fields are null (left-style join).
    expect(out[1]?.property_name).toBe(null);
    expect(out[1]?.property_city).toBe(null);
    expect(out[1]?.property_state).toBe(null);
    expect(out[1]?.unitName).toBe("Floating");
  });

  it("preserves the unit's own fields after the join", async () => {
    const out = (await fetchSource("units_with_property")) as Array<Unit>;
    expect(out[0]?.unitName).toBe("Apt 101");
    expect(out[0]?.currentMarketRent).toBe(1200);
  });
});
