import { safeParseSiteConfig } from "@/lib/site-config";
import { describe, expect, it } from "vitest";
import { sprint5Fixture } from "../fixtures";

describe("sprint5Fixture", () => {
  it("parses cleanly against siteConfigSchema", () => {
    const result = safeParseSiteConfig(sprint5Fixture);
    expect(result.success).toBe(true);
  });

  it("exercises every Sprint-5 component type at least once", () => {
    // Walk the rootComponent tree and collect every type used.
    type Node = { type: string; children?: Node[] };
    const seen = new Set<string>();
    function walk(node: Node): void {
      seen.add(node.type);
      for (const child of node.children ?? []) walk(child);
    }
    const home = sprint5Fixture.pages.find((p) => p.slug === "home");
    expect(home).toBeDefined();
    if (!home) return;
    walk(home.rootComponent as unknown as Node);

    const expected = [
      "Row",
      "Column",
      "Button",
      "Logo",
      "NavBar",
      "Footer",
      "HeroBanner",
      "PropertyCard",
      "UnitCard",
      "Repeater",
      "InputField",
      "Form",
      "MapEmbed",
      "Gallery",
    ];
    for (const t of expected) {
      expect(seen.has(t), `expected fixture to contain a ${t} node`).toBe(true);
    }
  });
});
