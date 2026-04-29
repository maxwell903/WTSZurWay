"use client";

import { useEditorStore } from "@/lib/editor-state";
import { useMemo } from "react";
import { PageSelect } from "./PageSelect";
import { SegmentedControl } from "./SegmentedControl";
import { TextInput } from "./TextInput";

export type HrefInputProps = {
  id: string;
  label?: string;
  value: string;
  onChange: (next: string) => void;
  testId?: string;
  tooltip?: string;
  placeholder?: string;
};

type HrefMode = "page" | "url";

// Persistence: ctaHref / ctaHref-like fields stay a plain string in the
// schema. "Page" mode writes "/{slug}", "URL" mode writes the value verbatim.
// We infer the current mode from the value: if it equals "/{slug}" for any
// existing static page, treat it as Page; otherwise treat it as URL.
export function HrefInput({
  id,
  label,
  value,
  onChange,
  testId,
  tooltip,
  placeholder,
}: HrefInputProps) {
  const pages = useEditorStore((s) => s.draftConfig.pages);
  const staticSlugs = useMemo(
    () => new Set(pages.filter((p) => p.kind === "static").map((p) => p.slug)),
    [pages],
  );

  const matchedSlug =
    value.startsWith("/") && staticSlugs.has(value.slice(1)) ? value.slice(1) : undefined;
  const mode: HrefMode = matchedSlug !== undefined ? "page" : "url";

  return (
    <div className="space-y-1.5 rounded-md border border-zinc-800 bg-zinc-900/40 p-2">
      {label ? <p className="text-xs text-zinc-300">{label}</p> : null}
      <SegmentedControl<HrefMode>
        id={`${id}-mode`}
        value={mode}
        options={[
          { label: "Page", value: "page" },
          { label: "URL", value: "url" },
        ]}
        testId={testId ? `${testId}-mode` : undefined}
        tooltip={tooltip}
        onChange={(next) => {
          if (next === "page") {
            const firstSlug = pages.find((p) => p.kind === "static")?.slug;
            onChange(firstSlug ? `/${firstSlug}` : "");
          } else {
            onChange("");
          }
        }}
      />
      {mode === "page" ? (
        <PageSelect
          id={id}
          value={matchedSlug}
          testId={testId ? `${testId}-page` : undefined}
          onChange={(next) => onChange(next ? `/${next}` : "")}
        />
      ) : (
        <TextInput
          id={id}
          value={value}
          placeholder={placeholder ?? "https://..."}
          testId={testId ? `${testId}-url` : undefined}
          onChange={onChange}
        />
      )}
    </div>
  );
}
