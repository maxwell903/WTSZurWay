import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import type { ComponentNode, SiteConfig } from "@/lib/site-config";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TextEffectsSubsection } from "../edit-panel/effects/TextEffectsSubsection";
import { CountdownTimer } from "../effects/CountdownTimer";
import { RotatingHeading } from "../effects/RotatingHeading";

// ---------------- RotatingHeading ----------------

describe("<RotatingHeading>", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders the heading verbatim when no {rotator} token is present", () => {
    const { container } = render(
      <RotatingHeading
        heading="Plain heading"
        rotatingWords={["a", "b"]}
        prefersReducedMotion={false}
      />,
    );
    expect(container.textContent).toBe("Plain heading");
  });

  it("renders the literal {rotator} when rotatingWords is empty", () => {
    const { container } = render(
      <RotatingHeading heading="Build {rotator} faster" prefersReducedMotion={false} />,
    );
    expect(container.textContent).toContain("{rotator}");
  });

  it("substitutes the first word initially when rotatingWords is provided", () => {
    const { container } = render(
      <RotatingHeading
        heading="Build {rotator} faster"
        rotatingWords={["websites", "apps", "forms"]}
        prefersReducedMotion={false}
      />,
    );
    expect(container.textContent).toBe("Build websites faster");
  });

  it("cycles to the next word after 2.5 seconds", () => {
    const { container } = render(
      <RotatingHeading
        heading="Build {rotator} faster"
        rotatingWords={["websites", "apps", "forms"]}
        prefersReducedMotion={false}
      />,
    );
    expect(container.textContent).toBe("Build websites faster");
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(container.textContent).toBe("Build apps faster");
  });

  it("under reduced motion: picks the first word and does not cycle", () => {
    const { container } = render(
      <RotatingHeading
        heading="Build {rotator} faster"
        rotatingWords={["websites", "apps"]}
        prefersReducedMotion={true}
      />,
    );
    expect(container.textContent).toBe("Build websites faster");
    expect(container.querySelector("[data-hero-rotator='static']")).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(container.textContent).toBe("Build websites faster");
  });
});

// ---------------- CountdownTimer ----------------

describe("<CountdownTimer>", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T12:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("returns null when no countdown prop is provided", () => {
    const { container } = render(<CountdownTimer countdown={undefined} />);
    expect(container.querySelector("[data-hero-countdown]")).toBeNull();
  });

  it("renders d/h/m/s remaining for a future target", () => {
    const { container } = render(
      <CountdownTimer
        countdown={{ targetIso: "2026-04-29T13:30:45.000Z", label: "Launching in" }}
      />,
    );
    const el = container.querySelector("[data-hero-countdown='ticking']");
    expect(el).not.toBeNull();
    // 2026-04-29T13:30:45 minus 2026-04-28T12:00:00 = 1d 1h 30m 45s
    expect(container.querySelector("[data-hero-countdown-unit='d']")?.textContent).toContain("01");
    expect(container.querySelector("[data-hero-countdown-unit='h']")?.textContent).toContain("01");
    expect(container.querySelector("[data-hero-countdown-unit='m']")?.textContent).toContain("30");
    expect(container.querySelector("[data-hero-countdown-unit='s']")?.textContent).toContain("45");
    expect(container.querySelector("[data-hero-countdown-label='true']")?.textContent).toBe(
      "Launching in",
    );
  });

  it("ticks every second", () => {
    const { container } = render(
      <CountdownTimer countdown={{ targetIso: "2026-04-28T12:00:10.000Z" }} />,
    );
    expect(container.querySelector("[data-hero-countdown-unit='s']")?.textContent).toContain("10");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(container.querySelector("[data-hero-countdown-unit='s']")?.textContent).toContain("09");
  });

  it("switches to expiredLabel after the target is reached (uses default 'Now live' when omitted)", () => {
    const { container, rerender } = render(
      <CountdownTimer countdown={{ targetIso: "2026-04-28T12:00:01.000Z" }} />,
    );
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    rerender(<CountdownTimer countdown={{ targetIso: "2026-04-28T12:00:01.000Z" }} />);
    const expired = container.querySelector("[data-hero-countdown='expired']");
    expect(expired?.textContent).toBe("Now live");
  });

  it("uses the supplied expiredLabel when provided", () => {
    const { container } = render(
      <CountdownTimer
        countdown={{ targetIso: "2026-04-27T12:00:00.000Z", expiredLabel: "We're live!" }}
      />,
    );
    expect(container.querySelector("[data-hero-countdown='expired']")?.textContent).toBe(
      "We're live!",
    );
  });
});

