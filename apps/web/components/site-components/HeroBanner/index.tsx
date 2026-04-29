"use client";

import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { usePrefersReducedMotion } from "./hooks/usePrefersReducedMotion";
import { CenteredLayout } from "./layouts/CenteredLayout";
import { FullBleedLayout } from "./layouts/FullBleedLayout";
import { SplitLayout } from "./layouts/SplitLayout";
import { HERO_BANNER_FALLBACK, type HeroBannerData, heroBannerPropsSchema } from "./schema";

type HeroBannerProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

// Wave 2 thin entry. Parses props via the v2 schema, builds the shared
// container/content/cta inline styles the layouts share, and dispatches
// to the layout component selected by `data.layout`. Wave 3 sprints fill
// in layouts/effects/overlays without re-editing this file.
export function HeroBanner({ node, cssStyle }: HeroBannerProps) {
  const parsed = heroBannerPropsSchema.safeParse(node.props);
  const data: HeroBannerData = parsed.success ? parsed.data : HERO_BANNER_FALLBACK;
  const prefersReducedMotion = usePrefersReducedMotion();

  const containerStyle: CSSProperties = {
    position: "relative",
    height: data.height,
    width: "100%",
    overflow: "hidden",
    backgroundImage: data.backgroundImage ? `url(${data.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    color: "#ffffff",
    ...cssStyle,
  };

  const contentStyle: CSSProperties = {
    position: "relative",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    height: "100%",
    width: "100%",
    padding: "32px",
    textAlign: "center",
  };

  const ctaStyle: CSSProperties = {
    display: "inline-block",
    padding: "12px 24px",
    background: "#ffffff",
    color: "#0f3a5f",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 600,
  };

  const layoutProps = {
    node,
    data,
    containerStyle,
    contentStyle,
    ctaStyle,
    prefersReducedMotion,
  };

  if (data.layout === "split-left") return <SplitLayout {...layoutProps} side="left" />;
  if (data.layout === "split-right") return <SplitLayout {...layoutProps} side="right" />;
  if (data.layout === "full-bleed") return <FullBleedLayout {...layoutProps} />;
  return <CenteredLayout {...layoutProps} />;
}
