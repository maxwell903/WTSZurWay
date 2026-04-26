import { SuggestedPrompts } from "@/components/editor/ai-chat/SuggestedPrompts";
import { WHOLE_PAGE_SUGGESTIONS } from "@/components/editor/ai-chat/suggested-prompts";
import { useEditorStore } from "@/lib/editor-state";
import { __resetEditorStoreForTests } from "@/lib/editor-state/store";
import type { SiteConfig } from "@/lib/site-config";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeConfig(): SiteConfig {
  return {
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
        rootComponent: {
          id: "cmp_root",
          type: "Section",
          props: {},
          style: {},
          children: [
            {
              id: "cmp_hero",
              type: "HeroBanner",
              props: { heading: "Hi", subheading: "" },
              style: {},
            },
          ],
        },
      },
    ],
    forms: [],
  };
}

describe("SuggestedPrompts", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "aurora",
      workingVersionId: "v",
      initialConfig: makeConfig(),
    });
  });

  it("renders the whole-page suggestions when nothing is selected", () => {
    render(<SuggestedPrompts onPick={() => {}} />);
    for (const prompt of WHOLE_PAGE_SUGGESTIONS) {
      expect(screen.getByText(prompt)).toBeInTheDocument();
    }
  });

  it("renders selection-specific suggestions and forwards picks to onPick", () => {
    useEditorStore.getState().selectComponent("cmp_hero");
    const onPick = vi.fn();
    render(<SuggestedPrompts onPick={onPick} />);
    const heroChip = screen.getByText("Make this taller");
    fireEvent.click(heroChip);
    expect(onPick).toHaveBeenCalledWith("Make this taller");
  });
});
