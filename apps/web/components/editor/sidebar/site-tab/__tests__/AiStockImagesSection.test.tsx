// @vitest-environment jsdom

import { AiStockImagesSection } from "@/components/editor/sidebar/site-tab/AiStockImagesSection";
import type { StockImageRow } from "@/lib/ai/prompts/snippets/stock-images";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/editor/sidebar/site-tab/useAiStockImages", () => ({
  useAiStockImages: vi.fn(),
}));

import { useAiStockImages } from "@/components/editor/sidebar/site-tab/useAiStockImages";

const defaults: StockImageRow[] = [
  {
    id: 1,
    site_id: null,
    storage_path: "default/A/x.jpg",
    public_url: "https://example.com/x.jpg",
    category: "A",
    description: "Default image",
  },
];

const perSite: StockImageRow[] = [
  {
    id: 2,
    site_id: "11111111-1111-4111-a111-111111111111",
    storage_path: "11111111-1111-4111-a111-111111111111/y.jpg",
    public_url: "https://example.com/y.jpg",
    category: null,
    description: "Per-site image",
  },
];

afterEach(() => vi.clearAllMocks());

describe("AiStockImagesSection", () => {
  it("renders Default and Yours sections", () => {
    vi.mocked(useAiStockImages).mockReturnValue({
      state: { status: "ready", defaults, perSite },
      refetch: vi.fn(),
      uploadAndRegister: vi.fn(),
      updateDescription: vi.fn(),
      remove: vi.fn(),
    });
    render(<AiStockImagesSection siteId="11111111-1111-4111-a111-111111111111" />);
    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.getByText("Yours")).toBeInTheDocument();
    expect(screen.getByText("Default image")).toBeInTheDocument();
  });

  it("does not show delete button for global rows", () => {
    vi.mocked(useAiStockImages).mockReturnValue({
      state: { status: "ready", defaults, perSite: [] },
      refetch: vi.fn(),
      uploadAndRegister: vi.fn(),
      updateDescription: vi.fn(),
      remove: vi.fn(),
    });
    render(<AiStockImagesSection siteId="11111111-1111-4111-a111-111111111111" />);
    expect(screen.queryByLabelText("Delete image")).not.toBeInTheDocument();
  });

  it("shows the empty-state hint when no per-site images", () => {
    vi.mocked(useAiStockImages).mockReturnValue({
      state: { status: "ready", defaults, perSite: [] },
      refetch: vi.fn(),
      uploadAndRegister: vi.fn(),
      updateDescription: vi.fn(),
      remove: vi.fn(),
    });
    render(<AiStockImagesSection siteId="11111111-1111-4111-a111-111111111111" />);
    expect(screen.getByText("Upload images to expand the AI's library.")).toBeInTheDocument();
  });

  it("calls remove when the delete button on a per-site row is clicked", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAiStockImages).mockReturnValue({
      state: { status: "ready", defaults, perSite },
      refetch: vi.fn(),
      uploadAndRegister: vi.fn(),
      updateDescription: vi.fn(),
      remove,
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AiStockImagesSection siteId="11111111-1111-4111-a111-111111111111" />);
    fireEvent.click(screen.getByLabelText("Delete image"));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(2));
  });
});
