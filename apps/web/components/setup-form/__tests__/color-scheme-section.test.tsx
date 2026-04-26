import { setupFormSchema } from "@/lib/setup-form/schema";
import { PALETTE_IDS, type SetupFormValues } from "@/lib/setup-form/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { ColorSchemeSection } from "../color-scheme-section";

// See general-section.test.tsx for why we use the triple-generic useForm form
// (input vs. output shape differ because of zod `.default(...)` fields).
type SetupFormInput = z.input<typeof setupFormSchema>;

function ValueSpy() {
  const form = useFormContext<SetupFormValues>();
  const value = form.watch("palette");
  return <span data-testid="value-palette">{String(value ?? "")}</span>;
}

function Wrapper({ children }: { children: ReactNode }) {
  const form = useForm<SetupFormInput, undefined, SetupFormValues>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: { companyName: "", tagline: "", currentWebsiteUrl: "", targetAudience: "" },
    mode: "onChange",
  });
  return <FormProvider {...form}>{children}</FormProvider>;
}

describe("<ColorSchemeSection>", () => {
  it("renders all six palette cards", () => {
    render(
      <Wrapper>
        <ColorSchemeSection />
      </Wrapper>,
    );
    for (const id of PALETTE_IDS) {
      expect(screen.getByTestId(`palette-card-${id}`)).toBeInTheDocument();
    }
  });

  it("renders a Color Scheme heading with a required asterisk", () => {
    render(
      <Wrapper>
        <ColorSchemeSection />
      </Wrapper>,
    );
    const heading = screen.getByText(/Color Scheme/);
    expect(heading.textContent).toContain("*");
  });

  it("renders four swatch dots per palette card", () => {
    render(
      <Wrapper>
        <ColorSchemeSection />
      </Wrapper>,
    );
    for (const id of PALETTE_IDS) {
      const card = screen.getByTestId(`palette-card-${id}`);
      const swatches = card.querySelectorAll('[style*="background"]');
      expect(swatches.length).toBe(4);
    }
  });

  it("updates form state when a palette card is clicked", async () => {
    render(
      <Wrapper>
        <ColorSchemeSection />
        <ValueSpy />
      </Wrapper>,
    );
    fireEvent.click(screen.getByTestId("palette-card-forest"));
    await waitFor(() => {
      expect(screen.getByTestId("value-palette")).toHaveTextContent("forest");
    });

    fireEvent.click(screen.getByTestId("palette-card-ocean"));
    await waitFor(() => {
      expect(screen.getByTestId("value-palette")).toHaveTextContent("ocean");
    });
  });
});
