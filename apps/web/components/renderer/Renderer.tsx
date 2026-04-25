"use client";

import type { SiteConfig } from "@/types/site-config";
import { ComponentRenderer, type Mode } from "./ComponentRenderer";

export type RendererProps = {
  config: SiteConfig;
  page: string;
  mode: Mode;
  selection?: string[];
  onSelect?: (id: string) => void;
  onContextMenu?: (id: string) => void;
};

export function Renderer({
  config,
  page,
  mode,
  selection,
  onSelect,
  onContextMenu,
}: RendererProps) {
  const pageData = config.pages.find((p) => p.slug === page);
  if (!pageData) {
    return <div>Page not found: {page}</div>;
  }

  return (
    <ComponentRenderer
      node={pageData.rootComponent}
      mode={mode}
      selection={selection}
      onSelect={onSelect}
      onContextMenu={onContextMenu}
    />
  );
}
