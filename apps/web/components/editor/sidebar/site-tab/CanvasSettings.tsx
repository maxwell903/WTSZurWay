"use client";

import { BackgroundInput } from "@/components/editor/edit-panels/controls/BackgroundInput";
import { NumberInput } from "@/components/editor/edit-panels/controls/NumberInput";
import { ShadowSelect } from "@/components/editor/edit-panels/controls/ShadowSelect";
import { Label } from "@/components/ui/label";
import { useEditorStore } from "@/lib/editor-state";
import { CANVAS_DEFAULTS } from "@/lib/site-config/canvas";

export function CanvasSettings() {
  const canvas = useEditorStore((s) => s.draftConfig.global.canvas);
  const setCanvasConfig = useEditorStore((s) => s.setCanvasConfig);

  const verticalTop = canvas?.verticalPadding?.top;
  const verticalBottom = canvas?.verticalPadding?.bottom;

  const setVerticalSide = (side: "top" | "bottom", value: number | undefined) => {
    const current = canvas?.verticalPadding ?? {};
    const nextPadding = { ...current, [side]: value };
    const allUndefined =
      nextPadding.top === undefined &&
      nextPadding.bottom === undefined &&
      nextPadding.left === undefined &&
      nextPadding.right === undefined;
    setCanvasConfig({ verticalPadding: allUndefined ? undefined : nextPadding });
  };

  return (
    <div className="space-y-4" data-testid="canvas-settings">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Canvas</h3>

      {/* Background */}
      <div className="space-y-3 rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Background
        </Label>
        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-400">
            Page background (behind canvas)
          </Label>
          <BackgroundInput
            id="canvas-page-bg"
            testId="canvas-page-bg"
            value={canvas?.pageBackground}
            onChange={(next) => setCanvasConfig({ pageBackground: next })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-400">
            Canvas background (where sections sit)
          </Label>
          <BackgroundInput
            id="canvas-surface-bg"
            testId="canvas-surface-bg"
            value={canvas?.canvasBackground}
            onChange={(next) => setCanvasConfig({ canvasBackground: next })}
          />
        </div>
      </div>

      {/* Layout */}
      <div className="space-y-3 rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Layout
        </Label>
        <NumberInput
          id="canvas-max-width"
          label={`Max width (px) — empty = full bleed (default ${CANVAS_DEFAULTS.maxWidth})`}
          testId="canvas-max-width"
          value={canvas?.maxWidth}
          min={1}
          step={10}
          placeholder={String(CANVAS_DEFAULTS.maxWidth)}
          onChange={(next) => setCanvasConfig({ maxWidth: next })}
        />
        <NumberInput
          id="canvas-side-padding"
          label="Side gutter (px)"
          testId="canvas-side-padding"
          value={canvas?.sidePadding}
          min={0}
          step={2}
          placeholder={String(CANVAS_DEFAULTS.sidePadding)}
          onChange={(next) => setCanvasConfig({ sidePadding: next })}
        />
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            id="canvas-pad-top"
            label="Padding top"
            testId="canvas-pad-top"
            value={verticalTop}
            min={0}
            step={4}
            placeholder={String(CANVAS_DEFAULTS.verticalPadding.top)}
            onChange={(next) => setVerticalSide("top", next)}
          />
          <NumberInput
            id="canvas-pad-bottom"
            label="Padding bottom"
            testId="canvas-pad-bottom"
            value={verticalBottom}
            min={0}
            step={4}
            placeholder={String(CANVAS_DEFAULTS.verticalPadding.bottom)}
            onChange={(next) => setVerticalSide("bottom", next)}
          />
        </div>
        <NumberInput
          id="canvas-section-gap"
          label="Section gap (px)"
          testId="canvas-section-gap"
          value={canvas?.sectionGap}
          min={0}
          step={2}
          placeholder={String(CANVAS_DEFAULTS.sectionGap)}
          onChange={(next) => setCanvasConfig({ sectionGap: next })}
        />
      </div>

      {/* Surface */}
      <div className="space-y-3 rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Surface
        </Label>
        <NumberInput
          id="canvas-radius"
          label="Border radius (px)"
          testId="canvas-radius"
          value={canvas?.borderRadius}
          min={0}
          step={2}
          placeholder={String(CANVAS_DEFAULTS.borderRadius)}
          onChange={(next) => setCanvasConfig({ borderRadius: next })}
        />
        <ShadowSelect
          testId="canvas-shadow"
          value={canvas?.shadow}
          onChange={(next) => setCanvasConfig({ shadow: next })}
        />
      </div>
    </div>
  );
}
