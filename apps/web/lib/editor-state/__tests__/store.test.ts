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

describe("setComponentDimensionWithCascade", () => {
  it("flips saveState to dirty and clamps descendant px-widths", () => {
    __resetEditorStoreForTests();
    // Build a fixture: root > "p" Section width 600px > "h" Heading width 500px
    const initialConfig: SiteConfig = {
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
          kind: "static" as const,
          rootComponent: {
            id: "cmp_root",
            type: "Section" as const,
            props: {},
            style: {},
            children: [
              {
                id: "p",
                type: "Section" as const,
                props: {},
                style: { width: "600px" },
                children: [
                  {
                    id: "h",
                    type: "Heading" as const,
                    props: {},
                    style: { width: "500px" },
                  },
                ],
              },
            ],
          },
        },
      ],
      forms: [],
    };
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "x",
      workingVersionId: "v",
      initialConfig,
    });

    useEditorStore.getState().setComponentDimensionWithCascade("p", "width", "400px");

    const state = useEditorStore.getState();
    expect(state.saveState).toBe("dirty");
    const p = state.draftConfig.pages[0]?.rootComponent.children?.[0];
    const h = p?.children?.[0];
    expect(p?.style.width).toBe("400px");
    expect(h?.style.width).toBe("400px"); // clamped
  });
});

// ---------------------------------------------------------------------------
// Sprint 7 -- drag-and-drop and resize action wrappers
// ---------------------------------------------------------------------------

function makeDndFixtureConfig(): SiteConfig {
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
              id: "cmp_secA",
              type: "Section",
              props: {},
              style: {},
              children: [
                { id: "cmp_h1", type: "Heading", props: {}, style: {} },
                { id: "cmp_h2", type: "Heading", props: {}, style: {} },
              ],
            },
            {
              id: "cmp_secB",
              type: "Section",
              props: {},
              style: {},
              children: [],
            },
            {
              id: "cmp_col1",
              type: "Column",
              props: { span: 12 },
              style: {},
              children: [],
            },
            {
              id: "cmp_sp",
              type: "Spacer",
              props: { height: 40 },
              style: {},
            },
          ],
        },
      },
    ],
    forms: [],
  };
}

