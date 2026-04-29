import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LinearOverlay } from "../overlays/LinearOverlay";
import { RadialOverlay } from "../overlays/RadialOverlay";
import { SolidOverlay } from "../overlays/SolidOverlay";

describe("overlay components", () => {
  it("SolidOverlay renders an absolute div with `data-hero-overlay='true'` and the rgba background", () => {
    const { container } = render(
      <SolidOverlay config={{ kind: "solid", color: "#000000", opacity: 0.45 }} />,
    );
    const el = container.querySelector("[data-hero-overlay='true']") as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.style.background).toBe("rgba(0, 0, 0, 0.45)");
    expect(el.style.position).toBe("absolute");
  });

  it("LinearOverlay renders a linear-gradient with the configured angle and stops", () => {
    const { container } = render(
      <LinearOverlay
        config={{
          kind: "linear",
          angle: 90,
          stops: [
            { color: "#000000", opacity: 0, position: 0 },
            { color: "#ff0000", opacity: 0.5, position: 100 },
          ],
        }}
      />,
    );
    const el = container.querySelector("[data-hero-overlay='true']") as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.getAttribute("data-hero-overlay-kind")).toBe("linear");
    expect(el.style.background).toBe(
      "linear-gradient(90deg, rgba(0, 0, 0, 0) 0%, rgba(255, 0, 0, 0.5) 100%)",
    );
  });

  it("LinearOverlay falls back to default stops when the config has none", () => {
    const { container } = render(
      <LinearOverlay config={{ kind: "linear", angle: 180, stops: [] }} />,
    );
    const el = container.querySelector("[data-hero-overlay='true']") as HTMLElement;
    expect(el.style.background).toBe(
      "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.6) 100%)",
    );
  });

  it("RadialOverlay maps `center: top|center|bottom` to circle positions", () => {
    // jsdom doesn't parse radial-gradient into the style.background
    // shorthand reliably, so assert on the raw style attribute instead.
    const top = render(
      <RadialOverlay
        config={{
          kind: "radial",
          center: "top",
          stops: [{ color: "#000000", opacity: 0.5, position: 50 }],
        }}
      />,
    );
    const elTop = top.container.querySelector("[data-hero-overlay='true']") as HTMLElement;
    // jsdom's CSS parser silently drops `background: radial-gradient(...)`
    // from inline style, so assert on a dedicated data attribute the
    // RadialOverlay exposes for testability.
    expect(elTop.getAttribute("data-hero-overlay-center")).toBe("top");
    expect(elTop.getAttribute("data-hero-overlay-kind")).toBe("radial");

    const bottom = render(
      <RadialOverlay
        config={{
          kind: "radial",
          center: "bottom",
          stops: [{ color: "#000000", opacity: 0.5, position: 50 }],
        }}
      />,
    );
    const elBottom = bottom.container.querySelector("[data-hero-overlay='true']") as HTMLElement;
    expect(elBottom.getAttribute("data-hero-overlay-center")).toBe("bottom");
  });
});
