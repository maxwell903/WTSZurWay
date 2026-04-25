import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandSection } from "../brand-section";

describe("<BrandSection>", () => {
  it("renders the Company Logo header", () => {
    render(<BrandSection />);
    expect(screen.getByText(/Company Logo/)).toBeInTheDocument();
  });

  it("renders the placeholder drop-zone copy", () => {
    render(<BrandSection />);
    expect(screen.getByText(/Drop your logo here/)).toBeInTheDocument();
    expect(screen.getByText(/PNG, SVG, JPG/)).toBeInTheDocument();
  });
});
