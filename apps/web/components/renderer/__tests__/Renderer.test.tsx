import { type SiteComponentProps, componentRegistry } from "@/components/site-components/registry";
import type { ComponentNode, SiteConfig } from "@/types/site-config";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Renderer } from "../Renderer";

function makeConfig(headingTextA: string, headingTextB: string): SiteConfig {
  const root: ComponentNode = {
    id: "cmp_root",
    type: "Section",
    props: {},
    style: {},
    children: [
      {
        id: "cmp_a",
        type: "Heading",
        props: { text: headingTextA, level: 1 },
        style: {},
      },
      {
        id: "cmp_b",
        type: "Heading",
        props: { text: headingTextB, level: 2 },
        style: {},
      },
    ],
  };
  return {
    meta: { siteName: "T", siteSlug: "t" },
    brand: { palette: "ocean", fontFamily: "Inter" },
    global: {
      navBar: { links: [], logoPlacement: "left", sticky: false },
      footer: { columns: [], copyright: "" },
    },
    pages: [{ id: "p_home", slug: "home", name: "Home", kind: "static", rootComponent: root }],
    forms: [],
  };
}

describe("<Renderer>", () => {
  it("renders the configured page in preview mode without any data-edit-* attributes", () => {
    const { container, getByText } = render(
      <Renderer config={makeConfig("Hello", "World")} page="home" mode="preview" />,
    );
    expect(getByText("Hello")).toBeInTheDocument();
    expect(getByText("World")).toBeInTheDocument();
    expect(container.querySelector("[data-edit-id]")).toBeNull();
  });

  it("wraps every node in EditModeWrapper when mode is 'edit'", () => {
    const { container } = render(
      <Renderer config={makeConfig("Hello", "World")} page="home" mode="edit" />,
    );
    // root + 2 headings = 3 wrappers
    expect(container.querySelectorAll("[data-edit-id]").length).toBe(3);
    expect(container.querySelector("[data-edit-id='cmp_root']")).not.toBeNull();
    expect(container.querySelector("[data-edit-id='cmp_a']")).not.toBeNull();
    expect(container.querySelector("[data-edit-id='cmp_b']")).not.toBeNull();
  });

  it("does NOT wrap in 'public' mode either", () => {
    const { container } = render(
      <Renderer config={makeConfig("A", "B")} page="home" mode="public" />,
    );
    expect(container.querySelector("[data-edit-id]")).toBeNull();
  });

  it("renders 'Page not found: {slug}' when the slug isn't in the config", () => {
    const { getByText } = render(
      <Renderer config={makeConfig("A", "B")} page="missing" mode="preview" />,
    );
    expect(getByText("Page not found: missing")).toBeInTheDocument();
  });

  it("leaves `{{ row.* }}` tokens verbatim on static pages outside any Repeater (token-leak guard)", () => {
    // Sprint 9 §8.12: tokens not resolved against any in-scope row pass
    // through verbatim, matching the Sprint 5 shell behavior.
    const { getByText } = render(
      <Renderer config={makeConfig("{{ row.unitName }}", "Plain")} page="home" mode="preview" />,
    );
    expect(getByText("{{ row.unitName }}")).toBeInTheDocument();
  });

  it("propagates 'selected' state through to EditModeWrapper", () => {
    const { container } = render(
      <Renderer config={makeConfig("A", "B")} page="home" mode="edit" selection={["cmp_a"]} />,
    );
    expect(
      container.querySelector("[data-edit-id='cmp_a'][data-edit-selected='true']"),
    ).not.toBeNull();
    expect(container.querySelector("[data-edit-id='cmp_b'][data-edit-selected='true']")).toBeNull();
  });

  describe("memoization", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("does NOT re-render an unchanged sibling when only one sibling node reference changes", () => {
      // Spy on the real Heading component to count renders. ComponentRenderer
      // is memoized, so unchanged sibling props (same node reference) should
      // skip the inner function entirely on rerender.
      const original = componentRegistry.Heading.Component;
      // ComponentType<P> is ComponentClass | FunctionComponent; vi.fn() expects
      // a plain Procedure. Narrow to the FunctionComponent branch — Heading is
      // a function component in our registry, so this is safe.
      type HeadingFn = (props: SiteComponentProps) => ReactNode;
      const spy = vi.fn(original as HeadingFn);
      componentRegistry.Heading.Component = spy as typeof original;

      try {
        const config1 = makeConfig("A", "B");
        // Snapshot the unchanged sibling reference so we can reuse it below.
        const root1 = config1.pages[0]?.rootComponent;
        if (!root1?.children) {
          throw new Error("test fixture invariant: root has children");
        }
        const siblingB = root1.children[1];
        if (!siblingB) {
          throw new Error("test fixture invariant: siblingB exists");
        }

        const { rerender } = render(<Renderer config={config1} page="home" mode="preview" />);
        const initialCalls = spy.mock.calls.length;
        // Both Headings should have rendered once each on the first pass.
        expect(initialCalls).toBe(2);

        // Build a NEW config where sibling A's node is a fresh object but
        // sibling B is the SAME reference as before. The page and root are
        // also new objects so the parent definitely re-renders.
        const newA: ComponentNode = {
          id: "cmp_a",
          type: "Heading",
          props: { text: "Aprime", level: 1 },
          style: {},
        };
        const config2: SiteConfig = {
          ...config1,
          pages: [
            {
              ...config1.pages[0],
              id: config1.pages[0]?.id ?? "p_home",
              slug: config1.pages[0]?.slug ?? "home",
              name: config1.pages[0]?.name ?? "Home",
              kind: config1.pages[0]?.kind ?? "static",
              rootComponent: {
                ...root1,
                children: [newA, siblingB],
              },
            },
          ],
        };
        rerender(<Renderer config={config2} page="home" mode="preview" />);

        // Only sibling A should have re-rendered; B was passed by reference
        // and React.memo's shallow check should have skipped it.
        const newCalls = spy.mock.calls.length - initialCalls;
        expect(newCalls).toBe(1);
      } finally {
        componentRegistry.Heading.Component = original;
      }
    });
  });
});
