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
        tooltip="The large text at the top of the hero. Supports the literal {rotator} token when Rotating words is set."
        onChange={(next) => writePartial({ heading: next })}
      />
      <TextInput
        id="hero-subheading"
        label="Sub-heading"
        value={readString(node.props, "subheading")}
        testId="hero-subheading"
        tooltip="The supporting line below the main heading."
        onChange={(next) => writePartial({ subheading: next })}
      />
      <TextInput
        id="hero-cta-label"
        label="CTA label"
        value={readString(node.props, "ctaLabel")}
        placeholder="Learn more"
        testId="hero-cta-label"
        tooltip="The text on the primary call-to-action button. Leave blank to hide it."
        onChange={(next) => writePartial({ ctaLabel: next })}
      />
      <TextInput
        id="hero-cta-href"
        label="CTA href"
        value={readString(node.props, "ctaHref", "#")}
        placeholder="#"
        testId="hero-cta-href"
        tooltip="Where the primary CTA button links to."
        onChange={(next) => writePartial({ ctaHref: next })}
      />
      <TextInput
        id="hero-secondary-cta-label"
        label="Secondary CTA label"
        value={readString(node.props, "secondaryCtaLabel")}
        placeholder="(optional, e.g. Learn more)"
        testId="hero-secondary-cta-label"
        tooltip="Adds an outlined secondary CTA next to the primary. Leave blank to hide."
        onChange={(next) => writePartial({ secondaryCtaLabel: next === "" ? undefined : next })}
      />
      <TextInput
        id="hero-secondary-cta-href"
        label="Secondary CTA href"
        value={readString(node.props, "secondaryCtaHref")}
        placeholder="#"
        testId="hero-secondary-cta-href"
        tooltip="Where the secondary CTA links to."
        onChange={(next) => writePartial({ secondaryCtaHref: next === "" ? undefined : next })}
      />
      <TextInput
        id="hero-bg-image"
        label="Background image URL"
        value={readString(node.props, "backgroundImage")}
        placeholder="https://... (used when no slides are added)"
        testId="hero-bg-image"
        tooltip="Static background image — used only when the slideshow has no slides."
        onChange={(next) => writePartial({ backgroundImage: next === "" ? undefined : next })}
      />
    </>
  );
}
