import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DragStateProvider } from "../DropZoneIndicator";
import { EmptyContainerOverlay } from "../EmptyContainerOverlay";

describe("EmptyContainerOverlay", () => {
  it("renders the hint label", () => {
    render(
      <DragStateProvider value={{ activeId: null, overId: null, isAcceptable: false }}>
        <EmptyContainerOverlay parentId="p" />
      </DragStateProvider>,
    );
    expect(screen.getByText(/drop a component here/i)).toBeInTheDocument();
  });

  it("registers as a droppable with id dropzone:p", () => {
    render(
      <DragStateProvider value={{ activeId: null, overId: null, isAcceptable: false }}>
        <EmptyContainerOverlay parentId="p" />
      </DragStateProvider>,
    );
    const el = screen.getByTestId("empty-container-overlay-p");
    expect(el.getAttribute("data-dropzone-id")).toBe("dropzone:p");
  });

  it("tints blue when an acceptable drag is hovering", () => {
    render(
      <DragStateProvider
        value={{ activeId: "palette:Heading", overId: "dropzone:p", isAcceptable: true }}
      >
        <EmptyContainerOverlay parentId="p" />
      </DragStateProvider>,
    );
    const el = screen.getByTestId("empty-container-overlay-p");
    expect(el).toHaveAttribute("data-acceptable", "true");
  });
});
