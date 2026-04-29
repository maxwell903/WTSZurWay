/**
 * Catalog of every registered site component, keyed by ComponentType. The
 * Initial Generation system prompt embeds this so Claude knows exactly
 * which components are available and what props each one accepts.
 *
 * Sourced from PROJECT_SPEC.md §6.1 and the per-component SPEC.md files
 * under apps/web/components/site-components/. When a component's prop
 * surface changes, update the corresponding entry here -- the prompt
 * snapshot test will fail until this snippet matches the registry's truth.
 */

import { COMPONENT_TYPES, type ComponentType } from "@/lib/site-config";

type ComponentDoc = {
  category: "Layout" | "Content" | "Media" | "Data" | "Forms" | "Navigation";
  childrenPolicy: "none" | "one" | "many";
  description: string;
  props: string;
};

const CATALOG: Record<ComponentType, ComponentDoc> = {
  Section: {
    category: "Layout",
    childrenPolicy: "many",
    description: "Top-level vertical container. Use one per logical page section.",
    props: "{ maxWidth?: number | 'full'; align?: 'left' | 'center' | 'right' }",
  },
  Row: {
    category: "Layout",
    childrenPolicy: "many",
    description: "Horizontal flex container. Children laid out left-to-right.",
    props: "{ gap?: number; align?: 'start' | 'center' | 'end'; wrap?: boolean }",
  },
  Column: {
    category: "Layout",
    childrenPolicy: "many",
    description: "Vertical flex container with a width (1-12 grid units).",
    props: "{ span?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12; gap?: number }",
  },
  Heading: {
    category: "Content",
    childrenPolicy: "none",
    description:
      "Page or section title. Supports rich-text formatting via the optional `richText` field (TipTap JSON doc); when present it wins over `text`. Use `setRichText` to author formatted content; `setText` is plain only and clears `richText`.",
    props: "{ text: string; richText?: RichTextDoc; level: 1 | 2 | 3 | 4 | 5 | 6 }",
  },
  Paragraph: {
    category: "Content",
    childrenPolicy: "none",
    description:
      "Body copy. Supports rich-text formatting via the optional `richText` field (TipTap JSON doc); when present it wins over `text`. Use `setRichText` to author formatted content; `setText` is plain only and clears `richText`.",
    props: "{ text: string; richText?: RichTextDoc }",
  },
  Button: {
    category: "Content",
    childrenPolicy: "none",
    description:
      'Primary or secondary action. linkMode="detail" pairs with detailPageSlug to link into a detail page (Sprint 9b resolves the {row.id} segment at render time). Supports rich-text formatting on the label via the optional `richLabel` field — note Button uses the INLINE rich-text profile (no headings/lists, only inline marks like bold/italic/color) since `<button>` cannot legally contain block elements.',
    props:
      '{ label: string; richLabel?: RichTextDoc; href?: string; variant?: "primary" | "secondary" | "outline"; linkMode?: "static" | "detail"; detailPageSlug?: string }',
  },
  Image: {
    category: "Media",
    childrenPolicy: "none",
    description: "Static image.",
    props:
      "{ src: string; alt: string; fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down' }",
  },
  Logo: {
    category: "Media",
    childrenPolicy: "none",
    description: "Renders the brand's primaryLogoUrl (or override `src`).",
    props: "{ src?: string; alt?: string; height?: number }",
  },
  Spacer: {
    category: "Layout",
    childrenPolicy: "none",
    description: "Vertical empty space.",
    props: "{ height: number }",
  },
  Divider: {
    category: "Layout",
    childrenPolicy: "none",
    description: "Horizontal rule.",
    props: "{ thickness?: number; color?: string }",
  },
  NavBar: {
    category: "Navigation",
    childrenPolicy: "none",
    description:
      'Top navigation bar. Pulls config.global.navBar by default; props overrides per-instance. Each link\'s label is rich-text-editable via `richLabel` (INLINE profile). Use `setRichText` with a path-style propKey: "links.{i}.richLabel".',
    props:
      '{ links?: { label: string; richLabel?: RichTextDoc; kind?: "page" | "external"; href?: string; pageSlug?: string }[]; logoPlacement?: "left" | "center" | "right"; sticky?: boolean; logoSrc?: string; overrideShared?: boolean }',
  },
  Footer: {
    category: "Navigation",
    childrenPolicy: "none",
    description:
      'Site footer. Pulls config.global.footer by default; props overrides per-instance. Each column\'s title is rich-text-editable via `richTitle` (BLOCK profile) — use `setRichText` with propKey "columns.{i}.richTitle". Footer-wide `copyright` has its own rich variant `richCopyright` (INLINE profile). Per-link rich text inside columns is not yet supported.',
    props:
      "{ columns?: { title: string; richTitle?: RichTextDoc; links: { label: string; href: string }[] }[]; copyright?: string; richCopyright?: RichTextDoc }",
  },
  HeroBanner: {
    category: "Content",
    childrenPolicy: "none",
    description:
      "Top-tier above-the-fold hero. Four layouts via `layout`: 'centered' (text over full-bleed media, default), 'split-left'/'split-right' (text on one half, media on the other, no overlap), 'full-bleed' (edge-to-edge media with text in a corner panel). Slides in `images` are a discriminated union — `kind:'image'` (src + alt) or `kind:'video'` (videoSrc + optional videoSrcWebm + videoPoster, autoplay-muted-loop, slide-advance waits the longer of intervalMs or the video's duration). Each slide can override the banner-level heading/subheading/ctaLabel/ctaHref/secondaryCtaLabel/secondaryCtaHref/align/verticalAlign — the slide value wins, then the banner value, then the field hides. `slideTransition` picks the inter-slide animation: 'crossfade' (default, opacity stack), 'slide-left'/'slide-right' (Framer Motion horizontal slide), 'zoom' (90%→100% scale + fade), 'fade-up' (translateY + fade). `overlay` is a discriminated union — `false` (none), `true` (legacy boolean coerced to default solid), `{kind:'solid', color, opacity}`, `{kind:'linear', angle, stops:[{color,opacity,position}]}`, `{kind:'radial', center:'top'|'center'|'bottom', stops}`. Motion effects: `kenBurns` (slow 1→1.1 zoom on image slides), `parallax` (passive scroll listener, slower drift). Background effects: `cursorSpotlight` (radial glow follows cursor; static at center on touch/reduce-motion), `particles:'none'|'stars'|'dots'|'grid'` (pure-CSS animated background). Text effects: `rotatingWords:string[]` cycles a `{rotator}` token in the heading every 2.5s; `countdown:{targetIso, label?, expiredLabel?}` renders d/h/m/s remaining and switches to `expiredLabel` (default 'Now live') at zero. `logoStrip:[{src,alt}]` adds a horizontal scrolling customer-logo row. `prefers-reduced-motion` disables every animation. Five named presets ship in `apps/web/components/site-components/HeroBanner/presets.ts`: 'cinematic-video' (full-bleed video + dark linear overlay + parallax), 'split-hero' (split-right + dual CTA + cursor spotlight), 'centered-carousel' (3 image slides + Ken Burns + crossfade + dots), 'minimalist' (no slides + oversize heading + {rotator} + stars), 'logo-marquee' (centered + scrolling logo row). When to pick which: cinematic for product/brand films; split for landing pages with strong CTA + product imagery; carousel for cycling features/testimonials; minimalist for typography-led brand sites; logo marquee for social-proof above-the-fold. heading/subheading support rich-text via `richHeading`/`richSubheading` (BLOCK profile); ctaLabel via `richCtaLabel` (INLINE profile) — preserved unchanged from v1.",
    props:
      "{ heading: string; richHeading?: RichTextDoc; subheading?: string; richSubheading?: RichTextDoc; ctaLabel?: string; richCtaLabel?: RichTextDoc; ctaHref?: string; secondaryCtaLabel?: string; secondaryCtaHref?: string; backgroundImage?: string; height?: string; layout?: 'centered'|'split-left'|'split-right'|'full-bleed'; slideTransition?: 'crossfade'|'slide-left'|'slide-right'|'zoom'|'fade-up'; overlay?: false | true | { kind: 'solid'; color: string; opacity: number } | { kind: 'linear'; angle: number; stops: { color: string; opacity: number; position: number }[] } | { kind: 'radial'; center: 'top'|'center'|'bottom'; stops: { color: string; opacity: number; position: number }[] }; images?: ({ kind: 'image'; src: string; alt?: string; heading?: string; subheading?: string; ctaLabel?: string; ctaHref?: string; secondaryCtaLabel?: string; secondaryCtaHref?: string; align?: 'left'|'center'|'right'; verticalAlign?: 'top'|'center'|'bottom' } | { kind: 'video'; videoSrc: string; videoSrcWebm?: string; videoPoster?: string; alt?: string; heading?: string; subheading?: string; ctaLabel?: string; ctaHref?: string; secondaryCtaLabel?: string; secondaryCtaHref?: string; align?: 'left'|'center'|'right'; verticalAlign?: 'top'|'center'|'bottom' })[]; autoplay?: boolean; intervalMs?: number; loop?: boolean; pauseOnHover?: boolean; showDots?: boolean; showArrows?: boolean; kenBurns?: boolean; parallax?: boolean; cursorSpotlight?: boolean; particles?: 'none'|'stars'|'dots'|'grid'; rotatingWords?: string[]; countdown?: { targetIso: string; label?: string; expiredLabel?: string }; logoStrip?: { src: string; alt: string }[] }",
  },
  PropertyCard: {
    category: "Data",
    childrenPolicy: "none",
    description:
      "Card rendering one Property. Props can be bound to RM fields with {{ row.* }} when used inside a Repeater of properties. heading/body support rich-text via `richHeading`/`richBody` (BLOCK profile); ctaLabel via `richCtaLabel` (INLINE profile).",
    props:
      "{ heading: string; richHeading?: RichTextDoc; body: string; richBody?: RichTextDoc; imageSrc?: string; ctaLabel?: string; richCtaLabel?: RichTextDoc; ctaHref?: string; propertyId?: number }",
  },
  UnitCard: {
    category: "Data",
    childrenPolicy: "none",
    description:
      "Card rendering one Unit. Props can be bound to RM fields with {{ row.* }} when used inside a Repeater of units. heading supports rich-text via `richHeading` (BLOCK profile); ctaLabel via `richCtaLabel` (INLINE profile).",
    props:
      "{ heading: string; richHeading?: RichTextDoc; beds?: number; baths?: number; sqft?: number; rent?: number; imageSrc?: string; ctaLabel?: string; richCtaLabel?: RichTextDoc; ctaHref?: string; unitId?: number }",
  },
  Repeater: {
    category: "Data",
    childrenPolicy: "one",
    description:
      'Iterates over a data source and renders its single child once per row. Pair with detail pages: a Repeater of units MUST be paired with a kind="detail" page with detailDataSource="units". Same for properties.',
    props: "{} -- configuration lives in dataBinding (source/filters/sort/limit)",
  },
  InputField: {
    category: "Forms",
    childrenPolicy: "none",
    description:
      "A single form input. defaultValueFromQueryParam reads window.location.search on mount (used by cross-page filter links).",
    props:
      '{ name: string; label?: string; placeholder?: string; type?: "text" | "email" | "tel" | "number" | "textarea" | "select" | "checkbox"; defaultValueFromQueryParam?: string; options?: { value: string; label: string }[] }',
  },
  Form: {
    category: "Forms",
    childrenPolicy: "many",
    description:
      "Wraps inputs and a submit button. Wired to the global `forms` array via the Form's id matching a FormDefinition.id.",
    props: "{ formId: string }",
  },
  MapEmbed: {
    category: "Media",
    childrenPolicy: "none",
    description: "Embedded map. For the demo, a static map iframe is acceptable.",
    props: "{ address?: string; lat?: number; lng?: number; zoom?: number }",
  },
  Gallery: {
    category: "Media",
    childrenPolicy: "none",
    description: "Image grid.",
    props: "{ images: { src: string; alt?: string }[]; columns?: 2 | 3 | 4 }",
  },
  // FlowGroup is engine-managed; the AI must never emit it directly.
  FlowGroup: {
    category: "Layout",
    childrenPolicy: "many",
    description:
      "Engine-managed horizontal flex wrapper. Never emit FlowGroup directly — it is auto-inserted by the editor when a user drops on the side edge of a component.",
    props: "(none)",
  },
};

