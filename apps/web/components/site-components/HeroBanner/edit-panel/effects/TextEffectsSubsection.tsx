"use client";

import { TextInput } from "@/components/editor/edit-panels/controls/TextInput";
import { WithTooltip } from "@/components/editor/edit-panels/controls/with-tooltip";
import { Label } from "@/components/ui/label";
import type { HeroBannerData } from "../../schema";
import type { SectionProps } from "../utils";

function readRotatingWords(props: Record<string, unknown>): string[] {
  const raw = props.rotatingWords;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

function readCountdown(
  props: Record<string, unknown>,
): NonNullable<HeroBannerData["countdown"]> | undefined {
  const raw = props.countdown;
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.targetIso !== "string") return undefined;
  return {
    targetIso: r.targetIso,
    label: typeof r.label === "string" ? r.label : undefined,
    expiredLabel: typeof r.expiredLabel === "string" ? r.expiredLabel : undefined,
  };
}

export function TextEffectsSubsection({ node, writePartial }: SectionProps) {
  const rotatingWords = readRotatingWords(node.props);
  const countdown = readCountdown(node.props);

  const writeWords = (csv: string) => {
    const words = csv
      .split(",")
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    writePartial({ rotatingWords: words.length === 0 ? undefined : words });
  };

  const writeCountdown = (next: Partial<NonNullable<HeroBannerData["countdown"]>>) => {
    if (countdown) {
      writePartial({ countdown: { ...countdown, ...next } });
    } else if (next.targetIso) {
      writePartial({
        countdown: {
          targetIso: next.targetIso,
          label: next.label,
          expiredLabel: next.expiredLabel,
        },
      });
    }
  };

  const clearCountdown = () => writePartial({ countdown: undefined });

  return (
    <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-2">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500">Text effects</p>

      <TextInput
        id="hero-rotating-words"
        label="Rotating words (comma-separated)"
        value={rotatingWords.join(", ")}
        placeholder="websites, apps, forms"
        testId="hero-rotating-words"
        tooltip='Replaces the literal "{rotator}" token in the heading with these words, one at a time, fading every 2.5 seconds.'
        onChange={writeWords}
      />

      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-300">Countdown</Label>
        <WithTooltip
          tooltip="Sets the date/time the countdown ends. ISO format, e.g. 2026-12-31T23:59:00Z. Leave blank to remove."
          testId="hero-countdown-target-tt"
        >
          <input
            id="hero-countdown-target"
            data-testid="hero-countdown-target"
            type="datetime-local"
            value={isoToLocal(countdown?.targetIso)}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                clearCountdown();
                return;
              }
              writeCountdown({ targetIso: new Date(v).toISOString() });
            }}
            className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100"
          />
        </WithTooltip>
        <TextInput
          id="hero-countdown-label"
          label="Label"
          value={countdown?.label ?? ""}
          placeholder="Launching in"
          testId="hero-countdown-label"
          tooltip="Optional label shown above the countdown digits."
          onChange={(next) => writeCountdown({ label: next })}
        />
        <TextInput
          id="hero-countdown-expired-label"
          label="Expired label"
          value={countdown?.expiredLabel ?? ""}
          placeholder="Now live"
          testId="hero-countdown-expired-label"
          tooltip="Text shown after the countdown reaches zero. Defaults to 'Now live'."
          onChange={(next) => writeCountdown({ expiredLabel: next })}
        />
      </div>
    </div>
  );
}

// Convert "2026-12-31T23:59:00.000Z" → "2026-12-31T23:59" for datetime-local
// inputs (which use the user's local time without zone).
function isoToLocal(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
