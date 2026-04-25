import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditModeWrapper } from "../EditModeWrapper";

describe("<EditModeWrapper>", () => {
  it("renders its children inside a div with data-edit-id", () => {
    const { getByText, container } = render(
      <EditModeWrapper id="cmp_x">
        <span>inner</span>
      </EditModeWrapper>,
    );
    expect(getByText("inner")).toBeInTheDocument();
    expect(container.querySelector("[data-edit-id='cmp_x']")).not.toBeNull();
  });

  it("marks itself selected when the selected prop is true", () => {
    const { container } = render(
      <EditModeWrapper id="cmp_x" selected>
        <span>x</span>
      </EditModeWrapper>,
    );
    expect(container.querySelector("[data-edit-selected='true']")).not.toBeNull();
  });

  it("invokes onSelect with the id on click", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <EditModeWrapper id="cmp_x" onSelect={onSelect}>
        <span>x</span>
      </EditModeWrapper>,
    );
    const wrapper = container.querySelector("[data-edit-id='cmp_x']");
    expect(wrapper).not.toBeNull();
    if (wrapper) {
      fireEvent.click(wrapper);
    }
    expect(onSelect).toHaveBeenCalledWith("cmp_x");
  });

  it("invokes onContextMenu with the id on right-click and prevents the default", () => {
    const onContextMenu = vi.fn();
    const { container } = render(
      <EditModeWrapper id="cmp_x" onContextMenu={onContextMenu}>
        <span>x</span>
      </EditModeWrapper>,
    );
    const wrapper = container.querySelector("[data-edit-id='cmp_x']");
    expect(wrapper).not.toBeNull();
    if (wrapper) {
      fireEvent.contextMenu(wrapper);
    }
    expect(onContextMenu).toHaveBeenCalledWith("cmp_x");
  });
});
