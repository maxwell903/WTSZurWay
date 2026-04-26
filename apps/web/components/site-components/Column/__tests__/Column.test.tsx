import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Column } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_col", type: "Column", props, style: {} };
}

describe("<Column>", () => {
  it("renders a flex-column div given a minimal valid node", () => {
    const { container } = render(
      <Column node={makeNode()} cssStyle={{}}>
        <span>only-child</span>
      </Column>,
    );
    const el = container.querySelector("[data-component-type='Column']") as HTMLElement | null;
    expect(el).not.toBeNull();
    expect(el?.style.display).toBe("flex");
    expect(el?.style.flexDirection).toBe("column");
    expect(el?.getAttribute("data-column-span")).toBe("12");
    expect(el?.textContent).toBe("only-child");
  });

  it("applies the supplied cssStyle and reflects span in the data attribute", () => {
    const { container } = render(
      <Column node={makeNode({ span: 4, gap: 12 })} cssStyle={{ background: "#0f0" }}>
        <span />
      </Column>,
    );
    const el = container.querySelector("[data-component-type='Column']") as HTMLElement | null;
    expect(el?.style.background).toContain("rgb(0, 255, 0)");
    expect(el?.style.gap).toBe("12px");
    expect(el?.getAttribute("data-column-span")).toBe("4");
    expect(el?.style.flex).toContain("4");
  });

  it("falls back to defaults when given malformed props", () => {
    const { container } = render(
      <Column node={makeNode({ span: 99, gap: -5, alignItems: 7 })} cssStyle={{}}>
        <span />
      </Column>,
    );
    const el = container.querySelector("[data-component-type='Column']") as HTMLElement | null;
    expect(el?.getAttribute("data-column-span")).toBe("12");
    expect(el?.style.gap).toBe("8px");
    expect(el?.style.alignItems).toBe("stretch");
  });
});
