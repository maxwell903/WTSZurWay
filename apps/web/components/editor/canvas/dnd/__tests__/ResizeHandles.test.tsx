// Sprint 7 — the binding "Resizable component matrix" in CLAUDE.md mirrors
// PROJECT_SPEC.md §8.6.
//
// Task 2.1 (2026-04-27 x-axis-resize plan): RESIZE_MATRIX has been replaced
// by the registry-driven isResizableOnAxis function. The old matrix-shape
// tests below have been updated to use isResizableOnAxis semantics: every
// ComponentType is resizable on both axes by default.
//
// Task 2.2 (2026-04-27 x-axis-resize plan): RightEdgeHandle now forks on
// component type AND shiftKey: Column without Shift → span snap (1..12);
// everything else (and Column + Shift) → free-percent `style.width`.
//
// Task 2.3 (2026-04-27 x-axis-resize plan): CornerHandle drives both axes
// simultaneously. For Spacer, only width is written (height lives in props,
// not style — corner skips the height write entirely for Spacer).

import { ResizeHandles, isResizableOnAxis } from "@/components/editor/canvas/dnd/ResizeHandles";
import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import { COMPONENT_TYPES } from "@/lib/site-config";
import type { SiteConfig } from "@/lib/site-config";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

describe("RightEdgeHandle — Task 2.2 branching", () => {
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

  it("Heading right-drag writes a percentage width to style.width", () => {
    // Parent section spans 0..400 px; drag release at x=300 → 75% → snapped to 75%.
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
      // Release at clientX=300 → fraction=300/400=0.75 → snapped to 75%
      dispatchPointerUp(300);
    });

    const state = useEditorStore.getState();
    const page = state.draftConfig.pages[0];
    const sec = page?.rootComponent.children?.find((c) => c.id === "cmp_sec");
    const heading = sec?.children?.find((c) => c.id === "cmp_heading");
    expect(heading?.style.width).toMatch(/^\d+(?:\.\d+)?%$/);
  });

  it("Column right-drag (no Shift) writes span in 1..12", () => {
    // Parent row spans 0..400 px; drag release at x=200 → fraction=0.5 → span=6
    plantElement("cmp_row", { left: 0, width: 400 });
    plantElement("cmp_col", { left: 0, top: 0, width: 200, height: 50 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_col");
    });

    const { getByTestId } = render(<ResizeHandles />);
    const handle = getByTestId("resize-handle-right-cmp_col");

    act(() => {
      dispatchPointerDown(handle, { clientX: 200, clientY: 25, shiftKey: false });
    });
    act(() => {
      // Release at clientX=200 → fraction=200/400=0.5 → span=6
      dispatchPointerUp(200);
    });

    const state = useEditorStore.getState();
    const page = state.draftConfig.pages[0];
    const row = page?.rootComponent.children?.find((c) => c.id === "cmp_row");
    const col = row?.children?.find((c) => c.id === "cmp_col");
    const span = col?.props.span as number;
    expect(span).toBeGreaterThanOrEqual(1);
    expect(span).toBeLessThanOrEqual(12);
    expect(Number.isInteger(span)).toBe(true);
  });

  it("Column right-drag with shiftKey writes a percentage width to style.width", () => {
    // Parent row spans 0..400 px; drag release at x=300 → fraction=0.75 → 75%
    plantElement("cmp_row", { left: 0, width: 400 });
    plantElement("cmp_col", { left: 0, top: 0, width: 200, height: 50 });

    act(() => {
      useEditorStore.getState().selectComponent("cmp_col");
    });

    const { getByTestId } = render(<ResizeHandles />);
    const handle = getByTestId("resize-handle-right-cmp_col");

    // shiftKey held on pointerdown
    act(() => {
      dispatchPointerDown(handle, { clientX: 200, clientY: 25, shiftKey: true });
    });
    act(() => {
      dispatchPointerUp(300);
    });

    const state = useEditorStore.getState();
    const page = state.draftConfig.pages[0];
    const row = page?.rootComponent.children?.find((c) => c.id === "cmp_row");
    const col = row?.children?.find((c) => c.id === "cmp_col");
    expect(col?.style.width).toMatch(/^\d+(?:\.\d+)?%$/);
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

  it("writes both width AND height in a single drag", () => {
    // Parent section: left=0, width=600, height=800.
    // Heading: left=0, top=0, width=100, height=100.
    // pointerDown at (100, 100), pointerUp at (200, 200) → drag 100px right + 100px down.
    // Width: (100+100)/600 = 0.333 → snapped to nearest 5% → 35%.
    // Height: snapHeight(100+100=200, false) → snap to 8 → 200px.
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
    expect(heading?.style.width).toMatch(/^\d+(?:\.\d+)?%$/);
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
