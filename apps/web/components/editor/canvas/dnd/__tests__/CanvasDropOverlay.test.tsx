import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CanvasDropOverlay } from "../CanvasDropOverlay";
import { DragStateProvider } from "../DropZoneIndicator";

describe("CanvasDropOverlay", () => {
  it("renders a non-interactive dotted-grey background panel", () => {
    render(
      <DragStateProvider value={{ activeId: null, overId: null, isAcceptable: false }}>
        <CanvasDropOverlay />
      </DragStateProvider>,
    );
    const el = screen.getByTestId("canvas-drop-overlay");
    expect(el).toBeInTheDocument();
    expect(el.className).toMatch(/border-dashed/);
    expect(el.className).toMatch(/pointer-events-none/);
  });

  // Progressive disclosure: invisible at idle, fades in on drag.
  it("is invisible at idle and visible while a drag is in progress", () => {
    const { rerender } = render(
      <DragStateProvider value={{ activeId: null, overId: null, isAcceptable: false }}>
        <CanvasDropOverlay />
      </DragStateProvider>,
    );
    const idle = screen.getByTestId("canvas-drop-overlay");
    expect(idle.className).toMatch(/opacity-0/);

    rerender(
      <DragStateProvider value={{ activeId: "palette:Heading", overId: null, isAcceptable: false }}>
        <CanvasDropOverlay />
      </DragStateProvider>,
    );
    const dragged = screen.getByTestId("canvas-drop-overlay");
    expect(dragged.className).toMatch(/opacity-100/);
    expect(dragged).toHaveAttribute("data-drag-in-progress", "true");
  });

  // Falls back to default state when no provider is in scope (preview mode,
  // standalone tests). Defaults to "no drag" → invisible.
  it("falls back to invisible when no DragStateProvider is mounted", () => {
    render(<CanvasDropOverlay />);
    const el = screen.getByTestId("canvas-drop-overlay");
    expect(el.className).toMatch(/opacity-0/);
  });
});