// Rich-text Phase 2 (2026-04-28). Inline blurb prepended to the catalog so
// the AI knows the structure of `RichTextDoc` (used in `setRichText` and as
// the `richText`/`richLabel` field on text-bearing components). Kept tight
// to control prompt size — the schema is enforced at storage so listing
// every node/mark variant is unnecessary.
const RICH_TEXT_DOC_BLURB = String.raw`### RichTextDoc shape (used by Heading, Paragraph, Button, …)

A TipTap JSON document. Top-level shape:
\`\`\`ts
type RichTextDoc = { type: "doc"; content?: RichTextNode[] };
type RichTextNode = {
  type?: string;             // "paragraph" | "heading" | "bulletList" | "orderedList" | "listItem" | "text" | "hardBreak"
  attrs?: Record<string, unknown>;  // e.g. { level: 1 } on heading; { textAlign: "center" } on paragraph
  content?: RichTextNode[];  // children (recursive)
  marks?: { type: string; attrs?: Record<string, unknown> }[];
                            // mark types: "bold" | "italic" | "underline" | "strike" |
                            //             "subscript" | "superscript" | "link" |
                            //             "textStyle" (carries color, fontFamily, fontSize, letterSpacing, textTransform)
  text?: string;             // present on { type: "text" } leaves
};
\`\`\`

The Button component uses an INLINE-only doc — its content is a flat list
of \`text\` / \`hardBreak\` nodes, NOT wrapped in a \`paragraph\`, because
\`<button>\` and \`<a>\` cannot legally contain block elements.

Heading and Paragraph use a BLOCK doc — content is one or more
\`paragraph\` / \`heading\` / \`bulletList\` / \`orderedList\` blocks, each
of which contains inline \`text\` runs.
`;

export function buildComponentCatalog(): string {
  const components = COMPONENT_TYPES.map((type) => {
    const doc = CATALOG[type];
    return [
      `### ${type} (${doc.category}, children: ${doc.childrenPolicy})`,
      doc.description,
      `Props: ${doc.props}`,
    ].join("\n");
  }).join("\n\n");
  return `${RICH_TEXT_DOC_BLURB}\n\n${components}`;
}
