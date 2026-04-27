import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FlowGroup } from "../index";

const baseNode: ComponentNode = {
  id: "cmp_fg1",
  type: "FlowGroup",
  props: {},
  style: {},
  children: [],
};

describe("FlowGroup", () => {
  it("renders a horizontal flex container", () => {
    const { container } = render(
      <FlowGroup node={baseNode} cssStyle={{}}>
        <span>child</span>
      </FlowGroup>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.display).toBe("flex");
    expect(root.style.flexDirection).toBe("row");
  });

  it("emits the standard data-component attributes", () => {
    const { container } = render(
      <FlowGroup node={baseNode} cssStyle={{}}>
        <span>child</span>
      </FlowGroup>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("data-component-id")).toBe("cmp_fg1");
    expect(root.getAttribute("data-component-type")).toBe("FlowGroup");
  });

  it("defaults width to 100% when style.width is unset", () => {
    const { container } = render(
      <FlowGroup node={baseNode} cssStyle={{}}>
        <span>child</span>
      </FlowGroup>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.width).toBe("100%");
  });

  it("respects an explicit cssStyle.width", () => {
    const { container } = render(
      <FlowGroup node={baseNode} cssStyle={{ width: "60%" }}>
        <span>child</span>
      </FlowGroup>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.width).toBe("60%");
  });
});