describe("editor store -- Sprint 7 dnd action wrappers", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "x",
      workingVersionId: "v",
      initialConfig: makeDndFixtureConfig(),
    });
  });

  it("addComponentChild inserts a node, sets selection to the new id, and flips saveState to dirty", () => {
    const newNode = {
      id: "cmp_new",
      type: "Heading" as const,
      props: { text: "x" },
      style: {},
    };
    useEditorStore.getState().addComponentChild("cmp_secB", 0, newNode);
    const s = useEditorStore.getState();
    expect(s.saveState).toBe("dirty");
    expect(s.selectedComponentId).toBe("cmp_new");
    const sec = s.draftConfig.pages[0]?.rootComponent.children?.find((c) => c.id === "cmp_secB");
    expect(sec?.children?.[0]?.id).toBe("cmp_new");
  });

  it("addComponentChild on an unknown parent throws and leaves the store unchanged", () => {
    const before = useEditorStore.getState().draftConfig;
    expect(() =>
      useEditorStore.getState().addComponentChild("cmp_missing", 0, {
        id: "cmp_new",
        type: "Heading",
        props: {},
        style: {},
      }),
    ).toThrow();
    expect(useEditorStore.getState().draftConfig).toBe(before);
  });

  it("moveComponent moves a node across parents and preserves selection on the moved node", () => {
    useEditorStore.getState().selectComponent("cmp_h1");
    useEditorStore.getState().moveComponent("cmp_h1", "cmp_secB", 0);
    const s = useEditorStore.getState();
    expect(s.selectedComponentId).toBe("cmp_h1");
    expect(s.saveState).toBe("dirty");
    const secB = s.draftConfig.pages[0]?.rootComponent.children?.find((c) => c.id === "cmp_secB");
    expect(secB?.children?.[0]?.id).toBe("cmp_h1");
  });

  it("moveComponent rejects a self-descendant move and leaves the store unchanged", () => {
    const before = useEditorStore.getState().draftConfig;
    expect(() => useEditorStore.getState().moveComponent("cmp_secA", "cmp_secA", 0)).toThrow();
    expect(useEditorStore.getState().draftConfig).toBe(before);
  });

  it("reorderChildren reorders within a parent and flips saveState to dirty", () => {
    useEditorStore.getState().reorderChildren("cmp_secA", ["cmp_h2", "cmp_h1"]);
    const s = useEditorStore.getState();
    expect(s.saveState).toBe("dirty");
    const secA = s.draftConfig.pages[0]?.rootComponent.children?.find((c) => c.id === "cmp_secA");
    expect(secA?.children?.map((c) => c.id)).toEqual(["cmp_h2", "cmp_h1"]);
  });

  it("setComponentSpan updates Column.props.span and flips saveState to dirty", () => {
    useEditorStore.getState().setComponentSpan("cmp_col1", 6);
    const s = useEditorStore.getState();
    expect(s.saveState).toBe("dirty");
    const col = s.draftConfig.pages[0]?.rootComponent.children?.find((c) => c.id === "cmp_col1");
    expect(col?.props.span).toBe(6);
  });

  it("setComponentSpan throws invalid_resize_target on a non-Column", () => {
    expect(() => useEditorStore.getState().setComponentSpan("cmp_h1", 6)).toThrow();
  });

  it("setComponentDimension('height') writes to style.height and flips saveState to dirty", () => {
    useEditorStore.getState().setComponentDimension("cmp_secA", "height", "240px");
    const s = useEditorStore.getState();
    expect(s.saveState).toBe("dirty");
    const sec = s.draftConfig.pages[0]?.rootComponent.children?.find((c) => c.id === "cmp_secA");
    expect(sec?.style.height).toBe("240px");
  });

  it("setComponentDimension(undefined) clears the field (revert to auto)", () => {
    useEditorStore.getState().setComponentDimension("cmp_secA", "height", "240px");
    useEditorStore.getState().setComponentDimension("cmp_secA", "height", undefined);
    const s = useEditorStore.getState();
    const sec = s.draftConfig.pages[0]?.rootComponent.children?.find((c) => c.id === "cmp_secA");
    expect(sec?.style.height).toBeUndefined();
  });

  it("setComponentDimension throws invalid_resize_target on Spacer (height is a prop, not a style)", () => {
    expect(() =>
      useEditorStore.getState().setComponentDimension("cmp_sp", "height", "80px"),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Phase 5 Task 5.4 -- wrapInFlowGroup and wrapInFlowGroupMove store actions
// ---------------------------------------------------------------------------

describe("wrapInFlowGroup store action (Task 5.4)", () => {
  it("flips dirty AND selects the new sibling", () => {
    __resetEditorStoreForTests();
    const initialConfig: SiteConfig = {
      meta: { siteName: "Test", siteSlug: "test" },
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
          kind: "static" as const,
          rootComponent: {
            id: "cmp_root",
            type: "Section" as const,
            props: {},
            style: {},
            children: [{ id: "a", type: "Section" as const, props: {}, style: {}, children: [] }],
          },
        },
      ],
      forms: [],
    };
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "x",
      workingVersionId: "v",
      initialConfig,
    });

    const newSibling = { id: "n", type: "Heading" as const, props: {}, style: {} };
    useEditorStore.getState().wrapInFlowGroup("a", newSibling, "right");

    const state = useEditorStore.getState();
    expect(state.saveState).toBe("dirty");
    expect(state.selectedComponentId).toBe("n");
    const fg = state.draftConfig.pages[0]?.rootComponent.children?.[0];
    expect(fg?.type).toBe("FlowGroup");
    expect(fg?.children?.map((c) => c.id)).toEqual(["a", "n"]);
  });
});

// Sprint 11 — AI Edit Accept folds the proposed Operation[] into draftConfig.
describe("editor store -- Sprint 11 commitAiEditOperations", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "x",
      workingVersionId: "v",
      initialConfig: makeFixtureConfig(),
    });
  });

  it("applies a batch of valid operations and flips saveState to dirty", () => {
    useEditorStore.getState().commitAiEditOperations([
      { type: "setText", targetId: "cmp_h1", text: "Hello" },
      {
        type: "setSiteSetting",
        path: "meta.siteName",
        value: "New Name",
      },
    ]);
    const s = useEditorStore.getState();
    expect(s.saveState).toBe("dirty");
    expect(s.saveError).toBeNull();
    expect(s.draftConfig.meta.siteName).toBe("New Name");
    const heading = s.draftConfig.pages[0]?.rootComponent.children?.find((c) => c.id === "cmp_h1");
    expect(heading?.props.text).toBe("Hello");
  });

  it("on OperationInvalidError, flips saveState to error and writes saveError without mutating draftConfig", () => {
    const before = useEditorStore.getState().draftConfig;
    useEditorStore.getState().commitAiEditOperations([
      // setText on a Section is invalid -- only Heading/Paragraph/Button.
      { type: "setText", targetId: "cmp_root", text: "boom" },
    ]);
    const s = useEditorStore.getState();
    expect(s.saveState).toBe("error");
    expect(s.saveError).toContain("setText only applies");
    expect(s.draftConfig).toBe(before);
  });

  it("clears any prior saveError on a successful commit", () => {
    // Force an error first.
    useEditorStore
      .getState()
      .commitAiEditOperations([{ type: "setText", targetId: "cmp_root", text: "boom" }]);
    expect(useEditorStore.getState().saveError).not.toBeNull();
    // Now apply a valid op.
    useEditorStore
      .getState()
      .commitAiEditOperations([{ type: "setText", targetId: "cmp_h1", text: "ok" }]);
    expect(useEditorStore.getState().saveError).toBeNull();
    expect(useEditorStore.getState().saveState).toBe("dirty");
  });
});

