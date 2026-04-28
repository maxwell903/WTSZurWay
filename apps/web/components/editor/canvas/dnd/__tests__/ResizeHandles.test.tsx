// Resize tests — post-2026-04-28 redesign.
//
// All width and height writes are now in PIXELS (no percent, no Column.span
// 1–12 grid from drag). The right-edge handle writes `${px}px` directly via
// `setComponentDimension(id, "width", …)`. Same for the corner handle's
// width arm. The Column.span fallback still exists in `Column/index.tsx` for
// Columns without an explicit width, but drag never writes span anymore.
//
// `isResizableOnAxis` returns true for every ComponentType on both axes.
// Pixel snap: 8-px multiples; min 8 px; min 0 px for Spacer height. Holding
// Shift escapes the snap (free 1-px).

import { ResizeHandles, isResizableOnAxis } from "@/components/editor/canvas/dnd/ResizeHandles";
import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import { COMPONENT_TYPES } from "@/lib/site-config";
import type { SiteConfig } from "@/lib/site-config";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("isResizableOnAxis", () => {
  for (const type of COMPONENT_TYPES) {
    if (type === "FlowGroup") continue;
    it(`${type} is resizable on width`, () => {
      expect(isResizableOnAxis(type, "width")).toBe(true);
    });
    it(`${type} is resizable on height`, () => {
      expect(isResizableOnAxis(type, "height")).toBe(true);
    });
  }

  it("FlowGroup is resizable on both axes", () => {
    expect(isResizableOnAxis("FlowGroup", "width")).toBe(true);
    expect(isResizableOnAxis("FlowGroup", "height")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 2.2 — RightEdgeHandle branching: Column span-snap vs free-percent
// ---------------------------------------------------------------------------
//
// Strategy: hydrate the store, plant data-edit-id elements in jsdom for the
// selected component and its parent, select the component so ResizeHandles
// renders a right-edge handle, then fire pointerdown + pointerup on the
// handle and inspect the store.

function makeFixture(): SiteConfig {
  return {
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
        kind: "static",
        rootComponent: {
          id: "cmp_root",
          type: "Section",
          props: {},
          style: {},
          children: [
            // Column inside a Row parent (for Column snap tests)
            {
              id: "cmp_row",
              type: "Row",
              props: {},
              style: {},
              children: [
                {
                  id: "cmp_col",
                  type: "Column",
                  props: { span: 6 },
                  style: {},
                  children: [],
                },
              ],
            },
            // Heading inside a Section (for free-percent tests)
            {
              id: "cmp_sec",
              type: "Section",
              props: {},
              style: {},
              children: [
                {
                  id: "cmp_heading",
                  type: "Heading",
                  props: { text: "Hello" },
                  style: {},
                  children: [],
                },
                {
                  id: "cmp_spacer",
                  type: "Spacer",
                  props: { height: 32 },
                  style: {},
                  children: [],
                },
              ],
            },
          ],
        },
      },
    ],
    forms: [],
  };
}

// Plant a fake DOM element with data-edit-id so ResizeHandles can find rects.
function plantElement(id: string, rect: Partial<DOMRect>): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("data-edit-id", id);
  el.getBoundingClientRect = () =>
    ({
      top: 0,
      left: 0,
      width: 200,
      height: 50,
      right: 200,
      bottom: 50,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...rect,
    }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

// jsdom does not expose PointerEvent as a global. Use MouseEvent constructor
// (which accepts clientX/shiftKey in the EventInit dict) to build events whose
// read-only properties are correctly set. The handler only reads ev.clientX and
// e.shiftKey, so a MouseEvent is a sufficient stand-in.
function dispatchPointerDown(
  target: Element,
  opts: { clientX?: number; clientY?: number; shiftKey?: boolean } = {},
): void {
  target.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true, ...opts }));
}

function dispatchPointerUp(clientX: number): void {
  window.dispatchEvent(new MouseEvent("pointerup", { clientX, bubbles: true }));
}

function dispatchPointerUpXY(clientX: number, clientY: number): void {
  window.dispatchEvent(new MouseEvent("pointerup", { clientX, clientY, bubbles: true }));
}

describe("RightEdgeHandle — pixel-mode width writes", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "test",
      workingVersionId: "v",
      initialConfig: makeFixture(),
    });
  });

  afterEach(() => {
    // Remove all data-edit-id sentinels planted during the test.
    for (const el of document.querySelectorAll("[data-edit-id]")) {
      el.parentNode?.removeChild(el);
    }
  });

  it("Heading right-drag writes a pixel width to style.width", () => {
    // Heading starts 200px wide; drag from clientX=200 to clientX=300 →
    // delta +100 → new width 300px → snapped to 8 → 304px (300/8 = 37.5 → 304).
    plantElement("cmp_sec", { left: 0, width: 400 });
    plantElement("cmp_heading", { left: 0, top: 0, width: 200, height: 50 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_heading");
    });

    const { getByTestId } = render(<ResizeHandles />);
    const handle = getByTestId("resize-handle-right-cmp_heading");

    act(() => {
      dispatchPointerDown(handle, { clientX: 200, clientY: 25 });
    });
    act(() => {
      dispatchPointerUp(300);
    });

    const state = useEditorStore.getState();
    const page = state.draftConfig.pages[0];
    const sec = page?.rootComponent.children?.find((c) => c.id === "cmp_sec");
    const heading = sec?.children?.find((c) => c.id === "cmp_heading");
    expect(heading?.style.width).toMatch(/^\d+px$/);
  });

  it("Column right-drag writes a pixel width (no longer Column.span)", () => {
    // Column starts 200px wide; drag from clientX=200 to clientX=300 → +100px → snapped.
    // Verify pixel write AND that Column.span is unchanged from its hydrated default.
    plantElement("cmp_row", { left: 0, width: 400 });
    plantElement("cmp_col", { left: 0, top: 0, width: 200, height: 50 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_col");
    });

    const initialSpan = (
      useEditorStore
        .getState()
        .draftConfig.pages[0]?.rootComponent.children?.find((c) => c.id === "cmp_row")
        ?.children?.find((c) => c.id === "cmp_col")?.props as { span?: number }
    ).span;

    const { getByTestId } = render(<ResizeHandles />);
    const handle = getByTestId("resize-handle-right-cmp_col");

    act(() => {
      dispatchPointerDown(handle, { clientX: 200, clientY: 25 });
    });
    act(() => {
      dispatchPointerUp(300);
    });

    const state = useEditorStore.getState();
    const page = state.draftConfig.pages[0];
    const row = page?.rootComponent.children?.find((c) => c.id === "cmp_row");
    const col = row?.children?.find((c) => c.id === "cmp_col");
    expect(col?.style.width).toMatch(/^\d+px$/);
    // span must NOT have been touched by the drag.
    expect((col?.props as { span?: number }).span).toBe(initialSpan);
  });

  it("right-drag with shiftKey escapes the 8-px snap", () => {
    // Drag delta = +5px; with snap, 200+5=205 rounds to 200 (or 208).
    // Without snap (Shift held), value should round to 205 exactly.
    plantElement("cmp_sec", { left: 0, width: 400 });
    plantElement("cmp_heading", { left: 0, top: 0, width: 200, height: 50 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_heading");
    });

    const { getByTestId } = render(<ResizeHandles />);
    const handle = getByTestId("resize-handle-right-cmp_heading");

    act(() => {
      dispatchPointerDown(handle, { clientX: 200, clientY: 25, shiftKey: true });
    });
    act(() => {
      window.dispatchEvent(
        new MouseEvent("pointerup", { clientX: 205, bubbles: true, shiftKey: true }),
      );
    });

    const state = useEditorStore.getState();
    const page = state.draftConfig.pages[0];
    const sec = page?.rootComponent.children?.find((c) => c.id === "cmp_sec");
    const heading = sec?.children?.find((c) => c.id === "cmp_heading");
    expect(heading?.style.width).toBe("205px");
  });
});

