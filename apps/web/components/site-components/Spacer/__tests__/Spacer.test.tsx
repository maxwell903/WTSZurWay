import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spacer } from "../index";

function makeNode(props: Record<string, unknown>): ComponentNode {
  return { id: "cmp_spacer", type: "Spacer", props, style: {} };
}

describe("<Spacer>", () => {
  it("renders a div with the configured height in pixels", () => {
    const { container } = render(<Spacer node={makeNode({ height: 80 })} cssStyle={{}} />);
    const el = container.querySelector("[data-component-type='Spacer']");
    expect(el).not.toBeNull();
    expect((el as HTMLElement | null)?.style.height).toBe("80px");
  });

  it("defaults to 40px when height is missing", () => {
    const { container } = render(<Spacer node={makeNode({})} cssStyle={{}} />);
    const el = container.querySelector("[data-component-type='Spacer']");
    expect((el as HTMLElement | null)?.style.height).toBe("40px");
  });
});
