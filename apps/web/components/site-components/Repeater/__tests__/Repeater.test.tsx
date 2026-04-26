import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Repeater } from "../index";

function makeNode(props: Record<string, unknown> = {}): ComponentNode {
  return { id: "cmp_rep", type: "Repeater", props, style: {} };
}

const HERE = dirname(fileURLToPath(import.meta.url));
const REPEATER_SOURCE_PATH = join(HERE, "..", "index.tsx");
const REPEATER_SOURCE = readFileSync(REPEATER_SOURCE_PATH, "utf8");

describe("<Repeater>", () => {
  it("renders the first child once inside a wrapper given a minimal valid node", () => {
    const { container } = render(
      <Repeater node={makeNode()} cssStyle={{}}>
        <div data-template="true">child-1</div>
        <div data-template="extra">child-2</div>
      </Repeater>,
    );
    const root = container.querySelector("[data-component-type='Repeater']") as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.getAttribute("data-component-id")).toBe("cmp_rep");
    // Sprint 5 shell: only the FIRST child renders.
    const templates = root?.querySelectorAll("[data-template]");
    expect(templates?.length).toBe(1);
    expect(templates?.[0]?.getAttribute("data-template")).toBe("true");
  });

  it("applies the supplied cssStyle to its root wrapper", () => {
    const { container } = render(
      <Repeater node={makeNode()} cssStyle={{ padding: "16px" }}>
        <div>only</div>
      </Repeater>,
    );
    const root = container.querySelector("[data-component-type='Repeater']") as HTMLElement | null;
    expect(root?.style.padding).toBe("16px");
  });

  it("renders an empty wrapper when no children are provided (defaults / malformed input fall back to empty)", () => {
    const { container } = render(<Repeater node={makeNode({ junk: 1 })} cssStyle={{}} />);
    const root = container.querySelector("[data-component-type='Repeater']") as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.children.length).toBe(0);
  });

  it("does not import from @/lib/rm-api or @tanstack/react-query and does not contain RM-token braces (Sprint 5 invariants)", () => {
    expect(REPEATER_SOURCE).not.toMatch(/@\/lib\/rm-api/);
    expect(REPEATER_SOURCE).not.toMatch(/@tanstack\/react-query/);
    // Compose the substring at runtime so the source file itself doesn't
    // contain the literal "((" pattern with curlies.
    const openBraces = `${"{"}${"{"}`;
    expect(REPEATER_SOURCE.includes(openBraces)).toBe(false);
    expect(REPEATER_SOURCE).not.toMatch(/node\.dataBinding/);
  });
});
