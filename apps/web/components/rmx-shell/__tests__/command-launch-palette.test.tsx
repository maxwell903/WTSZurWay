import { CommandLaunchPalette } from "@/components/rmx-shell/command-launch-palette";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

const EMPTY_STATE = "No commands yet — Command Launch is coming soon.";

// jsdom doesn't provide ResizeObserver; cmdk's <CommandList> uses it.
beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  }
});

describe("CommandLaunchPalette", () => {
  it("renders the trigger button without showing the dialog", () => {
    render(<CommandLaunchPalette />);
    expect(screen.getByRole("button", { name: "Command Launch" })).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument();
  });

  it("opens the palette on click and shows the empty state", async () => {
    render(<CommandLaunchPalette />);
    fireEvent.click(screen.getByRole("button", { name: "Command Launch" }));
    expect(await screen.findByText(EMPTY_STATE)).toBeInTheDocument();
  });

  it("closes the palette on Escape", async () => {
    render(<CommandLaunchPalette />);
    fireEvent.click(screen.getByRole("button", { name: "Command Launch" }));
    expect(await screen.findByText(EMPTY_STATE)).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument();
    });
  });

  it("opens the palette via Ctrl+K", async () => {
    render(<CommandLaunchPalette />);
    expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
    });
    expect(await screen.findByText(EMPTY_STATE)).toBeInTheDocument();
  });

  it("opens the palette via Cmd+K (metaKey)", async () => {
    render(<CommandLaunchPalette />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    });
    expect(await screen.findByText(EMPTY_STATE)).toBeInTheDocument();
  });
});
