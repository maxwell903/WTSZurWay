import {
  OverlayInput,
  type OverlayValue,
} from "@/components/editor/edit-panels/controls/OverlayInput";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

function Harness({ initial }: { initial: OverlayValue }) {
  const [value, setValue] = useState<OverlayValue>(initial);
  return <OverlayInput id="o" label="Overlay" value={value} onChange={setValue} testId="o" />;
}

describe("<OverlayInput>", () => {
  it("renders 4 kind options (none/solid/linear/radial)", () => {
    render(<Harness initial={undefined} />);
    expect(screen.getByTestId("o-kind-none")).toBeTruthy();
    expect(screen.getByTestId("o-kind-solid")).toBeTruthy();
    expect(screen.getByTestId("o-kind-linear")).toBeTruthy();
    expect(screen.getByTestId("o-kind-radial")).toBeTruthy();
  });

  it("clicking 'Solid' writes the default solid shape via onChange", () => {
    const onChange = vi.fn();
    render(<OverlayInput id="o" value={undefined} onChange={onChange} testId="o" />);
    fireEvent.click(screen.getByTestId("o-kind-solid"));
    expect(onChange).toHaveBeenCalledWith({
      kind: "solid",
      color: "#000000",
      opacity: 0.45,
    });
  });

  it("clicking 'Linear' writes the default linear shape with two stops", () => {
    const onChange = vi.fn();
    render(<OverlayInput id="o" value={undefined} onChange={onChange} testId="o" />);
    fireEvent.click(screen.getByTestId("o-kind-linear"));
    expect(onChange).toHaveBeenCalledWith({
      kind: "linear",
      angle: 180,
      stops: [
        { color: "#000000", opacity: 0, position: 0 },
        { color: "#000000", opacity: 0.6, position: 100 },
      ],
    });
  });

  it("clicking 'Radial' writes the default radial shape with center='center'", () => {
    const onChange = vi.fn();
    render(<OverlayInput id="o" value={undefined} onChange={onChange} testId="o" />);
    fireEvent.click(screen.getByTestId("o-kind-radial"));
    expect(onChange).toHaveBeenCalledWith({
      kind: "radial",
      center: "center",
      stops: [
        { color: "#000000", opacity: 0, position: 0 },
        { color: "#000000", opacity: 0.6, position: 100 },
      ],
    });
  });

  it("clicking 'None' writes undefined (the OverlaySection then maps undefined → false)", () => {
    const onChange = vi.fn();
    render(
      <OverlayInput
        id="o"
        value={{ kind: "solid", color: "#fff", opacity: 0.5 }}
        onChange={onChange}
        testId="o"
      />,
    );
    fireEvent.click(screen.getByTestId("o-kind-none"));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("Add stop appends a new stop to a linear gradient", () => {
    render(
      <Harness
        initial={{
          kind: "linear",
          angle: 180,
          stops: [{ color: "#000000", opacity: 0.5, position: 0 }],
        }}
      />,
    );
    fireEvent.click(screen.getByTestId("o-add-stop"));
    expect(screen.getByTestId("o-stop-1")).toBeTruthy();
  });

  it("Remove stop drops the stop from a linear gradient", () => {
    render(
      <Harness
        initial={{
          kind: "linear",
          angle: 180,
          stops: [
            { color: "#000000", opacity: 0, position: 0 },
            { color: "#000000", opacity: 1, position: 100 },
          ],
        }}
      />,
    );
    expect(screen.getByTestId("o-stop-1")).toBeTruthy();
    fireEvent.click(screen.getByTestId("o-stop-1-remove"));
    expect(screen.queryByTestId("o-stop-1")).toBeNull();
  });

  it("Reorder swaps adjacent stops", () => {
    const onChange = vi.fn();
    render(
      <OverlayInput
        id="o"
        value={{
          kind: "linear",
          angle: 180,
          stops: [
            { color: "#aaaaaa", opacity: 0, position: 0 },
            { color: "#bbbbbb", opacity: 0.5, position: 50 },
            { color: "#cccccc", opacity: 1, position: 100 },
          ],
        }}
        onChange={onChange}
        testId="o"
      />,
    );
    fireEvent.click(screen.getByTestId("o-stop-1-up"));
    expect(onChange).toHaveBeenLastCalledWith({
      kind: "linear",
      angle: 180,
      stops: [
        { color: "#bbbbbb", opacity: 0.5, position: 50 },
        { color: "#aaaaaa", opacity: 0, position: 0 },
        { color: "#cccccc", opacity: 1, position: 100 },
      ],
    });
  });

  it("Radial center buttons switch between top/center/bottom", () => {
    const onChange = vi.fn();
    render(
      <OverlayInput
        id="o"
        value={{
          kind: "radial",
          center: "center",
          stops: [{ color: "#000000", opacity: 0.5, position: 50 }],
        }}
        onChange={onChange}
        testId="o"
      />,
    );
    fireEvent.click(screen.getByTestId("o-center-bottom"));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ center: "bottom" }));
  });
});
