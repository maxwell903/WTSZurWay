import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { PauseSlideshowToggle } from "../PauseSlideshowToggle";

describe("PauseSlideshowToggle", () => {
  beforeEach(() => __resetEditorStoreForTests());

  it("flips the store flag on click", () => {
    render(<PauseSlideshowToggle />);
    expect(useEditorStore.getState().slideshowPaused).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /pause slideshow|resume slideshow/i }));
    expect(useEditorStore.getState().slideshowPaused).toBe(true);
  });

  it("uses the orange-400 active styling when paused", () => {
    render(<PauseSlideshowToggle />);
    fireEvent.click(screen.getByRole("button", { name: /pause slideshow/i }));
    const btn = screen.getByRole("button", { name: /resume slideshow/i });
    expect(btn.className).toMatch(/text-orange-400/);
  });

  it("aria-pressed reflects the flag", () => {
    render(<PauseSlideshowToggle />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });
});
