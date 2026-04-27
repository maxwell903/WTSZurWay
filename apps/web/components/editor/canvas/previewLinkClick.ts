// Pure helper that decides what to do when a click in preview mode lands on
// (or inside) a link element. Extracted from Canvas.tsx so the policy is unit
// testable without rendering the whole canvas.
//
// Behavior (PROJECT_SPEC.md §8.11 — "Clicking links navigates between pages
// in preview"):
//
//   1. Walk up to the nearest <a>. If no anchor, do nothing.
//   2. If the anchor carries `data-internal-page-slug`, swap the editor
//      canvas to that page and prevent the native navigation.
//   3. If the anchor's href is an http(s) URL, open it in a new tab so the
//      user keeps their place in the editor.
//   4. Otherwise (hashes, mailto:, tel:, in-page anchors), fall through to
//      native browser handling.
//
// The return value tells the caller whether the click was handled — Canvas
// uses this to decide whether the background-click deselect logic still
// applies.

export type PreviewLinkClickDeps = {
  preventDefault: () => void;
  setCurrentPageSlug: (slug: string) => void;
  openExternal: (href: string) => void;
};

export function handlePreviewLinkClick(
  target: EventTarget | null,
  deps: PreviewLinkClickDeps,
): "internal" | "external" | "passthrough" | "no-anchor" {
  if (!(target instanceof Element)) return "no-anchor";
  const anchor = target.closest("a");
  if (!anchor) return "no-anchor";

  const internalSlug = anchor.getAttribute("data-internal-page-slug");
  if (internalSlug) {
    deps.preventDefault();
    deps.setCurrentPageSlug(internalSlug);
    return "internal";
  }

  const href = anchor.getAttribute("href") ?? "";
  if (/^https?:\/\//i.test(href)) {
    deps.preventDefault();
    deps.openExternal(href);
    return "external";
  }

  return "passthrough";
}
