"use client";

import { useEditorStore } from "@/lib/editor-state";
import { findComponentTrail } from "@/lib/editor-state/store";
import { useMemo } from "react";

export function SelectionBreadcrumb() {
  // Subscribe to scalars + the draftConfig reference so the selector returns
  // stable values for useSyncExternalStore. Computing the trail inside a
  // useMemo avoids returning a fresh array per render (which would loop the
  // store subscription).
  const selectedId = useEditorStore((s) => s.selectedComponentId);
  const currentPageSlug = useEditorStore((s) => s.currentPageSlug);
  const pages = useEditorStore((s) => s.draftConfig.pages);

  const trail = useMemo(() => {
    if (!selectedId) return [];
    const page =
      pages.find((p) => p.slug === currentPageSlug && p.kind === "static") ??
      pages.find((p) => p.slug === currentPageSlug);
    // FlowGroup is engine-managed and never user-visible — hide it from the
    // breadcrumb so e.g. a Heading inside a FlowGroup inside a Section reads
    // as "Section / Heading", not "Section / Flow Group / Heading".
    return findComponentTrail(page?.rootComponent, selectedId).filter(
      (n) => n.type !== "FlowGroup",
    );
  }, [selectedId, currentPageSlug, pages]);

  if (trail.length === 0) return null;
  return (
    <div
      data-testid="selection-breadcrumb"
      className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md border border-zinc-700 bg-zinc-900/90 px-2 py-1 text-[11px] text-zinc-300 shadow-lg backdrop-blur"
    >
      {trail.map((node, idx) => (
        <span key={node.id}>
          {idx > 0 ? <span className="px-1 text-zinc-600">/</span> : null}
          {node.type}
        </span>
      ))}
    </div>
  );
}
