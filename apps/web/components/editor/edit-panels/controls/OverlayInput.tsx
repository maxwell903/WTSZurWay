"use client";

import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { WithTooltip } from "./with-tooltip";

// The discriminated overlay shape this control reads/writes. Mirror of the
// HeroBanner schema's OverlayConfig — duplicated locally so this control
// can be reused by other site-components later without an import cycle.
export type OverlayStop = { color: string; opacity: number; position: number };
export type OverlayValue =
  | undefined
  | { kind: "solid"; color: string; opacity: number }
  | { kind: "linear"; angle: number; stops: OverlayStop[] }
  | { kind: "radial"; center: "top" | "center" | "bottom"; stops: OverlayStop[] };

export type OverlayInputProps = {
  id: string;
  label?: string;
  value: OverlayValue;
  onChange: (next: OverlayValue) => void;
  testId?: string;
  tooltip?: string;
};

const KIND_OPTIONS: Array<{
  label: string;
  value: "none" | "solid" | "linear" | "radial";
  tooltip: string;
}> = [
  { label: "None", value: "none", tooltip: "Removes the overlay entirely." },
  {
    label: "Solid",
    value: "solid",
    tooltip: "Applies a single dimming color across the whole hero.",
  },
  {
    label: "Linear",
    value: "linear",
    tooltip: "Fades between colors along a configurable angle.",
  },
  {
    label: "Radial",
    value: "radial",
    tooltip: "Fades outward from a center point to the edges.",
  },
];

export function OverlayInput({ id, label, value, onChange, testId, tooltip }: OverlayInputProps) {
  const kind = value === undefined ? "none" : value.kind;

  const setKind = (nextKind: "none" | "solid" | "linear" | "radial") => {
    if (nextKind === "none") {
      onChange(undefined);
      return;
    }
    if (nextKind === "solid") {
      onChange({ kind: "solid", color: "#000000", opacity: 0.45 });
      return;
    }
    if (nextKind === "linear") {
      onChange({
        kind: "linear",
        angle: 180,
        stops: [
          { color: "#000000", opacity: 0, position: 0 },
          { color: "#000000", opacity: 0.6, position: 100 },
        ],
      });
      return;
    }
    onChange({
      kind: "radial",
      center: "center",
      stops: [
        { color: "#000000", opacity: 0, position: 0 },
        { color: "#000000", opacity: 0.6, position: 100 },
      ],
    });
  };

  return (
    <WithTooltip tooltip={tooltip} testId={testId}>
      <div className="space-y-2" data-testid={testId}>
        {label ? <Label className="text-xs text-zinc-300">{label}</Label> : null}

        <SwatchPreview value={value} testId={testId} />

        <div
          className="inline-flex w-full rounded-md border border-zinc-700 bg-zinc-900 p-0.5"
          role="radiogroup"
          aria-label="Overlay kind"
          data-testid={testId ? `${testId}-kind` : undefined}
        >
          {KIND_OPTIONS.map((opt) => {
            const selected = opt.value === kind;
            return (
              <WithTooltip
                key={opt.value}
                tooltip={opt.tooltip}
                testId={testId ? `${testId}-kind-${opt.value}-tt` : undefined}
              >
                <button
                  type="button"
                  // biome-ignore lint/a11y/useSemanticElements: parent role="radiogroup" + role="radio" carries the same a11y semantics as <input type="radio">; native inputs can't be styled into a horizontal segmented control.
                  role="radio"
                  aria-checked={selected}
                  aria-label={opt.label}
                  data-testid={testId ? `${testId}-kind-${opt.value}` : undefined}
                  onClick={() => setKind(opt.value)}
                  className={
                    selected
                      ? "flex-1 rounded bg-orange-400/90 px-2 py-1 text-xs text-zinc-950"
                      : "flex-1 rounded px-2 py-1 text-xs text-zinc-300 hover:text-zinc-100"
                  }
                >
                  {opt.label}
                </button>
              </WithTooltip>
            );
          })}
        </div>

        {value?.kind === "solid" ? (
          <SolidEditor value={value} onChange={onChange} testId={testId} id={id} />
        ) : null}
        {value?.kind === "linear" || value?.kind === "radial" ? (
          <GradientEditor value={value} onChange={onChange} testId={testId} />
        ) : null}
      </div>
    </WithTooltip>
  );
}

