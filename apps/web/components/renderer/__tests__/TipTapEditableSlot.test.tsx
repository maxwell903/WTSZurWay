// @vitest-environment jsdom

import { __resetEditorStoreForTests, useEditorStore } from "@/lib/editor-state/store";
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { RenderModeProvider } from "../RenderModeContext";
import { TipTapEditableSlot } from "../TipTapEditableSlot";

describe("<TipTapEditableSlot> — active-field indicator", () => {
  beforeEach(() => __resetEditorStoreForTests());

  it("renders a 1px white-outline + transparent white background on the wrapping tag", () => {
    act(() => {
      useEditorStore.getState().enterTextEditing("cmp_x", "text");
    });
    const { container } = render(
      <RenderModeProvider value="edit">
        <TipTapEditableSlot
          nodeId="cmp_x"
          propKey="text"
          richKey="richText"
          doc={undefined}
          fallback="hi"
          profile="block"
          fullProps={{ text: "hi" }}
        />
      </RenderModeProvider>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).not.toBeNull();
    const style = wrapper?.getAttribute("style") ?? "";
    expect(style).toContain("outline");
    expect(style).toContain("rgba(255, 255, 255, 0.5)");
    expect(style).toContain("rgba(255, 255, 255, 0.06)");
  });
});
