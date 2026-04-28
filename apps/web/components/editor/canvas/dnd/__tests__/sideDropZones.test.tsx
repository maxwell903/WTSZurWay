import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DragStateProvider } from "../DropZoneIndicator";
import { SideDropZones } from "../sideDropZones";

describe("SideDropZones", () => {
  it("renders four edge zones with side ids", () => {
    render(
      <DragStateProvider value={{ activeId: null, overId: null, isAcceptable: false }}>
        <SideDropZones targetId="cmp_x" />
      </DragStateProvider>,
    );
    expect(screen.getByTestId("side-dropzone-cmp_x-left")).toBeInTheDocument();
    expect(screen.getByTestId("side-dropzone-cmp_x-right")).toBeInTheDocument();
    expect(screen.getByTestId("side-dropzone-cmp_x-top")).toBeInTheDocument();
    expect(screen.getByTestId("side-dropzone-cmp_x-bottom")).toBeInTheDocument();
  });

  it("each zone carries the canonical data-side-id attribute", () => {
    render(
      <DragStateProvider value={{ activeId: null, overId: null, isAcceptable: false }}>
        <SideDropZones targetId="cmp_x" />
      </DragStateProvider>,
    );
    expect(screen.getByTestId("side-dropzone-cmp_x-left").getAttribute("data-side-id")).toBe(
      "side:cmp_x:left",
    );
    expect(screen.getByTestId("side-dropzone-cmp_x-right").getAttribute("data-side-id")).toBe(
      "side:cmp_x:right",
    );
  });

  it("tints blue when an acceptable drag hovers a side zone", () => {
    render(
      <DragStateProvider
        value={{ activeId: "palette:Heading", overId: "side:cmp_x:right", isAcceptable: true }}
      >
        <SideDropZones targetId="cmp_x" />
      </DragStateProvider>,
    );
    const right = screen.getByTestId("side-dropzone-cmp_x-right");
    expect(right).toHaveAttribute("data-acceptable", "true");
  });

  // Progressive disclosure (DECISIONS.md 2026-04-27 evening): side zones are
  // invisible at idle and only become visible while a drag is in progress.
  it("is invisible at idle (no drag) and visible during a drag", () => {
    const { rerender } = render(
      <DragStateProvider value={{ activeId: null, overId: null, isAcceptable: false }}>
        <SideDropZones targetId="cmp_x" />
      </DragStateProvider>,
    );
    const idleRight = screen.getByTestId("side-dropzone-cmp_x-right");
    expect(idleRight.className).toMatch(/opacity-0/);
    expect(idleRight.className).not.toMatch(/border-dashed/);
    expect(idleRight).toHaveAttribute("data-side-id", "side:cmp_x:right");

    rerender(
      <DragStateProvider value={{ activeId: "palette:Heading", overId: null, isAcceptable: true }}>
        <SideDropZones targetId="cmp_x" />
      </DragStateProvider>,
    );
    const dragRight = screen.getByTestId("side-dropzone-cmp_x-right");
    expect(dragRight.className).toMatch(/opacity-100/);
    expect(dragRight.className).toMatch(/border-dashed/);
    expect(dragRight).toHaveAttribute("data-drag-in-progress", "true");
  });
});
