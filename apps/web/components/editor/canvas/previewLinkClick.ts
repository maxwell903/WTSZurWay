// Pure helper that decides what to do when a click in preview mode lands on
// (or inside) a link element. Extracted from Canvas.tsx so the policy is unit
// testable without rendering the whole canvas.
//
// Behavior:
//
//   1. Walk up to the nearest <a>. If no anchor, do nothing.
//   2. If the anchor carries `data-internal-page-slug`, swap the editor
//      canvas to that page and prevent the native navigation.
//   3. If `knownPageSlugs` is provided and the anchor's href is a root-
//      relative path matching a known slug (e.g. `/about` for an "about"
//      page, or `/` for "home"), treat it as internal too. This catches
//      retroactive sites whose NavBar links predate the page-kind shape.
//   4. If the anchor's href is an http(s) URL, open it in a new tab so the
//      user keeps their place in the editor.
//   5. Otherwise (hashes, mailto:, tel:, in-page anchors), fall through to
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
  knownPageSlugs?: ReadonlySet<string>,
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

  if (knownPageSlugs) {
    const matched = matchKnownSlug(href, knownPageSlugs);
    if (matched) {
      deps.preventDefault();
      deps.setCurrentPageSlug(matched);
      return "internal";
    }
  }

  if (/^https?:\/\//i.test(href)) {
    deps.preventDefault();
    deps.openExternal(href);
    return "external";
  }

  return "passthrough";
}

function matchKnownSlug(href: string, knownPageSlugs: ReadonlySet<string>): string | null {
  if (href === "/" || href === "") {
    return knownPageSlugs.has("home") ? "home" : null;
  }
  if (!href.startsWith("/")) return null;
  const firstSegment = href.slice(1).split(/[/?#]/)[0];
  if (!firstSegment) return null;
  return knownPageSlugs.has(firstSegment) ? firstSegment : null;
}
