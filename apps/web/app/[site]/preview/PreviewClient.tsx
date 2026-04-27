"use client";

import { handlePreviewLinkClick } from "@/components/editor/canvas/previewLinkClick";
import { Renderer } from "@/components/renderer";
import type { SiteConfig } from "@/lib/site-config";
import { useMemo, useState } from "react";

export type PreviewClientProps = {
  config: SiteConfig;
  initialPageSlug: string;
};

// Standalone preview wrapper. NavBar (and Button) anchors emit
// `data-internal-page-slug`; this delegated click handler swaps the
// rendered page in local state instead of letting the browser navigate
// to a `/${slug}` URL that doesn't exist at the top level. Mirrors the
// editor canvas's preview-mode behavior so all three viewing surfaces
// (preview URL, edit canvas, edit-with-preview-toggle) feel the same.
//
// `knownPageSlugs` is also handed to the interceptor so legacy links
// without `data-internal-page-slug` (root-relative hrefs from configs
// generated before page-kind links shipped) still swap pages instead of
// 404'ing.
export function PreviewClient({ config, initialPageSlug }: PreviewClientProps) {
  const [pageSlug, setPageSlug] = useState(initialPageSlug);
  const knownPageSlugs = useMemo(
    () =>
      new Set(
        config.pages.filter((p) => p.kind === "static").map((p) => p.slug),
      ),
    [config.pages],
  );
  const deps = {
    setCurrentPageSlug: setPageSlug,
    openExternal: (href: string) => window.open(href, "_blank", "noopener,noreferrer"),
  };
  return (
    <div
      onClick={(e) => {
        handlePreviewLinkClick(
          e.target,
          { ...deps, preventDefault: () => e.preventDefault() },
          knownPageSlugs,
        );
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        handlePreviewLinkClick(
          e.target,
          { ...deps, preventDefault: () => e.preventDefault() },
          knownPageSlugs,
        );
      }}
    >
      <Renderer config={config} page={pageSlug} mode="preview" />
    </div>
  );
}
