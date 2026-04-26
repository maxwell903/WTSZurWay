import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const navLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

const navBarPropsSchema = z.object({
  links: z.array(navLinkSchema).default([]),
  logoPlacement: z.enum(["left", "center", "right"]).default("left"),
  sticky: z.boolean().default(false),
  logoSrc: z.string().optional(),
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
      {data.links.map((link, index) => (
        <li key={`${link.href}-${index}`}>
          <a href={link.href} style={{ color: "inherit", textDecoration: "none" }}>
            {link.label}
          </a>
        </li>
      ))}
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
