import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { ComponentNode, SiteConfig } from "@/lib/site-config";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { PropertyCardEditPanel } from "../EditPanel";

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
              id: "cmp_pcard",
              type: "PropertyCard",
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

describe("PropertyCardEditPanel", () => {
  beforeEach(() => {
    hydrateWith({
      heading: "Maple Heights",
      body: "Garden-style 2 BR.",
      imageSrc: "https://placehold.co/600x400",
      ctaLabel: "Tour it",
      ctaHref: "/p/maple",
    });
  });

  it("renders all five content inputs with the current prop values", () => {
    render(<PanelHost id="cmp_pcard" Panel={PropertyCardEditPanel} />);
    expect((screen.getByTestId("propertycard-image-src-url") as HTMLInputElement).value).toBe(
      "https://placehold.co/600x400",
    );
    expect((screen.getByTestId("propertycard-heading") as HTMLInputElement).value).toBe(
      "Maple Heights",
    );
    expect((screen.getByTestId("propertycard-body") as HTMLInputElement).value).toBe(
      "Garden-style 2 BR.",
    );
    expect((screen.getByTestId("propertycard-cta-label") as HTMLInputElement).value).toBe(
      "Tour it",
    );
    // ctaHref "/p/maple" doesn't match any static page → URL mode.
    expect((screen.getByTestId("propertycard-cta-href-url") as HTMLInputElement).value).toBe(
      "/p/maple",
    );
  });

  it("editing the heading writes node.props.heading through the store", () => {
    render(<PanelHost id="cmp_pcard" Panel={PropertyCardEditPanel} />);
    fireEvent.change(screen.getByTestId("propertycard-heading"), {
      target: { value: "Cedar Run" },
    });
    expect(getNode("cmp_pcard").props.heading).toBe("Cedar Run");
  });

  it("editing the body writes node.props.body through the store", () => {
    render(<PanelHost id="cmp_pcard" Panel={PropertyCardEditPanel} />);
    fireEvent.change(screen.getByTestId("propertycard-body"), {
      target: { value: "Renovated kitchens." },
    });
    expect(getNode("cmp_pcard").props.body).toBe("Renovated kitchens.");
  });

  it("editing the imageSrc URL field writes node.props.imageSrc through the store", () => {
    render(<PanelHost id="cmp_pcard" Panel={PropertyCardEditPanel} />);
    fireEvent.change(screen.getByTestId("propertycard-image-src-url"), {
      target: { value: "https://example.com/p.jpg" },
    });
    expect(getNode("cmp_pcard").props.imageSrc).toBe("https://example.com/p.jpg");
  });

  it("editing the ctaLabel writes node.props.ctaLabel through the store", () => {
    render(<PanelHost id="cmp_pcard" Panel={PropertyCardEditPanel} />);
    fireEvent.change(screen.getByTestId("propertycard-cta-label"), {
      target: { value: "Book a tour" },
    });
    expect(getNode("cmp_pcard").props.ctaLabel).toBe("Book a tour");
  });

  it("switching the CTA link to Page mode writes /<slug> from the first static page", () => {
    render(<PanelHost id="cmp_pcard" Panel={PropertyCardEditPanel} />);
    fireEvent.click(screen.getByTestId("propertycard-cta-href-mode-page"));
    expect(getNode("cmp_pcard").props.ctaHref).toBe("/home");
  });

  it("switching the CTA link back to URL mode clears the value to an empty string", () => {
    render(<PanelHost id="cmp_pcard" Panel={PropertyCardEditPanel} />);
    fireEvent.click(screen.getByTestId("propertycard-cta-href-mode-page"));
    fireEvent.click(screen.getByTestId("propertycard-cta-href-mode-url"));
    expect(getNode("cmp_pcard").props.ctaHref).toBe("");
  });

  it("renders blank inputs when the node has no props (defaults come from the renderer, not the panel)", () => {
    hydrateWith({});
    render(<PanelHost id="cmp_pcard" Panel={PropertyCardEditPanel} />);
    // The panel reads strings via readString with empty fallback — defaults
    // (e.g. "Property Name") are applied by the PropertyCard renderer's
    // Zod schema, not surfaced as input values here.
    expect((screen.getByTestId("propertycard-heading") as HTMLInputElement).value).toBe("");
    expect((screen.getByTestId("propertycard-body") as HTMLInputElement).value).toBe("");
    expect((screen.getByTestId("propertycard-cta-label") as HTMLInputElement).value).toBe("");
  });
});
