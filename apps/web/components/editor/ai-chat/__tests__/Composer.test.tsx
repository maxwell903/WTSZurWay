import { Composer } from "@/components/editor/ai-chat/Composer";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("Composer", () => {
  it("calls onSend with the trimmed prompt and clears the input", () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);
    const ta = screen.getByTestId("composer-textarea") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "  hi there  " } });
    fireEvent.click(screen.getByLabelText("Send"));
    expect(onSend).toHaveBeenCalledWith("hi there", []);
    expect(ta.value).toBe("");
  });

  it("submits on Enter without Shift", () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);
    const ta = screen.getByTestId("composer-textarea") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "go" } });
    fireEvent.keyDown(ta, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("go", []);
  });

  it("does not submit on Shift+Enter", () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);
    const ta = screen.getByTestId("composer-textarea") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "go" } });
    fireEvent.keyDown(ta, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables submit when disabled is true", () => {
    const onSend = vi.fn();
    render(<Composer disabled onSend={onSend} />);
    const ta = screen.getByTestId("composer-textarea") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "go" } });
    fireEvent.click(screen.getByLabelText("Send"));
    expect(onSend).not.toHaveBeenCalled();
  });

  it("rejects files larger than 5 MB before resize and surfaces an inline error", async () => {
    const onSend = vi.fn();
    render(<Composer onSend={onSend} />);
    const fileInput = screen.getByTestId("composer-file-input") as HTMLInputElement;
    const big = new File([new Uint8Array(6 * 1024 * 1024)], "big.png", { type: "image/png" });
    Object.defineProperty(fileInput, "files", { value: [big] });
    fireEvent.change(fileInput);
    // Wait one microtask for the async handleFiles loop.
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByTestId("composer-error").textContent).toMatch(/too large/i);
  });

  it("syncs prefill into the input via useEffect", () => {
    const { rerender } = render(<Composer onSend={() => {}} />);
    const ta = screen.getByTestId("composer-textarea") as HTMLTextAreaElement;
    expect(ta.value).toBe("");
    rerender(<Composer onSend={() => {}} prefill="Make it taller" onPrefillConsumed={() => {}} />);
    expect(ta.value).toBe("Make it taller");
  });
});
