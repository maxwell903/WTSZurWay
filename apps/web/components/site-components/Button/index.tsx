"use client";

// Sprint 5b backfill: Button stores `linkMode` and `detailPageSlug` per
// PROJECT_SPEC.md §8.12. When `linkMode === "detail"`, the rendered element
// carries `data-link-mode="detail"` and `data-detail-page-slug` data
// attributes. Sprint 9b adds the render-time href computation
// `/{detailPageSlug}/{row.id}` when row context is available (Repeater
// iteration or detail page) and switches the file to a "use client"
// component so it can call useRow().

import { useRow } from "@/lib/row-context";
import type { ComponentNode } from "@/types/site-config";
import type { CSSProperties } from "react";
import { z } from "zod";

const buttonPropsSchema = z
  .object({
    label: z.string().default("Button"),
    href: z.string().optional(),
    variant: z.enum(["primary", "secondary", "outline", "ghost", "link"]).default("primary"),
    size: z.enum(["sm", "md", "lg"]).default("md"),
    fullWidth: z.boolean().default(false),
    buttonType: z.enum(["button", "submit", "reset"]).default("button"),
    // Sprint 5b backfill — PROJECT_SPEC.md §8.12.
    linkMode: z.enum(["static", "detail"]).default("static"),
    detailPageSlug: z.string().optional(),
  })
  .superRefine((p, ctx) => {
    if (p.linkMode === "detail" && p.detailPageSlug === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["detailPageSlug"],
        message: "Required when linkMode is 'detail'",
      });
    }
  });

const BUTTON_FALLBACK = buttonPropsSchema.parse({});

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
  const data = parsed.success ? parsed.data : BUTTON_FALLBACK;
  const { row, kind } = useRow();

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

  const detailDataAttrs =
    data.linkMode === "detail" && data.detailPageSlug !== undefined
      ? {
          "data-link-mode": "detail" as const,
          "data-detail-page-slug": data.detailPageSlug,
        }
      : {};

  // Sprint 9b: detail-href computation. PROJECT_SPEC.md §8.12. The override
  // fires only when every condition holds; otherwise data.href passes through
  // verbatim and the silent-fallback semantics from Sprint 5b are preserved
  // (parse failures already swap data for BUTTON_FALLBACK whose linkMode is
  // "static", so the override never fires on the fallback path).
  let href: string | undefined = data.href;
  if (
    data.linkMode === "detail" &&
    data.detailPageSlug !== undefined &&
    kind !== null &&
    row !== null &&
    typeof row === "object"
  ) {
    const id = (row as { id?: unknown }).id;
    if (typeof id === "number" || typeof id === "string") {
      href = `/${data.detailPageSlug}/${id}`;
    }
  }

  if (href !== undefined) {
    return (
      <a
        data-component-id={node.id}
        data-component-type="Button"
        href={href}
        style={finalStyle}
        {...detailDataAttrs}
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
      {...detailDataAttrs}
    >
      {data.label}
    </button>
  );
}
