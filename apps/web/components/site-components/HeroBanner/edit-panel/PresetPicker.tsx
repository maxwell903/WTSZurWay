"use client";

import { WithTooltip } from "@/components/editor/edit-panels/controls/with-tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEditorStore } from "@/lib/editor-state";
import { useState } from "react";
import { type HeroPreset, heroPresets } from "../presets";
import type { SectionProps } from "./utils";

// Heuristic: a banner is considered "customized" when any prop other than
// the schema defaults is set. We approximate this by checking whether the
// node already has any of the v2-only fields, OR a non-default heading.
// Conservative — false positives (showing the dialog when not needed) are
// fine; false negatives would silently overwrite real work.
function isCustomized(props: Record<string, unknown>): boolean {
  if (typeof props.heading === "string" && props.heading !== "" && props.heading !== "Welcome") {
    return true;
  }
  const hasAny = (keys: string[]) => keys.some((k) => props[k] !== undefined);
  return (
    hasAny([
      "layout",
      "slideTransition",
      "kenBurns",
      "parallax",
      "cursorSpotlight",
      "particles",
      "rotatingWords",
      "countdown",
      "logoStrip",
      "secondaryCtaLabel",
      "ctaLabel",
      "subheading",
      "backgroundImage",
    ]) ||
    (Array.isArray(props.images) && props.images.length > 0)
  );
}

export function PresetPicker({ node }: SectionProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const [pending, setPending] = useState<HeroPreset | null>(null);
  const customized = isCustomized(node.props);

  const apply = (preset: HeroPreset) => {
    // Replace the entire props object with the preset shape — don't merge,
    // or leftover slides/overlay/effects from the prior banner would mix
    // with the preset's intended composition.
    setComponentProps(node.id, preset.props as Record<string, unknown>);
  };

  const onCardClick = (preset: HeroPreset) => {
    if (customized) {
      setPending(preset);
    } else {
      apply(preset);
    }
  };

  const onConfirm = () => {
    if (pending) apply(pending);
    setPending(null);
  };

  return (
    <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-2">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">Start from a preset</p>
      <div data-testid="hero-preset-picker" className="grid grid-cols-2 gap-1.5">
        {heroPresets.map((preset) => (
          <WithTooltip
            key={preset.id}
            tooltip={preset.tooltip}
            testId={`hero-preset-${preset.id}-tt`}
          >
            <button
              type="button"
              data-testid={`hero-preset-${preset.id}`}
              onClick={() => onCardClick(preset)}
              className="flex h-full w-full flex-col items-start gap-0.5 rounded-md border border-zinc-700 bg-zinc-900 p-2 text-left transition hover:border-orange-400/60 hover:bg-zinc-800"
            >
              <span className="text-xs font-medium text-zinc-100">{preset.name}</span>
              <span className="text-[10px] text-zinc-400">{preset.description}</span>
            </button>
          </WithTooltip>
        ))}
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent data-testid="hero-preset-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Apply the "{pending?.name}" preset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the current hero settings. Your existing slides, overlay, and effect
              choices will be discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="hero-preset-confirm-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="hero-preset-confirm-apply"
              onClick={onConfirm}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              Apply preset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
