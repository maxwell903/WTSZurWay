import { setupFormSchema } from "@/lib/setup-form/schema";
import { type SetupFormValues, TEMPLATE_STARTS } from "@/lib/setup-form/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { TemplateStartSection } from "../template-start-section";

// See general-section.test.tsx for why we use the triple-generic useForm form
// (input vs. output shape differ because of zod `.default(...)` fields).
type SetupFormInput = z.input<typeof setupFormSchema>;

function ValueSpy() {
  const form = useFormContext<SetupFormValues>();
  const value = form.watch("templateStart");
  return <span data-testid="value-templateStart">{String(value ?? "")}</span>;
}

function Wrapper({ children }: { children: ReactNode }) {
  const form = useForm<SetupFormInput, undefined, SetupFormValues>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: {
      companyName: "",
      tagline: "",
      currentWebsiteUrl: "",
      targetAudience: "",
      templateStart: "ai_generate",
    },
    mode: "onChange",
  });
  return <FormProvider {...form}>{children}</FormProvider>;
}

describe("<TemplateStartSection>", () => {
  it("renders all five template-start cards", () => {
    render(
      <Wrapper>
        <TemplateStartSection />
      </Wrapper>,
    );
    for (const id of TEMPLATE_STARTS) {
      expect(screen.getByTestId(`template-card-${id}`)).toBeInTheDocument();
    }
  });

  it("starts with AI Generate selected", () => {
    render(
      <Wrapper>
        <TemplateStartSection />
        <ValueSpy />
      </Wrapper>,
    );
    expect(screen.getByTestId("value-templateStart")).toHaveTextContent("ai_generate");
    expect(screen.getByTestId("template-card-ai_generate")).toHaveAttribute(
      "data-state",
      "checked",
    );
  });

  it("updates form state when a different card is clicked", async () => {
    render(
      <Wrapper>
        <TemplateStartSection />
        <ValueSpy />
      </Wrapper>,
    );
    fireEvent.click(screen.getByTestId("template-card-blank"));
    await waitFor(() => {
      expect(screen.getByTestId("value-templateStart")).toHaveTextContent("blank");
    });
  });
});
