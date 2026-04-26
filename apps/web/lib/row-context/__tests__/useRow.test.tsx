import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RowContextProvider } from "../RowContext";
import { useRow } from "../useRow";

function Probe({ testId = "probe" }: { testId?: string }) {
  const { row, kind } = useRow();
  return <div data-testid={testId}>{JSON.stringify({ row, kind })}</div>;
}

describe("useRow / RowContextProvider", () => {
  it("returns { row: null, kind: null } when used outside any provider", () => {
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe(JSON.stringify({ row: null, kind: null }));
  });

  it("returns the provided row and kind inside a provider", () => {
    render(
      <RowContextProvider row={{ unitName: "Apt 101" }} kind="repeater">
        <Probe />
      </RowContextProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toBe(
      JSON.stringify({ row: { unitName: "Apt 101" }, kind: "repeater" }),
    );
  });

  it("nested provider shadows the ancestor (innermost wins)", () => {
    render(
      <RowContextProvider row={{ id: 1 }} kind="detail">
        <Probe testId="outer" />
        <RowContextProvider row={{ id: 2 }} kind="repeater">
          <Probe testId="inner" />
        </RowContextProvider>
      </RowContextProvider>,
    );
    expect(screen.getByTestId("outer").textContent).toBe(
      JSON.stringify({ row: { id: 1 }, kind: "detail" }),
    );
    expect(screen.getByTestId("inner").textContent).toBe(
      JSON.stringify({ row: { id: 2 }, kind: "repeater" }),
    );
  });

  it("switching providers updates consumers", () => {
    const { rerender } = render(
      <RowContextProvider row={{ id: 1 }} kind="repeater">
        <Probe />
      </RowContextProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toBe(
      JSON.stringify({ row: { id: 1 }, kind: "repeater" }),
    );
    rerender(
      <RowContextProvider row={{ id: 2 }} kind="repeater">
        <Probe />
      </RowContextProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toBe(
      JSON.stringify({ row: { id: 2 }, kind: "repeater" }),
    );
  });

  it("propagates the `kind` field distinctly for repeater vs detail", () => {
    render(
      <>
        <RowContextProvider row={{ a: 1 }} kind="repeater">
          <Probe testId="rep" />
        </RowContextProvider>
        <RowContextProvider row={{ a: 1 }} kind="detail">
          <Probe testId="det" />
        </RowContextProvider>
      </>,
    );
    expect(screen.getByTestId("rep").textContent).toContain('"kind":"repeater"');
    expect(screen.getByTestId("det").textContent).toContain('"kind":"detail"');
  });

  it("treats row=undefined as no-row (returns null/null)", () => {
    render(
      <RowContextProvider row={undefined} kind="repeater">
        <Probe />
      </RowContextProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toBe(JSON.stringify({ row: null, kind: null }));
  });

  it("treats row=null as a real row (kind propagates)", () => {
    // null is a valid row value distinct from "no row in scope"; the
    // discriminated union forces consumers to look at `kind`, not `row`.
    render(
      <RowContextProvider row={null} kind="repeater">
        <Probe />
      </RowContextProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toBe(
      JSON.stringify({ row: null, kind: "repeater" }),
    );
  });
});