// ---------------------------------------------------------------------------
// Phase 6 Task 6.1 -- showComponentTypes toggle
// ---------------------------------------------------------------------------

describe("showComponentTypes toggle (X-ray mode)", () => {
  // Default flipped to false on the 2026-04-27 evening
  // progressive-disclosure pivot — see DECISIONS.md.
  it("defaults to false", () => {
    __resetEditorStoreForTests();
    expect(useEditorStore.getState().showComponentTypes).toBe(false);
  });

  it("toggles between false and true", () => {
    __resetEditorStoreForTests();
    useEditorStore.getState().toggleShowComponentTypes();
    expect(useEditorStore.getState().showComponentTypes).toBe(true);
    useEditorStore.getState().toggleShowComponentTypes();
    expect(useEditorStore.getState().showComponentTypes).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Sprint 13 -- first-NavBar auto-populate via addComponentChild
// ---------------------------------------------------------------------------

function makeMultiPageConfig(): SiteConfig {
  return {
    meta: { siteName: "Multi", siteSlug: "multi" },
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
        rootComponent: { id: "cmp_root_home", type: "Section", props: {}, style: {}, children: [] },
      },
      {
        id: "p_about",
        slug: "about",
        name: "About",
        kind: "static",
        rootComponent: {
          id: "cmp_root_about",
          type: "Section",
          props: {},
          style: {},
          children: [],
        },
      },
      {
        id: "p_contact",
        slug: "contact",
        name: "Contact",
        kind: "static",
        rootComponent: {
          id: "cmp_root_contact",
          type: "Section",
          props: {},
          style: {},
          children: [],
        },
      },
    ],
    forms: [],
  };
}

describe("addComponentChild auto-populates the first NavBar with all static pages", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "site-1",
      siteSlug: "multi",
      workingVersionId: "v1",
      initialConfig: makeMultiPageConfig(),
    });
  });

  it("seeds links with one page entry per static page when the site has no NavBar yet", () => {
    useEditorStore.getState().addComponentChild("cmp_root_home", 0, {
      id: "cmp_nav1",
      type: "NavBar",
      props: { links: [], logoPlacement: "left", sticky: false },
      style: {},
    });
    const home = useEditorStore.getState().draftConfig.pages.find((p) => p.slug === "home");
    const nav = home?.rootComponent.children?.[0];
    expect(nav?.type).toBe("NavBar");
    expect(nav?.props.links).toEqual([
      { kind: "page", pageSlug: "home", label: "Home" },
      { kind: "page", pageSlug: "about", label: "About" },
      { kind: "page", pageSlug: "contact", label: "Contact" },
    ]);
  });

  it("does NOT auto-populate a second NavBar after the first exists", () => {
    useEditorStore.getState().addComponentChild("cmp_root_home", 0, {
      id: "cmp_nav1",
      type: "NavBar",
      props: { links: [], logoPlacement: "left", sticky: false },
      style: {},
    });
    // 2026-04-28 (rich-text Phase 1, §15.9 retroactive fix): the global
    // NavBar lock defaults to ON, so without this line a second NavBar
    // inherits the first's (auto-populated) links via lock-replication —
    // not via the auto-populate path this test is meant to exercise.
    // Disabling the lock isolates the auto-populate behavior under test.
    useEditorStore.getState().setGlobalNavBarLocked(false);
    useEditorStore.getState().addComponentChild("cmp_root_about", 0, {
      id: "cmp_nav2",
      type: "NavBar",
      props: { links: [], logoPlacement: "left", sticky: false },
      style: {},
    });
    const about = useEditorStore.getState().draftConfig.pages.find((p) => p.slug === "about");
    const nav2 = about?.rootComponent.children?.[0];
    expect(nav2?.type).toBe("NavBar");
    expect(nav2?.props.links).toEqual([]);
  });

  it("leaves non-NavBar components unchanged on insert", () => {
    useEditorStore.getState().addComponentChild("cmp_root_home", 0, {
      id: "cmp_h",
      type: "Heading",
      props: { text: "Hi" },
      style: {},
    });
    const home = useEditorStore.getState().draftConfig.pages.find((p) => p.slug === "home");
    const node = home?.rootComponent.children?.[0];
    expect(node?.type).toBe("Heading");
    expect(node?.props).toEqual({ text: "Hi" });
  });
});

