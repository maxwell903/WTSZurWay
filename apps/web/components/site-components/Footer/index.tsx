import { EditableTextSlot } from "@/components/renderer/EditableTextSlot";
import { richTextDocSchema } from "@/lib/site-config";
import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const navLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

// Phase 4.5 — column titles and footer copyright are rich-text editable.
// Per-link rich text is intentionally deferred: column links are nested
// inside columns (Footer.columns[i].links[j]), and the array-text-field
// metadata supports a single level of nesting today.
const footerPropsSchema = z.object({
  columns: z
    .array(
      z.object({
        title: z.string(),
        richTitle: richTextDocSchema.optional(),
        links: z.array(navLinkSchema),
      }),
    )
    .default([]),
  copyright: z.string().default(""),
  richCopyright: richTextDocSchema.optional(),
});

type FooterProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

// Sprint 5 reads Footer config from `node.props`, NOT from
// `siteConfig.global.footer`. Same rationale as NavBar — see NavBar/index.tsx.
export function Footer({ node, cssStyle }: FooterProps) {
  const parsed = footerPropsSchema.safeParse(node.props);
  const data = parsed.success
    ? parsed.data
    : { columns: [], copyright: "", richCopyright: undefined };

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
            <EditableTextSlot
              nodeId={node.id}
              propKey={`columns.${idx}.title`}
              richKey={`columns.${idx}.richTitle`}
              doc={col.richTitle}
              fallback={col.title}
              fullProps={node.props}
              profile="block"
              as="h4"
              style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 8px 0" }}
              buildWritePatch={(json, plain) => {
                const nextColumns = data.columns.map((c, i) =>
                  i === idx ? { ...c, title: plain, richTitle: json } : c,
                );
                return { columns: nextColumns };
              }}
            />
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
      {data.copyright || data.richCopyright ? (
        <EditableTextSlot
          nodeId={node.id}
          propKey="copyright"
          richKey="richCopyright"
          doc={data.richCopyright}
          fallback={data.copyright}
          fullProps={node.props}
          profile="inline"
          as="div"
          style={{ fontSize: "12px", color: "#9ca3af", paddingTop: "8px" }}
          passthroughAttrs={{ "data-footer-copyright": "true" }}
        />
      ) : null}
    </footer>
  );
}