// ---------------- TextEffectsSubsection ----------------

function makeFixtureConfig(heroProps: Record<string, unknown>): SiteConfig {
  return {
    meta: { siteName: "X", siteSlug: "x" },
    brand: { palette: "ocean", fontFamily: "Inter" },
    global: {
      navBar: { links: [], logoPlacement: "left", sticky: false },
      footer: { columns: [], copyright: "" },
    },
    pages: [
      {
        id: "p_home",
        slug: "home",
        name: "Home",
        kind: "static",
        rootComponent: {
          id: "cmp_root",
          type: "Section",
          props: {},
          style: {},
          children: [{ id: "cmp_hero", type: "HeroBanner", props: heroProps, style: {} }],
        },
      },
    ],
    forms: [],
  };
}

function findById(root: ComponentNode, id: string): ComponentNode | null {
  if (root.id === id) return root;
  for (const c of root.children ?? []) {
    const f = findById(c, id);
    if (f) return f;
  }
  return null;
}

function getNode(id: string): ComponentNode {
  const page = useEditorStore.getState().draftConfig.pages[0];
  if (!page) throw new Error("no page");
  const found = findById(page.rootComponent, id);
  if (!found) throw new Error(`no node ${id}`);
  return found;
}

function hydrateWith(heroProps: Record<string, unknown>) {
  __resetEditorStoreForTests();
  useEditorStore.getState().hydrate({
    siteId: "s",
    siteSlug: "x",
    workingVersionId: "v",
    initialConfig: makeFixtureConfig(heroProps),
  });
}

function PanelHost() {
  const node = useEditorStore((s) => {
    for (const page of s.draftConfig.pages) {
      const found = findById(page.rootComponent, "cmp_hero");
      if (found) return found;
    }
    return null;
  });
  if (!node) return null;
  const setComponentProps = useEditorStore.getState().setComponentProps;
  return (
    <TextEffectsSubsection
      node={node}
      writePartial={(patch) => setComponentProps(node.id, { ...node.props, ...patch })}
    />
  );
}

describe("<TextEffectsSubsection>", () => {
  beforeEach(() => hydrateWith({ heading: "X" }));

  it("editing rotating words writes a parsed string array (split by comma)", () => {
    render(<PanelHost />);
    fireEvent.change(screen.getByTestId("hero-rotating-words"), {
      target: { value: "websites, apps , forms" },
    });
    expect(getNode("cmp_hero").props.rotatingWords).toEqual(["websites", "apps", "forms"]);
  });

  it("clearing rotating words writes undefined (removes the prop)", () => {
    hydrateWith({ heading: "X", rotatingWords: ["a", "b"] });
    render(<PanelHost />);
    fireEvent.change(screen.getByTestId("hero-rotating-words"), {
      target: { value: "" },
    });
    expect(getNode("cmp_hero").props.rotatingWords).toBeUndefined();
  });

  it("editing the countdown label writes through (when a countdown already exists)", () => {
    hydrateWith({ heading: "X", countdown: { targetIso: "2026-12-31T23:59:00.000Z" } });
    render(<PanelHost />);
    fireEvent.change(screen.getByTestId("hero-countdown-label"), {
      target: { value: "Launching in" },
    });
    const cd = getNode("cmp_hero").props.countdown as { label?: string };
    expect(cd.label).toBe("Launching in");
  });
});
