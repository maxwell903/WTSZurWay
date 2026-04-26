import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConnectedInput } from "../types";
import { useConnectedInputs } from "../useConnectedInputs";

function MockInput({ id, name, initial = "" }: { id: string; name: string; initial?: string }) {
  return (
    <div data-component-id={id}>
      <input name={name} defaultValue={initial} data-testid={`input-${id}`} />
    </div>
  );
}

function Probe({ connections }: { connections: ConnectedInput[] }) {
  const values = useConnectedInputs(connections);
  return <div data-testid="values">{JSON.stringify(values)}</div>;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("useConnectedInputs", () => {
  it("reads the initial value of each connected input on mount", async () => {
    render(
      <>
        <MockInput id="cmp_q" name="q" initial="hello" />
        <Probe connections={[{ inputId: "cmp_q", field: "unitName", operator: "contains" }]} />
      </>,
    );
    // The hook's mount-effect runs synchronously after render; advance the
    // pending timers to flush state updates.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByTestId("values").textContent).toBe(JSON.stringify({ cmp_q: "hello" }));
  });

  it("debounces value updates with a 150ms window", async () => {
    render(
      <>
        <MockInput id="cmp_q" name="q" />
        <Probe connections={[{ inputId: "cmp_q", field: "unitName", operator: "contains" }]} />
      </>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const input = screen.getByTestId("input-cmp_q") as HTMLInputElement;
    await act(async () => {
      fireEvent.input(input, { target: { value: "1" } });
      fireEvent.input(input, { target: { value: "10" } });
      fireEvent.input(input, { target: { value: "101" } });
      // Less than the debounce window — values should not be applied yet.
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(screen.getByTestId("values").textContent).toBe(JSON.stringify({ cmp_q: "" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    expect(screen.getByTestId("values").textContent).toBe(JSON.stringify({ cmp_q: "101" }));
  });

  it("returns an empty string for connections whose input is not mounted", async () => {
    render(<Probe connections={[{ inputId: "cmp_missing", field: "x", operator: "=" }]} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByTestId("values").textContent).toBe(JSON.stringify({ cmp_missing: "" }));
  });

  it("supports multiple connections at once", async () => {
    render(
      <>
        <MockInput id="cmp_a" name="a" initial="hello" />
        <MockInput id="cmp_b" name="b" initial="world" />
        <Probe
          connections={[
            { inputId: "cmp_a", field: "x", operator: "contains" },
            { inputId: "cmp_b", field: "y", operator: "contains" },
          ]}
        />
      </>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByTestId("values").textContent).toBe(
      JSON.stringify({ cmp_a: "hello", cmp_b: "world" }),
    );
  });
});
