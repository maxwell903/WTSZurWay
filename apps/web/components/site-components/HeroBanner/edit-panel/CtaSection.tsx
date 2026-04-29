"use client";

import { TextInput } from "@/components/editor/edit-panels/controls/TextInput";
import { type SectionProps, readString } from "./utils";

// Wave 2 CtaSection holds heading + sub-heading + (single) CTA + the static
// background image URL. A future Wave 3 sprint will expand this to dual
// CTA (primary + secondary) — the schema field `secondaryCtaLabel` is
// already in place from Sprint 2.
export function CtaSection({ node, writePartial }: SectionProps) {
  return (
    <>
      <TextInput
        id="hero-heading"
        label="Heading"
        value={readString(node.props, "heading")}
        testId="hero-heading"
        onChange={(next) => writePartial({ heading: next })}
      />
      <TextInput
        id="hero-subheading"
        label="Sub-heading"
        value={readString(node.props, "subheading")}
        testId="hero-subheading"
        onChange={(next) => writePartial({ subheading: next })}
      />
      <TextInput
        id="hero-cta-label"
        label="CTA label"
        value={readString(node.props, "ctaLabel")}
        placeholder="Learn more"
        testId="hero-cta-label"
        onChange={(next) => writePartial({ ctaLabel: next })}
      />
      <TextInput
        id="hero-cta-href"
        label="CTA href"
        value={readString(node.props, "ctaHref", "#")}
        placeholder="#"
        testId="hero-cta-href"
        onChange={(next) => writePartial({ ctaHref: next })}
      />
      <TextInput
        id="hero-bg-image"
        label="Background image URL"
        value={readString(node.props, "backgroundImage")}
        placeholder="https://... (used when no slides are added)"
        testId="hero-bg-image"
        onChange={(next) => writePartial({ backgroundImage: next === "" ? undefined : next })}
      />
    </>
  );
}