// ---------------------------------------------------------------------------
// Task 2.3 — CornerHandle: two-axis resize (width % + height px)
// ---------------------------------------------------------------------------

describe("CornerHandle — Task 2.3 two-axis resize", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "test",
      workingVersionId: "v",
      initialConfig: makeFixture(),
    });
  });

  afterEach(() => {
    for (const el of document.querySelectorAll("[data-edit-id]")) {
      el.parentNode?.removeChild(el);
    }
  });

  it("renders for a Heading (both axes resizable)", () => {
    plantElement("cmp_sec", { left: 0, width: 600, height: 800 });
    plantElement("cmp_heading", { left: 0, top: 0, width: 200, height: 50 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_heading");
    });

    render(<ResizeHandles />);

    expect(document.querySelector(`[data-testid^="resize-handle-corner-"]`)).not.toBeNull();
  });

  it("writes both width AND height in pixels in a single drag", () => {
    // Heading starts 100x100. pointerDown at (100, 100), pointerUp at (200, 200) →
    // delta +100 right, +100 down → expect width ≈ 200px and height ≈ 200px (8-px snap).
    plantElement("cmp_sec", { left: 0, top: 0, width: 600, height: 800 });
    plantElement("cmp_heading", { left: 0, top: 0, width: 100, height: 100 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_heading");
    });

    const { getByTestId } = render(<ResizeHandles />);
    const handle = getByTestId("resize-handle-corner-cmp_heading");

    act(() => {
      dispatchPointerDown(handle, { clientX: 100, clientY: 100 });
    });
    act(() => {
      dispatchPointerUpXY(200, 200);
    });

    const state = useEditorStore.getState();
    const page = state.draftConfig.pages[0];
    const sec = page?.rootComponent.children?.find((c) => c.id === "cmp_sec");
    const heading = sec?.children?.find((c) => c.id === "cmp_heading");
    expect(heading?.style.width).toMatch(/^\d+px$/);
    expect(heading?.style.height).toMatch(/^\d+px$/);
  });

  it("does NOT write style.height for a Spacer (height skipped; setComponentDimension rejects Spacer)", () => {
    // Spacer height lives in props.height, not style.height.
    // Corner handle skips the height write for Spacer entirely (node.type !== 'Spacer' guard).
    // style.width is also not written: applySetComponentDimension rejects any Spacer node
    // (the action layer guards the whole type, not just the height axis). Both writes are
    // silently no-oped via the catch block — Spacer style remains unchanged after a corner drag.
    plantElement("cmp_sec", { left: 0, top: 0, width: 600, height: 800 });
    plantElement("cmp_spacer", { left: 0, top: 0, width: 100, height: 32 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_spacer");
    });

    const { getByTestId } = render(<ResizeHandles />);
    const handle = getByTestId("resize-handle-corner-cmp_spacer");

    act(() => {
      dispatchPointerDown(handle, { clientX: 100, clientY: 32 });
    });
    act(() => {
      dispatchPointerUpXY(200, 132);
    });

    const state = useEditorStore.getState();
    const page = state.draftConfig.pages[0];
    const sec = page?.rootComponent.children?.find((c) => c.id === "cmp_sec");
    const spacer = sec?.children?.find((c) => c.id === "cmp_spacer");
    // The action layer rejects setComponentDimension for Spacer (any axis),
    // so style remains untouched after a corner drag.
    expect(spacer?.style.width).toBeUndefined();
    expect(spacer?.style.height).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Action-layer wiring: pixel writes go through plain setComponentDimension
// ---------------------------------------------------------------------------
//
// The post-2026-04-28 redesign drops the percent-aware
// `setComponentDimensionWithCascade` path from drag (it's still in the store
// for AI/programmatic use). Both right-edge and corner handles now write
// directly via `setComponentDimension(id, axis, "${px}px")`.

describe("RightEdgeHandle — action wiring", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "test",
      workingVersionId: "v",
      initialConfig: makeFixture(),
    });
  });

  afterEach(() => {
    for (const el of document.querySelectorAll("[data-edit-id]")) {
      el.parentNode?.removeChild(el);
    }
    vi.restoreAllMocks();
  });

  it("calls setComponentDimension with a px string for width", () => {
    plantElement("cmp_sec", { left: 0, width: 400 });
    plantElement("cmp_heading", { left: 0, top: 0, width: 200, height: 50 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_heading");
    });

    const dimSpy = vi.spyOn(useEditorStore.getState(), "setComponentDimension");

    const { getByTestId } = render(<ResizeHandles />);
    const handle = getByTestId("resize-handle-right-cmp_heading");

    act(() => {
      dispatchPointerDown(handle, { clientX: 200, clientY: 25 });
    });
    act(() => {
      dispatchPointerUp(300);
    });

    expect(dimSpy).toHaveBeenCalledWith("cmp_heading", "width", expect.stringMatching(/^\d+px$/));
  });
});

