import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const heroBannerPropsSchema = z.object({
  heading: z.string().default("Welcome"),
  subheading: z.string().default(""),
  ctaLabel: z.string().default(""),
  ctaHref: z.string().default("#"),
  backgroundImage: z.string().optional(),
  overlay: z.boolean().default(true),
  height: z.string().default("480px"),
});

type HeroBannerProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

export function HeroBanner({ node, cssStyle }: HeroBannerProps) {
  const parsed = heroBannerPropsSchema.safeParse(node.props);
  const data = parsed.success
    ? parsed.data
    : {
        heading: "Welcome",
        subheading: "",
        ctaLabel: "",
        ctaHref: "#",
        backgroundImage: undefined,
        overlay: true,
        height: "480px",
      };

  const containerStyle: CSSProperties = {
    position: "relative",
    height: data.height,
    width: "100%",
    overflow: "hidden",
    backgroundImage: data.backgroundImage ? `url(${data.backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    color: "#ffffff",
    ...cssStyle,
  };

  const overlayStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "rgba(0, 0, 0, 0.45)",
  };

  const contentStyle: CSSProperties = {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    height: "100%",
    width: "100%",
    padding: "32px",
    textAlign: "center",
  };

  const ctaStyle: CSSProperties = {
    display: "inline-block",
    padding: "12px 24px",
    background: "#ffffff",
    color: "#0f3a5f",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 600,
  };

  return (
    <section data-component-id={node.id} data-component-type="HeroBanner" style={containerStyle}>
      {data.backgroundImage && data.overlay ? (
        <div data-hero-overlay="true" style={overlayStyle} />
      ) : null}
      <div style={contentStyle}>
        <h1 style={{ fontSize: "40px", fontWeight: 700, margin: 0 }}>{data.heading}</h1>
        {data.subheading ? (
          <p style={{ fontSize: "18px", margin: 0, maxWidth: "640px" }}>{data.subheading}</p>
        ) : null}
        {data.ctaLabel ? (
          <a href={data.ctaHref} style={ctaStyle}>
            {data.ctaLabel}
          </a>
        ) : null}
      </div>
    </section>
  );
}
