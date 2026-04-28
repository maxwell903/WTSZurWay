"use client";

import { EditableTextSlot } from "@/components/renderer/EditableTextSlot";
import { useSiteConfigContext } from "@/components/renderer/SiteConfigContext";
import { richTextDocSchema } from "@/lib/site-config";
import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

// Mirror of `navLinkSchema` in lib/site-config/schema.ts — the component does
// its own safeParse so malformed `node.props` falls back to defaults rather
// than crashing the whole canvas. Keep the two shapes in sync. `kind` is
// optional; `undefined` is treated as "external" so legacy configs parse.
// Phase 4.5 adds `richLabel` (TipTap JSON doc) alongside `label`.
const navLinkSchema = z
  .object({
    label: z.string(),
    richLabel: richTextDocSchema.optional(),
    kind: z.enum(["page", "external"]).optional(),
    href: z.string().optional(),
    pageSlug: z.string().optional(),
  })
  .superRefine((link, ctx) => {
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
  });

type ParsedNavLink = z.infer<typeof navLinkSchema>;

const navBarPropsSchema = z.object({
  links: z.array(navLinkSchema).default([]),
  logoPlacement: z.enum(["left", "center", "right"]).default("left"),
  sticky: z.boolean().default(false),
  logoSrc: z.string().optional(),
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
    : { links: [], logoPlacement: "left" as const, sticky: false, logoSrc: undefined };
  const siteCtx = useSiteConfigContext();

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

  const logo = data.logoSrc ? (
    <img
      src={data.logoSrc}
      alt="Logo"
      data-navbar-logo="true"
      style={{ height: "32px", width: "auto" }}
    />
  ) : null;

  type RenderedLink = {
    key: string;
    href: string;
    label: string;
    pageSlug?: string;
    sourceIndex: number; // original position in node.props.links
  };
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
        gap: "20px",
        listStyle: "none",
        margin: 0,
        padding: 0,
      }}
    >
      {rendered.map((link) => {
        const sourceLink = data.links[link.sourceIndex];
        return (
          <li key={link.key}>
            <a
              href={link.href}
              data-internal-page-slug={link.pageSlug}
              style={{ color: "inherit", textDecoration: "none" }}
            >
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
            </a>
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
    <nav data-component-id={node.id} data-component-type="NavBar" style={finalStyle}>
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
