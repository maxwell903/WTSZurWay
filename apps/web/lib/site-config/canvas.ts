import type { CanvasConfig, ColorOrGradient, ShadowPreset, Spacing } from "./schema";

// Default values applied when a canvas field is undefined. Resolved at render
// time so users can clear a field to revert without us mutating the stored
// config. Keep these in sync with the test fixture in canvas.test.ts.
export const CANVAS_DEFAULTS = {
  pageBackground: { kind: "color", value: "#f4f4f5" } satisfies ColorOrGradient,
  canvasBackground: { kind: "color", value: "#ffffff" } satisfies ColorOrGradient,
  maxWidth: 1200,
  sidePadding: 24,
  verticalPadding: { top: 32, bottom: 32 } satisfies Spacing,
  sectionGap: 0,
  borderRadius: 0,
} as const;

export type ResolvedCanvas = {
  pageBackground: ColorOrGradient;
  canvasBackground: ColorOrGradient;
  // `null` means the user explicitly opted out of a max-width (full-bleed canvas).
  maxWidth: number | null;
  sidePadding: number;
  verticalPadding: { top: number; bottom: number };
  sectionGap: number;
  borderRadius: number;
  shadow: ShadowPreset | undefined;
};

// `pageBackground === null` is the encoded "user cleared this" state if a
// future UI ever distinguishes "unset" from "transparent". For now both
// undefined and missing fall back to the default.
export function resolveCanvas(canvas: CanvasConfig | undefined): ResolvedCanvas {
  return {
    pageBackground: canvas?.pageBackground ?? CANVAS_DEFAULTS.pageBackground,
    canvasBackground: canvas?.canvasBackground ?? CANVAS_DEFAULTS.canvasBackground,
    maxWidth: canvas?.maxWidth ?? CANVAS_DEFAULTS.maxWidth,
    sidePadding: canvas?.sidePadding ?? CANVAS_DEFAULTS.sidePadding,
    verticalPadding: {
      top: canvas?.verticalPadding?.top ?? CANVAS_DEFAULTS.verticalPadding.top,
      bottom: canvas?.verticalPadding?.bottom ?? CANVAS_DEFAULTS.verticalPadding.bottom,
    },
    sectionGap: canvas?.sectionGap ?? CANVAS_DEFAULTS.sectionGap,
    borderRadius: canvas?.borderRadius ?? CANVAS_DEFAULTS.borderRadius,
    shadow: canvas?.shadow,
  };
}
