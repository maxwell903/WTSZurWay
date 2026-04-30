"use client";

import { EditableTextSlot } from "@/components/renderer/EditableTextSlot";
import { useSiteConfigContext } from "@/components/renderer/SiteConfigContext";
import { richTextDocSchema } from "@/lib/site-config";
import type { ComponentNode } from "@/types/site-config";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { z } from "zod";

// Mirror of `navLinkSchema` in lib/site-config/schema.ts — the component does
// its own safeParse so malformed `node.props` falls back to defaults rather
// than crashing the whole canvas. Keep the two shapes in sync. `kind` is
// optional; `undefined` is treated as "external" so legacy configs parse.
// Phase 4.5 adds `richLabel` (TipTap JSON doc) alongside `label`.
//
// `children` (Sprint 14, dropdowns): a top-level link can carry a flat
// list of submenu items. Depth is fixed at 1 — submenu items themselves
// cannot have `children`. Encoded as a separate schema rather than via
// z.lazy so the type carries the invariant.
const navLinkBaseObject = {
  label: z.string(),
  richLabel: richTextDocSchema.optional(),
  kind: z.enum(["page", "external"]).optional(),
  href: z.string().optional(),
  pageSlug: z.string().optional(),
};

function refineLinkKind(
  link: { kind?: "page" | "external"; href?: string; pageSlug?: string },
  ctx: z.RefinementCtx,
) {
  const effectiveKind = link.kind ?? "external";
  if (effectiveKind === "page" && link.pageSlug === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["pageSlug"],
      message: "Required when kind is 'page'",
    });
  }
  if (effectiveKind === "external" && link.href === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["href"],
      message: "Required when kind is 'external'",
    });
  }
}

const navLinkChildSchema = z.object(navLinkBaseObject).superRefine(refineLinkKind);

const navLinkSchema = z
  .object({
    ...navLinkBaseObject,
    children: z.array(navLinkChildSchema).optional(),
  })
  .superRefine(refineLinkKind);

type ParsedNavLink = z.infer<typeof navLinkSchema>;

const navBarPropsSchema = z.object({
  links: z.array(navLinkSchema).default([]),
  logoPlacement: z.enum(["left", "center", "right"]).default("left"),
  sticky: z.boolean().default(false),
  logoSrc: z.string().optional(),
  // Sprint 14 — visual layout knobs. All optional; renderer applies sane
  // defaults (gap 20px, logo height 32px, no horizontal margin).
  linkGap: z.number().int().nonnegative().optional(),
  logoMarginX: z.number().int().nonnegative().optional(),
  logoSize: z.number().int().nonnegative().optional(),
  // Sprint 13 (locked NavBars). When true, this specific NavBar opts out of
  // the site-wide lock and edits its own props/style independently. The
  // flag is read by the store's replication policy, not the renderer —
  // render output is identical regardless of `overrideShared`.
  overrideShared: z.boolean().optional(),
});

type NavBarProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

