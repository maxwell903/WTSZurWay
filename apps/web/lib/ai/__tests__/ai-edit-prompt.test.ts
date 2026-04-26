// @vitest-environment node

import { buildAiEditSystemPrompt } from "@/lib/ai/prompts/ai-edit";
import type { SiteConfig } from "@/lib/site-config";
import { describe, expect, it } from "vitest";

function makeConfig(): SiteConfig {
  return {
    meta: { siteName: "Aurora Property Group", siteSlug: "aurora-property-group" },
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
        rootComponent: {
          id: "cmp_root_home",
          type: "Section",
          props: {},
          style: {},
          children: [
            {
              id: "cmp_hero",
              type: "HeroBanner",
              props: { heading: "Welcome", subheading: "" },
              style: {},
            },
          ],
        },
      },
    ],
    forms: [],
  };
}

describe("buildAiEditSystemPrompt", () => {
  const prompt = buildAiEditSystemPrompt({ config: makeConfig(), selection: null });

  it("(a) describes the diff-of-operations contract from §9.3", () => {
    expect(prompt).toMatch(/diff of operations/i);
  });

  it("(b) references the Operation discriminated union", () => {
    expect(prompt).toContain("Operation");
    expect(prompt).toContain("operations: Operation[]");
  });

  it("(c) embeds the strict JSON output rule with no prose / no markdown fences", () => {
    expect(prompt).toMatch(/do not include prose|no prose/i);
    expect(prompt).toMatch(/markdown code fences|markdown fences/i);
    expect(prompt).toContain("first character");
  });

  it("(d) embeds the discriminated-union ok / clarify response shapes from §9.3", () => {
    expect(prompt).toContain('kind: "ok"');
    expect(prompt).toContain('kind: "clarify"');
    expect(prompt).toContain("question: string");
    expect(prompt).toContain("summary: string");
  });

  it("(e) forbids inventing components, props, or fields", () => {
    expect(prompt).toMatch(/MUST NOT invent component types/);
    expect(prompt).toMatch(/Do not invent components, props, or fields/);
  });

  it("(f) lists the three §8.12 detail-page op names verbatim", () => {
    expect(prompt).toContain("setLinkMode");
    expect(prompt).toContain("setDetailPageSlug");
    expect(prompt).toContain("setQueryParamDefault");
  });

  it("(g) embeds the SiteConfig schema prose (Page.kind, detailDataSource)", () => {
    expect(prompt).toContain('kind: "static" | "detail"');
    expect(prompt).toContain("detailDataSource");
  });

  it("(h) embeds the registered component catalog", () => {
    expect(prompt).toContain("### Section");
    expect(prompt).toContain("### Repeater");
    expect(prompt).toContain("### Button");
  });

  it("(i) embeds the data-sources reference", () => {
    expect(prompt).toContain("## properties (data source)");
    expect(prompt).toContain("## units (data source)");
  });

  it("(j) embeds the current SiteConfig as JSON", () => {
    expect(prompt).toContain('"siteName": "Aurora Property Group"');
    expect(prompt).toContain('"id": "cmp_hero"');
  });

  it("(k) every Tier 1 + Tier 2 op type appears in the operations vocabulary", () => {
    const op_types = [
      "addComponent",
      "removeComponent",
      "moveComponent",
      "setProp",
      "setStyle",
      "setAnimation",
      "setVisibility",
      "setText",
      "bindRMField",
      "addPage",
      "removePage",
      "renamePage",
      "setSiteSetting",
      "setPalette",
      "duplicateComponent",
      "wrapComponent",
      "unwrapComponent",
      "reorderChildren",
      "setRepeaterDataSource",
      "setRepeaterFilters",
      "setRepeaterSort",
      "connectInputToRepeater",
    ];
    for (const t of op_types) {
      expect(prompt).toContain(t);
    }
  });

  it("(l) carries the selection-aware whole-page hint when selection is null", () => {
    expect(prompt).toContain("nothing selected");
  });

  it("(m) when a selection is provided, embeds id + type + shallow props", () => {
    const promptWithSelection = buildAiEditSystemPrompt({
      config: makeConfig(),
      selection: { componentIds: ["cmp_hero"], pageSlug: "home", pageKind: "static" },
    });
    expect(promptWithSelection).toContain("Selected components");
    expect(promptWithSelection).toContain('"id":"cmp_hero"');
    expect(promptWithSelection).toContain('"type":"HeroBanner"');
  });

  it("is deterministic -- same input yields identical output", () => {
    const a = buildAiEditSystemPrompt({ config: makeConfig(), selection: null });
    const b = buildAiEditSystemPrompt({ config: makeConfig(), selection: null });
    expect(a).toBe(b);
  });
});
