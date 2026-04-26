import type { SiteConfig } from "@/lib/site-config";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetEditorStoreForTests, useEditorStore } from "../store";

function makeFixtureConfig(): SiteConfig {
  return {
    meta: { siteName: "Test Site", siteSlug: "test-site" },
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
              id: "cmp_h1",
              type: "Heading",
              props: { text: "Welcome" },
              style: {},
              children: [],
            },
          ],
        },
      },
    ],
    forms: [],
  };
}

describe("editor store", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
  });

  it("hydrate seeds state from a working version and resets save flags", () => {
    useEditorStore.getState().hydrate({
      siteId: "site-1",
      siteSlug: "test-site",
      workingVersionId: "v1",
      initialConfig: makeFixtureConfig(),
    });
    const s = useEditorStore.getState();
    expect(s.siteId).toBe("site-1");
    expect(s.workingVersionId).toBe("v1");
    expect(s.currentPageSlug).toBe("home");
    expect(s.saveState).toBe("idle");
    expect(s.selectedComponentId).toBeNull();
  });

  it("selectComponent / setHoveredComponent set the selection refs", () => {
    useEditorStore.getState().selectComponent("cmp_h1");
    expect(useEditorStore.getState().selectedComponentId).toBe("cmp_h1");
    useEditorStore.getState().setHoveredComponent("cmp_root");
    expect(useEditorStore.getState().hoveredComponentId).toBe("cmp_root");
    useEditorStore.getState().selectComponent(null);
    expect(useEditorStore.getState().selectedComponentId).toBeNull();
  });

  it("setLeftSidebarTab persists the active tab in the store", () => {
    useEditorStore.getState().setLeftSidebarTab("site");
    expect(useEditorStore.getState().leftSidebarTab).toBe("site");
    useEditorStore.getState().setLeftSidebarTab("add");
    expect(useEditorStore.getState().leftSidebarTab).toBe("add");
  });

  it("setPreviewMode(true) clears the active selection", () => {
    useEditorStore.getState().selectComponent("cmp_h1");
    useEditorStore.getState().setPreviewMode(true);
    const s = useEditorStore.getState();
    expect(s.previewMode).toBe(true);
    expect(s.selectedComponentId).toBeNull();
  });

  it("setSiteName flips saveState to dirty and updates meta.siteName", () => {
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "x",
      workingVersionId: "v",
      initialConfig: makeFixtureConfig(),
    });
    useEditorStore.getState().setSiteName("Aurora Demo");
    const s = useEditorStore.getState();
    expect(s.draftConfig.meta.siteName).toBe("Aurora Demo");
    expect(s.saveState).toBe("dirty");
  });

  it("addPage flips saveState to dirty, updates currentPageSlug, and clears selection", () => {
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "x",
      workingVersionId: "v",
      initialConfig: makeFixtureConfig(),
    });
    useEditorStore.getState().selectComponent("cmp_h1");
    useEditorStore.getState().addPage({ name: "Properties", slug: "properties", kind: "static" });
    const s = useEditorStore.getState();
    expect(s.saveState).toBe("dirty");
    expect(s.currentPageSlug).toBe("properties");
    expect(s.selectedComponentId).toBeNull();
  });

  it("deletePage drops a non-home page and switches current page back to home if needed", () => {
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "x",
      workingVersionId: "v",
      initialConfig: makeFixtureConfig(),
    });
    useEditorStore.getState().addPage({ name: "Properties", slug: "properties", kind: "static" });
    useEditorStore.getState().deletePage("properties", "static");
    const s = useEditorStore.getState();
    expect(s.draftConfig.pages.find((p) => p.slug === "properties")).toBeUndefined();
    expect(s.currentPageSlug).toBe("home");
  });

  it("markSaved flips saveState to saved with a timestamp", () => {
    useEditorStore.getState().markSaving();
    useEditorStore.getState().markSaved(123_456);
    const s = useEditorStore.getState();
    expect(s.saveState).toBe("saved");
    expect(s.lastSavedAt).toBe(123_456);
  });

  it("markError flips saveState to error and stores the message", () => {
    useEditorStore.getState().markError("Network down");
    const s = useEditorStore.getState();
    expect(s.saveState).toBe("error");
    expect(s.saveError).toBe("Network down");
  });
});

// ---------------------------------------------------------------------------
// Sprint 8 -- element edit mode & component-level mutators
// ---------------------------------------------------------------------------

