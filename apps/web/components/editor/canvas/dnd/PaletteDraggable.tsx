"use client";

// Wraps a Sprint-6 ComponentCard so it functions BOTH as a click-to-highlight
// target (Sprint 6 selection chrome) AND a dnd-kit drag source (Sprint 7).
// The two coexist because dnd-kit's pointer sensor (configured on the
// `<DndCanvasProvider>`) has a 10-px activation distance — a stationary
// press-release fires the inner button's onClick; a >10-px move starts the
// drag. The wrapper renders only when a `<DndCanvasProvider>` is in scope;
// outside that scope (preview mode, standalone tests) the existing card
// renders unchanged.

import type { ComponentType } from "@/lib/site-config";
import { useDraggable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import { paletteId } from "./dnd-ids";

type Props = {
  type: ComponentType;
  children: ReactNode;
};

export function PaletteDraggable({ type, children }: Props) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: paletteId(type) });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-dnd-handle="palette"
      data-dnd-palette-type={type}
    >
      {children}
    </div>
  );
}
