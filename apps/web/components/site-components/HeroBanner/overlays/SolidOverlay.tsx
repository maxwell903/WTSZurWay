"use client";

import type { CSSProperties } from "react";
import type { OverlayConfig } from "../schema";

export type SolidOverlayProps = {
  config: Extract<OverlayConfig, { kind: "solid" }>;
};

// Renders the same fixed-position dimmer the v1 renderer used. The default
// solid overlay (color: "#000000", opacity: 0.45) reproduces the original
// `rgba(0,0,0,0.45)` pixel-for-pixel.
export function SolidOverlay({ config }: SolidOverlayProps) {
  const style: CSSProperties = {
    position: "absolute",
    inset: 0,
    background: rgbaFromHex(config.color, config.opacity),
    zIndex: 1,
  };
  return <div data-hero-overlay="true" style={style} />;
}

function rgbaFromHex(hex: string, opacity: number): string {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match || !match[1]) {
    // Fall back to the historical default if hex is malformed.
    return `rgba(0, 0, 0, ${opacity})`;
  }
  const r = Number.parseInt(match[1].slice(0, 2), 16);
  const g = Number.parseInt(match[1].slice(2, 4), 16);
  const b = Number.parseInt(match[1].slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
