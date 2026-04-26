import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const logoPropsSchema = z.object({
  source: z.enum(["primary", "secondary", "custom"]).default("primary"),
  customUrl: z.string().optional(),
  alt: z.string().default("Logo"),
  height: z.number().nonnegative().default(32),
});

type LogoProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

// Sprint 5 ships the Logo with a placeholder when the requested logo source
// is `primary` or `secondary` because the renderer does not pass siteConfig
// down to leaf components yet. Sprint 6 (or 8) will add the wiring that
// resolves siteConfig.brand.primaryLogoUrl / secondaryLogoUrl. Until then the
// `custom` source with a `customUrl` is the only path that produces a real
// image; the other two intentionally render the rectangular placeholder.
export function Logo({ node, cssStyle }: LogoProps) {
  const parsed = logoPropsSchema.safeParse(node.props);
  const data = parsed.success
    ? parsed.data
    : { source: "primary" as const, customUrl: undefined, alt: "Logo", height: 32 };

  const resolvedUrl = data.source === "custom" ? data.customUrl : undefined;

  if (resolvedUrl) {
    const finalStyle: CSSProperties = {
      ...cssStyle,
      height: `${data.height}px`,
      width: "auto",
    };
    return (
      <img
        data-component-id={node.id}
        data-component-type="Logo"
        src={resolvedUrl}
        alt={data.alt}
        style={finalStyle}
      />
    );
  }

  const placeholderStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#e5e7eb",
    color: "#6b7280",
    fontSize: "12px",
    fontWeight: 500,
    height: `${data.height}px`,
    width: `${data.height * 3}px`,
    borderRadius: "4px",
    ...cssStyle,
  };

  return (
    <span
      data-component-id={node.id}
      data-component-type="Logo"
      data-logo-placeholder="true"
      role="img"
      aria-label={data.alt}
      style={placeholderStyle}
    >
      Logo
    </span>
  );
}
