import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BetweenDropZone } from "../BetweenDropZone";
import { DragStateProvider } from "../DropZoneIndicator";

describe("BetweenDropZone visuals", () => {
  it("renders dotted-grey idle overlay even with no drag in progress", () => {
    render(
      <DragStateProvider value={{ activeId: null, overId: null, isAcceptable: false }}>
        <BetweenDropZone parentId="p1" index={0} />
      </DragStateProvider>,
    );
    const zone = screen.getByTestId("between-dropzone-p1-0");
    // Idle: dashed border AND visible at all times.
    expect(zone.className).toMatch(/border-dashed/);
    expect(zone.className).toMatch(/h-4/); // doubled idle height (was h-2).
  });

  it("expands and tints blue when drag hovers and is acceptable", () => {
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

  it("renders horizontal orientation with width-based sizing", () => {
    render(
      <DragStateProvider value={{ activeId: null, overId: null, isAcceptable: false }}>
        <BetweenDropZone parentId="p1" index={0} orientation="horizontal" />
      </DragStateProvider>,
    );
    const zone = screen.getByTestId("between-dropzone-p1-0");
    expect(zone.className).toMatch(/w-4/); // horizontal idle width (was w-1).
  });
});
