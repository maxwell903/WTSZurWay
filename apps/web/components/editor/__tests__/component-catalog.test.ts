import { componentRegistry } from "@/components/site-components/registry";
import type { ComponentType } from "@/lib/site-config";
import { COMPONENT_TYPES } from "@/lib/site-config";
import { describe, expect, it } from "vitest";
import {
  COMPONENT_CATALOG,
  COMPONENT_GROUP_ORDER,
  getCatalogByGroup,
} from "../sidebar/add-tab/component-catalog";

// FlowGroup is auto-inserted by the editor engine when the user drops on a
// left/right edge (Phase 5 of the x-axis-resize plan). It must never appear
// in the hand-curated palette.
const ENGINE_MANAGED = new Set<ComponentType>(["FlowGroup"]);

describe("component-catalog", () => {
  it("exposes exactly 20 catalog entries", () => {
    expect(COMPONENT_CATALOG).toHaveLength(20);
  });

  it("excludes engine-managed types (FlowGroup)", () => {
    const catalogTypes = COMPONENT_CATALOG.map((e) => e.type);
    expect(catalogTypes).not.toContain("FlowGroup");
  });

  it("matches the registry's keys 1:1, excluding engine-managed types", () => {
    const catalogTypes = COMPONENT_CATALOG.map((e) => e.type).sort();
    const registryTypes = Object.keys(componentRegistry)
      .filter((t) => !ENGINE_MANAGED.has(t as ComponentType))
      .sort();
    expect(catalogTypes).toEqual(registryTypes);
  });

  it("includes every non-engine-managed ComponentType", () => {
    const catalogTypes = new Set(COMPONENT_CATALOG.map((e) => e.type));
    for (const type of COMPONENT_TYPES) {
      if (ENGINE_MANAGED.has(type)) continue;
      expect(catalogTypes.has(type)).toBe(true);
    }
  });

  it("organises every entry into one of the six declared groups", () => {
    const validGroups = new Set(COMPONENT_GROUP_ORDER);
    for (const entry of COMPONENT_CATALOG) {
      expect(validGroups.has(entry.group)).toBe(true);
    }
  });

  it("the section ordering exposes Layout, Content, Media, Data, Forms, Navigation", () => {
    expect(COMPONENT_GROUP_ORDER).toEqual([
      "Layout",
      "Content",
      "Media",
      "Data",
      "Forms",
      "Navigation",
    ]);
  });

  it("getCatalogByGroup returns a record with all groups populated", () => {
    const grouped = getCatalogByGroup();
    for (const group of COMPONENT_GROUP_ORDER) {
      expect(grouped[group].length).toBeGreaterThan(0);
    }
  });
});
