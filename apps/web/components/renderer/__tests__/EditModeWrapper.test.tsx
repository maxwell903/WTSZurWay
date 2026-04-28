import { useNodeSortable } from "@/components/editor/canvas/dnd/SortableNodeContext";
import { __resetEditorStoreForTests } from "@/lib/editor-state/store";
import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditModeWrapper } from "../EditModeWrapper";

// Sprint 7 — the wrapper now consumes `useNodeSortable(id)`. The Sprint-5/6/8
// behavior must remain identical when the hook returns null (no provider in
// scope), and the wrapper must apply refs/listeners/attributes/transform when
// the hook returns dnd-kit's sortable state.
vi.mock("@/components/editor/canvas/dnd/SortableNodeContext", () => ({
  useNodeSortable: vi.fn(),
}));
const mockedUseNodeSortable = vi.mocked(useNodeSortable);

describe("<EditModeWrapper> — Sprint 5/6/8 behavior (no provider)", () => {
  beforeEach(() => {
    mockedUseNodeSortable.mockReturnValue(null);
    __resetEditorStoreForTests();
  });
  afterEach(() => {
    mockedUseNodeSortable.mockReset();
  });

  it("renders its children inside a div with data-edit-id", () => {
    const { getByText, container } = render(
      <EditModeWrapper id="cmp_x" type="Heading" mode="edit">
        <span>inner</span>
      </EditModeWrapper>,
    );
    expect(getByText("inner")).toBeInTheDocument();
    expect(container.querySelector("[data-edit-id='cmp_x']")).not.toBeNull();
  });

  it("marks itself selected when the selected prop is true", () => {
    const { container } = render(
      <EditModeWrapper id="cmp_x" type="Heading" mode="edit" selected>
        <span>x</span>
      </EditModeWrapper>,
    );
    expect(container.querySelector("[data-edit-selected='true']")).not.toBeNull();
  });

  it("invokes onSelect with the id on click", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <EditModeWrapper id="cmp_x" type="Heading" mode="edit" onSelect={onSelect}>
        <span>x</span>
      </EditModeWrapper>,
    );
    const wrapper = container.querySelector("[data-edit-id='cmp_x']");
    expect(wrapper).not.toBeNull();
    if (wrapper) {
      fireEvent.click(wrapper);
    }
    expect(onSelect).toHaveBeenCalledWith("cmp_x");
  });

  it("does not select when the click lands inside an <a> — anchor clicks bubble up to the canvas-level link interceptor", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <EditModeWrapper id="cmp_x" type="NavBar" mode="edit" onSelect={onSelect}>
        <a href="/about" data-internal-page-slug="about">
          <span>About</span>
        </a>
      </EditModeWrapper>,
    );
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    if (link) {
      fireEvent.click(link);
    }
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("invokes onContextMenu with the id and meta on right-click and prevents the default", () => {
    const onContextMenu = vi.fn();
    const { container } = render(
      <EditModeWrapper id="cmp_x" type="Heading" mode="edit" onContextMenu={onContextMenu}>
        <span>x</span>
      </EditModeWrapper>,
    );
    const wrapper = container.querySelector("[data-edit-id='cmp_x']");
    expect(wrapper).not.toBeNull();
    if (wrapper) {
      fireEvent.contextMenu(wrapper);
    }
    // Rich-text Phase 1 (2026-04-28) — onContextMenu now takes a meta object
    // with `isDouble`. A single right-click reports false.
    expect(onContextMenu).toHaveBeenCalledWith("cmp_x", { isDouble: false });
  });

  it("flags the second right-click on the same node within 400ms as a double", () => {
    const onContextMenu = vi.fn();
    const { container } = render(
      <EditModeWrapper id="cmp_x" type="Heading" mode="edit" onContextMenu={onContextMenu}>
        <span>x</span>
      </EditModeWrapper>,
    );
    const wrapper = container.querySelector("[data-edit-id='cmp_x']");
    if (!wrapper) return;
    fireEvent.contextMenu(wrapper);
    fireEvent.contextMenu(wrapper);
    expect(onContextMenu).toHaveBeenNthCalledWith(1, "cmp_x", { isDouble: false });
    expect(onContextMenu).toHaveBeenNthCalledWith(2, "cmp_x", { isDouble: true });
  });
});

