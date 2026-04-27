import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DragStateProvider, DropZoneIndicator } from "../DropZoneIndicator";

describe("DropZoneIndicator (post-overlay-system)", () => {
  it("emits NO DOM regardless of drag state — overlay system replaces it", () => {
    const { container } = render(
      <DragStateProvider
        value={{ activeId: "palette:Heading", overId: "node:cmp_x", isAcceptable: true }}
      >
        <DropZoneIndicator id="cmp_x" />
      </DragStateProvider>,
    );
    expect(container.firstChild).toBeNull();
  });
});
