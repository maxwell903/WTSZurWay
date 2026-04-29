import type { ComponentNode } from "@/types/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroBanner } from "../index";
import { heroPresets, parsePreset } from "../presets";
import { heroBannerPropsSchema } from "../schema";

function makeNode(props: Record<string, unknown>): ComponentNode {
  return { id: "cmp_preset", type: "HeroBanner", props, style: {} };
}

function getRoot(container: HTMLElement): HTMLElement | null {
  return container.querySelector("[data-component-type='HeroBanner']") as HTMLElement | null;
}

describe("hero presets — registry shape", () => {
  it("ships exactly 5 presets with the spec's IDs", () => {
    const ids = heroPresets.map((p) => p.id).sort();
    expect(ids).toEqual([
      "centered-carousel",
      "cinematic-video",
      "logo-marquee",
      "minimalist",
      "split-hero",
    ]);
  });

  it("every preset has name + description + tooltip + props", () => {
    for (const preset of heroPresets) {
      expect(preset.name.length).toBeGreaterThan(0);
      expect(preset.description.length).toBeGreaterThan(0);
      expect(preset.tooltip.length).toBeGreaterThan(0);
      expect(typeof preset.props).toBe("object");
    }
  });

  it("every preset round-trips cleanly through heroBannerPropsSchema.parse()", () => {
    for (const preset of heroPresets) {
      expect(() => heroBannerPropsSchema.parse(preset.props)).not.toThrow();
    }
  });

  it("parsePreset() returns a fully-defaulted HeroBannerData", () => {
    for (const preset of heroPresets) {
      const data = parsePreset(preset);
      // All required defaults are filled in:
      expect(data.heading).toBeDefined();
      expect(data.height).toBeDefined();
      expect(data.layout).toBeDefined();
      expect(data.slideTransition).toBeDefined();
    }
  });
});

describe("hero presets — render correctness (the 5 fixtures hit the right code paths)", () => {
  it("'cinematic-video' renders full-bleed layout with one video slide", () => {
    const preset = heroPresets.find((p) => p.id === "cinematic-video");
    if (!preset) throw new Error("cinematic-video missing");
    const { container } = render(
      <HeroBanner node={makeNode(preset.props as Record<string, unknown>)} cssStyle={{}} />,
    );
    const root = getRoot(container);
    expect(root?.getAttribute("data-hero-layout")).toBe("full-bleed");
    expect(root?.querySelector("video[data-hero-slide]")).not.toBeNull();
  });

  it("'split-hero' renders split-right layout with media + text panes", () => {
    const preset = heroPresets.find((p) => p.id === "split-hero");
    if (!preset) throw new Error("split-hero missing");
    const { container } = render(
      <HeroBanner node={makeNode(preset.props as Record<string, unknown>)} cssStyle={{}} />,
    );
    const root = getRoot(container);
    expect(root?.getAttribute("data-hero-layout")).toBe("split-right");
    expect(root?.querySelector("[data-hero-split-pane='media']")).not.toBeNull();
    expect(root?.querySelector("[data-hero-split-pane='text']")).not.toBeNull();
    // Dual CTA renders both buttons
    expect(root?.querySelector("[data-hero-cta='primary']")).not.toBeNull();
    expect(root?.querySelector("[data-hero-cta='secondary']")).not.toBeNull();
  });

  it("'centered-carousel' renders centered layout with 3 stacked image slides", () => {
    const preset = heroPresets.find((p) => p.id === "centered-carousel");
    if (!preset) throw new Error("centered-carousel missing");
    const { container } = render(
      <HeroBanner node={makeNode(preset.props as Record<string, unknown>)} cssStyle={{}} />,
    );
    const root = getRoot(container);
    expect(root?.getAttribute("data-hero-layout")).toBe("centered");
    const slides = root?.querySelectorAll("img[data-hero-slide]") ?? [];
    expect(slides.length).toBe(3);
  });

  it("'minimalist' renders centered with no slides and the rotator-substituted heading", () => {
    const preset = heroPresets.find((p) => p.id === "minimalist");
    if (!preset) throw new Error("minimalist missing");
    const { container } = render(
      <HeroBanner node={makeNode(preset.props as Record<string, unknown>)} cssStyle={{}} />,
    );
    const root = getRoot(container);
    expect(root?.getAttribute("data-hero-layout")).toBe("centered");
    expect(root?.querySelector("img[data-hero-slide]")).toBeNull();
    // First rotating word substituted
    expect(root?.querySelector("h1")?.textContent).toContain("websites");
    // Particles attached
    expect(root?.querySelector("[data-hero-particles-kind='stars']")).not.toBeNull();
  });

  it("'logo-marquee' renders centered with a logo strip pinned to the bottom", () => {
    const preset = heroPresets.find((p) => p.id === "logo-marquee");
    if (!preset) throw new Error("logo-marquee missing");
    const { container } = render(
      <HeroBanner node={makeNode(preset.props as Record<string, unknown>)} cssStyle={{}} />,
    );
    const root = getRoot(container);
    expect(root?.getAttribute("data-hero-layout")).toBe("centered");
    const marquee = root?.querySelector("[data-hero-logo-marquee='true']");
    expect(marquee).not.toBeNull();
    // Doubled list (6 logos × 2)
    expect(marquee?.querySelectorAll("img").length).toBe(12);
  });
});
