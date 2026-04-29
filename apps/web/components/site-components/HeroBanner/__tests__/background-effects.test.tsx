import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { ComponentNode, SiteConfig } from "@/lib/site-config";
import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundEffectsSubsection } from "../edit-panel/effects/BackgroundEffectsSubsection";
import { CursorSpotlight } from "../effects/CursorSpotlight";
import { Particles } from "../effects/Particles";

// ---------------- CursorSpotlight ----------------

describe("<CursorSpotlight>", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when disabled", () => {
    const { container } = render(<CursorSpotlight enabled={false} prefersReducedMotion={false} />);
    expect(container.querySelector("[data-hero-effect='cursor-spotlight']")).toBeNull();
  });

  it("renders an overlay with mode='follow' on a non-touch device", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
    const { container } = render(<CursorSpotlight enabled={true} prefersReducedMotion={false} />);
    const el = container.querySelector("[data-hero-effect='cursor-spotlight']");
    expect(el).not.toBeNull();
    expect(el?.getAttribute("data-hero-spotlight-mode")).toBe("follow");
  });

  it("renders mode='static' under prefers-reduced-motion", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("prefers-reduced-motion"),
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
    const { container } = render(<CursorSpotlight enabled={true} prefersReducedMotion={true} />);
    expect(container.querySelector("[data-hero-spotlight-mode='static']")).not.toBeNull();
  });

  it("renders mode='static' on touch devices (hover: none)", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("hover: none"),
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
    const { container } = render(<CursorSpotlight enabled={true} prefersReducedMotion={false} />);
    expect(container.querySelector("[data-hero-spotlight-mode='static']")).not.toBeNull();
  });
});

// ---------------- Particles ----------------

describe("<Particles>", () => {
  it("returns null for kind='none'", () => {
    const { container } = render(<Particles kind="none" prefersReducedMotion={false} />);
    expect(container.querySelector("[data-hero-effect='particles']")).toBeNull();
  });

  it("renders kind='stars' with animated motion attr", () => {
    const { container } = render(<Particles kind="stars" prefersReducedMotion={false} />);
    const el = container.querySelector("[data-hero-effect='particles']");
    expect(el?.getAttribute("data-hero-particles-kind")).toBe("stars");
    expect(el?.getAttribute("data-hero-particles-motion")).toBe("animated");
  });

  it("renders kind='dots' with animated motion attr", () => {
    const { container } = render(<Particles kind="dots" prefersReducedMotion={false} />);
    const el = container.querySelector("[data-hero-effect='particles']");
    expect(el?.getAttribute("data-hero-particles-kind")).toBe("dots");
  });

  it("renders kind='grid' with animated motion attr", () => {
    const { container } = render(<Particles kind="grid" prefersReducedMotion={false} />);
    const el = container.querySelector("[data-hero-effect='particles']");
    expect(el?.getAttribute("data-hero-particles-kind")).toBe("grid");
  });

  it("under reduced motion: motion attr is 'static' and no animation property is set", () => {
    const { container } = render(<Particles kind="stars" prefersReducedMotion={true} />);
    const el = container.querySelector("[data-hero-effect='particles']") as HTMLElement;
    expect(el.getAttribute("data-hero-particles-motion")).toBe("static");
    expect(el.style.animation).toBe("");
  });
});

// ---------------- BackgroundEffectsSubsection ----------------

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
    <BackgroundEffectsSubsection
      node={node}
      writePartial={(patch) => setComponentProps(node.id, { ...node.props, ...patch })}
    />
  );
}

describe("<BackgroundEffectsSubsection>", () => {
  beforeEach(() => hydrateWith({ heading: "X" }));

  it("toggling cursor spotlight writes cursorSpotlight=true", () => {
    const { container } = render(<PanelHost />);
    const sw = container.querySelector("[data-testid='hero-cursor-spotlight']");
    if (!sw) throw new Error("cursor-spotlight switch missing");
    fireEvent.click(sw);
    expect(getNode("cmp_hero").props.cursorSpotlight).toBe(true);
  });

  it("clicking 'stars' writes particles='stars'", () => {
    const { container } = render(<PanelHost />);
    const opt = container.querySelector("[data-testid='hero-particles-stars']");
    if (!opt) throw new Error("particles-stars option missing");
    fireEvent.click(opt);
    expect(getNode("cmp_hero").props.particles).toBe("stars");
  });
});
