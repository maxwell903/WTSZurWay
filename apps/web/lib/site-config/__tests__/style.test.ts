import { describe, expect, it } from "vitest";
import { styleConfigToCss } from "../style";

describe("styleConfigToCss", () => {
  it("returns an empty object when no style fields are set", () => {
    expect(styleConfigToCss({})).toEqual({});
  });

  it("translates a flat color background", () => {
    expect(styleConfigToCss({ background: { kind: "color", value: "#fff" } })).toEqual({
      background: "#fff",
    });
  });

  it("translates a gradient background with explicit angle", () => {
    expect(
      styleConfigToCss({
        background: { kind: "gradient", from: "#000", to: "#fff", angle: 45 },
      }),
    ).toEqual({ background: "linear-gradient(45deg, #000, #fff)" });
  });

  it("defaults gradient angle to 180 degrees when not specified", () => {
    expect(
      styleConfigToCss({ background: { kind: "gradient", from: "#000", to: "#fff" } }),
    ).toEqual({ background: "linear-gradient(180deg, #000, #fff)" });
  });

  it("translates partial padding (only some sides set)", () => {
    expect(styleConfigToCss({ padding: { top: 10, bottom: 20 } })).toEqual({
      paddingTop: 10,
      paddingBottom: 20,
    });
  });

  it("translates margin on all four sides", () => {
    expect(styleConfigToCss({ margin: { top: 1, right: 2, bottom: 3, left: 4 } })).toEqual({
      marginTop: 1,
      marginRight: 2,
      marginBottom: 3,
      marginLeft: 4,
    });
  });

  it("translates border width, style, and color", () => {
    expect(styleConfigToCss({ border: { width: 2, style: "dashed", color: "#aaa" } })).toEqual({
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: "#aaa",
    });
  });

  it("translates borderRadius to its own CSS property", () => {
    expect(styleConfigToCss({ borderRadius: 8 })).toEqual({ borderRadius: 8 });
  });

  it("maps the 'none' shadow preset to none", () => {
    expect(styleConfigToCss({ shadow: "none" })).toEqual({ boxShadow: "none" });
  });

  it("maps the 'md' shadow preset to a Tailwind-equivalent box-shadow string", () => {
    const css = styleConfigToCss({ shadow: "md" });
    expect(css.boxShadow).toContain("rgb");
    expect(css.boxShadow).not.toBe("none");
  });

  it("passes through width and height as raw CSS strings", () => {
    expect(styleConfigToCss({ width: "100%", height: "auto" })).toEqual({
      width: "100%",
      height: "auto",
    });
  });

  it("maps textColor to the CSS color property", () => {
    expect(styleConfigToCss({ textColor: "#222" })).toEqual({ color: "#222" });
  });
});
