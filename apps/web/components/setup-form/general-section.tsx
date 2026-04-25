"use client";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { SetupFormValues } from "@/lib/setup-form/types";
import { useFormContext } from "react-hook-form";

const inputClass =
  "flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400";

const labelClass = "text-zinc-200";

const RequiredMark = () => <span className="ml-0.5 text-red-500">*</span>;

export function GeneralSection() {
  const form = useFormContext<SetupFormValues>();

  return (
    <section className="rounded-lg bg-zinc-900 p-6">
      <h2 className="text-lg font-semibold text-white">General</h2>
      <div className="mt-4 grid gap-4">
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>
                Company Name
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="e.g. Acme Corporation"
                  className={inputClass}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tagline"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Tagline / Slogan</FormLabel>
              <FormControl>
                <input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="e.g. Building the future, today"
                  className={inputClass}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currentWebsiteUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Current Website URL</FormLabel>
              <FormControl>
                <input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="e.g. https://yoursite.com"
                  className={inputClass}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="targetAudience"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Target Audience</FormLabel>
              <FormControl>
                <input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="e.g. Small business owners aged 30-50"
                  className={inputClass}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </section>
  );
}
