import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_btn", type: "Button", props, style: {} };
}

describe("<Button>", () => {
  it("renders a <button> with the label given a minimal valid node", () => {
    const { container } = render(<Button node={makeNode({ label: "Click me" })} cssStyle={{}} />);
    const el = container.querySelector("button[data-component-type='Button']");
    expect(el).not.toBeNull();
    expect(el?.textContent).toBe("Click me");
    expect(el?.getAttribute("type")).toBe("button");
  });

  it("renders an <a> tag when href is set, and applies the supplied cssStyle", () => {
    const { container } = render(
      <Button
        node={makeNode({ label: "Apply", href: "/apply", variant: "primary" })}
        cssStyle={{ marginTop: "12px" }}
      />,
    );
    const el = container.querySelector("a[data-component-type='Button']") as HTMLElement | null;
    expect(el).not.toBeNull();
    expect(el?.getAttribute("href")).toBe("/apply");
    expect(el?.style.marginTop).toBe("12px");
    expect(container.querySelector("button[data-component-type='Button']")).toBeNull();
  });

  it("falls back to defaults when given malformed props", () => {
    const { container } = render(
      <Button
        node={makeNode({ label: 123, variant: "rainbow", size: "huge", buttonType: "" })}
        cssStyle={{}}
      />,
    );
    const el = container.querySelector("[data-component-type='Button']");
    expect(el).not.toBeNull();
    expect(el?.textContent).toBe("Button");
    expect(el?.getAttribute("type")).toBe("button");
  });

  it("respects buttonType=submit so a Form's submit button works", () => {
    const { container } = render(
      <Button node={makeNode({ label: "Send", buttonType: "submit" })} cssStyle={{}} />,
    );
    const el = container.querySelector("button[data-component-type='Button']");
    expect(el?.getAttribute("type")).toBe("submit");
  });
});
