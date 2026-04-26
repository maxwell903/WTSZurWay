import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const buttonPropsSchema = z.object({
  label: z.string().default("Button"),
  href: z.string().optional(),
  variant: z.enum(["primary", "secondary", "outline", "ghost", "link"]).default("primary"),
  size: z.enum(["sm", "md", "lg"]).default("md"),
  fullWidth: z.boolean().default(false),
  buttonType: z.enum(["button", "submit", "reset"]).default("button"),
});

type ButtonVariant = z.infer<typeof buttonPropsSchema>["variant"];
type ButtonSize = z.infer<typeof buttonPropsSchema>["size"];

const VARIANT_STYLES: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: "#0f3a5f",
    color: "#ffffff",
    border: "1px solid #0f3a5f",
  },
  secondary: {
    background: "#e5e7eb",
    color: "#111827",
    border: "1px solid #e5e7eb",
  },
  outline: {
    background: "transparent",
    color: "#0f3a5f",
    border: "1px solid #0f3a5f",
  },
  ghost: {
    background: "transparent",
    color: "#0f3a5f",
    border: "1px solid transparent",
  },
  link: {
    background: "transparent",
    color: "#0f3a5f",
    border: "1px solid transparent",
    textDecoration: "underline",
  },
};

const SIZE_STYLES: Record<ButtonSize, CSSProperties> = {
  sm: { fontSize: "13px", padding: "6px 12px", borderRadius: "6px" },
  md: { fontSize: "14px", padding: "8px 16px", borderRadius: "8px" },
  lg: { fontSize: "16px", padding: "12px 24px", borderRadius: "10px" },
};

type ButtonProps = {
  node: ComponentNode;
  cssStyle: CSSProperties;
};

export function Button({ node, cssStyle }: ButtonProps) {
  const parsed = buttonPropsSchema.safeParse(node.props);
  const data = parsed.success
    ? parsed.data
    : {
        label: "Button",
        href: undefined,
        variant: "primary" as const,
        size: "md" as const,
        fullWidth: false,
        buttonType: "button" as const,
      };

  const finalStyle: CSSProperties = {
    cursor: "pointer",
    fontWeight: 500,
    display: data.fullWidth ? "block" : "inline-block",
    width: data.fullWidth ? "100%" : undefined,
    textAlign: "center",
    ...VARIANT_STYLES[data.variant],
    ...SIZE_STYLES[data.size],
    ...cssStyle,
  };

  if (data.href !== undefined) {
    return (
      <a
        data-component-id={node.id}
        data-component-type="Button"
        href={data.href}
        style={finalStyle}
      >
        {data.label}
      </a>
    );
  }

  return (
    <button
      data-component-id={node.id}
      data-component-type="Button"
      type={data.buttonType}
      style={finalStyle}
    >
      {data.label}
    </button>
  );
}
