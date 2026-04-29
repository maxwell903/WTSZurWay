import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { ComponentNode, SiteConfig } from "@/lib/site-config";
import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MotionEffectsSubsection } from "../edit-panel/effects/MotionEffectsSubsection";
import { KenBurns } from "../effects/KenBurns";
import { Parallax } from "../effects/Parallax";

// ---------------- KenBurns ----------------

describe("<KenBurns>", () => {
  it("returns children unwrapped when disabled", () => {
    const { container } = render(
      <KenBurns enabled={false} intervalMs={5000} prefersReducedMotion={false}>
        <span data-testid="kb-child">child</span>
      </KenBurns>,
    );
    expect(container.querySelector("[data-hero-effect='ken-burns']")).toBeNull();
  });

  it("returns children unwrapped under reduced motion", () => {
    const { container } = render(
      <KenBurns enabled={true} intervalMs={5000} prefersReducedMotion={true}>
        <span data-testid="kb-child">child</span>
      </KenBurns>,
    );
    expect(container.querySelector("[data-hero-effect='ken-burns']")).toBeNull();
  });

  it("wraps children in a motion div with the ken-burns marker when enabled", () => {
    const { container } = render(
      <KenBurns enabled={true} intervalMs={5000} prefersReducedMotion={false}>
        <span data-testid="kb-child">child</span>
      </KenBurns>,
    );
    const wrapper = container.querySelector("[data-hero-effect='ken-burns']");
    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelector("[data-testid='kb-child']")).not.toBeNull();
  });
});

// ---------------- Parallax ----------------

describe("<Parallax>", () => {
  beforeEach(() => {
    vi.spyOn(window, "addEventListener");
    vi.spyOn(window, "removeEventListener");
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("attaches and detaches a passive scroll listener when enabled", () => {
    const { unmount } = render(
      <Parallax enabled={true} prefersReducedMotion={false}>
        <span data-testid="px-child">child</span>
      </Parallax>,
    );
    expect(window.addEventListener).toHaveBeenCalledWith("scroll", expect.any(Function), {
      passive: true,
    });
    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("does NOT attach a scroll listener when disabled", () => {
    render(
      <Parallax enabled={false} prefersReducedMotion={false}>
        <span>child</span>
      </Parallax>,
    );
    expect(window.addEventListener).not.toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      expect.anything(),
    );
  });

  it("does NOT attach a scroll listener under reduced motion", () => {
    render(
      <Parallax enabled={true} prefersReducedMotion={true}>
        <span>child</span>
      </Parallax>,
    );
    expect(window.addEventListener).not.toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      expect.anything(),
    );
  });
});

// ---------------- MotionEffectsSubsection ----------------

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
    <MotionEffectsSubsection
      node={node}
      writePartial={(patch) => setComponentProps(node.id, { ...node.props, ...patch })}
    />
  );
}

describe("<MotionEffectsSubsection>", () => {
  beforeEach(() => hydrateWith({ heading: "X" }));

  it("clicking 'zoom' transition writes slideTransition='zoom'", () => {
    const { container } = render(<PanelHost />);
    const opt = container.querySelector("[data-testid='hero-slide-transition-zoom']");
    if (!opt) throw new Error("zoom option missing");
    fireEvent.click(opt);
    expect(getNode("cmp_hero").props.slideTransition).toBe("zoom");
  });

  it("toggling Ken Burns writes kenBurns=true", () => {
    const { container } = render(<PanelHost />);
    const sw = container.querySelector("[data-testid='hero-ken-burns']");
    if (!sw) throw new Error("ken-burns switch missing");
    fireEvent.click(sw);
    expect(getNode("cmp_hero").props.kenBurns).toBe(true);
  });

  it("toggling Parallax writes parallax=true", () => {
    const { container } = render(<PanelHost />);
    const sw = container.querySelector("[data-testid='hero-parallax']");
    if (!sw) throw new Error("parallax switch missing");
    fireEvent.click(sw);
    expect(getNode("cmp_hero").props.parallax).toBe(true);
  });
});