describe("CornerHandle — action wiring", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "test",
      workingVersionId: "v",
      initialConfig: makeFixture(),
    });
  });

  afterEach(() => {
    for (const el of document.querySelectorAll("[data-edit-id]")) {
      el.parentNode?.removeChild(el);
    }
    vi.restoreAllMocks();
  });

  it("calls setComponentDimension with px strings for both width and height", () => {
    plantElement("cmp_sec", { left: 0, top: 0, width: 600, height: 800 });
    plantElement("cmp_heading", { left: 0, top: 0, width: 100, height: 100 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_heading");
    });

    const dimSpy = vi.spyOn(useEditorStore.getState(), "setComponentDimension");

    const { getByTestId } = render(<ResizeHandles />);
    const handle = getByTestId("resize-handle-corner-cmp_heading");

    act(() => {
      dispatchPointerDown(handle, { clientX: 100, clientY: 100 });
    });
    act(() => {
      dispatchPointerUpXY(200, 200);
    });

    expect(dimSpy).toHaveBeenCalledWith("cmp_heading", "width", expect.stringMatching(/^\d+px$/));
    expect(dimSpy).toHaveBeenCalledWith("cmp_heading", "height", expect.stringMatching(/^\d+px$/));
  });
});

// ---------------------------------------------------------------------------
// Drag-past-parent-edge — pixel writes are unclamped
// ---------------------------------------------------------------------------
//
// Fixture: a Section parent 600px wide with one selected Heading child. Post
// 2026-04-28 redesign, drag does NOT cap the written width to the parent's
// remaining space — the chosen pixel value is honoured literally; the
// "Bounded by parent" tooltip arms instead. These tests verify the pixel
// write reaches the store even when the cursor passes the parent's edge.

