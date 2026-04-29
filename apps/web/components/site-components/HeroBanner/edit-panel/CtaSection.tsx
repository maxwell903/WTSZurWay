"use client";

import { HrefInput } from "@/components/editor/edit-panels/controls/HrefInput";
import { RichTextMirror } from "@/components/editor/edit-panels/controls/RichTextMirror";
import { TextInput } from "@/components/editor/edit-panels/controls/TextInput";
import { type SectionProps, readString } from "./utils";

// Wave 2 CtaSection holds heading + sub-heading + (single) CTA + the static
// background image URL. Heading / subheading / CTA labels use RichTextMirror
// so panel edits stay in lockstep with the canvas's TipTap docs:
// `RichTextMirror.handlePlainChange` writes both the plain key AND a
// synthesized rich doc. When formatting exists, the panel switches to a
// read-only mirror with an "Edit as plain text" escape hatch.
export function CtaSection({ node, writePartial }: SectionProps) {
  return (
    <>
      <RichTextMirror
        fieldId="hero-heading"
        fieldLabel="Heading"
        plainKey="heading"
        richKey="richHeading"
        plain={readString(node.props, "heading")}
        rawRich={node.props.richHeading}
        profile="block"
        writePartial={writePartial}
      />
      <RichTextMirror
        fieldId="hero-subheading"
        fieldLabel="Sub-heading"
        plainKey="subheading"
        richKey="richSubheading"
        plain={readString(node.props, "subheading")}
        rawRich={node.props.richSubheading}
        profile="block"
        writePartial={writePartial}
      />
      <RichTextMirror
        fieldId="hero-cta-label"
        fieldLabel="CTA label"
        plainKey="ctaLabel"
        richKey="richCtaLabel"
        plain={readString(node.props, "ctaLabel")}
        rawRich={node.props.richCtaLabel}
        profile="inline"
        writePartial={writePartial}
      />
      <HrefInput
        id="hero-cta-href"
        label="CTA link"
        value={readString(node.props, "ctaHref", "#")}
        testId="hero-cta-href"
        tooltip="Where the primary CTA button links to. Pick a page in the site, or enter an external URL."
        onChange={(next) => writePartial({ ctaHref: next })}
      />
      <RichTextMirror
        fieldId="hero-secondary-cta-label"
        fieldLabel="Secondary CTA label"
        plainKey="secondaryCtaLabel"
        richKey="richSecondaryCtaLabel"
        plain={readString(node.props, "secondaryCtaLabel")}
        rawRich={node.props.richSecondaryCtaLabel}
        profile="inline"
        writePartial={writePartial}
      />
      <HrefInput
        id="hero-secondary-cta-href"
        label="Secondary CTA link"
        value={readString(node.props, "secondaryCtaHref")}
        testId="hero-secondary-cta-href"
        tooltip="Where the secondary CTA links to. Pick a page in the site, or enter an external URL."
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
