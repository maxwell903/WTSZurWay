import type { CSSProperties } from "react";
import type { ColorOrGradient, ShadowPreset, StyleConfig } from "./schema";

const SHADOW_VALUES: Record<ShadowPreset, string> = {
  none: "none",
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
};

export function backgroundToCss(bg: ColorOrGradient | undefined): string | undefined {
  if (!bg) return undefined;
  if (bg.kind === "color") return bg.value;
  const angle = bg.angle ?? 180;
  return `linear-gradient(${angle}deg, ${bg.from}, ${bg.to})`;
}

export function shadowPresetToCss(shadow: ShadowPreset | undefined): string | undefined {
  if (shadow === undefined) return undefined;
  return SHADOW_VALUES[shadow];
}

export function styleConfigToCss(style: StyleConfig): CSSProperties {
  const css: CSSProperties = {};

  const bg = backgroundToCss(style.background);
  if (bg !== undefined) css.background = bg;

  if (style.padding) {
    if (style.padding.top !== undefined) css.paddingTop = style.padding.top;
    if (style.padding.right !== undefined) css.paddingRight = style.padding.right;
    if (style.padding.bottom !== undefined) css.paddingBottom = style.padding.bottom;
    if (style.padding.left !== undefined) css.paddingLeft = style.padding.left;
  }

  if (style.margin) {
    if (style.margin.top !== undefined) css.marginTop = style.margin.top;
    if (style.margin.right !== undefined) css.marginRight = style.margin.right;
    if (style.margin.bottom !== undefined) css.marginBottom = style.margin.bottom;
    if (style.margin.left !== undefined) css.marginLeft = style.margin.left;
  }

  if (style.border) {
    css.borderWidth = style.border.width;
    css.borderStyle = style.border.style;
    css.borderColor = style.border.color;
  }

  if (style.borderRadius !== undefined) {
    css.borderRadius = style.borderRadius;
  }

  const shadow = shadowPresetToCss(style.shadow);
  if (shadow !== undefined) css.boxShadow = shadow;

  if (style.width !== undefined) {
    css.width = style.width;
  }

  if (style.height !== undefined) {
    css.height = style.height;
  }

  if (style.textColor !== undefined) {
    css.color = style.textColor;
  }

  return css;
}
