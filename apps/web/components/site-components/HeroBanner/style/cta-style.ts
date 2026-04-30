import type { CSSProperties } from "react";
import type { CtaButtonStyle, ElementLayout } from "../schema";

// Maps a sparse CtaButtonStyle override onto a base CSSProperties object.
// Every field is optional; missing fields fall through to the base. The
// merge is intentionally a one-shot replacement (no deep merging) — bg,
// text, border, padding, font-size, and full-width all overwrite the
// base's matching keys when present.
export function mergeCtaStyle(
  base: CSSProperties,
  override: CtaButtonStyle | undefined,
): CSSProperties {
  if (!override) return base;
  const next: CSSProperties = { ...base };
  if (override.backgroundColor !== undefined) next.background = override.backgroundColor;
  if (override.textColor !== undefined) next.color = override.textColor;
  if (
    override.borderWidth !== undefined &&
    override.borderWidth > 0 &&
    override.borderColor !== undefined
  ) {
    next.border = `${override.borderWidth}px solid ${override.borderColor}`;
  } else if (override.borderWidth === 0) {
    next.border = "none";
  }
  if (override.borderRadius !== undefined) next.borderRadius = `${override.borderRadius}px`;
  if (override.paddingX !== undefined || override.paddingY !== undefined) {
    const px = override.paddingX ?? 24;
    const py = override.paddingY ?? 12;
    next.padding = `${py}px ${px}px`;
  }
  if (override.fontSize !== undefined) next.fontSize = `${override.fontSize}px`;
  if (override.fullWidth) {
    next.display = "block";
    next.width = "100%";
    next.textAlign = "center";
  }
  return next;
}

// Applies a per-element layout override (alignSelf, margin, width,
// maxWidth) onto a base style. `applyLayout(undefined)` is a no-op.
// margin uses individual sides so the base's `margin: 0` shorthand stays
// intact for sides the user didn't override (React serialises shorthand
// before per-side props in the inline-style object iteration order).
export function applyElementLayout(
  base: CSSProperties,
  layout: ElementLayout | undefined,
): CSSProperties {
  if (!layout) return base;
  const next: CSSProperties = { ...base };
  if (layout.alignSelf && layout.alignSelf !== "auto") {
    next.alignSelf = ALIGN_SELF_MAP[layout.alignSelf];
  }
  if (layout.margin) {
    if (layout.margin.top !== undefined) next.marginTop = layout.margin.top;
    if (layout.margin.right !== undefined) next.marginRight = layout.margin.right;
    if (layout.margin.bottom !== undefined) next.marginBottom = layout.margin.bottom;
    if (layout.margin.left !== undefined) next.marginLeft = layout.margin.left;
  }
  if (layout.width !== undefined) next.width = layout.width;
  if (layout.maxWidth !== undefined) next.maxWidth = layout.maxWidth;
  if (layout.nowrap) {
    next.whiteSpace = "nowrap";
    // Auto-size to content when the user hasn't pinned width/maxWidth, so
    // toggling "No wrap" alone produces a tight box without forcing them
    // to also tweak the sliders. `maxWidth: none` overrides the
    // subheading's 640px base cap that would otherwise clip the line.
    if (layout.width === undefined) next.width = "max-content";
    if (layout.maxWidth === undefined) next.maxWidth = "none";
  }
  return next;
}

const ALIGN_SELF_MAP: Record<"left" | "center" | "right", CSSProperties["alignSelf"]> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};
