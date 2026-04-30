"use client";

import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";
import { CtaSection } from "./CtaSection";
import { CtaStyleSection } from "./CtaStyleSection";
import { EffectsSection } from "./EffectsSection";
import { ElementLayoutSection } from "./ElementLayoutSection";
import { LayoutSection } from "./LayoutSection";
import { OverlaySection } from "./OverlaySection";
import { PresetPicker } from "./PresetPicker";
import { SlidesSection } from "./SlidesSection";
import { TimingSection } from "./TimingSection";
import type { SectionProps } from "./utils";

export type HeroBannerEditPanelProps = { node: ComponentNode };

// HeroBanner v2 EditPanel composition root. Each section is its own file
// so Wave 3 sprints can land their feature panels without touching this
// file or the other sprints' sections. Section ordering matches the plan:
//   1. PresetPicker  (S11)         — pick a complete starter
//   2. SlidesSection (S8 expands)  — slideshow image array
//   3. LayoutSection (S4)          — centered / split / full-bleed
//   4. OverlaySection (S5 expands) — gradient overlay configuration
//   5. EffectsSection (S6/S9/S10)  — composition root → 3 sub-sections
//   6. TimingSection               — autoplay + intervalMs + loop + dots/arrows
//   7. CtaSection                  — heading + sub-heading + CTA + bg image
export function HeroBannerEditPanel({ node }: HeroBannerEditPanelProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const writePartial = (patch: Record<string, unknown>) => {
    setComponentProps(node.id, { ...node.props, ...patch });
  };

  const sectionProps: SectionProps = { node, writePartial };

  return (
    <div data-component-edit-panel="HeroBanner" className="space-y-3">
      <PresetPicker {...sectionProps} />
      <SlidesSection {...sectionProps} />
      <LayoutSection {...sectionProps} />
      <OverlaySection {...sectionProps} />
      <EffectsSection {...sectionProps} />
      <TimingSection {...sectionProps} />
      <CtaSection {...sectionProps} />
      <CtaStyleSection {...sectionProps} />
      <ElementLayoutSection {...sectionProps} />
    </div>
  );
}