describe("editor store -- element edit mode", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "x",
      workingVersionId: "v",
      initialConfig: makeFixtureConfig(),
    });
  });

  it("enterElementEditMode selects the id, flips mode, and resets the tab to content", () => {
    useEditorStore.getState().setElementEditTab("style");
    useEditorStore.getState().enterElementEditMode("cmp_h1");
    const s = useEditorStore.getState();
    expect(s.selectedComponentId).toBe("cmp_h1");
    expect(s.leftSidebarMode).toBe("element-edit");
    expect(s.elementEditTab).toBe("content");
  });

  it("exitElementEditMode clears selection, returns mode to primary, resets tab", () => {
    useEditorStore.getState().enterElementEditMode("cmp_h1");
    useEditorStore.getState().setElementEditTab("animation");
    useEditorStore.getState().exitElementEditMode();
    const s = useEditorStore.getState();
    expect(s.selectedComponentId).toBeNull();
    expect(s.leftSidebarMode).toBe("primary");
    expect(s.elementEditTab).toBe("content");
  });

  it("setElementEditTab persists the active tab", () => {
    useEditorStore.getState().setElementEditTab("visibility");
    expect(useEditorStore.getState().elementEditTab).toBe("visibility");
  });

  it("setCurrentPageSlug exits element-edit mode", () => {
    useEditorStore.getState().addPage({ name: "Properties", slug: "properties", kind: "static" });
    useEditorStore.getState().enterElementEditMode("cmp_h1");
    useEditorStore.getState().setCurrentPageSlug("properties");
    const s = useEditorStore.getState();
    expect(s.leftSidebarMode).toBe("primary");
    expect(s.selectedComponentId).toBeNull();
    expect(s.elementEditTab).toBe("content");
  });

  it("setPreviewMode(true) exits element-edit mode", () => {
    useEditorStore.getState().enterElementEditMode("cmp_h1");
    useEditorStore.getState().setPreviewMode(true);
    const s = useEditorStore.getState();
    expect(s.previewMode).toBe(true);
    expect(s.leftSidebarMode).toBe("primary");
    expect(s.selectedComponentId).toBeNull();
  });

  it("setPreviewMode(false) does not affect the sidebar mode", () => {
    useEditorStore.getState().setPreviewMode(true);
    // Mode is "primary" now (preview cleared). Re-enter edit and confirm.
    useEditorStore.getState().setPreviewMode(false);
    expect(useEditorStore.getState().leftSidebarMode).toBe("primary");
  });
});

describe("editor store -- component-level mutators", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "x",
      workingVersionId: "v",
      initialConfig: makeFixtureConfig(),
    });
  });

  it("setComponentProps updates the node and flips saveState to dirty", () => {
    useEditorStore.getState().setComponentProps("cmp_h1", { text: "Updated" });
    const s = useEditorStore.getState();
    expect(s.saveState).toBe("dirty");
    const home = s.draftConfig.pages.find((p) => p.slug === "home");
    expect(home?.rootComponent.children?.[0]?.props).toEqual({ text: "Updated" });
  });

  it("setComponentStyle updates the node's style and flips saveState to dirty", () => {
    useEditorStore.getState().setComponentStyle("cmp_h1", { textColor: "#ff0000" });
    const s = useEditorStore.getState();
    expect(s.saveState).toBe("dirty");
    const home = s.draftConfig.pages.find((p) => p.slug === "home");
    expect(home?.rootComponent.children?.[0]?.style).toEqual({ textColor: "#ff0000" });
  });

  it("setComponentAnimation(undefined) removes the animation field", () => {
    useEditorStore.getState().setComponentAnimation("cmp_h1", { onEnter: "fadeIn" });
    useEditorStore.getState().setComponentAnimation("cmp_h1", undefined);
    const s = useEditorStore.getState();
    const node = s.draftConfig.pages.find((p) => p.slug === "home")?.rootComponent.children?.[0];
    expect(node).toBeDefined();
    expect("animation" in (node as object)).toBe(false);
  });

  it("setComponentVisibility(undefined) removes the visibility field", () => {
    useEditorStore.getState().setComponentVisibility("cmp_h1", "desktop");
    useEditorStore.getState().setComponentVisibility("cmp_h1", undefined);
    const s = useEditorStore.getState();
    const node = s.draftConfig.pages.find((p) => p.slug === "home")?.rootComponent.children?.[0];
    expect(node).toBeDefined();
    expect("visibility" in (node as object)).toBe(false);
  });

  it("removeComponent drops the node and clears selectedComponentId if it was selected", () => {
    useEditorStore.getState().enterElementEditMode("cmp_h1");
    useEditorStore.getState().removeComponent("cmp_h1");
    const s = useEditorStore.getState();
    expect(s.selectedComponentId).toBeNull();
    expect(s.saveState).toBe("dirty");
    const home = s.draftConfig.pages.find((p) => p.slug === "home");
    expect(home?.rootComponent.children).toEqual([]);
  });

  it("removeComponent leaves selectedComponentId untouched when a different node is removed", () => {
    // Add a sibling and select cmp_h1; remove the sibling.
    useEditorStore.getState().setComponentProps("cmp_root", {});
    useEditorStore.getState().selectComponent("cmp_h1");
    // The fixture has only cmp_h1 inside the root; nothing else to remove cleanly here.
    // Instead, verify the inverse: removing a non-selected leaf does not touch selection.
    useEditorStore.getState().selectComponent("cmp_root");
    expect(useEditorStore.getState().selectedComponentId).toBe("cmp_root");
    useEditorStore.getState().removeComponent("cmp_h1");
    expect(useEditorStore.getState().selectedComponentId).toBe("cmp_root");
  });
});
