import { SwitchInput } from "@/components/editor/edit-panels/controls/SwitchInput";
import { TextInput } from "@/components/editor/edit-panels/controls/TextInput";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("controls — `tooltip?` prop", () => {
  it("TextInput without tooltip renders the bare input (no wrapping trigger)", () => {
    render(<TextInput id="t" label="Heading" value="" onChange={vi.fn()} testId="text-input" />);
    const input = screen.getByTestId("text-input");
    expect(input.closest("[data-with-tooltip]")).toBeNull();
  });

  it("TextInput with tooltip wraps the input in a Tooltip trigger", () => {
    render(
      <TextInput
        id="t"
        label="Heading"
        value=""
        onChange={vi.fn()}
        testId="text-input"
        tooltip="The big text at the top of the hero."
      />,
    );
    const input = screen.getByTestId("text-input");
    const trigger = input.closest("[data-with-tooltip]");
    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute("data-testid")).toBe("text-input-tooltip-trigger");
  });

  it("SwitchInput with tooltip wraps the switch in a Tooltip trigger", () => {
    render(
      <SwitchInput
        id="s"
        label="Autoplay"
        value={true}
        onChange={vi.fn()}
        testId="switch-input"
        tooltip="Automatically advance to the next slide on a timer."
      />,
    );
    const sw = screen.getByTestId("switch-input");
    expect(sw.closest("[data-with-tooltip]")).not.toBeNull();
  });

  it("SwitchInput without tooltip is functionally unchanged", () => {
    const onChange = vi.fn();
    render(
      <SwitchInput
        id="s"
        label="Autoplay"
        value={false}
        onChange={onChange}
        testId="switch-input"
      />,
    );
    const sw = screen.getByTestId("switch-input");
    expect(sw.closest("[data-with-tooltip]")).toBeNull();
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
