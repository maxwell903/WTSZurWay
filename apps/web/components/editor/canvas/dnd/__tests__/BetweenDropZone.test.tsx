import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BetweenDropZone } from "../BetweenDropZone";
import { DragStateProvider } from "../DropZoneIndicator";

// Visibility model — progressive disclosure (DECISIONS.md 2026-04-27 evening):
// - At idle (no drag): collapsed + opacity 0; layout matches preview mode.
// - Drag in progress: dotted-grey idle visual fades in.
// - Drag + acceptable hover: blue tint.
// - Drag + invalid hover: red tint.
// useDroppable registration is preserved at all times (data-between-id stays
// set so dnd-kit collision detection still resolves the moment a drag starts).
describe("BetweenDropZone visuals", () => {
  it("collapses to invisible at idle (no drag in progress)", () => {
    render(
      <DragStateProvider value={{ activeId: null, overId: null, isAcceptable: false }}>
        <BetweenDropZone parentId="p1" index={0} />
      </DragStateProvider>,
    );
    const zone = screen.getByTestId("between-dropzone-p1-0");
    expect(zone.className).toMatch(/h-0/);
    expect(zone.className).toMatch(/opacity-0/);
    expect(zone.className).not.toMatch(/border-dashed/);
    // The droppable id stays registered so dnd-kit can resolve collisions
    // the moment a drag starts.
    expect(zone).toHaveAttribute("data-between-id", "between:p1:0");
  });

  it("expands and shows the dotted-grey idle visual when a drag is in progress", () => {
    render(
      <DragStateProvider value={{ activeId: "palette:Heading", overId: null, isAcceptable: true }}>
        <BetweenDropZone parentId="p1" index={0} />
      </DragStateProvider>,
    );
    const zone = screen.getByTestId("between-dropzone-p1-0");
    expect(zone).toHaveAttribute("data-drag-in-progress", "true");
    expect(zone.className).toMatch(/h-4/);
    expect(zone.className).toMatch(/opacity-100/);
    expect(zone.className).toMatch(/border-dashed/);
  });

  it("tints blue when a drag hovers a target it can accept", () => {
    render(
      <DragStateProvider
        value={{
          activeId: "palette:Heading",
          overId: "between:p1:0",
          isAcceptable: true,
        }}
      >
        <BetweenDropZone parentId="p1" index={0} />
      </DragStateProvider>,
    );
    const zone = screen.getByTestId("between-dropzone-p1-0");
    expect(zone).toHaveAttribute("data-acceptable", "true");
    expect(zone.className).toMatch(/blue/);
  });

  it("collapses horizontal orientation to w-0 at idle and expands to w-4 on drag", () => {
    const { rerender } = render(
      <DragStateProvider value={{ activeId: null, overId: null, isAcceptable: false }}>
        <BetweenDropZone parentId="p1" index={0} orientation="horizontal" />
      </DragStateProvider>,
    );
    const idle = screen.getByTestId("between-dropzone-p1-0");
    expect(idle.className).toMatch(/w-0/);
    expect(idle.className).toMatch(/opacity-0/);

    rerender(
      <DragStateProvider value={{ activeId: "palette:Heading", overId: null, isAcceptable: true }}>
        <BetweenDropZone parentId="p1" index={0} orientation="horizontal" />
      </DragStateProvider>,
    );
    const dragged = screen.getByTestId("between-dropzone-p1-0");
    expect(dragged.className).toMatch(/w-4/);
    expect(dragged.className).toMatch(/opacity-100/);
  });
});
