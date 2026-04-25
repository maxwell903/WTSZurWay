import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Paragraph } from "../index";

function makeNode(props: Record<string, unknown>): ComponentNode {
  return { id: "cmp_paragraph", type: "Paragraph", props, style: {} };
}

describe("<Paragraph>", () => {
  it("renders the supplied text inside a <p>", () => {
    const { container } = render(
      <Paragraph node={makeNode({ text: "A paragraph." })} cssStyle={{}} />,
    );
    const el = container.querySelector("p");
    expect(el?.textContent).toBe("A paragraph.");
  });

  it("falls back to an empty string when text is missing", () => {
    const { container } = render(<Paragraph node={makeNode({})} cssStyle={{}} />);
    expect(container.querySelector("p")?.textContent).toBe("");
  });

  it("applies the supplied cssStyle to the <p>", () => {
    const { container } = render(
      <Paragraph
        node={makeNode({ text: "x" })}
        cssStyle={{ paddingTop: 8, color: "rgb(50, 50, 50)" }}
      />,
    );
    const el = container.querySelector("p");
    expect(el?.style.paddingTop).toBe("8px");
    expect(el?.style.color).toBe("rgb(50, 50, 50)");
  });
});
