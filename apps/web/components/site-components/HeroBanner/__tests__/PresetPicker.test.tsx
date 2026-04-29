import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { ComponentNode, SiteConfig } from "@/lib/site-config";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { PresetPicker } from "../edit-panel/PresetPicker";

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
    <PresetPicker
      node={node}
      writePartial={(patch) => setComponentProps(node.id, { ...node.props, ...patch })}
    />
  );
}

describe("<PresetPicker> — gallery rendering", () => {
  beforeEach(() => hydrateWith({}));

  it("renders 5 preset cards with the spec's IDs", () => {
    render(<PanelHost />);
    expect(screen.getByTestId("hero-preset-cinematic-video")).toBeTruthy();
    expect(screen.getByTestId("hero-preset-split-hero")).toBeTruthy();
    expect(screen.getByTestId("hero-preset-centered-carousel")).toBeTruthy();
    expect(screen.getByTestId("hero-preset-minimalist")).toBeTruthy();
    expect(screen.getByTestId("hero-preset-logo-marquee")).toBeTruthy();
  });

  it("each card is wrapped in a tooltip", () => {
    const { container } = render(<PanelHost />);
    const tooltipTriggers = container.querySelectorAll("[data-with-tooltip]");
    expect(tooltipTriggers.length).toBeGreaterThanOrEqual(5);
  });
});

describe("<PresetPicker> — apply behavior", () => {
  it("clicking a preset on a fresh banner applies the preset directly (no confirm dialog)", () => {
    hydrateWith({});
    render(<PanelHost />);
    fireEvent.click(screen.getByTestId("hero-preset-minimalist"));
    // Confirm dialog NOT shown — fresh banner is not customized
    expect(screen.queryByTestId("hero-preset-confirm")).toBeNull();
    // Minimalist preset wrote particles='stars' + the rotator-style heading
    expect(getNode("cmp_hero").props.particles).toBe("stars");
    expect(getNode("cmp_hero").props.heading).toBe("Build {rotator} faster.");
  });

  it("clicking a preset on a customized banner opens the confirmation dialog", () => {
    hydrateWith({ heading: "Custom heading", layout: "split-left" });
    render(<PanelHost />);
    fireEvent.click(screen.getByTestId("hero-preset-cinematic-video"));
    expect(screen.queryByTestId("hero-preset-confirm")).not.toBeNull();
    // Apply NOT yet performed
    expect(getNode("cmp_hero").props.heading).toBe("Custom heading");
    expect(getNode("cmp_hero").props.layout).toBe("split-left");
  });

  it("confirming the dialog applies the preset", () => {
    hydrateWith({ heading: "Custom heading", layout: "split-left" });
    render(<PanelHost />);
    fireEvent.click(screen.getByTestId("hero-preset-cinematic-video"));
    fireEvent.click(screen.getByTestId("hero-preset-confirm-apply"));
    expect(getNode("cmp_hero").props.layout).toBe("full-bleed");
    // Old layout=split-left was REPLACED, not merged
    expect(getNode("cmp_hero").props.heading).toBe("Built for what's next");
  });

  it("cancelling the dialog leaves the props unchanged", () => {
    hydrateWith({ heading: "Custom heading", layout: "split-left" });
    render(<PanelHost />);
    fireEvent.click(screen.getByTestId("hero-preset-cinematic-video"));
    fireEvent.click(screen.getByTestId("hero-preset-confirm-cancel"));
    expect(getNode("cmp_hero").props.heading).toBe("Custom heading");
    expect(getNode("cmp_hero").props.layout).toBe("split-left");
  });
});
