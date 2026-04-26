import { SelectionChip } from "@/components/editor/ai-chat/SelectionChip";
import { useEditorStore } from "@/lib/editor-state";
import { __resetEditorStoreForTests } from "@/lib/editor-state/store";
import type { SiteConfig } from "@/lib/site-config";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

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

describe("SelectionChip", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "aurora",
      workingVersionId: "v",
      initialConfig: makeConfig(),
    });
  });

  it("reads 'Editing: whole page' when nothing is selected", () => {
    render(<SelectionChip />);
    expect(screen.getByTestId("selection-chip").textContent).toContain("Editing: whole page");
  });

  it("reads 'Editing: <Type> — <id>' when a component is selected", () => {
    useEditorStore.getState().selectComponent("cmp_hero");
    render(<SelectionChip />);
    expect(screen.getByTestId("selection-chip").textContent).toContain(
      "Editing: HeroBanner — cmp_hero",
    );
  });
});
