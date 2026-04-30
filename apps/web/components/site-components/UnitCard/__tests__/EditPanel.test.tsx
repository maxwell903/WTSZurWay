import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { ComponentNode, SiteConfig } from "@/lib/site-config";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { UnitCardEditPanel } from "../EditPanel";

function makeFixtureConfig(cardProps: Record<string, unknown>): SiteConfig {
  return {
    meta: { siteName: "X", siteSlug: "x" },
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
              id: "cmp_ucard",
              type: "UnitCard",
              props: cardProps,
              style: {},
            },
          ],
        },
      },
    ],
    forms: [],
  };
}

function findById(root: ComponentNode, id: string): ComponentNode | null {
  if (root.id === id) return root;
  for (const c of root.children ?? []) {
    const f = findById(c, id);
    if (f) return f;
  }
  return null;
}

function getNode(id: string): ComponentNode {
  const page = useEditorStore.getState().draftConfig.pages[0];
  if (!page) throw new Error("no page");
  const found = findById(page.rootComponent, id);
  if (!found) throw new Error(`no node ${id}`);
  return found;
}

function PanelHost({
  id,
  Panel,
}: {
  id: string;
  Panel: ComponentType<{ node: ComponentNode }>;
}) {
  const node = useEditorStore((s) => {
    for (const page of s.draftConfig.pages) {
      const found = findById(page.rootComponent, id);
      if (found) return found;
    }
    return null;
  });
  if (!node) return null;
  return <Panel node={node} />;
}

function hydrateWith(cardProps: Record<string, unknown>) {
  __resetEditorStoreForTests();
  useEditorStore.getState().hydrate({
    siteId: "s",
    siteSlug: "x",
    workingVersionId: "v",
    initialConfig: makeFixtureConfig(cardProps),
  });
}

describe("UnitCardEditPanel", () => {
  beforeEach(() => {
    hydrateWith({
      heading: "Unit 4B",
      beds: 2,
      baths: 1,
      sqft: 850,
      rent: 1850,
      imageSrc: "https://placehold.co/600x400",
      ctaLabel: "Tour Unit",
      ctaHref: "/units/4b",
    });
  });

  it("renders all eight content inputs with the current prop values", () => {
    render(<PanelHost id="cmp_ucard" Panel={UnitCardEditPanel} />);
    expect((screen.getByTestId("unitcard-image-src-url") as HTMLInputElement).value).toBe(
      "https://placehold.co/600x400",
    );
    expect((screen.getByTestId("unitcard-heading") as HTMLInputElement).value).toBe("Unit 4B");
    expect((screen.getByTestId("unitcard-beds") as HTMLInputElement).value).toBe("2");
    expect((screen.getByTestId("unitcard-baths") as HTMLInputElement).value).toBe("1");
    expect((screen.getByTestId("unitcard-sqft") as HTMLInputElement).value).toBe("850");
    expect((screen.getByTestId("unitcard-rent") as HTMLInputElement).value).toBe("1850");
    expect((screen.getByTestId("unitcard-cta-label") as HTMLInputElement).value).toBe("Tour Unit");
    expect((screen.getByTestId("unitcard-cta-href-url") as HTMLInputElement).value).toBe(
      "/units/4b",
    );
  });

  it("editing the heading writes node.props.heading through the store", () => {
    render(<PanelHost id="cmp_ucard" Panel={UnitCardEditPanel} />);
    fireEvent.change(screen.getByTestId("unitcard-heading"), {
      target: { value: "Unit 7A" },
    });
    expect(getNode("cmp_ucard").props.heading).toBe("Unit 7A");
  });

  it("editing rent writes a numeric value through the store (not a string)", () => {
    render(<PanelHost id="cmp_ucard" Panel={UnitCardEditPanel} />);
    fireEvent.change(screen.getByTestId("unitcard-rent"), { target: { value: "2100" } });
    const after = getNode("cmp_ucard").props.rent;
    expect(typeof after).toBe("number");
    expect(after).toBe(2100);
  });

  it("editing beds, baths, and sqft each store numbers", () => {
    render(<PanelHost id="cmp_ucard" Panel={UnitCardEditPanel} />);
    fireEvent.change(screen.getByTestId("unitcard-beds"), { target: { value: "3" } });
    fireEvent.change(screen.getByTestId("unitcard-baths"), { target: { value: "2" } });
    fireEvent.change(screen.getByTestId("unitcard-sqft"), { target: { value: "1100" } });
    const props = getNode("cmp_ucard").props;
    expect(props.beds).toBe(3);
    expect(props.baths).toBe(2);
    expect(props.sqft).toBe(1100);
  });

  it("clearing rent (empty input) coalesces to 0 so the live preview never NaN-flickers", () => {
    render(<PanelHost id="cmp_ucard" Panel={UnitCardEditPanel} />);
    fireEvent.change(screen.getByTestId("unitcard-rent"), { target: { value: "" } });
    expect(getNode("cmp_ucard").props.rent).toBe(0);
  });

  it("editing the imageSrc URL field writes node.props.imageSrc through the store", () => {
    render(<PanelHost id="cmp_ucard" Panel={UnitCardEditPanel} />);
    fireEvent.change(screen.getByTestId("unitcard-image-src-url"), {
      target: { value: "https://example.com/u.jpg" },
    });
    expect(getNode("cmp_ucard").props.imageSrc).toBe("https://example.com/u.jpg");
  });

  it("switching the CTA link to Page mode writes /<slug> from the first static page", () => {
    render(<PanelHost id="cmp_ucard" Panel={UnitCardEditPanel} />);
    fireEvent.click(screen.getByTestId("unitcard-cta-href-mode-page"));
    expect(getNode("cmp_ucard").props.ctaHref).toBe("/home");
  });

  it("renders blank string inputs and empty number inputs when the node has no props", () => {
    hydrateWith({});
    render(<PanelHost id="cmp_ucard" Panel={UnitCardEditPanel} />);
    // String fields read empty fallback; number fields show "" when undefined.
    expect((screen.getByTestId("unitcard-heading") as HTMLInputElement).value).toBe("");
    expect((screen.getByTestId("unitcard-beds") as HTMLInputElement).value).toBe("");
    expect((screen.getByTestId("unitcard-rent") as HTMLInputElement).value).toBe("");
    expect((screen.getByTestId("unitcard-cta-label") as HTMLInputElement).value).toBe("");
  });
});
