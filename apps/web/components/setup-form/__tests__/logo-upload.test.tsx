import { LogoUpload } from "@/components/setup-form/logo-upload";
import { setupFormSchema } from "@/lib/setup-form/schema";
import type { SetupFormValues } from "@/lib/setup-form/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";

const uploadLogoMock = vi.fn();
vi.mock("@/lib/storage", () => ({
  uploadLogo: (file: File) => uploadLogoMock(file),
  uploadAttachment: vi.fn(),
}));

const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  }),
}));

function ValueSpy() {
  const form = useFormContext<SetupFormValues>();
  const value = form.watch("logoPrimary");
  return <span data-testid="value-logoPrimary">{value ? `${value.name}|${value.url}` : ""}</span>;
}

function Wrapper({ children }: { children: ReactNode }) {
  const form = useForm<z.input<typeof setupFormSchema>, undefined, SetupFormValues>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: {
      companyName: "",
      additionalLogos: [],
      templateStart: "ai_generate",
      inspirationImages: [],
    },
    mode: "onChange",
  });
  return <FormProvider {...form}>{children}</FormProvider>;
}

describe("<LogoUpload>", () => {
  beforeEach(() => {
    uploadLogoMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the dashed drop-zone with the spec copy", () => {
    render(
      <Wrapper>
        <LogoUpload />
      </Wrapper>,
    );
    expect(screen.getByTestId("logo-upload-dropzone")).toBeInTheDocument();
    expect(screen.getByText(/Drop your logo here/)).toBeInTheDocument();
    expect(screen.getByText(/PNG, SVG, JPG/)).toBeInTheDocument();
  });

  it("triggers the hidden file input when the drop zone is clicked", () => {
    render(
      <Wrapper>
        <LogoUpload />
      </Wrapper>,
    );
    const fileInput = screen.getByTestId("logo-upload-file-input") as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, "click").mockImplementation(() => undefined);
    fireEvent.click(screen.getByTestId("logo-upload-dropzone"));
    expect(clickSpy).toHaveBeenCalled();
  });

  it("uploads the chosen file and sets the form's logoPrimary field", async () => {
    uploadLogoMock.mockResolvedValueOnce({
      url: "https://supabase.example/storage/logos/123-acme.png",
      path: "123-acme.png",
    });

    render(
      <Wrapper>
        <LogoUpload />
        <ValueSpy />
      </Wrapper>,
    );

    const fileInput = screen.getByTestId("logo-upload-file-input") as HTMLInputElement;
    const file = new File(["a"], "Acme Logo.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadLogoMock).toHaveBeenCalledTimes(1);
    });
    expect(uploadLogoMock).toHaveBeenCalledWith(file);

    await waitFor(() => {
      expect(screen.getByTestId("logo-upload-preview")).toBeInTheDocument();
    });
    expect(screen.getByTestId("logo-upload-filename")).toHaveTextContent("Acme Logo.png");
    expect(screen.getByTestId("value-logoPrimary")).toHaveTextContent(
      "Acme Logo.png|https://supabase.example/storage/logos/123-acme.png",
    );
  });

  it("shows a toast and leaves form state untouched when uploadLogo throws", async () => {
    uploadLogoMock.mockRejectedValueOnce(new Error("Upload to logos failed: anon disallowed"));

    render(
      <Wrapper>
        <LogoUpload />
        <ValueSpy />
      </Wrapper>,
    );

    const fileInput = screen.getByTestId("logo-upload-file-input") as HTMLInputElement;
    const file = new File(["a"], "broken.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledTimes(1);
    });
    const [title, options] = toastErrorMock.mock.calls[0] ?? [];
    expect(title).toMatch(/Logo upload failed/);
    expect(options).toMatchObject({ description: expect.stringContaining("anon disallowed") });

    expect(screen.queryByTestId("logo-upload-preview")).not.toBeInTheDocument();
    expect(screen.getByTestId("value-logoPrimary")).toHaveTextContent("");
  });

  it("rejects non-image MIME types with a toast and never calls uploadLogo", async () => {
    render(
      <Wrapper>
        <LogoUpload />
      </Wrapper>,
    );
    const fileInput = screen.getByTestId("logo-upload-file-input") as HTMLInputElement;
    const file = new File(["x"], "notes.txt", { type: "text/plain" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledTimes(1);
    });
    expect(toastErrorMock.mock.calls[0]?.[0]).toMatch(/Unsupported file type/);
    expect(uploadLogoMock).not.toHaveBeenCalled();
  });

  it("clears form state when Replace is clicked after an upload", async () => {
    uploadLogoMock.mockResolvedValueOnce({
      url: "https://supabase.example/storage/logos/abc.png",
      path: "abc.png",
    });

    render(
      <Wrapper>
        <LogoUpload />
        <ValueSpy />
      </Wrapper>,
    );

    const fileInput = screen.getByTestId("logo-upload-file-input") as HTMLInputElement;
    const file = new File(["a"], "abc.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("logo-upload-preview")).toBeInTheDocument();
    });

    vi.spyOn(fileInput, "click").mockImplementation(() => undefined);
    fireEvent.click(screen.getByTestId("logo-upload-replace"));

    expect(screen.getByTestId("logo-upload-dropzone")).toBeInTheDocument();
    expect(screen.getByTestId("value-logoPrimary")).toHaveTextContent("");
  });

  it("renders without crashing when there is no FormProvider ancestor", () => {
    render(<LogoUpload />);
    expect(screen.getByTestId("logo-upload-dropzone")).toBeInTheDocument();
    expect(screen.getByText(/Drop your logo here/)).toBeInTheDocument();
  });
});