function makeClampFixture(): SiteConfig {
  return {
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
        kind: "static",
        rootComponent: {
          id: "cmp_root",
          type: "Section",
          props: {},
          style: {},
          children: [
            {
              id: "cmp_parent",
              type: "Section",
              props: {},
              style: {},
              children: [
                {
                  // sibling consuming 80% of parent
                  id: "cmp_sibling",
                  type: "Heading",
                  props: { text: "Sibling" },
                  style: { width: "80%" },
                  children: [],
                },
                {
                  // selected child with no explicit width — max allowed = 20%
                  id: "cmp_child",
                  type: "Heading",
                  props: { text: "Child" },
                  style: {},
                  children: [],
                },
              ],
            },
          ],
        },
      },
    ],
    forms: [],
  };
}

// Post-redesign: drag does NOT clamp width to parent's available space.
// The user's chosen width is honoured as a literal pixel value; if it
// exceeds the parent, the parent's overflow rules take over visually and a
// "Bounded by parent" tooltip arms (tooltip behaviour is verified separately
// in BoundedByParentTooltip.test.tsx). These tests just confirm the write
// happens at all when the cursor goes past the parent's edge.

describe("RightEdgeHandle — drag past parent edge writes literal px", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "test",
      workingVersionId: "v",
      initialConfig: makeClampFixture(),
    });
  });

  afterEach(() => {
    for (const el of document.querySelectorAll("[data-edit-id]")) {
      el.parentNode?.removeChild(el);
    }
  });

  it("writes a px width even when the cursor passes the parent's right edge", () => {
    plantElement("cmp_parent", { left: 0, width: 600 });
    plantElement("cmp_child", { left: 0, top: 0, width: 60, height: 50 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_child");
    });

    const { getByTestId } = render(<ResizeHandles />);
    const handle = getByTestId("resize-handle-right-cmp_child");

    act(() => {
      dispatchPointerDown(handle, { clientX: 60, clientY: 25 });
    });
    act(() => {
      dispatchPointerUp(570);
    });

    const state = useEditorStore.getState();
    const page = state.draftConfig.pages[0];
    const parent = page?.rootComponent.children?.find((c) => c.id === "cmp_parent");
    const child = parent?.children?.find((c) => c.id === "cmp_child");
    expect(child?.style.width).toMatch(/^\d+px$/);
  });
});

describe("CornerHandle — drag past parent edge writes literal px", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "test",
      workingVersionId: "v",
      initialConfig: makeClampFixture(),
    });
  });

  afterEach(() => {
    for (const el of document.querySelectorAll("[data-edit-id]")) {
      el.parentNode?.removeChild(el);
    }
  });

  it("writes a px width and px height even when corner passes parent's edges", () => {
    plantElement("cmp_parent", { left: 0, top: 0, width: 600, height: 800 });
    plantElement("cmp_child", { left: 0, top: 0, width: 60, height: 50 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_child");
    });

    const { getByTestId } = render(<ResizeHandles />);
    const handle = getByTestId("resize-handle-corner-cmp_child");

    act(() => {
      dispatchPointerDown(handle, { clientX: 60, clientY: 50 });
    });
    act(() => {
      dispatchPointerUpXY(570, 100);
    });

    const state = useEditorStore.getState();
    const page = state.draftConfig.pages[0];
    const parent = page?.rootComponent.children?.find((c) => c.id === "cmp_parent");
    const child = parent?.children?.find((c) => c.id === "cmp_child");
    expect(child?.style.width).toMatch(/^\d+px$/);
    expect(child?.style.height).toMatch(/^\d+px$/);
  });
});