function SwatchPreview({ value, testId }: { value: OverlayValue; testId?: string }) {
  const background = computeCss(value);
  return (
    <div
      data-testid={testId ? `${testId}-swatch` : undefined}
      className="relative h-10 w-full overflow-hidden rounded-md border border-zinc-800 bg-[repeating-conic-gradient(#444_0_25%,#222_0_50%)] bg-[length:12px_12px]"
    >
      <div className="absolute inset-0" style={{ background }} />
    </div>
  );
}

function computeCss(value: OverlayValue): string {
  if (!value) return "transparent";
  if (value.kind === "solid") return rgbaFromHex(value.color, value.opacity);
  if (value.kind === "linear") {
    const stops = (value.stops.length > 0 ? value.stops : DEFAULT_STOPS)
      .map((s) => `${rgbaFromHex(s.color, s.opacity)} ${s.position}%`)
      .join(", ");
    return `linear-gradient(${value.angle}deg, ${stops})`;
  }
  const center =
    value.center === "top"
      ? "circle at 50% 0%"
      : value.center === "bottom"
        ? "circle at 50% 100%"
        : "circle at 50% 50%";
  const stops = (value.stops.length > 0 ? value.stops : DEFAULT_STOPS)
    .map((s) => `${rgbaFromHex(s.color, s.opacity)} ${s.position}%`)
    .join(", ");
  return `radial-gradient(${center}, ${stops})`;
}

const DEFAULT_STOPS: OverlayStop[] = [
  { color: "#000000", opacity: 0, position: 0 },
  { color: "#000000", opacity: 0.6, position: 100 },
];

function SolidEditor({
  id,
  value,
  onChange,
  testId,
}: {
  id: string;
  value: Extract<OverlayValue, { kind: "solid" }>;
  onChange: (next: OverlayValue) => void;
  testId?: string;
}) {
  return (
    <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-2">
      <ColorRow
        id={`${id}-color`}
        color={value.color}
        onChange={(color) => onChange({ ...value, color })}
        testId={testId ? `${testId}-color` : undefined}
        tooltip="Sets the dim color."
      />
      <OpacityRow
        opacity={value.opacity}
        onChange={(opacity) => onChange({ ...value, opacity })}
        testId={testId ? `${testId}-opacity` : undefined}
        tooltip="Sets how strong the dim is (0 = invisible, 1 = fully opaque)."
      />
    </div>
  );
}

