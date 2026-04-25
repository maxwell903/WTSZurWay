import { parseSiteConfig } from "@/lib/site-config";
import { describe, expect, it } from "vitest";
import { previewFixture } from "../fixtures";

function collectTypes(node: { type: string; children?: { type: string }[] }): string[] {
  const types: string[] = [node.type];
  if (node.children) {
    for (const child of node.children) {
      types.push(...collectTypes(child as { type: string; children?: { type: string }[] }));
    }
  }
  return types;
}

describe("preview fixture", () => {
  it("parses cleanly against the SiteConfig schema", () => {
    expect(() => parseSiteConfig(previewFixture)).not.toThrow();
  });

  it("exercises every one of the six Sprint-3 components", () => {
    const home = previewFixture.pages.find((p) => p.slug === "home");
    expect(home).toBeDefined();
    if (!home) return;
    const types = collectTypes(home.rootComponent);
    for (const t of ["Section", "Heading", "Paragraph", "Image", "Spacer", "Divider"]) {
      expect(types).toContain(t);
    }
  });

  it("uses at least three distinct StyleConfig features across the tree", () => {
    const home = previewFixture.pages.find((p) => p.slug === "home");
    expect(home).toBeDefined();
    if (!home) return;
    const usedFeatures = new Set<string>();
    function walk(node: {
      style: Record<string, unknown>;
      children?: { style: Record<string, unknown>; children?: unknown }[];
    }): void {
      for (const key of Object.keys(node.style)) {
        usedFeatures.add(key);
      }
      if (node.children) {
        for (const child of node.children) {
          walk(child as Parameters<typeof walk>[0]);
        }
      }
    }
    walk(home.rootComponent as Parameters<typeof walk>[0]);
    expect(usedFeatures.size).toBeGreaterThanOrEqual(3);
  });
});