// ---------------------------------------------------------------------------
// Sprint 13 -- locked NavBar replication via store actions
// ---------------------------------------------------------------------------

describe("locked NavBar replication: setComponentProps + setComponentStyle propagate", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "site-1",
      siteSlug: "multi",
      workingVersionId: "v1",
      initialConfig: makeMultiPageConfig(),
    });
    // Drop a NavBar on home (auto-populates + becomes the canonical).
    useEditorStore.getState().addComponentChild("cmp_root_home", 0, {
      id: "nav_a",
      type: "NavBar",
      props: { links: [], logoPlacement: "left", sticky: false },
      style: {},
    });
    // Drop another NavBar on about; addComponentChild should adopt locked content.
    useEditorStore.getState().addComponentChild("cmp_root_about", 0, {
      id: "nav_b",
      type: "NavBar",
      props: { links: [], logoPlacement: "left", sticky: false },
      style: {},
    });
  });

  it("the second NavBar adopts the canonical's links on insertion", () => {
    const about = useEditorStore.getState().draftConfig.pages.find((p) => p.slug === "about");
    const navB = about?.rootComponent.children?.[0];
    expect(navB?.id).toBe("nav_b");
    expect(navB?.props.links).toHaveLength(3);
  });

  it("setComponentProps on a locked NavBar replicates to all other locked NavBars", () => {
    useEditorStore.getState().setComponentProps("nav_a", {
      links: [],
      logoPlacement: "right",
      sticky: true,
    });
    const about = useEditorStore.getState().draftConfig.pages.find((p) => p.slug === "about");
    const navB = about?.rootComponent.children?.[0];
    expect(navB?.props).toMatchObject({ logoPlacement: "right", sticky: true });
  });

  it("setComponentStyle on a locked NavBar replicates style to siblings", () => {
    useEditorStore
      .getState()
      .setComponentStyle("nav_a", { background: { kind: "color", value: "#ff0" } });
    const about = useEditorStore.getState().draftConfig.pages.find((p) => p.slug === "about");
    const navB = about?.rootComponent.children?.[0];
    expect(navB?.style.background).toEqual({ kind: "color", value: "#ff0" });
  });

  it("setNavBarOverrideShared(true) opts out and stops replicating into that node", () => {
    useEditorStore.getState().setNavBarOverrideShared("nav_b", true);
    useEditorStore.getState().setComponentProps("nav_a", {
      links: [],
      logoPlacement: "center",
      sticky: false,
    });
    const about = useEditorStore.getState().draftConfig.pages.find((p) => p.slug === "about");
    const navB = about?.rootComponent.children?.[0];
    // logoPlacement on nav_b is whatever it was before override (not center).
    expect(navB?.props.logoPlacement).not.toBe("center");
    expect(navB?.props.overrideShared).toBe(true);
  });

  it("setNavBarOverrideShared(false) re-adopts content from another locked NavBar", () => {
    useEditorStore.getState().setNavBarOverrideShared("nav_b", true);
    useEditorStore.getState().setComponentProps("nav_a", {
      links: [],
      logoPlacement: "center",
      sticky: false,
    });
    useEditorStore.getState().setNavBarOverrideShared("nav_b", false);
    const about = useEditorStore.getState().draftConfig.pages.find((p) => p.slug === "about");
    const navB = about?.rootComponent.children?.[0];
    expect(navB?.props.logoPlacement).toBe("center");
    expect(navB?.props.overrideShared).toBe(false);
  });

  it("setGlobalNavBarLocked(false) stops sync, then setGlobalNavBarLocked(true) re-aligns", () => {
    useEditorStore.getState().setGlobalNavBarLocked(false);
    useEditorStore.getState().setComponentProps("nav_a", {
      links: [],
      logoPlacement: "right",
      sticky: false,
    });
    let about = useEditorStore.getState().draftConfig.pages.find((p) => p.slug === "about");
    let navB = about?.rootComponent.children?.[0];
    // With lock off, nav_b stays as it was.
    expect(navB?.props.logoPlacement).not.toBe("right");
    // Flip lock back on -- nav_b adopts the canonical's content.
    useEditorStore.getState().setGlobalNavBarLocked(true);
    about = useEditorStore.getState().draftConfig.pages.find((p) => p.slug === "about");
    navB = about?.rootComponent.children?.[0];
    expect(navB?.props.logoPlacement).toBe("right");
  });
});
