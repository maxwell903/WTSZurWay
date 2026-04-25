// @vitest-environment node
//
// Integration tests for getCompany. These hit the linked hosted Supabase
// project (per /DECISIONS.md 2026-04-25) and assume `pnpm seed` has already
// loaded the Aurora Property Group seed data. The suite skips cleanly when
// the required env vars are missing (CI without secrets, fresh checkouts),
// so `pnpm test` always exits green for code that compiles.

import path from "node:path";
import { config as loadEnv } from "dotenv";
import { describe, expect, it } from "vitest";
import { getCompany } from "../company";

// Load .env.local from monorepo root and from apps/web (whichever exists).
// dotenv silently no-ops when a path is missing, so listing both is safe.
loadEnv({ path: path.resolve(process.cwd(), "../../.env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

const skipIntegration = !(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

describe.skipIf(skipIntegration)("rm-api / getCompany (integration)", () => {
  it("returns the seeded Aurora Property Group row", async () => {
    const company = await getCompany();

    expect(company).not.toBeNull();
    expect(company.name).toBe("Aurora Property Group");
    expect(company.city).toBe("Cincinnati");
    expect(company.state).toBe("OH");
    expect(typeof company.id).toBe("number");
  });

  it("translates snake_case columns to camelCase fields", async () => {
    const company = await getCompany();

    // Spot-check that the boundary mapper actually ran (snake_case keys
    // would not exist on the camelCase Company shape).
    expect(company).toHaveProperty("legalName");
    expect(company).toHaveProperty("postalCode");
    expect(company).toHaveProperty("logoUrl");
    expect(company).not.toHaveProperty("legal_name");
    expect(company).not.toHaveProperty("postal_code");
  });
});
