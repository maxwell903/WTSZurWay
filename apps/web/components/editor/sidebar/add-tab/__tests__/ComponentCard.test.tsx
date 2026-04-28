import { useEditorStore } from "@/lib/editor-state";
import { fireEvent, render } from "@testing-library/react";
import { Box } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComponentCard } from "../ComponentCard";
import type { ComponentCatalogEntry } from "../component-catalog";

const sampleEntry: ComponentCatalogEntry = {
  type: "Heading",
  group: "Content",
  label: "Heading",
  description: "A title or subtitle",
  icon: Box,
};

describe("<ComponentCard>", () => {
  afterEach(() => {
    if (useEditorStore.getState().showComponentTypes) {
      useEditorStore.getState().toggleShowComponentTypes();
    }
  });

  it("renders the entry's label and hides the description by default (x-ray off)", () => {
    const { getByText, queryByText } = render(
      <ComponentCard entry={sampleEntry} selected={false} onSelect={() => {}} />,
    );
    expect(getByText("Heading")).toBeInTheDocument();
    expect(queryByText("A title or subtitle")).not.toBeInTheDocument();
  });

  it("renders the entry's label and description when x-ray mode is on", () => {
    useEditorStore.getState().toggleShowComponentTypes();
    const { getByText } = render(
      <ComponentCard entry={sampleEntry} selected={false} onSelect={() => {}} />,
    );
    expect(getByText("Heading")).toBeInTheDocument();
    expect(getByText("A title or subtitle")).toBeInTheDocument();
  });

  it("reports aria-pressed=true when selected (Sprint 6 selection chrome preserved)", () => {
    const { getByTestId } = render(
      <ComponentCard entry={sampleEntry} selected={true} onSelect={() => {}} />,
    );
    expect(getByTestId("component-card-Heading").getAttribute("aria-pressed")).toBe("true");
  });

  it("reports aria-pressed=false when not selected", () => {
    const { getByTestId } = render(
      <ComponentCard entry={sampleEntry} selected={false} onSelect={() => {}} />,
    );
    expect(getByTestId("component-card-Heading").getAttribute("aria-pressed")).toBe("false");
  });

  it("invokes onSelect with the type on click (Sprint 6 click-to-highlight preserved)", () => {
    const onSelect = vi.fn();
    const { getByTestId } = render(
      <ComponentCard entry={sampleEntry} selected={false} onSelect={onSelect} />,
    );
    fireEvent.click(getByTestId("component-card-Heading"));
    expect(onSelect).toHaveBeenCalledWith("Heading");
  });

  it("Sprint 7: is wrapped in a PaletteDraggable source (data-dnd-handle present)", () => {
    const { container } = render(
      <ComponentCard entry={sampleEntry} selected={false} onSelect={() => {}} />,
    );
    expect(container.querySelector("[data-dnd-handle='palette']")).not.toBeNull();
    expect(container.querySelector("[data-dnd-palette-type='Heading']")).not.toBeNull();
  });

  it("Sprint 7: the inner button still carries the Sprint-6 data-testid", () => {
    const { container } = render(
      <ComponentCard entry={sampleEntry} selected={false} onSelect={() => {}} />,
    );
    expect(container.querySelector("[data-testid='component-card-Heading']")).not.toBeNull();
  });
});