describe("<EditModeWrapper> — Sprint 7 dnd-kit integration", () => {
  beforeEach(() => {
    __resetEditorStoreForTests();
  });
  afterEach(() => {
    mockedUseNodeSortable.mockReset();
  });

  it("applies setNodeRef from useNodeSortable when a provider is active", () => {
    const setNodeRef = vi.fn();
    mockedUseNodeSortable.mockReturnValue({
      setNodeRef,
      attributes: { "aria-roledescription": "sortable" },
      listeners: {},
      transform: null,
      transition: undefined,
      isDragging: false,
      // Extra dnd-kit fields ignored by the wrapper but typed by useSortable.
      // biome-ignore lint/suspicious/noExplicitAny: synthetic fixture for the mocked hook return shape.
    } as any);
    render(
      <EditModeWrapper id="cmp_x" type="Heading" mode="edit">
        <span>x</span>
      </EditModeWrapper>,
    );
    expect(setNodeRef).toHaveBeenCalled();
  });

  it("spreads sortable attributes onto the wrapper div", () => {
    mockedUseNodeSortable.mockReturnValue({
      setNodeRef: vi.fn(),
      attributes: { "aria-roledescription": "sortable", "aria-disabled": false },
      listeners: {},
      transform: null,
      transition: undefined,
      isDragging: false,
      // biome-ignore lint/suspicious/noExplicitAny: synthetic fixture.
    } as any);
    const { container } = render(
      <EditModeWrapper id="cmp_x" type="Heading" mode="edit">
        <span>x</span>
      </EditModeWrapper>,
    );
    const wrapper = container.querySelector("[data-edit-id='cmp_x']");
    expect(wrapper?.getAttribute("aria-roledescription")).toBe("sortable");
  });

  it("applies transform style when the node is being dragged", () => {
    mockedUseNodeSortable.mockReturnValue({
      setNodeRef: vi.fn(),
      attributes: {},
      listeners: {},
      transform: { x: 10, y: 20, scaleX: 1, scaleY: 1 },
      transition: "transform 200ms ease",
      isDragging: true,
      // biome-ignore lint/suspicious/noExplicitAny: synthetic fixture.
    } as any);
    const { container } = render(
      <EditModeWrapper id="cmp_x" type="Heading" mode="edit">
        <span>x</span>
      </EditModeWrapper>,
    );
    const wrapper = container.querySelector<HTMLDivElement>("[data-edit-id='cmp_x']");
    expect(wrapper?.style.transform).toBeTruthy();
    expect(wrapper?.style.opacity).toBe("0.5");
  });

  it("explicit onClick handler still wins over any pointer listener spread by dnd-kit", () => {
    const onSelect = vi.fn();
    // Inject a listener onPointerDown to confirm it does not block onClick from firing.
    mockedUseNodeSortable.mockReturnValue({
      setNodeRef: vi.fn(),
      attributes: {},
      listeners: { onPointerDown: vi.fn() },
      transform: null,
      transition: undefined,
      isDragging: false,
      // biome-ignore lint/suspicious/noExplicitAny: synthetic fixture.
    } as any);
    const { container } = render(
      <EditModeWrapper id="cmp_x" type="Heading" mode="edit" onSelect={onSelect}>
        <span>x</span>
      </EditModeWrapper>,
    );
    const wrapper = container.querySelector("[data-edit-id='cmp_x']");
    if (wrapper) fireEvent.click(wrapper);
    expect(onSelect).toHaveBeenCalledWith("cmp_x");
  });
});
