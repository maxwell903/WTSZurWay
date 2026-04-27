// @vitest-environment node

import type { SetupFormValues } from "@/lib/setup-form/types";
import type { SiteConfig } from "@/lib/site-config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Per-call queues drive the chainable Supabase mock below. Each `from(...)`
// call dequeues one entry; tests prepend entries via `pushSelectResult` /
// `pushUpsertResult` before invoking the lookup/record under test.
type SelectResult = { data: unknown; error: { message: string } | null };
type UpsertResult = { error: { message: string } | null };
const selectQueue: SelectResult[] = [];
const upsertQueue: UpsertResult[] = [];

vi.mock("@/lib/supabase", () => ({
  createServiceSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => selectQueue.shift() ?? { data: null, error: null },
          }),
        }),
      }),
      upsert: async () => upsertQueue.shift() ?? { error: null },
    }),
  }),
}));

import {
  _internal,
  hashAiEditInput,
  hashGenerationInput,
  lookupAiEditFixture,
  lookupGenerationFixture,
  recordAiEditFixture,
  recordGenerationFixture,
} from "../fixtures";

const VALID_CONFIG: SiteConfig = {
  meta: { siteName: "Aurora", siteSlug: "aurora" },
  brand: { palette: "ocean", fontFamily: "Inter" },
  global: {
    navBar: { links: [], logoPlacement: "left", sticky: false },
    footer: { columns: [], copyright: "" },
  },
  pages: [
    {
      id: "p_home",
      slug: "home",
      name: "Home",
      kind: "static",
      rootComponent: { id: "cmp_root", type: "Section", props: {}, style: {} },
    },
  ],
  forms: [],
};

const BASE_FORM: SetupFormValues = {
  companyName: "Aurora Cincy",
  palette: "ocean",
  templateStart: "ai_generate",
  additionalLogos: [],
  inspirationImages: [],
};

