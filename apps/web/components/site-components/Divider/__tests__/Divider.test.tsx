import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Divider } from "../index";

function makeNode(props: Record<string, unknown>): ComponentNode {
  return { id: "cmp_divider", type: "Divider", props, style: {} };
}

describe("<Divider>", () => {
  it("renders an <hr> with the configured thickness and color", () => {
    const { container } = render(
      <Divider node={makeNode({ thickness: 2, color: "rgb(255, 0, 0)" })} cssStyle={{}} />,
    );
    const el = container.querySelector("hr");
    expect(el).not.toBeNull();
    expect(el?.style.borderTopWidth).toBe("2px");
    expect(el?.style.borderTopColor).toBe("rgb(255, 0, 0)");
  });

  it("uses defaults when props are missing", () => {
    const { container } = render(<Divider node={makeNode({})} cssStyle={{}} />);
    const el = container.querySelector("hr");
    expect(el?.style.borderTopWidth).toBe("1px");
  });
});
