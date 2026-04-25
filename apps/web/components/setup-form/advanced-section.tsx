"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PAGE_INCLUSIONS,
  PRIMARY_CTAS,
  PROPERTY_TYPES_FEATURED,
  type PageInclusion,
  type PrimaryCta,
  type PropertyTypeFeatured,
  type SetupFormValues,
  TONES,
  type Tone,
} from "@/lib/setup-form/types";
import type { FieldPath } from "react-hook-form";
import { useFormContext } from "react-hook-form";

const PROPERTY_TYPE_LABELS: Record<PropertyTypeFeatured, string> = {
  residential: "Residential",
  commercial: "Commercial",
  manufactured_housing: "Manufactured Housing",
};

const PAGE_LABELS: Record<PageInclusion, string> = {
  home: "Home",
  properties: "Properties",
  units: "Units",
  about: "About",
  contact: "Contact",
  apply_now: "Apply Now",
  testimonials: "Testimonials",
};

const TONE_LABELS: Record<Tone, string> = {
  professional: "Professional",
  warm: "Warm",
  modern: "Modern",
  bold: "Bold",
  minimal: "Minimal",
};

const PRIMARY_CTA_LABELS: Record<PrimaryCta, string> = {
  schedule_a_tour: "Schedule a Tour",
  apply_now: "Apply Now",
  contact_us: "Contact Us",
  browse_listings: "Browse Listings",
};

const inputClass =
  "flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400";
const labelClass = "text-zinc-200";
const textareaClass =
  "min-h-[100px] w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400";

type StringFieldName = Extract<
  FieldPath<SetupFormValues>,
  | "phoneNumber"
  | "email"
  | "serviceArea"
  | "hoursOfOperation"
  | "socialFacebook"
  | "socialInstagram"
  | "socialLinkedin"
  | "socialX"
>;

type NumberFieldName = Extract<
  FieldPath<SetupFormValues>,
  "yearsInBusiness" | "numberOfProperties" | "numberOfUnits"
>;

function TextField({
  name,
  label,
  placeholder,
  type = "text",
  testId,
}: {
  name: StringFieldName;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "url";
  testId?: string;
}) {
  const form = useFormContext<SetupFormValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className={labelClass}>{label}</FormLabel>
          <FormControl>
            <input
              {...field}
              value={field.value ?? ""}
              type={type}
              placeholder={placeholder}
              data-testid={testId ?? `field-${name}`}
              className={inputClass}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function NumberField({ name, label }: { name: NumberFieldName; label: string }) {
  const form = useFormContext<SetupFormValues>();
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className={labelClass}>{label}</FormLabel>
          <FormControl>
            <input
              type="number"
              min={0}
              step={1}
              value={field.value ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                field.onChange(v === "" ? undefined : Number(v));
              }}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
              data-testid={`field-${name}`}
              className={inputClass}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function PropertyTypesField() {
  const form = useFormContext<SetupFormValues>();
  return (
    <FormField
      control={form.control}
      name="propertyTypesFeatured"
      render={({ field }) => {
        const value = field.value ?? [];
        return (
          <FormItem>
            <FormLabel className={labelClass}>Property Types Featured</FormLabel>
            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              data-testid="property-types-group"
            >
              {PROPERTY_TYPES_FEATURED.map((opt) => {
                const checked = value.includes(opt);
                const id = `property-type-${opt}`;
                return (
                  <label
                    key={opt}
                    htmlFor={id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                  >
                    <Checkbox
                      id={id}
                      data-testid={id}
                      checked={checked}
                      onCheckedChange={(c) => {
                        const next = c === true ? [...value, opt] : value.filter((v) => v !== opt);
                        field.onChange(next);
                      }}
                    />
                    {PROPERTY_TYPE_LABELS[opt]}
                  </label>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

function PagesToIncludeField() {
  const form = useFormContext<SetupFormValues>();
  return (
    <FormField
      control={form.control}
      name="pagesToInclude"
      render={({ field }) => {
        const value = field.value ?? [];
        return (
          <FormItem>
            <FormLabel className={labelClass}>Pages to Include</FormLabel>
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-3"
              data-testid="pages-to-include-group"
            >
              {PAGE_INCLUSIONS.map((opt) => {
                const checked = value.includes(opt);
                const id = `page-${opt}`;
                return (
                  <label
                    key={opt}
                    htmlFor={id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                  >
                    <Checkbox
                      id={id}
                      data-testid={id}
                      checked={checked}
                      onCheckedChange={(c) => {
                        const next = c === true ? [...value, opt] : value.filter((v) => v !== opt);
                        field.onChange(next);
                      }}
                    />
                    {PAGE_LABELS[opt]}
                  </label>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

export function AdvancedSection() {
  const form = useFormContext<SetupFormValues>();

  return (
    <section className="rounded-lg bg-zinc-900 px-6 py-2">
      <Accordion type="single" collapsible defaultValue="">
        <AccordionItem value="advanced" className="border-b-0">
          <AccordionTrigger
            data-testid="advanced-trigger"
            className="text-lg font-semibold text-white hover:no-underline"
          >
            Advanced
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-5 pt-2" data-testid="advanced-fields">
              <PropertyTypesField />
              <PagesToIncludeField />

              <FormField
                control={form.control}
                name="tone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Tone</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger
                          data-testid="tone-trigger"
                          className="border-zinc-700 bg-zinc-950 text-white"
                        >
                          <SelectValue placeholder="Select a tone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TONES.map((t) => (
                          <SelectItem key={t} value={t} data-testid={`tone-option-${t}`}>
                            {TONE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="primaryCta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Primary CTA</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger
                          data-testid="primary-cta-trigger"
                          className="border-zinc-700 bg-zinc-950 text-white"
                        >
                          <SelectValue placeholder="Select a primary CTA" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIMARY_CTAS.map((c) => (
                          <SelectItem key={c} value={c} data-testid={`primary-cta-option-${c}`}>
                            {PRIMARY_CTA_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brandVoiceNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Brand Voice Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        rows={3}
                        placeholder="e.g. friendly but professional"
                        data-testid="field-brandVoiceNotes"
                        className={textareaClass}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <TextField
                name="phoneNumber"
                label="Phone Number"
                type="tel"
                placeholder="e.g. (555) 123-4567"
              />
              <TextField
                name="email"
                label="Email"
                type="email"
                placeholder="e.g. owner@example.com"
              />
              <TextField
                name="serviceArea"
                label="Service Area"
                placeholder="e.g. Greater Cincinnati, OH"
              />
              <NumberField name="yearsInBusiness" label="Years in Business" />
              <NumberField name="numberOfProperties" label="Number of Properties" />
              <NumberField name="numberOfUnits" label="Number of Units" />
              <TextField
                name="hoursOfOperation"
                label="Hours of Operation"
                placeholder="e.g. Mon–Fri 9am–6pm"
              />

              <div data-testid="social-links-group">
                <h3 className="mb-3 text-sm font-semibold text-zinc-200">Social Links</h3>
                <div className="grid gap-3">
                  <TextField
                    name="socialFacebook"
                    label="Facebook"
                    type="url"
                    placeholder="https://facebook.com/…"
                  />
                  <TextField
                    name="socialInstagram"
                    label="Instagram"
                    type="url"
                    placeholder="https://instagram.com/…"
                  />
                  <TextField
                    name="socialLinkedin"
                    label="LinkedIn"
                    type="url"
                    placeholder="https://linkedin.com/in/…"
                  />
                  <TextField name="socialX" label="X" type="url" placeholder="https://x.com/…" />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
