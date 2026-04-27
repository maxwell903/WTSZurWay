import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BoundedByParentTooltip } from "../BoundedByParentTooltip";

describe("BoundedByParentTooltip", () => {
  it("renders the message when visible", () => {
    render(<BoundedByParentTooltip visible top={100} left={200} />);
    expect(screen.getByText(/bounded by parent/i)).toBeInTheDocument();
  });

  it("emits no DOM when visible=false", () => {
    const { container } = render(<BoundedByParentTooltip visible={false} top={0} left={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("positions itself at the given top/left coordinates", () => {
    render(<BoundedByParentTooltip visible top={100} left={200} />);
    const el = screen.getByTestId("bounded-by-parent-tooltip");
    // top is offset by -8 to float above the handle.
    expect(el.style.top).toBe("92px");
    expect(el.style.left).toBe("200px");
  });
});
