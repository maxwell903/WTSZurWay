import { ComponentRenderer } from "@/components/renderer/ComponentRenderer";
import type { ComponentNode } from "@/lib/site-config";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// Fixture: a Row with 3 Columns at different widths and margins, mirroring
// the user's "Vigilant Security / Justice-First Service / Legacy of Excellence"
// layout where cols 2 and 3 had margin-left:-64 from prior left-edge resizes.
function makeRow(): ComponentNode {
  return {
    id: "cmp_row",
    type: "Row",
    props: { gap: 16 },
    style: {},
    children: [
      {
        id: "cmp_col_1",
        type: "Column",
        props: { span: 4, gap: 8, alignItems: "stretch" },
        style: { width: "352px" },
        children: [],
      },
      {
        id: "cmp_col_2",
        type: "Column",
        props: { span: 4, gap: 8, alignItems: "stretch" },
        style: { width: "320px", margin: { left: -64 } },
        children: [],
      },
      {
        id: "cmp_col_3",
        type: "Column",
        props: { span: 4, gap: 8, alignItems: "stretch" },
        style: { width: "368px", margin: { left: -64 } },
        children: [],
      },
    ],
  };
}

describe("Edit/preview parity for Row > Column layout", () => {
  it("BetweenDropZones in a Row carry parentGap = Row.gap as a negative inline margin", () => {
    const { container } = render(<ComponentRenderer node={makeRow()} mode="edit" />);

    // 4 BZs interleaved between 3 cards: bz-cmp_row-0, -1, -2, -3
    const bz0 = container.querySelector<HTMLElement>('[data-testid="between-dropzone-cmp_row-0"]');
    const bz1 = container.querySelector<HTMLElement>('[data-testid="between-dropzone-cmp_row-1"]');
    expect(bz0).not.toBeNull();
    expect(bz1).not.toBeNull();
    if (!bz0 || !bz1) return;

    // Each BZ in a horizontal Row gets margin-left equal to the negative
    // of Row.gap (16). That cancels one of the two duplicated gaps that
    // would otherwise surround it.
    expect(bz0.style.marginLeft).toBe("-16px");
    expect(bz1.style.marginLeft).toBe("-16px");
  });

  it("BetweenDropZones in a Column (vertical) get marginTop = -Column.gap", () => {
    const node: ComponentNode = {
      id: "cmp_col_x",
      type: "Column",
      props: { span: 12, gap: 12, alignItems: "stretch" },
      style: {},
      children: [
        {
          id: "cmp_h",
          type: "Heading",
          props: { text: "h" },
          style: {},
          children: [],
        },
        {
          id: "cmp_p",
          type: "Paragraph",
          props: { text: "p" },
          style: {},
          children: [],
        },
      ],
    };
    const { container } = render(<ComponentRenderer node={node} mode="edit" />);
    const bz = container.querySelector<HTMLElement>('[data-testid="between-dropzone-cmp_col_x-1"]');
    expect(bz).not.toBeNull();
    if (!bz) return;
    // Vertical orientation, Column.gap = 12 → marginTop = -12
    expect(bz.style.marginTop).toBe("-12px");
  });
});
