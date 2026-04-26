import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const navLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

const footerPropsSchema = z.object({
  columns: z
    .array(
      z.object({
        title: z.string(),
        links: z.array(navLinkSchema),
      }),
    )
    .default([]),
  copyright: z.string().default(""),
});

type FooterProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

// Sprint 5 reads Footer config from `node.props`, NOT from
// `siteConfig.global.footer`. Same rationale as NavBar — see NavBar/index.tsx.
export function Footer({ node, cssStyle }: FooterProps) {
  const parsed = footerPropsSchema.safeParse(node.props);
  const data = parsed.success ? parsed.data : { columns: [], copyright: "" };

  const finalStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "32px 24px",
    background: "#111827",
    color: "#f3f4f6",
    ...cssStyle,
  };

  return (
    <footer data-component-id={node.id} data-component-type="Footer" style={finalStyle}>
      <div
        data-footer-columns="true"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(1, data.columns.length)}, 1fr)`,
          gap: "24px",
        }}
      >
        {data.columns.map((col, idx) => (
          <div key={`${col.title}-${idx}`} data-footer-column="true">
            <h4 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 8px 0" }}>{col.title}</h4>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "4px" }}>
              {col.links.map((link, linkIdx) => (
                <li key={`${link.href}-${linkIdx}`}>
                  <a href={link.href} style={{ color: "inherit", textDecoration: "none" }}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {data.copyright ? (
        <div
          data-footer-copyright="true"
          style={{ fontSize: "12px", color: "#9ca3af", paddingTop: "8px" }}
        >
          {data.copyright}
        </div>
      ) : null}
    </footer>
  );
}