// Sprint 5 reads NavBar config from `node.props`, NOT from
// `siteConfig.global.navBar`. The renderer doesn't pass siteConfig down
// today, and adding that wiring is a Sprint 6+ concern. The schema's
// `global.navBar` is a separate surface used by Element 1's setup form
// to seed defaults — Sprint 6's editor will lift it into a NavBar node.
export function NavBar({ node, cssStyle }: NavBarProps) {
  const parsed = navBarPropsSchema.safeParse(node.props);
  const data = parsed.success
    ? parsed.data
    : {
        links: [],
        logoPlacement: "left" as const,
        sticky: false,
        logoSrc: undefined,
        linkGap: undefined,
        logoMarginX: undefined,
        logoSize: undefined,
      };
  const siteCtx = useSiteConfigContext();

  // Dropdown open-state: the sourceIndex of the parent link whose submenu
  // is currently visible, or null. Hover (mouse-enter/leave) and click both
  // toggle this; outside-click closes it. Hover events are inert on touch
  // devices, so the same handlers cover desktop hover + mobile tap.
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (openIndex === null) return;
    const onDocDown = (e: MouseEvent) => {
      if (!navRef.current) return;
      if (e.target instanceof Node && navRef.current.contains(e.target)) return;
      setOpenIndex(null);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [openIndex]);

  const finalStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    background: "#ffffff",
    color: "#111827",
    position: data.sticky ? "sticky" : undefined,
    top: data.sticky ? 0 : undefined,
    zIndex: data.sticky ? 10 : undefined,
    ...cssStyle,
  };

  const logoHeight = data.logoSize && data.logoSize > 0 ? data.logoSize : 32;
  const logoMarginX = data.logoMarginX ?? 0;
  const linkGap = data.linkGap ?? 20;

  const logo = data.logoSrc ? (
    <span
      data-navbar-logo-wrapper="true"
      style={{ display: "inline-flex", marginInline: `${logoMarginX}px` }}
    >
      <img
        src={data.logoSrc}
        alt="Logo"
        data-navbar-logo="true"
        style={{ height: `${logoHeight}px`, width: "auto" }}
      />
    </span>
  ) : null;

  const rendered: RenderedLink[] = [];
  data.links.forEach((link, index) => {
    const r = resolveLink(link, siteCtx?.pages, index);
    if (r) rendered.push(r);
  });

  const linkList = (
    <ul
      data-navbar-links="true"
      style={{
        display: "flex",
        gap: `${linkGap}px`,
        listStyle: "none",
        margin: 0,
        padding: 0,
      }}
    >
      {rendered.map((link) => {
        const sourceLink = data.links[link.sourceIndex];
        const renderedChildren: RenderedLink[] = [];
        (sourceLink?.children ?? []).forEach((child, j) => {
          const r = resolveLink(child, siteCtx?.pages, j);
          if (r) renderedChildren.push(r);
        });
        const hasDropdown = renderedChildren.length > 0;
        const isOpen = openIndex === link.sourceIndex;

        const labelEl = (
          <EditableTextSlot
            nodeId={node.id}
            propKey={`links.${link.sourceIndex}.label`}
            richKey={`links.${link.sourceIndex}.richLabel`}
            doc={sourceLink?.richLabel}
            fallback={link.label}
            fullProps={node.props}
            profile="inline"
            as="span"
            buildWritePatch={(json, plain) => {
              // Deep patch into props.links[sourceIndex]: preserve
              // every other link untouched.
              const nextLinks = data.links.map((l, i) =>
                i === link.sourceIndex ? { ...l, label: plain, richLabel: json } : l,
              );
              return { links: nextLinks };
            }}
          />
        );

        if (!hasDropdown) {
          return (
            <li key={link.key}>
              <a
                href={link.href}
                data-internal-page-slug={link.pageSlug}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                {labelEl}
              </a>
            </li>
          );
        }

        return (
          <li
            key={link.key}
            data-navbar-dropdown-parent="true"
            style={{ position: "relative" }}
            onMouseEnter={() => setOpenIndex(link.sourceIndex)}
            onMouseLeave={() => setOpenIndex(null)}
          >
            <button
              type="button"
              data-navbar-dropdown-trigger="true"
              aria-haspopup="menu"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : link.sourceIndex)}
              style={{
                all: "unset",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                color: "inherit",
              }}
            >
              {labelEl}
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  fontSize: "0.75em",
                  transform: isOpen ? "rotate(180deg)" : "rotate(0)",
                  transition: "transform 120ms ease",
                }}
              >
                ▾
              </span>
            </button>
            {isOpen ? (
              <ul
                role="menu"
                data-navbar-dropdown-menu="true"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "4px",
                  padding: "8px 0",
                  background: "#ffffff",
                  color: "#111827",
                  listStyle: "none",
                  minWidth: "180px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  borderRadius: "6px",
                  zIndex: 20,
                }}
              >
                {renderedChildren.map((child) => (
                  <li key={`child-${child.key}`}>
                    <a
                      role="menuitem"
                      href={child.href}
                      data-internal-page-slug={child.pageSlug}
                      style={{
                        display: "block",
                        padding: "6px 16px",
                        color: "inherit",
                        textDecoration: "none",
                      }}
                    >
                      {child.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  let order: ("logo" | "links" | "spacer")[];
  if (data.logoPlacement === "left") {
    order = ["logo", "links"];
  } else if (data.logoPlacement === "right") {
    order = ["links", "logo"];
  } else {
    order = ["spacer", "logo", "links"];
  }

  return (
    <nav ref={navRef} data-component-id={node.id} data-component-type="NavBar" style={finalStyle}>
      {order.map((slot, idx) => {
        if (slot === "logo") {
          // biome-ignore lint/suspicious/noArrayIndexKey: layout slots are stable per render
          return <div key={`logo-${idx}`}>{logo}</div>;
        }
        if (slot === "links") {
          // biome-ignore lint/suspicious/noArrayIndexKey: layout slots are stable per render
          return <div key={`links-${idx}`}>{linkList}</div>;
        }
        // biome-ignore lint/suspicious/noArrayIndexKey: layout slots are stable per render
        return <div key={`spacer-${idx}`} aria-hidden="true" style={{ flex: 1 }} />;
      })}
    </nav>
  );
}

type RenderedLink = {
  key: string;
  href: string;
  label: string;
  pageSlug?: string;
  sourceIndex: number;
};

function resolveLink(
  link: ParsedNavLink,
  pages: readonly { kind: string; slug: string; name: string }[] | undefined,
  index: number,
): {
  key: string;
  href: string;
  label: string;
  pageSlug?: string;
  sourceIndex: number;
} | null {
  const effectiveKind = link.kind ?? "external";
  if (effectiveKind === "page") {
    const pageSlug = link.pageSlug;
    if (!pageSlug) return null;
    // When pages context is available, resolve the live page name; otherwise
    // (e.g. NavBar rendered outside a SiteConfigProvider in unit tests) keep
    // the stored label and assume the slug is correct.
    const page = pages?.find((p) => p.kind === "static" && p.slug === pageSlug);
    if (pages !== undefined && !page) return null;
    return {
      key: `page-${pageSlug}-${index}`,
      href: `/${pageSlug}`,
      label: link.label || page?.name || pageSlug,
      pageSlug,
      sourceIndex: index,
    };
  }
  // external (or kind === undefined, treated as external)
  const href = link.href ?? "";
  return { key: `ext-${href}-${index}`, href, label: link.label, sourceIndex: index };
}
