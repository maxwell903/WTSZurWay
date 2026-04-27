"use client";

import { handlePreviewLinkClick } from "@/components/editor/canvas/previewLinkClick";
import { Renderer } from "@/components/renderer";
import type { SiteConfig } from "@/lib/site-config";
import { useState } from "react";

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
export function PreviewClient({ config, initialPageSlug }: PreviewClientProps) {
  const [pageSlug, setPageSlug] = useState(initialPageSlug);
  return (
    <div
      onClick={(e) => {
        handlePreviewLinkClick(e.target, {
          preventDefault: () => e.preventDefault(),
          setCurrentPageSlug: setPageSlug,
          openExternal: (href) => window.open(href, "_blank", "noopener,noreferrer"),
        });
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        handlePreviewLinkClick(e.target, {
          preventDefault: () => e.preventDefault(),
          setCurrentPageSlug: setPageSlug,
          openExternal: (href) => window.open(href, "_blank", "noopener,noreferrer"),
        });
      }}
    >
      <Renderer config={config} page={pageSlug} mode="preview" />
    </div>
  );
}
