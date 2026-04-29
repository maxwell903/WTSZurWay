"use client";

import {
  OverlayInput,
  type OverlayValue,
} from "@/components/editor/edit-panels/controls/OverlayInput";
import { TextInput } from "@/components/editor/edit-panels/controls/TextInput";
import { type SectionProps, readString } from "./utils";

// Sprint 5 OverlaySection. Replaces the v1 boolean overlay switch with the
// full discriminated overlay editor. Backwards-compat: when node.props.overlay
// is `true` we coerce to the default solid for the editor; the renderer's
// schema preprocess does the same coercion at render time. When the user
// chooses "None" we write `false` (not undefined) so the schema doesn't
// re-coerce it back to the default solid.
function readOverlay(props: Record<string, unknown>): OverlayValue {
  const raw = props.overlay;
  if (raw === undefined || raw === null || raw === true) {
    return { kind: "solid", color: "#000000", opacity: 0.45 };
  }
  if (raw === false) return undefined;
  if (raw && typeof raw === "object" && "kind" in raw) {
    return raw as OverlayValue;
  }
  return { kind: "solid", color: "#000000", opacity: 0.45 };
}

export function OverlaySection({ node, writePartial }: SectionProps) {
  return (
    <div className="space-y-2">
      <OverlayInput
        id="hero-overlay"
        label="Overlay"
        value={readOverlay(node.props)}
        testId="hero-overlay"
        tooltip="Adds a dimming color or gradient over the background to make text more readable."
        onChange={(next) => {
          // `undefined` means the user chose "None"; write `false` so the
          // schema's preprocess doesn't fall back to the default solid.
          writePartial({ overlay: next === undefined ? false : next });
        }}
      />
      <TextInput
        id="hero-height"
        label="Height"
        value={readString(node.props, "height", "480px")}
        placeholder="480px"
        testId="hero-height"
        tooltip="Sets the hero's vertical size, e.g. 480px or 60vh."
        onChange={(next) => writePartial({ height: next })}
      />
    </div>
  );
}