// ---------------------------------------------------------------------------
// Live preview — width writes on pointermove (not just pointerup)
// ---------------------------------------------------------------------------
//
// After pointerdown + a single pointermove (no pointerup), the store must
// already hold a style.width value. jsdom's rAF fires asynchronously so we
// use waitFor to let the animation frame flush before asserting.

describe("RightEdgeHandle live preview during drag", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "test",
      workingVersionId: "v",
      initialConfig: makeFixture(),
    });
  });

  afterEach(() => {
    for (const el of document.querySelectorAll("[data-edit-id]")) {
      el.parentNode?.removeChild(el);
    }
    vi.restoreAllMocks();
    // Clean up any lingering pointermove/pointerup listeners from a failed test.
    window.dispatchEvent(new MouseEvent("pointerup", { clientX: 0, bubbles: true }));
  });

  it("writes width on pointermove (not just pointerup)", async () => {
    // Stub requestAnimationFrame to be synchronous so the rAF callback fires
    // immediately without waiting for the next paint tick in jsdom.
    let rafCallback: FrameRequestCallback | null = null;
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
      rafCallback = null;
    });

    // Parent section: 0..400px. Move to x=300 → fraction=0.75 → snapped to 75%.
    plantElement("cmp_sec", { left: 0, width: 400 });
    plantElement("cmp_heading", { left: 0, top: 0, width: 200, height: 50 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_heading");
    });

    const { getByTestId } = render(<ResizeHandles />);
    const handle = getByTestId("resize-handle-right-cmp_heading");

    // Start the drag.
    act(() => {
      dispatchPointerDown(handle, { clientX: 200, clientY: 25 });
    });

    // Fire pointermove — no pointerup yet. The RAF stub captures the callback.
    act(() => {
      window.dispatchEvent(
        new MouseEvent("pointermove", { clientX: 300, clientY: 25, bubbles: true }),
      );
    });

    // Flush the captured rAF callback synchronously.
    act(() => {
      if (rafCallback) {
        rafCallback(performance.now());
        rafCallback = null;
      }
    });

    // Store should now have the live px width written via pointermove.
    const page = useEditorStore.getState().draftConfig.pages[0];
    const sec = page?.rootComponent.children?.find((c) => c.id === "cmp_sec");
    const heading = sec?.children?.find((c) => c.id === "cmp_heading");
    expect(heading?.style.width).toMatch(/^\d+px$/);

    // Clean up: release the drag so window listeners are removed.
    act(() => {
      dispatchPointerUp(300);
    });

    rafSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// LeftEdgeHandle — drags W edge; width grows inversely; margin-left
// compensates so the right edge stays anchored.
// ---------------------------------------------------------------------------

