// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { handlePreviewLinkClick } from "../previewLinkClick";

function makeAnchor(attrs: Record<string, string>, innerNode?: HTMLElement): HTMLAnchorElement {
  const a = document.createElement("a");
  for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
  if (innerNode) a.appendChild(innerNode);
  document.body.appendChild(a);
  return a;
}

function makeDeps() {
  return {
    preventDefault: vi.fn(),
    setCurrentPageSlug: vi.fn(),
    openExternal: vi.fn(),
  };
}

describe("handlePreviewLinkClick", () => {
  it("swaps the canvas page on internal-page links and prevents native nav", () => {
    const a = makeAnchor({ href: "/about", "data-internal-page-slug": "about" });
    const deps = makeDeps();
    const outcome = handlePreviewLinkClick(a, deps);
    expect(outcome).toBe("internal");
    expect(deps.preventDefault).toHaveBeenCalledOnce();
    expect(deps.setCurrentPageSlug).toHaveBeenCalledWith("about");
    expect(deps.openExternal).not.toHaveBeenCalled();
  });

  it("opens external http(s) URLs in a new tab and prevents native nav", () => {
    const a = makeAnchor({ href: "https://anthropic.com" });
    const deps = makeDeps();
    const outcome = handlePreviewLinkClick(a, deps);
    expect(outcome).toBe("external");
    expect(deps.preventDefault).toHaveBeenCalledOnce();
    expect(deps.openExternal).toHaveBeenCalledWith("https://anthropic.com");
    expect(deps.setCurrentPageSlug).not.toHaveBeenCalled();
  });

  it("walks up from a nested click target to find the enclosing anchor", () => {
    const inner = document.createElement("span");
    inner.textContent = "click me";
    const a = makeAnchor({ href: "/about", "data-internal-page-slug": "about" }, inner);
    const deps = makeDeps();
    expect(handlePreviewLinkClick(inner, deps)).toBe("internal");
    expect(deps.setCurrentPageSlug).toHaveBeenCalledWith("about");
    // Reach a is a no-op marker — just confirm the wiring above used it.
    expect(a.getAttribute("data-internal-page-slug")).toBe("about");
  });

  it("returns 'no-anchor' when the click is not inside an <a>", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    const deps = makeDeps();
    expect(handlePreviewLinkClick(div, deps)).toBe("no-anchor");
    expect(deps.preventDefault).not.toHaveBeenCalled();
  });

  it("falls through (passthrough) for hash, mailto, tel, and relative non-internal hrefs", () => {
    for (const href of ["#section", "mailto:hi@example.com", "tel:555", "about"]) {
      const a = makeAnchor({ href });
      const deps = makeDeps();
      expect(handlePreviewLinkClick(a, deps)).toBe("passthrough");
      expect(deps.preventDefault).not.toHaveBeenCalled();
      expect(deps.setCurrentPageSlug).not.toHaveBeenCalled();
      expect(deps.openExternal).not.toHaveBeenCalled();
    }
  });

  it("prefers internal-page-slug over href when both are present", () => {
    const a = makeAnchor({ href: "https://example.com", "data-internal-page-slug": "home" });
    const deps = makeDeps();
    expect(handlePreviewLinkClick(a, deps)).toBe("internal");
    expect(deps.setCurrentPageSlug).toHaveBeenCalledWith("home");
    expect(deps.openExternal).not.toHaveBeenCalled();
  });

  it("treats `/<slug>` hrefs as internal when the slug is in knownPageSlugs (retroactive path)", () => {
    const a = makeAnchor({ href: "/about" });
    const deps = makeDeps();
    const known = new Set(["home", "about", "contact"]);
    expect(handlePreviewLinkClick(a, deps, known)).toBe("internal");
    expect(deps.preventDefault).toHaveBeenCalledOnce();
    expect(deps.setCurrentPageSlug).toHaveBeenCalledWith("about");
  });

  it("treats `/` as the home slug when 'home' is in knownPageSlugs", () => {
    const a = makeAnchor({ href: "/" });
    const deps = makeDeps();
    const known = new Set(["home", "about"]);
    expect(handlePreviewLinkClick(a, deps, known)).toBe("internal");
    expect(deps.setCurrentPageSlug).toHaveBeenCalledWith("home");
  });

  it("falls through to passthrough when the relative href doesn't match any known slug", () => {
    const a = makeAnchor({ href: "/unknown" });
    const deps = makeDeps();
    const known = new Set(["home", "about"]);
    expect(handlePreviewLinkClick(a, deps, known)).toBe("passthrough");
    expect(deps.preventDefault).not.toHaveBeenCalled();
    expect(deps.setCurrentPageSlug).not.toHaveBeenCalled();
  });

  it("strips query/hash off matched slugs (e.g. `/about?ref=nav` → 'about')", () => {
    const a = makeAnchor({ href: "/about?ref=nav#section" });
    const deps = makeDeps();
    const known = new Set(["about"]);
    expect(handlePreviewLinkClick(a, deps, known)).toBe("internal");
    expect(deps.setCurrentPageSlug).toHaveBeenCalledWith("about");
  });
});
