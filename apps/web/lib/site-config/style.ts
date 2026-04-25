import type { CSSProperties } from "react";
import type { ShadowPreset, StyleConfig } from "./schema";

const SHADOW_VALUES: Record<ShadowPreset, string> = {
  none: "none",
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
};

export function styleConfigToCss(style: StyleConfig): CSSProperties {
  const css: CSSProperties = {};

  if (style.background) {
    if (style.background.kind === "color") {
      css.background = style.background.value;
    } else {
      const angle = style.background.angle ?? 180;
      css.background = `linear-gradient(${angle}deg, ${style.background.from}, ${style.background.to})`;
    }
  }

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

  if (style.shadow !== undefined) {
    css.boxShadow = SHADOW_VALUES[style.shadow];
  }

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
