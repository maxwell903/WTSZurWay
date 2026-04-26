import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Row } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_row", type: "Row", props, style: {} };
}

describe("<Row>", () => {
  it("renders a flex-row div with children given a minimal valid node", () => {
    const { container } = render(
      <Row node={makeNode()} cssStyle={{}}>
        <span>a</span>
        <span>b</span>
      </Row>,
    );
    const el = container.querySelector("[data-component-type='Row']") as HTMLElement | null;
    expect(el).not.toBeNull();
    expect(el?.getAttribute("data-component-id")).toBe("cmp_row");
    expect(el?.style.display).toBe("flex");
    expect(el?.style.flexDirection).toBe("row");
    expect(el?.textContent).toBe("ab");
  });

  it("applies the supplied cssStyle to its root element", () => {
    const { container } = render(
      <Row node={makeNode({ gap: 24 })} cssStyle={{ background: "#abcdef", padding: "8px" }}>
        <span />
      </Row>,
    );
    const el = container.querySelector("[data-component-type='Row']") as HTMLElement | null;
    expect(el?.style.background).toContain("rgb(171, 205, 239)");
    expect(el?.style.padding).toBe("8px");
    expect(el?.style.gap).toBe("24px");
  });

  it("falls back to defaults when given malformed props", () => {
    const { container } = render(
      <Row
        node={makeNode({ gap: "wide", alignItems: 42, justifyContent: null, wrap: "yes" })}
        cssStyle={{}}
      >
        <span />
      </Row>,
    );
    const el = container.querySelector("[data-component-type='Row']") as HTMLElement | null;
    expect(el?.style.gap).toBe("16px");
    expect(el?.style.alignItems).toBe("stretch");
    expect(el?.style.justifyContent).toBe("flex-start");
    expect(el?.style.flexWrap).toBe("nowrap");
  });
});
