import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CanvasDropOverlay } from "../CanvasDropOverlay";

describe("CanvasDropOverlay", () => {
  it("renders a non-interactive dotted-grey background panel", () => {
    render(<CanvasDropOverlay />);
    const el = screen.getByTestId("canvas-drop-overlay");
    expect(el).toBeInTheDocument();
    expect(el.className).toMatch(/border-dashed/);
    expect(el.className).toMatch(/pointer-events-none/);
  });
});
