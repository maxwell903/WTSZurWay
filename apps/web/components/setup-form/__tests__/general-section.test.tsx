import { setupFormSchema } from "@/lib/setup-form/schema";
import type { SetupFormValues } from "@/lib/setup-form/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { GeneralSection } from "../general-section";

function ValueSpy({ name }: { name: keyof SetupFormValues }) {
  const form = useFormContext<SetupFormValues>();
  const value = form.watch(name);
  return <span data-testid={`value-${name}`}>{String(value ?? "")}</span>;
}

function ErrorSpy({ name }: { name: keyof SetupFormValues }) {
  const form = useFormContext<SetupFormValues>();
  const error = form.formState.errors[name];
  return <span data-testid={`error-${name}`}>{error?.message ? String(error.message) : ""}</span>;
}

function Wrapper({ children }: { children: ReactNode }) {
  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: {
      companyName: "",
      tagline: "",
      currentWebsiteUrl: "",
      targetAudience: "",
    },
    mode: "onChange",
  });
  return <FormProvider {...form}>{children}</FormProvider>;
}

describe("<GeneralSection>", () => {
  it("renders the four labeled inputs", () => {
    render(
      <Wrapper>
        <GeneralSection />
      </Wrapper>,
    );
    expect(screen.getByText(/Company Name/)).toBeInTheDocument();
    expect(screen.getByText(/Tagline \/ Slogan/)).toBeInTheDocument();
    expect(screen.getByText(/Current Website URL/)).toBeInTheDocument();
    expect(screen.getByText(/Target Audience/)).toBeInTheDocument();
  });

  it("shows a required-asterisk on Company Name", () => {
    render(
      <Wrapper>
        <GeneralSection />
      </Wrapper>,
    );
    const label = screen.getByText(/Company Name/);
    expect(label.textContent).toContain("*");
  });

  it("renders the placeholder copy from the spec", () => {
    render(
      <Wrapper>
        <GeneralSection />
      </Wrapper>,
    );
    expect(screen.getByPlaceholderText(/Acme Corporation/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Building the future, today/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/yoursite\.com/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Small business owners/)).toBeInTheDocument();
  });

  it("updates form state when the user types into Company Name", async () => {
    render(
      <Wrapper>
        <GeneralSection />
        <ValueSpy name="companyName" />
      </Wrapper>,
    );
    const input = screen.getByPlaceholderText(/Acme Corporation/);
    fireEvent.change(input, { target: { value: "Aurora Property Group" } });
    await waitFor(() => {
      expect(screen.getByTestId("value-companyName")).toHaveTextContent("Aurora Property Group");
    });
  });

  it("surfaces a validation error when an invalid URL is typed", async () => {
    render(
      <Wrapper>
        <GeneralSection />
        <ErrorSpy name="currentWebsiteUrl" />
      </Wrapper>,
    );
    const url = screen.getByPlaceholderText(/yoursite\.com/);
    fireEvent.change(url, { target: { value: "not a url" } });
    await waitFor(() => {
      expect(screen.getByTestId("error-currentWebsiteUrl").textContent).not.toBe("");
    });
  });
});
