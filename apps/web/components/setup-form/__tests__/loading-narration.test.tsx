import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INITIAL_GENERATION_NARRATION, LoadingNarration } from "../LoadingNarration";

beforeEach(() => {
  // Default reduced-motion to false so the fade timers fire predictably.
  // Individual tests override when they want the no-fade branch.
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      }),
    });
  }
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("<LoadingNarration>", () => {
  it("renders the first §9.5 string on initial mount", () => {
    render(<LoadingNarration />);
    expect(screen.getByTestId("loading-narration")).toHaveTextContent(
      INITIAL_GENERATION_NARRATION[0],
    );
  });

  it("rotates to the next message after intervalMs (+ fade-out timer)", () => {
    render(<LoadingNarration intervalMs={1000} />);
    expect(screen.getByTestId("loading-narration")).toHaveTextContent(
      INITIAL_GENERATION_NARRATION[0],
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // Fade-out tick: opacity drops but message text hasn't swapped yet.
    expect(screen.getByTestId("loading-narration")).toHaveTextContent(
      INITIAL_GENERATION_NARRATION[0],
    );
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByTestId("loading-narration")).toHaveTextContent(
      INITIAL_GENERATION_NARRATION[1],
    );
  });

  it("respects custom messages list", () => {
    const custom = ["one", "two", "three"];
    render(<LoadingNarration messages={custom} intervalMs={500} />);
    expect(screen.getByTestId("loading-narration")).toHaveTextContent("one");
    act(() => {
      vi.advanceTimersByTime(500 + 250);
    });
    expect(screen.getByTestId("loading-narration")).toHaveTextContent("two");
  });

  it("clears the interval on unmount", () => {
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = render(<LoadingNarration intervalMs={1000} />);
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });

  it("with a single-message list, never advances even after many ticks", () => {
    render(<LoadingNarration messages={["only"]} intervalMs={100} />);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByTestId("loading-narration")).toHaveTextContent("only");
  });
});
