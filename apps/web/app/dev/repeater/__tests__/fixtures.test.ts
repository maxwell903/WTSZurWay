import { parseSiteConfig } from "@/lib/site-config";
import { describe, expect, it } from "vitest";
import {
  SECTION_BOTTOM_INPUT_ID,
  SECTION_BOTTOM_REPEATER_ID,
  SECTION_TOP_REPEATER_ID,
  repeaterDevFixture,
} from "../fixtures";

describe("/dev/repeater fixture", () => {
  it("validates against the SiteConfig schema", () => {
    expect(() => parseSiteConfig(repeaterDevFixture)).not.toThrow();
  });

  it("contains the top Repeater bound to units, sorted desc, limited to 12", () => {
    const parsed = parseSiteConfig(repeaterDevFixture);
    const root = parsed.pages[0]?.rootComponent;
    const found = findById(root, SECTION_TOP_REPEATER_ID);
    expect(found).not.toBeNull();
    expect(found?.dataBinding?.source).toBe("units");
    expect(found?.dataBinding?.sort?.field).toBe("currentMarketRent");
    expect(found?.dataBinding?.sort?.direction).toBe("desc");
    expect(found?.dataBinding?.limit).toBe(12);
    // The template is the first child.
    expect(found?.children?.[0]?.type).toBe("UnitCard");
  });

  it("contains the bottom Repeater connected to the search InputField with `contains` on `unitName`", () => {
    const parsed = parseSiteConfig(repeaterDevFixture);
    const root = parsed.pages[0]?.rootComponent;
    const input = findById(root, SECTION_BOTTOM_INPUT_ID);
    expect(input?.type).toBe("InputField");
    const repeater = findById(root, SECTION_BOTTOM_REPEATER_ID);
    expect(repeater?.dataBinding?.connectedInputs).toEqual([
      { inputId: SECTION_BOTTOM_INPUT_ID, field: "unitName", operator: "contains" },
    ]);
  });

  it("includes a Paragraph empty-state with text 'No units match.' on the bottom Repeater", () => {
    const parsed = parseSiteConfig(repeaterDevFixture);
    const repeater = findById(parsed.pages[0]?.rootComponent, SECTION_BOTTOM_REPEATER_ID);
    const empty = repeater?.dataBinding?.emptyState;
    expect(empty?.type).toBe("Paragraph");
    expect((empty?.props as { text?: unknown }).text).toBe("No units match.");
  });

  it("uses `{{ row.* }}` tokens on the UnitCard template heading and image", () => {
    const parsed = parseSiteConfig(repeaterDevFixture);
    const repeater = findById(parsed.pages[0]?.rootComponent, SECTION_TOP_REPEATER_ID);
    const tpl = repeater?.children?.[0];
    const props = tpl?.props as Record<string, unknown>;
    expect(props.heading).toBe("{{ row.unitName }}");
    expect(props.imageSrc).toBe("{{ row.primaryImageUrl }}");
    expect(props.ctaHref).toBe("/units/{{ row.id }}");
  });
});

import type { ComponentNode } from "@/types/site-config";

function findById(root: ComponentNode | undefined, id: string): ComponentNode | null {
  if (!root) return null;
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findById(child, id);
    if (found) return found;
  }
  return null;
}
