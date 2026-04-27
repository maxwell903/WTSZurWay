import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Section } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_section", type: "Section", props, style: {} };
}

function makeSection(children: ComponentNode[]): ComponentNode {
  return {
    id: "cmp_s",
    type: "Section",
    props: {},
    style: {},
    children,
  };
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

describe("Section flex-on-explicit-width (UX rework)", () => {
  it("renders block layout when no child has an explicit width", () => {
    const node = makeSection([{ id: "h", type: "Heading", props: {}, style: {} }]);
    const { container } = render(
      <Section node={node} cssStyle={{}}>
        <span data-testid="child">child</span>
      </Section>,
    );
    const section = container.firstElementChild as HTMLElement;
    // No flex applied.
    expect(section.style.display).not.toBe("flex");
  });

  it("switches to flex-row-wrap when ANY child has an explicit width", () => {
    const node = makeSection([
      { id: "a", type: "Section", props: {}, style: { width: "50%" }, children: [] },
      { id: "b", type: "Section", props: {}, style: {}, children: [] },
    ]);
    const { container } = render(
      <Section node={node} cssStyle={{}}>
        <span data-testid="a">a</span>
        <span data-testid="b">b</span>
      </Section>,
    );
    const section = container.firstElementChild as HTMLElement;
    expect(section.style.display).toBe("flex");
    expect(section.style.flexDirection).toBe("row");
    expect(section.style.flexWrap).toBe("wrap");
  });

  it("wraps children with `flex: 0 0 <width>` when they have explicit widths", () => {
    const node = makeSection([
      { id: "a", type: "Section", props: {}, style: { width: "50%" }, children: [] },
      { id: "b", type: "Section", props: {}, style: { width: "50%" }, children: [] },
    ]);
    const { container } = render(
      <Section node={node} cssStyle={{}}>
        <span data-testid="a">a</span>
        <span data-testid="b">b</span>
      </Section>,
    );
    const wrappers = container.firstElementChild?.querySelectorAll(":scope > div");
    expect(wrappers?.length).toBe(2);
    // Each wrapper has flex set per its child's width.
    expect((wrappers?.[0] as HTMLElement).style.flex).toContain("50%");
    expect((wrappers?.[1] as HTMLElement).style.flex).toContain("50%");
  });

  it("wraps width-less children with `flex: 1 1 100%` in flex mode", () => {
    const node = makeSection([
      { id: "a", type: "Section", props: {}, style: { width: "50%" }, children: [] },
      { id: "b", type: "Heading", props: {}, style: {} },
    ]);
    const { container } = render(
      <Section node={node} cssStyle={{}}>
        <span data-testid="a">a</span>
        <span data-testid="b">b</span>
      </Section>,
    );
    const wrappers = container.firstElementChild?.querySelectorAll(":scope > div");
    expect(wrappers?.length).toBe(2);
    expect((wrappers?.[0] as HTMLElement).style.flex).toContain("50%");
    // Child b has no width — defaults to 1 1 100% so it takes its own row.
    expect((wrappers?.[1] as HTMLElement).style.flex).toContain("100%");
  });
});
