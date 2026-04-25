// @vitest-environment node
//
// Integration tests for getUnits / getUnitById. Skips cleanly when Supabase
// env vars are missing -- see company.test.ts for the rationale.

import path from "node:path";
import { config as loadEnv } from "dotenv";
import { describe, expect, it } from "vitest";
import { getUnitById, getUnits } from "../units";

loadEnv({ path: path.resolve(process.cwd(), "../../.env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

const skipIntegration = !(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

describe.skipIf(skipIntegration)("rm-api / getUnits (integration)", () => {
  it("returns at least 30 units when no filters are passed", async () => {
    const units = await getUnits();
    expect(units.length).toBeGreaterThanOrEqual(30);
  });

  it("returns only units belonging to the requested property", async () => {
    const units = await getUnits({ propertyId: 1 });
    expect(units.length).toBeGreaterThan(0);
    for (const u of units) {
      expect(u.propertyId).toBe(1);
    }
  });

  it("filters by max rent (inclusive)", async () => {
    const cap = 1200;
    const units = await getUnits({ maxRent: cap });
    expect(units.length).toBeGreaterThan(0);
    for (const u of units) {
      expect(u.currentMarketRent).not.toBeNull();
      expect(u.currentMarketRent ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(cap);
    }
  });

  it("returns only available units when available=true", async () => {
    const units = await getUnits({ available: true });
    expect(units.length).toBeGreaterThan(0);
    for (const u of units) {
      expect(u.isAvailable).toBe(true);
    }
  });

  it("hydrates nested amenities and images on each unit", async () => {
    const units = await getUnits({ propertyId: 1 });
    expect(units.length).toBeGreaterThan(0);
    const first = units[0];
    expect(first).toBeDefined();
    expect(Array.isArray(first?.amenities)).toBe(true);
    expect(Array.isArray(first?.images)).toBe(true);
  });
});

describe.skipIf(skipIntegration)("rm-api / getUnitById (integration)", () => {
  it("returns the matching unit for a known id", async () => {
    const unit = await getUnitById(101);
    expect(unit).not.toBeNull();
    expect(unit?.id).toBe(101);
    expect(unit?.unitName).toBe("Apt 101");
    expect(unit?.propertyId).toBe(1);
  });

  it("returns null for an unknown id", async () => {
    const unit = await getUnitById(999_999);
    expect(unit).toBeNull();
  });
});
