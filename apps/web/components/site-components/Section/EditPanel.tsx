"use client";

import { SwitchInput } from "@/components/editor/edit-panels/controls/SwitchInput";
import { useEditorStore } from "@/lib/editor-state";
import type { ComponentNode } from "@/lib/site-config";
import { Info } from "lucide-react";

export type SectionEditPanelProps = { node: ComponentNode };

export function SectionEditPanel({ node }: SectionEditPanelProps) {
  const setComponentProps = useEditorStore((s) => s.setComponentProps);
  const snapshotChildPositions = useEditorStore((s) => s.snapshotChildPositions);

  const props = node.props as { freePlacement?: unknown; fitToContents?: unknown };
  // Transitional read: legacy `fitToContents` (Approach B) is treated as
  // `freePlacement` so a config saved before the rename still toggles on.
  const freePlacement = props.freePlacement === true || props.fitToContents === true;

  const onToggle = (next: boolean): void => {
    // Drop the legacy `fitToContents` key on every write so once the user
    // touches the toggle post-rename, the legacy name is gone.
    const { fitToContents: _legacy, ...rest } = node.props as Record<string, unknown>;
    if (next === true) {
      // Snapshot the children's CURRENT flow-mode rects BEFORE flipping the
      // prop. If we flipped first, the children would re-render in absolute
      // mode at (0, 0) (no positions set yet) and the snapshot would
      // capture that broken layout — section collapses and the page looks
      // empty. Both store calls happen synchronously inside one JS tick,
      // so React only sees the final committed state and renders once with
      // both `position` populated and `freePlacement: true`.
      //
      // `force: true` so re-toggling after the user edited the layout in
      // flex mode picks up the new visual layout instead of sticking to
      // the stale positions from the first toggle-on.
      snapshotChildPositions(node.id, { force: true });
    }
    setComponentProps(node.id, { ...rest, freePlacement: next });
  };

  return (
    <div
      data-component-edit-panel="Section"
      data-testid="content-placeholder-section"
      className="space-y-3 text-zinc-400"
    >
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 text-zinc-500" />
        <h3 className="text-sm font-medium text-zinc-200">Content fields for this component</h3>
      </div>
      <p className="text-xs leading-relaxed text-zinc-500">
        Section is a structural container; the Style tab handles layout and the Pages tab handles
        its position.
      </p>
      <SwitchInput
        id={`section-free-placement-${node.id}`}
        label="Free placement"
        value={freePlacement}
        testId="section-free-placement"
        tooltip="When on, children stay in fixed positions. Resizing or adding a child won't move the others."
        onChange={onToggle}
      />
      {freePlacement ? (
        <button
          type="button"
          data-testid="section-recapture-positions"
          className="text-xs text-zinc-400 underline hover:text-zinc-200"
          onClick={() => snapshotChildPositions(node.id, { force: true })}
        >
          Recapture positions from current layout
        </button>
      ) : null}
    </div>
  );
}
