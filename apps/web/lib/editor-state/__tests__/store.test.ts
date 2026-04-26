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
