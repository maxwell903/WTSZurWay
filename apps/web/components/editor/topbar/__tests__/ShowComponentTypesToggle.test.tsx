import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ShowComponentTypesToggle } from "../ShowComponentTypesToggle";

describe("ShowComponentTypesToggle", () => {
  beforeEach(() => __resetEditorStoreForTests());

  it("flips the store flag on click", () => {
    render(<ShowComponentTypesToggle />);
    expect(useEditorStore.getState().showComponentTypes).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /component types/i }));
    expect(useEditorStore.getState().showComponentTypes).toBe(false);
  });

  it("uses the orange-400 active styling when on", () => {
    render(<ShowComponentTypesToggle />);
    const btn = screen.getByRole("button", { name: /component types/i });
    expect(btn.className).toMatch(/text-orange-400/);
  });

  it("loses the orange-400 styling when off", () => {
    render(<ShowComponentTypesToggle />);
    fireEvent.click(screen.getByRole("button", { name: /component types/i }));
    const btn = screen.getByRole("button", { name: /component types/i });
    expect(btn.className).not.toMatch(/text-orange-400/);
  });
});
