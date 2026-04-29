import { fireEvent, render } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { useSwipe } from "../hooks/useSwipe";

function Harness({
  onSwipeLeft,
  onSwipeRight,
  thresholdPx,
}: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  thresholdPx?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useSwipe({ ref, onSwipeLeft, onSwipeRight, thresholdPx });
  return <div ref={ref} data-testid="swipe-target" style={{ width: 200, height: 200 }} />;
}

function pointer(name: string, x: number, y: number) {
  // jsdom doesn't have PointerEvent in older versions; use a generic Event
  // with the right properties attached.
  return new MouseEvent(name, { bubbles: true, button: 0, clientX: x, clientY: y });
}

describe("useSwipe", () => {
  it("fires onSwipeLeft when horizontal travel exceeds threshold to the left", () => {
    const onSwipeLeft = vi.fn();
    const { getByTestId } = render(<Harness onSwipeLeft={onSwipeLeft} />);
    const el = getByTestId("swipe-target");
    fireEvent(el, pointer("pointerdown", 200, 100));
    fireEvent(el, pointer("pointerup", 100, 100));
    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it("fires onSwipeRight when horizontal travel exceeds threshold to the right", () => {
    const onSwipeRight = vi.fn();
    const { getByTestId } = render(<Harness onSwipeRight={onSwipeRight} />);
    const el = getByTestId("swipe-target");
    fireEvent(el, pointer("pointerdown", 50, 100));
    fireEvent(el, pointer("pointerup", 150, 100));
    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it("does NOT fire when horizontal travel is below threshold", () => {
    const onSwipeLeft = vi.fn();
    const { getByTestId } = render(<Harness onSwipeLeft={onSwipeLeft} thresholdPx={50} />);
    const el = getByTestId("swipe-target");
    fireEvent(el, pointer("pointerdown", 100, 100));
    fireEvent(el, pointer("pointerup", 80, 100)); // 20px < 50px
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("does NOT fire when vertical travel is too high (rejects vertical-scroll gestures)", () => {
    const onSwipeLeft = vi.fn();
    const { getByTestId } = render(<Harness onSwipeLeft={onSwipeLeft} thresholdPx={50} />);
    const el = getByTestId("swipe-target");
    fireEvent(el, pointer("pointerdown", 200, 50));
    fireEvent(el, pointer("pointerup", 100, 250)); // 100px horizontal but 200px vertical
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("ignores secondary mouse buttons", () => {
    const onSwipeLeft = vi.fn();
    const { getByTestId } = render(<Harness onSwipeLeft={onSwipeLeft} />);
    const el = getByTestId("swipe-target");
    fireEvent(
      el,
      new MouseEvent("pointerdown", { bubbles: true, button: 2, clientX: 200, clientY: 100 }),
    );
    fireEvent(el, pointer("pointerup", 100, 100));
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });
});
