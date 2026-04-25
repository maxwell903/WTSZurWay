import { CustomInstructionsSection } from "@/components/setup-form/custom-instructions-section";
import { setupFormSchema } from "@/lib/setup-form/schema";
import type { SetupFormValues } from "@/lib/setup-form/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/setup-form/resize-image", () => ({
  resizeImage: vi.fn(async (file: File) => ({
    blob: new Blob([file.name]),
    url: `blob:fake-${file.name}`,
    name: file.name,
  })),
}));

vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

function ValueSpy() {
  const form = useFormContext<SetupFormValues>();
  const value = form.watch("customInstructions");
  return <span data-testid="value-customInstructions">{String(value ?? "")}</span>;
}

function Wrapper({ children }: { children: ReactNode }) {
  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: {
      customInstructions: "",
      inspirationImages: [],
    },
    mode: "onChange",
  });
  return <FormProvider {...form}>{children}</FormProvider>;
}

describe("<CustomInstructionsSection>", () => {
  it("renders the textarea with the spec placeholder", () => {
    render(
      <Wrapper>
        <CustomInstructionsSection />
      </Wrapper>,
    );
    expect(screen.getByPlaceholderText(/How would you like me to/i)).toBeInTheDocument();
  });

  it("renders the inline 'Inspiration only' disclaimer below the textarea", () => {
    render(
      <Wrapper>
        <CustomInstructionsSection />
      </Wrapper>,
    );
    expect(screen.getByTestId("custom-instructions-disclaimer")).toHaveTextContent(
      /Inspiration only — we won't copy designs pixel-for-pixel/,
    );
  });

  it("updates customInstructions in form state when the user types", async () => {
    render(
      <Wrapper>
        <CustomInstructionsSection />
        <ValueSpy />
      </Wrapper>,
    );
    const textarea = screen.getByPlaceholderText(/How would you like me to/i);
    fireEvent.change(textarea, { target: { value: "Make it minimal and bold." } });
    await waitFor(() => {
      expect(screen.getByTestId("value-customInstructions")).toHaveTextContent(
        "Make it minimal and bold.",
      );
    });
  });

  it("opens the file dialog when the paperclip button is clicked", () => {
    render(
      <Wrapper>
        <CustomInstructionsSection />
      </Wrapper>,
    );
    const fileInput = screen.getByTestId("image-attachment-file-input") as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, "click").mockImplementation(() => undefined);
    fireEvent.click(screen.getByTestId("custom-instructions-attach"));
    expect(clickSpy).toHaveBeenCalled();
  });
});
