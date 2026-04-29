"use client";

import type { CSSProperties } from "react";
import type { OverlayConfig } from "../schema";

export type LinearOverlayProps = {
  config: Extract<OverlayConfig, { kind: "linear" }>;
};

export function LinearOverlay({ config }: LinearOverlayProps) {
  const stops = config.stops.length > 0 ? config.stops : DEFAULT_STOPS;
  const stopList = stops
    .map((stop) => `${rgbaFromHex(stop.color, stop.opacity)} ${stop.position}%`)
    .join(", ");
  const style: CSSProperties = {
    position: "absolute",
    inset: 0,
    background: `linear-gradient(${config.angle}deg, ${stopList})`,
    zIndex: 1,
  };
  return <div data-hero-overlay="true" data-hero-overlay-kind="linear" style={style} />;
}

const DEFAULT_STOPS = [
  { color: "#000000", opacity: 0, position: 0 },
  { color: "#000000", opacity: 0.6, position: 100 },
];

function rgbaFromHex(hex: string, opacity: number): string {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match || !match[1]) return `rgba(0, 0, 0, ${opacity})`;
  const r = Number.parseInt(match[1].slice(0, 2), 16);
  const g = Number.parseInt(match[1].slice(2, 4), 16);
  const b = Number.parseInt(match[1].slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
