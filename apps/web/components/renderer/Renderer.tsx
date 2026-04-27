"use client";

import { RowContextProvider } from "@/lib/row-context";
import type { SiteConfig } from "@/types/site-config";
import { ComponentRenderer, type Mode } from "./ComponentRenderer";
import { SiteConfigProvider } from "./SiteConfigContext";

export type RendererProps = {
  config: SiteConfig;
  page: string;
  mode: Mode;
  selection?: string[];
  onSelect?: (id: string) => void;
  onContextMenu?: (id: string) => void;
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

  const wrappedTree =
    effectiveKind === "detail" && row !== undefined ? (
      <RowContextProvider row={row} kind="detail">
        {tree}
      </RowContextProvider>
    ) : (
      tree
    );

  return <SiteConfigProvider config={config}>{wrappedTree}</SiteConfigProvider>;
}