function GradientEditor({
  value,
  onChange,
  testId,
}: {
  value: Extract<OverlayValue, { kind: "linear" } | { kind: "radial" }>;
  onChange: (next: OverlayValue) => void;
  testId?: string;
}) {
  const updateStops = (stops: OverlayStop[]) => onChange({ ...value, stops });

  return (
    <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-2">
      {value.kind === "linear" ? (
        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-400">Angle: {value.angle}°</Label>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={value.angle}
            onChange={(e) => onChange({ ...value, angle: Number(e.target.value) })}
            data-testid={testId ? `${testId}-angle` : undefined}
            className="w-full"
          />
        </div>
      ) : (
        <div className="flex gap-2">
          {(["top", "center", "bottom"] as const).map((opt) => {
            const selected = value.center === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ ...value, center: opt })}
                aria-pressed={selected}
                data-testid={testId ? `${testId}-center-${opt}` : undefined}
                className={
                  selected
                    ? "flex-1 rounded border border-orange-400 bg-orange-400/90 px-2 py-1 text-xs capitalize text-zinc-950"
                    : "flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs capitalize text-zinc-300 hover:text-zinc-100"
                }
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500">Stops</p>
        {value.stops.map((stop, i) => (
          <StopRow
            // biome-ignore lint/suspicious/noArrayIndexKey: stop order is the identifier
            key={i}
            stop={stop}
            index={i}
            count={value.stops.length}
            onChange={(next) => {
              const copy = value.stops.slice();
              copy[i] = next;
              updateStops(copy);
            }}
            onRemove={() => updateStops(value.stops.filter((_, j) => j !== i))}
            onMoveUp={
              i === 0
                ? undefined
                : () => {
                    const copy = value.stops.slice();
                    const a = copy[i - 1];
                    const b = copy[i];
                    if (a === undefined || b === undefined) return;
                    copy[i - 1] = b;
                    copy[i] = a;
                    updateStops(copy);
                  }
            }
            onMoveDown={
              i === value.stops.length - 1
                ? undefined
                : () => {
                    const copy = value.stops.slice();
                    const a = copy[i];
                    const b = copy[i + 1];
                    if (a === undefined || b === undefined) return;
                    copy[i] = b;
                    copy[i + 1] = a;
                    updateStops(copy);
                  }
            }
            testId={testId ? `${testId}-stop-${i}` : undefined}
          />
        ))}
        <button
          type="button"
          onClick={() =>
            updateStops([...value.stops, { color: "#000000", opacity: 0.5, position: 100 }])
          }
          data-testid={testId ? `${testId}-add-stop` : undefined}
          className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-md border border-dashed border-zinc-700 bg-transparent text-xs text-zinc-300 hover:bg-zinc-900"
        >
          <Plus className="h-3 w-3" /> Add stop
        </button>
      </div>
    </div>
  );
}

function StopRow({
  stop,
  index: _index,
  count: _count,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  testId,
}: {
  stop: OverlayStop;
  index: number;
  count: number;
  onChange: (next: OverlayStop) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  testId?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-zinc-950/40 p-1.5" data-testid={testId}>
      <ColorRow
        id={`${testId}-color`}
        color={stop.color}
        onChange={(color) => onChange({ ...stop, color })}
        testId={testId ? `${testId}-color` : undefined}
      />
      <input
        type="number"
        min={0}
        max={100}
        value={stop.position}
        onChange={(e) => onChange({ ...stop, position: Number(e.target.value) })}
        data-testid={testId ? `${testId}-position` : undefined}
        className="h-7 w-14 rounded-md border border-zinc-700 bg-zinc-900 px-1 text-xs text-zinc-100"
        aria-label="Stop position (0-100)"
      />
      <input
        type="number"
        min={0}
        max={1}
        step={0.05}
        value={stop.opacity}
        onChange={(e) => onChange({ ...stop, opacity: Number(e.target.value) })}
        data-testid={testId ? `${testId}-opacity` : undefined}
        className="h-7 w-14 rounded-md border border-zinc-700 bg-zinc-900 px-1 text-xs text-zinc-100"
        aria-label="Stop opacity (0-1)"
      />
      <button
        type="button"
        onClick={onMoveUp}
        disabled={!onMoveUp}
        aria-label="Move stop up"
        data-testid={testId ? `${testId}-up` : undefined}
        className="text-zinc-400 disabled:opacity-30 hover:text-zinc-100"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={!onMoveDown}
        aria-label="Move stop down"
        data-testid={testId ? `${testId}-down` : undefined}
        className="text-zinc-400 disabled:opacity-30 hover:text-zinc-100"
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove stop"
        data-testid={testId ? `${testId}-remove` : undefined}
        className="text-zinc-400 hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ColorRow({
  id: _id,
  color,
  onChange,
  testId,
  tooltip,
}: {
  id: string;
  color: string;
  onChange: (next: string) => void;
  testId?: string;
  tooltip?: string;
}) {
  return (
    <Popover>
      <WithTooltip tooltip={tooltip} testId={testId}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid={testId}
            aria-label="Pick color"
            className="h-7 w-9 rounded-md border border-zinc-700"
            style={{ background: color }}
          />
        </PopoverTrigger>
      </WithTooltip>
      <PopoverContent className="w-auto p-2">
        <HexColorPicker color={color} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

function OpacityRow({
  opacity,
  onChange,
  testId,
  tooltip,
}: {
  opacity: number;
  onChange: (next: number) => void;
  testId?: string;
  tooltip?: string;
}) {
  return (
    <WithTooltip tooltip={tooltip} testId={testId}>
      <div className="space-y-1">
        <Label className="text-[11px] text-zinc-400">Opacity: {opacity.toFixed(2)}</Label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={opacity}
          onChange={(e) => onChange(Number(e.target.value))}
          data-testid={testId}
          className="w-full"
        />
      </div>
    </WithTooltip>
  );
}

function rgbaFromHex(hex: string, opacity: number): string {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match || !match[1]) return `rgba(0, 0, 0, ${opacity})`;
  const r = Number.parseInt(match[1].slice(0, 2), 16);
  const g = Number.parseInt(match[1].slice(2, 4), 16);
  const b = Number.parseInt(match[1].slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
