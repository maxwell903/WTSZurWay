// @vitest-environment node
//
// Integration tests for getProperties / getPropertyById. Skips cleanly when
// Supabase env vars are missing -- see company.test.ts for the rationale.

import path from "node:path";
import { config as loadEnv } from "dotenv";
import { describe, expect, it } from "vitest";
import { getProperties, getPropertyById } from "../properties";

loadEnv({ path: path.resolve(process.cwd(), "../../.env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

const skipIntegration = !(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

describe.skipIf(skipIntegration)("rm-api / getProperties (integration)", () => {
  it("returns at least 10 properties when no filters are passed", async () => {
    const properties = await getProperties();
    expect(properties.length).toBeGreaterThanOrEqual(10);
  });

  it("returns exactly the 8 seeded Residential properties when filtered", async () => {
    const residential = await getProperties({ propertyType: "Residential" });
    expect(residential).toHaveLength(8);
    for (const p of residential) {
      expect(p.propertyType).toBe("Residential");
    }
  });

  it("returns the single Commercial property when filtered", async () => {
    const commercial = await getProperties({ propertyType: "Commercial" });
    expect(commercial).toHaveLength(1);
    expect(commercial[0]?.propertyType).toBe("Commercial");
  });

  it("returns the single ManufacturedHousing property when filtered", async () => {
    const mh = await getProperties({ propertyType: "ManufacturedHousing" });
    expect(mh).toHaveLength(1);
    expect(mh[0]?.propertyType).toBe("ManufacturedHousing");
  });

  it("hydrates the amenities array from rm_property_amenities", async () => {
    const [first] = await getProperties();
    expect(first).toBeDefined();
    expect(Array.isArray(first?.amenities)).toBe(true);
    expect(first?.amenities.length).toBeGreaterThan(0);
  });
});

describe.skipIf(skipIntegration)("rm-api / getPropertyById (integration)", () => {
  it("returns the matching property row for a known id", async () => {
    const property = await getPropertyById(1);
    expect(property).not.toBeNull();
    expect(property?.id).toBe(1);
    expect(property?.name).toBe("The Aurora at Hyde Park");
    expect(property?.propertyType).toBe("Residential");
  });

  it("returns null for an unknown id", async () => {
    const property = await getPropertyById(999_999);
    expect(property).toBeNull();
  });
});
