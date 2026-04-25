import { AdvancedSection } from "@/components/setup-form/advanced-section";
import { setupFormSchema } from "@/lib/setup-form/schema";
import type { SetupFormValues } from "@/lib/setup-form/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { beforeAll, describe, expect, it } from "vitest";

// Radix UI components rely on a few DOM APIs that jsdom does not implement.
// Polyfill them once before any test in this file runs.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => undefined;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => undefined;
  }
});

function ValueSpy<K extends keyof SetupFormValues>({ name }: { name: K }) {
  const form = useFormContext<SetupFormValues>();
  const value = form.watch(name);
  return (
    <span data-testid={`value-${String(name)}`}>
      {value === undefined ? "" : JSON.stringify(value)}
    </span>
  );
}

function Wrapper({ children }: { children: ReactNode }) {
  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: {
      propertyTypesFeatured: [],
      pagesToInclude: [],
      brandVoiceNotes: "",
      phoneNumber: "",
      email: "",
      serviceArea: "",
      hoursOfOperation: "",
      socialFacebook: "",
      socialInstagram: "",
      socialLinkedin: "",
      socialX: "",
    },
    mode: "onChange",
  });
  return <FormProvider {...form}>{children}</FormProvider>;
}

describe("<AdvancedSection>", () => {
  it("renders the Advanced trigger collapsed by default", () => {
    render(
      <Wrapper>
        <AdvancedSection />
      </Wrapper>,
    );
    const trigger = screen.getByTestId("advanced-trigger");
    expect(trigger).toHaveAttribute("data-state", "closed");
    expect(screen.queryByTestId("advanced-fields")).not.toBeInTheDocument();
  });

  it("reveals all of the Advanced fields when expanded", async () => {
    render(
      <Wrapper>
        <AdvancedSection />
      </Wrapper>,
    );
    fireEvent.click(screen.getByTestId("advanced-trigger"));
    await waitFor(() => {
      expect(screen.getByTestId("advanced-fields")).toBeInTheDocument();
    });

    expect(screen.getByTestId("property-types-group")).toBeInTheDocument();
    expect(screen.getByTestId("pages-to-include-group")).toBeInTheDocument();
    expect(screen.getByTestId("tone-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("primary-cta-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("field-brandVoiceNotes")).toBeInTheDocument();
    expect(screen.getByTestId("field-phoneNumber")).toBeInTheDocument();
    expect(screen.getByTestId("field-email")).toBeInTheDocument();
    expect(screen.getByTestId("field-serviceArea")).toBeInTheDocument();
    expect(screen.getByTestId("field-yearsInBusiness")).toBeInTheDocument();
    expect(screen.getByTestId("field-numberOfProperties")).toBeInTheDocument();
    expect(screen.getByTestId("field-numberOfUnits")).toBeInTheDocument();
    expect(screen.getByTestId("field-hoursOfOperation")).toBeInTheDocument();
    expect(screen.getByTestId("social-links-group")).toBeInTheDocument();
    expect(screen.getByTestId("field-socialFacebook")).toBeInTheDocument();
    expect(screen.getByTestId("field-socialInstagram")).toBeInTheDocument();
    expect(screen.getByTestId("field-socialLinkedin")).toBeInTheDocument();
    expect(screen.getByTestId("field-socialX")).toBeInTheDocument();
  });

  it("appends a Property Types value when the matching checkbox is clicked", async () => {
    render(
      <Wrapper>
        <AdvancedSection />
        <ValueSpy name="propertyTypesFeatured" />
      </Wrapper>,
    );
    fireEvent.click(screen.getByTestId("advanced-trigger"));
    await waitFor(() => {
      expect(screen.getByTestId("property-type-residential")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("property-type-residential"));
    await waitFor(() => {
      expect(screen.getByTestId("value-propertyTypesFeatured")).toHaveTextContent(
        '["residential"]',
      );
    });
    fireEvent.click(screen.getByTestId("property-type-commercial"));
    await waitFor(() => {
      expect(screen.getByTestId("value-propertyTypesFeatured")).toHaveTextContent(
        '["residential","commercial"]',
      );
    });
  });

  it("updates the tone field when an option is selected", async () => {
    render(
      <Wrapper>
        <AdvancedSection />
        <ValueSpy name="tone" />
      </Wrapper>,
    );
    fireEvent.click(screen.getByTestId("advanced-trigger"));
    await waitFor(() => {
      expect(screen.getByTestId("tone-trigger")).toBeInTheDocument();
    });

    const trigger = screen.getByTestId("tone-trigger");
    trigger.focus();
    // Radix Select opens on Space, Enter, or ArrowDown when the trigger is
    // focused. Keyboard control is more reliable than pointer events in jsdom.
    fireEvent.keyDown(trigger, { key: " ", code: "Space" });

    const listbox = await screen.findByRole("listbox");
    const option = within(listbox).getByTestId("tone-option-modern");
    fireEvent.click(option);

    await waitFor(() => {
      expect(screen.getByTestId("value-tone")).toHaveTextContent('"modern"');
    });
  });
});
