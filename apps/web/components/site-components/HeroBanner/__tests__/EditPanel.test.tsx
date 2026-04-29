import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import { synthesizeDoc } from "@/lib/rich-text/synthesize-doc";
import type { ComponentNode, SiteConfig } from "@/lib/site-config";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { HeroBannerEditPanel } from "../EditPanel";

function makeFixtureConfig(heroProps: Record<string, unknown>): SiteConfig {
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
              id: "cmp_hero",
              type: "HeroBanner",
              props: heroProps,
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

function hydrateWith(heroProps: Record<string, unknown>) {
  __resetEditorStoreForTests();
  useEditorStore.getState().hydrate({
    siteId: "s",
    siteSlug: "x",
    workingVersionId: "v",
    initialConfig: makeFixtureConfig(heroProps),
  });
}

describe("HeroBannerEditPanel — basic prop fields", () => {
  beforeEach(() => {
    hydrateWith({ heading: "Welcome", subheading: "" });
  });

  it("editing the Heading field writes node.props.heading through the store", () => {
    render(<PanelHost id="cmp_hero" Panel={HeroBannerEditPanel} />);
    fireEvent.change(screen.getByTestId("hero-heading"), {
      target: { value: "New tagline" },
    });
    expect(getNode("cmp_hero").props.heading).toBe("New tagline");
  });

  // Sprint 5: the v1 boolean SwitchInput was replaced by the OverlayInput
  // (kind: none / solid / linear / radial). Choosing "None" writes
  // `overlay: false` so the renderer's schema preprocess doesn't fall back
  // to the default solid.
  it("clicking the Overlay 'None' kind writes overlay=false (replaces v1 boolean toggle)", () => {
    hydrateWith({ heading: "X", overlay: true });
    render(<PanelHost id="cmp_hero" Panel={HeroBannerEditPanel} />);
    fireEvent.click(screen.getByTestId("hero-overlay-kind-none"));
    expect(getNode("cmp_hero").props.overlay).toBe(false);
  });
});

describe("HeroBannerEditPanel — slideshow images editor", () => {
  beforeEach(() => {
    hydrateWith({ heading: "Hi", images: [] });
  });

  it("clicking 'Add slide' appends a blank slide to node.props.images", () => {
    render(<PanelHost id="cmp_hero" Panel={HeroBannerEditPanel} />);
    fireEvent.click(screen.getByTestId("hero-slides-add"));
    expect(getNode("cmp_hero").props.images).toEqual([{ src: "", alt: "" }]);
  });

  // Sprint 8: SlideshowImagesEditor became collapsible. Per-slide controls
  // (src, alt, etc.) live inside the expanded card; remove + drag are on
  // the collapsed row header. Testids changed accordingly:
  //   - row remove:  `hero-slides-{idx}-remove`  (was `hero-slides-remove-{idx}`)
  //   - row toggle:  `hero-slides-{idx}-toggle`  (new)
  //   - src URL:     `hero-slides-{idx}-src-url` (was `hero-slides-src-{idx}-url`)
  //   - alt:         `hero-slides-{idx}-alt`     (was `hero-slides-alt-{idx}`)
  // These swaps are documented in the Sprint 8 Completion Report.
  it("editing a slide src writes through to the store (after expanding the row)", () => {
    hydrateWith({ heading: "Hi", images: [{ src: "", alt: "" }] });
    render(<PanelHost id="cmp_hero" Panel={HeroBannerEditPanel} />);
    fireEvent.click(screen.getByTestId("hero-slides-0-toggle"));
    fireEvent.change(screen.getByTestId("hero-slides-0-src-url"), {
      target: { value: "https://example.com/a.png" },
    });
    const images = getNode("cmp_hero").props.images as { src: string; alt?: string }[];
    expect(images[0]?.src).toBe("https://example.com/a.png");
  });

  it("editing a slide alt writes through to the store (after expanding the row)", () => {
    hydrateWith({ heading: "Hi", images: [{ src: "x", alt: "" }] });
    render(<PanelHost id="cmp_hero" Panel={HeroBannerEditPanel} />);
    fireEvent.click(screen.getByTestId("hero-slides-0-toggle"));
    fireEvent.change(screen.getByTestId("hero-slides-0-alt"), {
      target: { value: "City skyline" },
    });
    const images = getNode("cmp_hero").props.images as { src: string; alt?: string }[];
    expect(images[0]?.alt).toBe("City skyline");
  });

  it("clicking 'Remove' on a slide drops it from the array", () => {
    hydrateWith({
      heading: "Hi",
      images: [
        { src: "a", alt: "" },
        { src: "b", alt: "" },
      ],
    });
    render(<PanelHost id="cmp_hero" Panel={HeroBannerEditPanel} />);
    fireEvent.click(screen.getByTestId("hero-slides-0-remove"));
    const images = getNode("cmp_hero").props.images as { src: string; alt?: string }[];
    expect(images).toEqual([{ src: "b", alt: "" }]);
  });

  it("toggling autoplay writes node.props.autoplay", () => {
    hydrateWith({ heading: "Hi", autoplay: true });
    render(<PanelHost id="cmp_hero" Panel={HeroBannerEditPanel} />);
    fireEvent.click(screen.getByTestId("hero-autoplay"));
    expect(getNode("cmp_hero").props.autoplay).toBe(false);
  });

  it("editing intervalMs writes a number through the store", () => {
    hydrateWith({ heading: "Hi", intervalMs: 5000 });
    render(<PanelHost id="cmp_hero" Panel={HeroBannerEditPanel} />);
    fireEvent.change(screen.getByTestId("hero-interval-ms"), {
      target: { value: "3000" },
    });
    expect(getNode("cmp_hero").props.intervalMs).toBe(3000);
  });
});

describe("<HeroBannerEditPanel> — RichTextMirror bidirectional sync", () => {
  it("writes both plain and rich keys when the user types in the heading textarea", () => {
    hydrateWith({ heading: "" });
    render(<PanelHost id="cmp_hero" Panel={HeroBannerEditPanel} />);
    const textarea = screen.getByTestId("hero-heading");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    const after = getNode("cmp_hero").props;
    expect(after.heading).toBe("Hello");
    expect(after.richHeading).toEqual(synthesizeDoc("Hello", "block"));
  });

  it("shows the read-only mirror when richHeading has formatting", () => {
    hydrateWith({
      heading: "Hello",
      richHeading: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Hello", marks: [{ type: "bold" }] }],
          },
        ],
      },
    });
    render(<PanelHost id="cmp_hero" Panel={HeroBannerEditPanel} />);
    expect(screen.getByTestId("hero-heading-formatted-badge")).toBeInTheDocument();
    expect(screen.getByTestId("hero-heading-readonly")).toHaveTextContent("Hello");
    expect(screen.queryByTestId("hero-heading")).toBeNull();
  });

  it("re-renders heading textarea after a TipTap-style write to richHeading + heading", () => {
    hydrateWith({ heading: "" });
    render(<PanelHost id="cmp_hero" Panel={HeroBannerEditPanel} />);
    expect((screen.getByTestId("hero-heading") as HTMLTextAreaElement).value).toBe("");
    act(() => {
      useEditorStore.getState().setComponentProps("cmp_hero", {
        heading: "Inline edit",
        richHeading: synthesizeDoc("Inline edit", "block"),
      });
    });
    expect((screen.getByTestId("hero-heading") as HTMLTextAreaElement).value).toBe("Inline edit");
  });
});
