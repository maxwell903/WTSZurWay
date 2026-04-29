import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { ComponentNode, SiteConfig } from "@/lib/site-config";
import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LayoutSection } from "../edit-panel/LayoutSection";

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
          children: [{ id: "cmp_hero", type: "HeroBanner", props: heroProps, style: {} }],
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

function hydrateWith(heroProps: Record<string, unknown>) {
  __resetEditorStoreForTests();
  useEditorStore.getState().hydrate({
    siteId: "s",
    siteSlug: "x",
    workingVersionId: "v",
    initialConfig: makeFixtureConfig(heroProps),
  });
}

function PanelHost() {
  const node = useEditorStore((s) => {
    for (const page of s.draftConfig.pages) {
      const found = findById(page.rootComponent, "cmp_hero");
      if (found) return found;
    }
    return null;
  });
  if (!node) return null;
  const setComponentProps = useEditorStore.getState().setComponentProps;
  return (
    <LayoutSection
      node={node}
      writePartial={(patch) => setComponentProps(node.id, { ...node.props, ...patch })}
    />
  );
}

describe("<LayoutSection>", () => {
  beforeEach(() => {
    hydrateWith({ heading: "X" });
  });

  it("renders a SegmentedControl with 4 layout options", () => {
    const { container } = render(<PanelHost />);
    const radioGroup = container.querySelector("[data-testid='hero-layout']");
    expect(radioGroup).not.toBeNull();
    expect(container.querySelector("[data-testid='hero-layout-centered']")).not.toBeNull();
    expect(container.querySelector("[data-testid='hero-layout-split-left']")).not.toBeNull();
    expect(container.querySelector("[data-testid='hero-layout-split-right']")).not.toBeNull();
    expect(container.querySelector("[data-testid='hero-layout-full-bleed']")).not.toBeNull();
  });

  it("clicking the split-left option writes layout='split-left' to the store", () => {
    const { container } = render(<PanelHost />);
    const opt = container.querySelector("[data-testid='hero-layout-split-left']");
    if (!opt) throw new Error("split-left option missing");
    fireEvent.click(opt);
    expect(getNode("cmp_hero").props.layout).toBe("split-left");
  });

  it("clicking the full-bleed option writes layout='full-bleed' to the store", () => {
    const { container } = render(<PanelHost />);
    const opt = container.querySelector("[data-testid='hero-layout-full-bleed']");
    if (!opt) throw new Error("full-bleed option missing");
    fireEvent.click(opt);
    expect(getNode("cmp_hero").props.layout).toBe("full-bleed");
  });

  it("renders inside a tooltip wrapper (the SegmentedControl receives a `tooltip` prop)", () => {
    const { container } = render(<PanelHost />);
    expect(container.querySelector("[data-with-tooltip]")).not.toBeNull();
  });
});
