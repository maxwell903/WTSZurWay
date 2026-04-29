import { CANVAS_DEFAULTS, resolveCanvas } from "@/lib/site-config/canvas";
import type { CanvasConfig } from "@/lib/site-config/schema";
import { siteConfigSchema } from "@/lib/site-config/schema";
import { describe, expect, it } from "vitest";

describe("resolveCanvas", () => {
  it("returns full defaults when canvas is undefined", () => {
    const r = resolveCanvas(undefined);
    expect(r.pageBackground).toEqual(CANVAS_DEFAULTS.pageBackground);
    expect(r.canvasBackground).toEqual(CANVAS_DEFAULTS.canvasBackground);
    expect(r.maxWidth).toBe(CANVAS_DEFAULTS.maxWidth);
    expect(r.sidePadding).toBe(CANVAS_DEFAULTS.sidePadding);
    expect(r.verticalPadding).toEqual({
      top: CANVAS_DEFAULTS.verticalPadding.top,
      bottom: CANVAS_DEFAULTS.verticalPadding.bottom,
    });
    expect(r.sectionGap).toBe(CANVAS_DEFAULTS.sectionGap);
    expect(r.borderRadius).toBe(CANVAS_DEFAULTS.borderRadius);
    expect(r.shadow).toBeUndefined();
  });

  it("merges overrides on top of defaults field-by-field", () => {
    const canvas: CanvasConfig = {
      maxWidth: 960,
      borderRadius: 16,
      shadow: "lg",
    };
    const r = resolveCanvas(canvas);
    expect(r.maxWidth).toBe(960);
    expect(r.borderRadius).toBe(16);
    expect(r.shadow).toBe("lg");
    // Defaults remain for unset fields.
    expect(r.sidePadding).toBe(CANVAS_DEFAULTS.sidePadding);
    expect(r.canvasBackground).toEqual(CANVAS_DEFAULTS.canvasBackground);
  });

  it("falls back per-side when verticalPadding has only one side set", () => {
    const r = resolveCanvas({ verticalPadding: { top: 80 } });
    expect(r.verticalPadding.top).toBe(80);
    expect(r.verticalPadding.bottom).toBe(CANVAS_DEFAULTS.verticalPadding.bottom);
  });

  it("respects an explicit gradient pageBackground", () => {
    const canvas: CanvasConfig = {
      pageBackground: { kind: "gradient", from: "#000", to: "#fff", angle: 90 },
    };
    expect(resolveCanvas(canvas).pageBackground).toEqual({
      kind: "gradient",
      from: "#000",
      to: "#fff",
      angle: 90,
    });
  });
});

describe("siteConfigSchema canvas", () => {
  function baseConfig() {
    return {
      meta: { siteName: "T", siteSlug: "t" },
      brand: { palette: "ocean", fontFamily: "Inter" },
      global: {
        navBar: { links: [], logoPlacement: "left" as const, sticky: false },
        footer: { columns: [], copyright: "" },
      },
      pages: [
        {
          id: "p_home",
          slug: "home",
          name: "Home",
          kind: "static" as const,
          rootComponent: { id: "cmp_root", type: "Section" as const, props: {}, style: {} },
        },
      ],
      forms: [],
    };
  }

  it("parses a config with no canvas (backward compat)", () => {
    const result = siteConfigSchema.safeParse(baseConfig());
    expect(result.success).toBe(true);
  });

  it("parses a config with a fully populated canvas", () => {
    const cfg = baseConfig();
    cfg.global = {
      ...cfg.global,
      canvas: {
        pageBackground: { kind: "color", value: "#eef" },
        canvasBackground: { kind: "color", value: "#fff" },
        maxWidth: 1280,
        sidePadding: 24,
        verticalPadding: { top: 48, bottom: 64 },
        sectionGap: 16,
        borderRadius: 12,
        shadow: "md",
      },
      // biome-ignore lint/suspicious/noExplicitAny: test fixture only
    } as any;
    const result = siteConfigSchema.safeParse(cfg);
    expect(result.success).toBe(true);
  });

  it("rejects a non-positive maxWidth", () => {
    const cfg = baseConfig();
    // biome-ignore lint/suspicious/noExplicitAny: test fixture only
    (cfg.global as any).canvas = { maxWidth: 0 };
    const result = siteConfigSchema.safeParse(cfg);
    expect(result.success).toBe(false);
  });
});
