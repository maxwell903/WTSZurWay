import {
  AI_EDIT_NARRATION_STRINGS,
  AiEditNarration,
  NARRATION_INTERVAL_MS,
} from "@/components/editor/ai-chat/AiEditNarration";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("AiEditNarration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the first §9.5 narration string on first paint", () => {
    render(<AiEditNarration />);
    expect(screen.getByTestId("ai-edit-narration").textContent).toBe(AI_EDIT_NARRATION_STRINGS[0]);
  });

  it("rotates through all four §9.5 strings on the configured interval", () => {
    render(<AiEditNarration />);
    for (let i = 0; i < AI_EDIT_NARRATION_STRINGS.length * 2; i++) {
      const expected = AI_EDIT_NARRATION_STRINGS[i % AI_EDIT_NARRATION_STRINGS.length];
      expect(screen.getByTestId("ai-edit-narration").textContent).toBe(expected);
      act(() => {
        vi.advanceTimersByTime(NARRATION_INTERVAL_MS);
      });
    }
  });

  it("reproduces the §9.5 strings verbatim including ellipsis", () => {
    expect(AI_EDIT_NARRATION_STRINGS).toEqual([
      "Reading your request…",
      "Looking at the current page…",
      "Planning the changes…",
      "Writing the diff…",
    ]);
  });
});
