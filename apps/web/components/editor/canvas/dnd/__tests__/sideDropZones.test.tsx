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
});
