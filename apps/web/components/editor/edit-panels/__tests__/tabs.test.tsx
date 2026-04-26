import { AdvancedTab } from "@/components/editor/edit-panels/tabs/AdvancedTab";
import { AnimationTab } from "@/components/editor/edit-panels/tabs/AnimationTab";
import { StyleTab } from "@/components/editor/edit-panels/tabs/StyleTab";
import { VisibilityTab } from "@/components/editor/edit-panels/tabs/VisibilityTab";
import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { ComponentNode, SiteConfig } from "@/lib/site-config";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it } from "vitest";

function makeFixtureConfig(): SiteConfig {
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
            { id: "cmp_h1", type: "Heading", props: { text: "Hi" }, style: {}, children: [] },
            { id: "cmp_spacer", type: "Spacer", props: {}, style: {}, children: [] },
            { id: "cmp_divider", type: "Divider", props: {}, style: {}, children: [] },
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

function findNode(id: string): ComponentNode | null {
  const page = useEditorStore.getState().draftConfig.pages[0];
  return page ? findById(page.rootComponent, id) : null;
}

// Mirrors EditPanelShell -- subscribes to the store for the live node so
// each fireEvent re-renders the tab with fresh data.
function TabHost({
  id,
  Tab,
}: {
  id: string;
  Tab: ComponentType<{ node: ComponentNode }>;
}) {
  const node = useEditorStore((s) => {
    for (const page of s.draftConfig.pages) {
      const found = findById(page.rootComponent, id);
      if (found) return found;
    }
    return null;
  });
  if (!node) return null;
  return <Tab node={node} />;
}

beforeEach(() => {
  __resetEditorStoreForTests();
  useEditorStore.getState().hydrate({
    siteId: "s",
    siteSlug: "x",
    workingVersionId: "v",
    initialConfig: makeFixtureConfig(),
  });
});

describe("StyleTab", () => {
  it("changing the border-radius writes through setComponentStyle", () => {
    render(<TabHost id="cmp_h1" Tab={StyleTab} />);
    fireEvent.change(screen.getByTestId("style-border-radius"), { target: { value: "8" } });
    const updated = findNode("cmp_h1");
    expect(updated?.style.borderRadius).toBe(8);
    expect(useEditorStore.getState().saveState).toBe("dirty");
  });

  it("changing the shadow preset writes through setComponentStyle", () => {
    render(<TabHost id="cmp_h1" Tab={StyleTab} />);
    fireEvent.click(screen.getByTestId("style-shadow-md"));
    const updated = findNode("cmp_h1");
    expect(updated?.style.shadow).toBe("md");
  });

  it("changing the background mode to color writes a color background", () => {
    render(<TabHost id="cmp_h1" Tab={StyleTab} />);
    fireEvent.click(screen.getByTestId("style-background-mode-color"));
    const updated = findNode("cmp_h1");
    expect(updated?.style.background).toEqual({ kind: "color", value: "#000000" });
  });

  it("Spacer renders the no-chrome carve-out note", () => {
    render(<TabHost id="cmp_spacer" Tab={StyleTab} />);
    expect(screen.getByTestId("style-tab-spacer-note")).toBeInTheDocument();
  });

  it("Divider renders the margin-only carve-out", () => {
    render(<TabHost id="cmp_divider" Tab={StyleTab} />);
    expect(screen.getByTestId("style-tab-divider-margin-only")).toBeInTheDocument();
    expect(screen.queryByTestId("style-background")).toBeNull();
    expect(screen.queryByTestId("style-border")).toBeNull();
  });
});

describe("AnimationTab", () => {
  it("setting both presets to (none) and clearing duration/delay removes animation", () => {
    useEditorStore.getState().setComponentAnimation("cmp_h1", {
      onEnter: "fadeIn",
      duration: 200,
    });
    render(<TabHost id="cmp_h1" Tab={AnimationTab} />);
    fireEvent.change(screen.getByTestId("anim-on-enter"), { target: { value: "__none__" } });
    fireEvent.change(screen.getByTestId("anim-duration"), { target: { value: "" } });
    const updated = findNode("cmp_h1");
    expect(updated).toBeDefined();
    expect("animation" in (updated as object)).toBe(false);
  });

  it("selecting a preset writes the AnimationConfig", () => {
    render(<TabHost id="cmp_h1" Tab={AnimationTab} />);
    fireEvent.change(screen.getByTestId("anim-on-enter"), { target: { value: "fadeInUp" } });
    const updated = findNode("cmp_h1");
    expect(updated?.animation?.onEnter).toBe("fadeInUp");
  });
});

describe("VisibilityTab", () => {
  it("selecting Always writes visibility: undefined", () => {
    useEditorStore.getState().setComponentVisibility("cmp_h1", "desktop");
    render(<TabHost id="cmp_h1" Tab={VisibilityTab} />);
    fireEvent.click(screen.getByTestId("visibility-card-always"));
    const updated = findNode("cmp_h1");
    expect("visibility" in (updated as object)).toBe(false);
  });

  it("selecting Desktop only writes 'desktop'", () => {
    render(<TabHost id="cmp_h1" Tab={VisibilityTab} />);
    fireEvent.click(screen.getByTestId("visibility-card-desktop"));
    expect(findNode("cmp_h1")?.visibility).toBe("desktop");
  });
});

describe("AdvancedTab", () => {
  it("renders the placeholder testid and does not write to the store", () => {
    render(<AdvancedTab />);
    expect(screen.getByTestId("advanced-tab-placeholder")).toBeInTheDocument();
    expect(useEditorStore.getState().saveState).toBe("idle");
  });
});
