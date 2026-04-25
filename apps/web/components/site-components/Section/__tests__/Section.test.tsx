import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Section } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_section", type: "Section", props, style: {} };
}

describe("<Section>", () => {
  it("renders a <section> by default and applies the supplied cssStyle", () => {
    const { container } = render(
      <Section node={makeNode()} cssStyle={{ background: "#fff" }}>
        <span>child</span>
      </Section>,
    );
    const el = container.querySelector("section");
    expect(el).not.toBeNull();
    expect(el?.getAttribute("data-component-id")).toBe("cmp_section");
    expect(el?.style.background).toBe("rgb(255, 255, 255)");
    expect(el?.textContent).toBe("child");
  });

  it("renders a <main> tag when the 'as' prop is set", () => {
    const { container } = render(
      <Section node={makeNode({ as: "main" })} cssStyle={{}}>
        <span>m</span>
      </Section>,
    );
    expect(container.querySelector("main")).not.toBeNull();
    expect(container.querySelector("section")).toBeNull();
  });

  it("falls back to <section> when 'as' is invalid", () => {
    const { container } = render(
      <Section node={makeNode({ as: "video" })} cssStyle={{}}>
        <span />
      </Section>,
    );
    expect(container.querySelector("section")).not.toBeNull();
  });
});