describe("LeftEdgeHandle — anchored W-edge resize", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "test",
      workingVersionId: "v",
      initialConfig: makeFixture(),
    });
  });

  afterEach(() => {
    for (const el of document.querySelectorAll("[data-edit-id]")) {
      el.parentNode?.removeChild(el);
    }
  });

  it("renders a left-edge handle alongside the right-edge handle", () => {
    plantElement("cmp_sec", { left: 0, width: 400 });
    plantElement("cmp_heading", { left: 100, top: 0, width: 200, height: 50 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_heading");
    });

    const { getByTestId } = render(<ResizeHandles />);
    expect(getByTestId("resize-handle-left-cmp_heading")).toBeInTheDocument();
    expect(getByTestId("resize-handle-right-cmp_heading")).toBeInTheDocument();
  });

  it("dragging W edge LEFT grows width and writes a negative margin.left", () => {
    // Heading starts 200px wide at clientX=100..300. Drag left edge from
    // clientX=100 to clientX=50 → cursorDx=-50 → newWidth = 200-(-50) = 250
    // → snapped to 8 → 248. widthDelta = +48. marginLeft = 0 - 48 = -48.
    plantElement("cmp_sec", { left: 0, width: 400 });
    plantElement("cmp_heading", { left: 100, top: 0, width: 200, height: 50 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_heading");
    });

    const { getByTestId } = render(<ResizeHandles />);
    const handle = getByTestId("resize-handle-left-cmp_heading");

    act(() => {
      dispatchPointerDown(handle, { clientX: 100, clientY: 25 });
    });
    act(() => {
      dispatchPointerUp(50);
    });

    const state = useEditorStore.getState();
    const page = state.draftConfig.pages[0];
    const sec = page?.rootComponent.children?.find((c) => c.id === "cmp_sec");
    const heading = sec?.children?.find((c) => c.id === "cmp_heading");
    expect(heading?.style.width).toMatch(/^\d+px$/);
    const widthPx = Number.parseInt(heading?.style.width ?? "0", 10);
    expect(widthPx).toBeGreaterThan(200);
    // margin.left must be negative (the wrapper shifted left to keep the
    // right edge anchored).
    expect(heading?.style.margin?.left).toBeLessThan(0);
  });

  it("Esc cancels the drag without mutating style", () => {
    plantElement("cmp_sec", { left: 0, width: 400 });
    plantElement("cmp_heading", { left: 100, top: 0, width: 200, height: 50 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_heading");
    });

    const { getByTestId } = render(<ResizeHandles />);
    const handle = getByTestId("resize-handle-left-cmp_heading");

    act(() => {
      dispatchPointerDown(handle, { clientX: 100, clientY: 25 });
    });
    // No pointermove + Esc cancels before any write.
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    const state = useEditorStore.getState();
    const page = state.draftConfig.pages[0];
    const sec = page?.rootComponent.children?.find((c) => c.id === "cmp_sec");
    const heading = sec?.children?.find((c) => c.id === "cmp_heading");
    expect(heading?.style.width).toBeUndefined();
    expect(heading?.style.margin).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// TopEdgeHandle — drags N edge; height grows inversely; margin-top
// compensates so the bottom edge stays anchored. Spacer skipped (height in
// props, not style).
// ---------------------------------------------------------------------------

describe("TopEdgeHandle — anchored N-edge resize", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
    useEditorStore.getState().hydrate({
      siteId: "s",
      siteSlug: "test",
      workingVersionId: "v",
      initialConfig: makeFixture(),
    });
  });

  afterEach(() => {
    for (const el of document.querySelectorAll("[data-edit-id]")) {
      el.parentNode?.removeChild(el);
    }
  });

  it("renders for a Heading", () => {
    plantElement("cmp_sec", { left: 0, top: 0, width: 400, height: 600 });
    plantElement("cmp_heading", { left: 0, top: 100, width: 200, height: 50 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_heading");
    });

    const { getByTestId } = render(<ResizeHandles />);
    expect(getByTestId("resize-handle-top-cmp_heading")).toBeInTheDocument();
  });

  it("does NOT render for Spacer (height lives in props, not style)", () => {
    plantElement("cmp_sec", { left: 0, top: 0, width: 400, height: 600 });
    plantElement("cmp_spacer", { left: 0, top: 100, width: 200, height: 32 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_spacer");
    });

    const { queryByTestId } = render(<ResizeHandles />);
    expect(queryByTestId("resize-handle-top-cmp_spacer")).toBeNull();
  });

  it("dragging N edge UP grows height and writes a negative margin.top", () => {
    // Heading at top=100, height=50. Drag from clientY=100 to clientY=50 →
    // cursorDy=-50 → newHeight = 50-(-50) = 100 → snapped to 8 → 104 (or 96
    // depending on exact rounding; min boundary 8).
    plantElement("cmp_sec", { left: 0, top: 0, width: 400, height: 600 });
    plantElement("cmp_heading", { left: 0, top: 100, width: 200, height: 50 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_heading");
    });

    const { getByTestId } = render(<ResizeHandles />);
    const handle = getByTestId("resize-handle-top-cmp_heading");

    act(() => {
      dispatchPointerDown(handle, { clientX: 100, clientY: 100 });
    });
    act(() => {
      window.dispatchEvent(
        new MouseEvent("pointerup", { clientX: 100, clientY: 50, bubbles: true }),
      );
    });

    const state = useEditorStore.getState();
    const page = state.draftConfig.pages[0];
    const sec = page?.rootComponent.children?.find((c) => c.id === "cmp_sec");
    const heading = sec?.children?.find((c) => c.id === "cmp_heading");
    expect(heading?.style.height).toMatch(/^\d+px$/);
    const heightPx = Number.parseInt(heading?.style.height ?? "0", 10);
    expect(heightPx).toBeGreaterThan(50);
    expect(heading?.style.margin?.top).toBeLessThan(0);
  });
});