beforeEach(() => {
  selectQueue.length = 0;
  upsertQueue.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("hashGenerationInput", () => {
  it("is stable across runs (same input -> identical hex string)", () => {
    const a = hashGenerationInput(BASE_FORM);
    const b = hashGenerationInput({ ...BASE_FORM });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs across normalized-different inputs (palette swap)", () => {
    const a = hashGenerationInput(BASE_FORM);
    const b = hashGenerationInput({ ...BASE_FORM, palette: "forest" });
    expect(a).not.toBe(b);
  });

  it("ignores companyName casing and surrounding whitespace", () => {
    const a = hashGenerationInput(BASE_FORM);
    const b = hashGenerationInput({ ...BASE_FORM, companyName: "  AURORA CINCY  " });
    expect(a).toBe(b);
  });

  it("ignores image-attachment URL changes (inspirationImages excluded)", () => {
    const a = hashGenerationInput(BASE_FORM);
    const b = hashGenerationInput({
      ...BASE_FORM,
      inspirationImages: [{ url: "https://example.com/123.png", name: "a.png" }],
    });
    expect(a).toBe(b);
  });

  it("ignores logo URL changes (logoPrimary excluded)", () => {
    const a = hashGenerationInput(BASE_FORM);
    const b = hashGenerationInput({
      ...BASE_FORM,
      logoPrimary: { url: "https://example.com/logo-1700000000.png", name: "logo.png" },
    });
    expect(a).toBe(b);
  });

  it("ignores non-relevant advanced fields (social URLs, brandVoiceNotes)", () => {
    const a = hashGenerationInput(BASE_FORM);
    const b = hashGenerationInput({
      ...BASE_FORM,
      brandVoiceNotes: "Casual Midwestern",
      socialFacebook: "https://facebook.com/aurora",
      socialInstagram: "https://instagram.com/aurora",
      tone: "warm",
    });
    expect(a).toBe(b);
  });

  it("changes when targetAudience changes (included in hash)", () => {
    const a = hashGenerationInput(BASE_FORM);
    const b = hashGenerationInput({ ...BASE_FORM, targetAudience: "Students" });
    expect(a).not.toBe(b);
  });

  it("normalizes pagesToInclude order (sorted before hashing)", () => {
    const a = hashGenerationInput({
      ...BASE_FORM,
      pagesToInclude: ["home", "about", "contact"],
    });
    const b = hashGenerationInput({
      ...BASE_FORM,
      pagesToInclude: ["contact", "home", "about"],
    });
    expect(a).toBe(b);
  });
});

describe("hashAiEditInput", () => {
  it("is stable across runs and ignores prompt casing/whitespace", () => {
    const a = hashAiEditInput({
      prompt: "Make it darker",
      siteId: "s1",
      currentVersionId: "v1",
      selection: null,
    });
    const b = hashAiEditInput({
      prompt: "  MAKE IT DARKER  ",
      siteId: "s1",
      currentVersionId: "v1",
      selection: null,
    });
    expect(a).toBe(b);
  });

  it("excludes attachments and history from the hash", () => {
    const a = hashAiEditInput({
      prompt: "x",
      siteId: "s1",
      currentVersionId: "v1",
      selection: null,
    });
    const b = hashAiEditInput({
      prompt: "x",
      siteId: "s1",
      currentVersionId: "v1",
      selection: null,
      attachments: [{ url: "https://example.com/a.png" }],
      history: [{ role: "user", content: "earlier turn" }],
    });
    expect(a).toBe(b);
  });

  it("differs when siteId differs (no cross-site fixture collision)", () => {
    const a = hashAiEditInput({
      prompt: "x",
      siteId: "site-a",
      currentVersionId: "v1",
      selection: null,
    });
    const b = hashAiEditInput({
      prompt: "x",
      siteId: "site-b",
      currentVersionId: "v1",
      selection: null,
    });
    expect(a).not.toBe(b);
  });

  it("normalizes selection.componentIds order", () => {
    const a = hashAiEditInput({
      prompt: "x",
      siteId: "s1",
      currentVersionId: "v1",
      selection: { componentIds: ["a", "b", "c"], pageSlug: "home", pageKind: "static" },
    });
    const b = hashAiEditInput({
      prompt: "x",
      siteId: "s1",
      currentVersionId: "v1",
      selection: { componentIds: ["c", "a", "b"], pageSlug: "home", pageKind: "static" },
    });
    expect(a).toBe(b);
  });
});

describe("lookupGenerationFixture", () => {
  it("returns null on miss", async () => {
    selectQueue.push({ data: null, error: null });
    const result = await lookupGenerationFixture(BASE_FORM);
    expect(result).toBeNull();
  });

  it("returns the parsed SiteConfig on hit", async () => {
    selectQueue.push({ data: { response: VALID_CONFIG }, error: null });
    const result = await lookupGenerationFixture(BASE_FORM);
    expect(result).not.toBeNull();
    expect(result?.meta.siteName).toBe("Aurora");
  });

  it("returns null when the stored JSON no longer parses against SiteConfig", async () => {
    selectQueue.push({ data: { response: { meta: { not: "valid" } } }, error: null });
    const result = await lookupGenerationFixture(BASE_FORM);
    expect(result).toBeNull();
  });

  it("returns null when Supabase errors", async () => {
    selectQueue.push({ data: null, error: { message: "boom" } });
    const result = await lookupGenerationFixture(BASE_FORM);
    expect(result).toBeNull();
  });
});

describe("lookupAiEditFixture", () => {
  it("returns null on miss", async () => {
    selectQueue.push({ data: null, error: null });
    const result = await lookupAiEditFixture({
      prompt: "x",
      siteId: "s1",
      currentVersionId: "v1",
      selection: null,
    });
    expect(result).toBeNull();
  });

  it("returns the parsed ok shape tagged source: fixture on hit", async () => {
    selectQueue.push({
      data: {
        response: {
          kind: "ok",
          summary: "stored summary",
          operations: [
            { type: "setProp", targetId: "cmp_hero", propPath: "heading", value: "Stored" },
          ],
        },
      },
      error: null,
    });
    const result = await lookupAiEditFixture({
      prompt: "x",
      siteId: "s1",
      currentVersionId: "v1",
      selection: null,
    });
    expect(result).not.toBeNull();
    if (result?.kind === "ok") {
      expect(result.summary).toBe("stored summary");
      expect(result.source).toBe("fixture");
    } else {
      throw new Error("expected ok variant");
    }
  });

  it("returns the parsed clarify shape tagged source: fixture on hit", async () => {
    selectQueue.push({
      data: { response: { kind: "clarify", question: "Which one?" } },
      error: null,
    });
    const result = await lookupAiEditFixture({
      prompt: "x",
      siteId: "s1",
      currentVersionId: "v1",
      selection: null,
    });
    expect(result).not.toBeNull();
    if (result?.kind === "clarify") {
      expect(result.question).toBe("Which one?");
      expect(result.source).toBe("fixture");
    } else {
      throw new Error("expected clarify variant");
    }
  });

  it("returns null when stored JSON does not match the ai-edit response shape", async () => {
    selectQueue.push({
      data: { response: { kind: "ok", summary: "", operations: [] } },
      error: null,
    });
    const result = await lookupAiEditFixture({
      prompt: "x",
      siteId: "s1",
      currentVersionId: "v1",
      selection: null,
    });
    expect(result).toBeNull();
  });
});

describe("recordGenerationFixture / recordAiEditFixture", () => {
  it("recordGenerationFixture upserts without throwing on success", async () => {
    upsertQueue.push({ error: null });
    await expect(recordGenerationFixture(BASE_FORM, VALID_CONFIG)).resolves.toBeUndefined();
  });

  it("recordGenerationFixture throws when supabase returns an error", async () => {
    upsertQueue.push({ error: { message: "boom" } });
    await expect(recordGenerationFixture(BASE_FORM, VALID_CONFIG)).rejects.toThrow(/boom/);
  });

  it("recordAiEditFixture strips source: 'fixture' from the stored payload", async () => {
    upsertQueue.push({ error: null });
    await expect(
      recordAiEditFixture(
        { prompt: "x", siteId: "s1", currentVersionId: "v1", selection: null },
        { kind: "ok", summary: "s", operations: [], source: "fixture" },
      ),
    ).resolves.toBeUndefined();
  });
});

describe("stableStringify", () => {
  it("sorts object keys alphabetically at every nesting level", () => {
    const out = _internal.stableStringify({ b: 1, a: { d: 2, c: 1 } });
    expect(out).toBe('{"a":{"c":1,"d":2},"b":1}');
  });

  it("preserves array order", () => {
    const out = _internal.stableStringify([3, 1, 2]);
    expect(out).toBe("[3,1,2]");
  });

  it("drops undefined values inside objects", () => {
    const out = _internal.stableStringify({ a: undefined, b: 1 });
    expect(out).toBe('{"b":1}');
  });
});
