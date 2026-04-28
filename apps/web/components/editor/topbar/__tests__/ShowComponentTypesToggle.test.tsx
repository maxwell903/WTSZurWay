import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ShowComponentTypesToggle } from "../ShowComponentTypesToggle";

// X-ray mode toggle — defaults OFF since the 2026-04-27 evening
// progressive-disclosure pivot (see DECISIONS.md). When OFF the canvas
// at idle has no per-component chrome; when ON every component shows
// a dashed grey outline + type pill.
describe("ShowComponentTypesToggle (X-ray mode)", () => {
  beforeEach(() => __resetEditorStoreForTests());

  it("flips the store flag on click", () => {
    render(<ShowComponentTypesToggle />);
    expect(useEditorStore.getState().showComponentTypes).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /x-ray mode/i }));
    expect(useEditorStore.getState().showComponentTypes).toBe(true);
  });

  it("uses the orange-400 active styling when on", () => {
    render(<ShowComponentTypesToggle />);
    fireEvent.click(screen.getByRole("button", { name: /x-ray mode/i }));
    const btn = screen.getByRole("button", { name: /x-ray mode/i });
    expect(btn.className).toMatch(/text-orange-400/);
  });

  it("loses the orange-400 styling when off", () => {
    render(<ShowComponentTypesToggle />);
    const btn = screen.getByRole("button", { name: /x-ray mode/i });
    expect(btn.className).not.toMatch(/text-orange-400/);
  });

  it("reflects toggle state via aria-pressed", () => {
    render(<ShowComponentTypesToggle />);
    const btn = screen.getByRole("button", { name: /x-ray mode/i });
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });
});
