import { useBrand } from "@/components/renderer/BrandContext";
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

export function Logo({ node, cssStyle }: LogoProps) {
  const brand = useBrand();
  const parsed = logoPropsSchema.safeParse(node.props);
  const data = parsed.success
    ? parsed.data
    : { source: "primary" as const, customUrl: undefined, alt: "Logo", height: 32 };

  // source=custom uses the per-instance customUrl; primary/secondary resolve
  // against brand context. Outside a BrandProvider (useBrand returns null),
  // primary/secondary fall through to the placeholder — same behavior as
  // when the brand fields are unset.
  let resolvedUrl: string | undefined;
  if (data.source === "custom") {
    resolvedUrl = data.customUrl;
  } else if (data.source === "primary") {
    resolvedUrl = brand?.primaryLogoUrl;
  } else {
    resolvedUrl = brand?.secondaryLogoUrl;
  }

  if (resolvedUrl) {
    const finalStyle: CSSProperties = {
      height: `${data.height}px`,
      width: "auto",
      ...cssStyle,
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
