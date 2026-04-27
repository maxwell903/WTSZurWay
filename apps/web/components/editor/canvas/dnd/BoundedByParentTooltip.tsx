"use client";

type Props = {
  visible: boolean;
  top: number;
  left: number;
};

// Lives at viewport coordinates because it's anchored to a fixed-position
// resize handle. Pointer-events:none so it doesn't intercept the drag.
export function BoundedByParentTooltip({ visible, top, left }: Props) {
  if (!visible) return null;
  return (
    <div
      data-testid="bounded-by-parent-tooltip"
      className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-full rounded-sm bg-zinc-800/90 px-1.5 py-0.5 text-[10px] text-white"
      style={{ top: top - 8, left }}
    >
      Bounded by parent
    </div>
  );
}
