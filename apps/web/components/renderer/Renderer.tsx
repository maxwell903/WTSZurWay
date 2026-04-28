"use client";

import { RowContextProvider } from "@/lib/row-context";
import { backgroundToCss, resolveCanvas, shadowPresetToCss } from "@/lib/site-config";
import type { SiteConfig } from "@/types/site-config";
import type { CSSProperties } from "react";
import { BrandProvider } from "./BrandContext";
import { ComponentRenderer, type Mode } from "./ComponentRenderer";
import { RenderModeProvider } from "./RenderModeContext";
import { SiteConfigProvider } from "./SiteConfigContext";

export type RendererProps = {
  config: SiteConfig;
  page: string;
  mode: Mode;
  selection?: string[];
  onSelect?: (id: string) => void;
  onContextMenu?: (id: string, meta: { isDouble: boolean }) => void;
  // Sprint 9b: detail-page support. PROJECT_SPEC.md §8.12 / §11. When
  // `pageKind === "detail"`, the lookup matches a detail page (slug uniqueness
  // is per-kind, so the U2 routing pattern picks the right variant). When a
  // `row` is also provided, the rootComponent tree is wrapped in a
  // <RowContextProvider kind="detail">, activating the Sprint 9 token
  // resolver hook in ComponentRenderer for descendant `{{ row.* }}` props.
  pageKind?: "static" | "detail";
  row?: unknown;
};

export function Renderer({
  config,
  page,
  mode,
  selection,
  onSelect,
  onContextMenu,
  pageKind,
  row,
}: RendererProps) {
  const effectiveKind: "static" | "detail" = pageKind ?? "static";
  const pageData = config.pages.find((p) => p.slug === page && p.kind === effectiveKind);
  if (!pageData) {
    return <div>Page not found: {page}</div>;
  }

  const tree = (
    <ComponentRenderer
      node={pageData.rootComponent}
      mode={mode}
      selection={selection}
      onSelect={onSelect}
      onContextMenu={onContextMenu}
    />
  );

  // Site-wide canvas: pageBackground sits behind everything, the canvas div
  // (max-width, margin-auto, padding) wraps the entire rendered tree. The
  // tree's DOM is unchanged (no partition), so EditModeWrapper,
  // BetweenDropZone, sticky NavBars, and the root Section's own style all
  // continue to work. NavBar/Footer are constrained to the canvas's
  // max-width — making them visually full-bleed would require hoisting them
  // out of the rootComponent tree, which is currently not how they're
  // stored (they live as direct children of the page rootComponent).
  const canvas = resolveCanvas(config.global.canvas);
  const pageStyle: CSSProperties = {
    minHeight: "100vh",
    background: backgroundToCss(canvas.pageBackground),
  };
  const canvasStyle: CSSProperties = {
    background: backgroundToCss(canvas.canvasBackground),
    maxWidth: canvas.maxWidth === null ? undefined : `${canvas.maxWidth}px`,
    width: "100%",
    marginInline: "auto",
    paddingInline: `${canvas.sidePadding}px`,
    paddingBlock: `${canvas.verticalPadding.top}px ${canvas.verticalPadding.bottom}px`,
    borderRadius: canvas.borderRadius > 0 ? `${canvas.borderRadius}px` : undefined,
    boxShadow: shadowPresetToCss(canvas.shadow),
    display: canvas.sectionGap > 0 ? "flex" : undefined,
    flexDirection: canvas.sectionGap > 0 ? "column" : undefined,
    gap: canvas.sectionGap > 0 ? `${canvas.sectionGap}px` : undefined,
  };

  const wrapped = (
    <div style={pageStyle}>
      <div data-canvas style={canvasStyle}>
        {tree}
      </div>
    </div>
  );

  const withRowContext =
    effectiveKind === "detail" && row !== undefined ? (
      <RowContextProvider row={row} kind="detail">
        {wrapped}
      </RowContextProvider>
    ) : (
      wrapped
    );

  return (
    <SiteConfigProvider config={config}>
      <BrandProvider brand={config.brand}>
        <RenderModeProvider value={mode}>{withRowContext}</RenderModeProvider>
      </BrandProvider>
    </SiteConfigProvider>
  );
}
