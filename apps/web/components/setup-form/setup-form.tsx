"use client";

// SetupForm — the Element 1 orchestrator. Mounts FormProvider with the
// Sprint-2a Zod resolver, composes all six sections in spec order, and
// renders the bottom action bar. Save is gated on form validity (mode:
// "onChange" + an initial trigger so isValid reflects the schema before the
// user has touched anything).

import { AdvancedSection } from "@/components/setup-form/advanced-section";
import { BrandSection } from "@/components/setup-form/brand-section";
import { ColorSchemeSection } from "@/components/setup-form/color-scheme-section";
import { CustomInstructionsSection } from "@/components/setup-form/custom-instructions-section";
import { GeneralSection } from "@/components/setup-form/general-section";
import { TemplateStartSection } from "@/components/setup-form/template-start-section";
import { setupFormSchema } from "@/lib/setup-form/schema";
import type { SetupFormValues } from "@/lib/setup-form/types";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

type SetupFormInput = z.input<typeof setupFormSchema>;

// Partial because `palette` is required at the schema level but intentionally
// left undefined at mount — its absence keeps Save disabled until the user
// picks one. RHF's defaultValues accepts a partial shape.
const DEFAULT_VALUES: Partial<SetupFormInput> = {
  companyName: "",
  tagline: "",
  currentWebsiteUrl: "",
  targetAudience: "",
  // Logo fields intentionally omitted — undefined matches the optional schema.
  additionalLogos: [],
  // palette omitted — required, must be picked by the user (gates Save).
  templateStart: "ai_generate",
  customInstructions: "",
  inspirationImages: [],
  propertyTypesFeatured: [],
  pagesToInclude: [],
  // tone, primaryCta omitted — optional in schema; selecting "" would fail enum.
  brandVoiceNotes: "",
  phoneNumber: "",
  email: "",
  serviceArea: "",
  // numeric fields omitted — optional, undefined is the schema's accepted empty.
  hoursOfOperation: "",
  socialFacebook: "",
  socialInstagram: "",
  socialLinkedin: "",
  socialX: "",
};

export type SetupFormProps = {
  // Optional override hook so tests can observe the validated payload
  // without scraping console output. Production callers omit this.
  onValid?: (values: SetupFormValues) => void;
};

export function SetupForm({ onValid }: SetupFormProps = {}) {
  // The 3-arg useForm generic aligns zodResolver's
  // Resolver<SchemaInput, _, SchemaOutput> with TFieldValues / TTransformedValues.
  // The schema's `.default()` calls make some keys optional on input but
  // required on output — a single generic mismatches.
  const form = useForm<SetupFormInput, undefined, SetupFormValues>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  });

  // Force initial validation so isValid is correct on first paint (RHF only
  // computes isValid lazily otherwise — we need Save disabled at mount).
  useEffect(() => {
    void form.trigger();
  }, [form]);

  const handleValid = (values: SetupFormValues) => {
    if (onValid) {
      onValid(values);
      return;
    }
    console.log("[setup-form] valid payload", values);
    toast.success("Payload logged — Sprint 4 will wire the API");
  };

  const isValid = form.formState.isValid;

  return (
    <FormProvider {...form}>
      <form
        data-testid="setup-form"
        onSubmit={form.handleSubmit(handleValid)}
        className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10"
      >
        <GeneralSection />
        <BrandSection />
        <ColorSchemeSection />
        <TemplateStartSection />
        <CustomInstructionsSection />
        <AdvancedSection />

        <div
          data-testid="setup-form-actions"
          className="flex flex-col gap-3 border-t border-zinc-800 pt-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-zinc-500">
            <span className="text-red-500">*</span> Required fields
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              data-testid="setup-form-cancel"
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-700 bg-transparent px-4 text-sm font-medium text-white transition hover:bg-zinc-900"
            >
              Cancel
            </Link>
            <button
              type="submit"
              data-testid="setup-form-save"
              disabled={!isValid}
              className="inline-flex h-10 items-center justify-center rounded-md bg-sky-500 px-4 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
