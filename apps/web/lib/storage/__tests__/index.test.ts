// @vitest-environment node
//
// Integration tests for lib/storage. These hit the linked hosted Supabase
// project's `logos` and `ai-attachments` buckets. The suite gates on three
// env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and
// SUPABASE_STORAGE_INTEGRATION=1 (an explicit opt-in). The opt-in flag
// exists because bucket creation is a User Action Required for Sprint 2c —
// running `pnpm test` on a fresh checkout (no buckets yet) would otherwise
// red-X the suite. Once the user has created the `logos` and
// `ai-attachments` buckets per the Sprint 2c Completion Report, they enable
// these tests by exporting `SUPABASE_STORAGE_INTEGRATION=1` in their env.
// CI machines without secrets just don't set anything — tests skip cleanly.
//
// Cleanup uses the service-role client when available; failures to delete
// are tolerated with a console.warn (test files accumulate under timestamped
// names — easy to manually prune in the Supabase dashboard).

import path from "node:path";
import {
  LOGO_BUCKET,
  sanitizeFilename,
  uploadAttachment,
  uploadLogo,
  uploadStockImage,
} from "@/lib/storage";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

loadEnv({ path: path.resolve(process.cwd(), "../../.env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

const skipIntegration = !(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.SUPABASE_STORAGE_INTEGRATION === "1"
);

// 1×1 transparent PNG, base64-encoded. Smallest valid file we can upload.
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function makeTinyPngFile(name: string): File {
  const binary = Buffer.from(TINY_PNG_BASE64, "base64");
  return new File([binary], name, { type: "image/png" });
}

describe("lib/storage helpers (unit)", () => {
  it("sanitizes filenames to lowercase kebab with safe characters", () => {
    expect(sanitizeFilename("Aurora Logo @v2.PNG")).toBe("aurora-logo-v2.png");
    expect(sanitizeFilename("My File.svg")).toBe("my-file.svg");
    expect(sanitizeFilename("")).toBe("file");
    expect(sanitizeFilename("///---")).toBe("---");
  });
});

describe.skipIf(skipIntegration)("lib/storage (integration: live Supabase)", () => {
  const uploadedPaths: { bucket: string; path: string }[] = [];

  beforeAll(() => {
    // Sanity: ensure the env we gated on is actually present.
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeTruthy();
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeTruthy();
  });

  afterAll(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return;

    // Lazy import so unit-only test runs don't pay the cost.
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(url, serviceKey);
    for (const { bucket, path: p } of uploadedPaths) {
      const { error } = await admin.storage.from(bucket).remove([p]);
      if (error) {
        console.warn(`[storage-test] cleanup failed for ${bucket}/${p}: ${error.message}`);
      }
    }
  });

  it("uploadLogo pushes a PNG to the logos bucket and returns a public URL", async () => {
    const file = makeTinyPngFile("integration-test.png");
    const { url, path: storedPath } = await uploadLogo(file);

    expect(url).toMatch(/^https?:\/\//);
    expect(url).toContain(LOGO_BUCKET);
    expect(storedPath).toMatch(/^\d+-integration-test\.png$/);

    uploadedPaths.push({ bucket: LOGO_BUCKET, path: storedPath });

    const head = await fetch(url, { method: "HEAD" });
    expect(head.ok).toBe(true);
  }, 30_000);

  it("uploadAttachment pushes to the ai-attachments bucket", async () => {
    const file = makeTinyPngFile("inspiration.png");
    const { url, path: storedPath } = await uploadAttachment(file);

    expect(url).toMatch(/^https?:\/\//);
    expect(url).toContain("ai-attachments");
    uploadedPaths.push({ bucket: "ai-attachments", path: storedPath });
  }, 30_000);

  it("uploadStockImage prefixes the path with siteId", async () => {
    const fakeSiteId = "11111111-1111-1111-1111-111111111111";
    const file = makeTinyPngFile("integration-stock.png");
    const { url, path: storedPath } = await uploadStockImage(file, fakeSiteId);

    expect(url).toMatch(/^https?:\/\//);
    expect(url).toContain("ai-stock-images");
    expect(storedPath.startsWith(`${fakeSiteId}/`)).toBe(true);
    expect(storedPath).toMatch(/\d+-integration-stock\.png$/);

    uploadedPaths.push({ bucket: "ai-stock-images", path: storedPath });
  }, 30_000);
});
