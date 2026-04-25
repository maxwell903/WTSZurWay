"use client";

import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { type SetupFormValues, TEMPLATE_STARTS, type TemplateStart } from "@/lib/setup-form/types";
import { cn } from "@/lib/utils";
import { useFormContext } from "react-hook-form";

const TEMPLATE_LABELS: Record<TemplateStart, string> = {
  ai_generate: "AI Generate",
  blank: "Blank",
  template_residential: "Template: Residential",
  template_commercial: "Template: Commercial",
  template_mh: "Template: Manufactured Housing",
};

export function TemplateStartSection() {
  const form = useFormContext<SetupFormValues>();

  return (
    <section className="rounded-lg bg-zinc-900 p-6">
      <h2 className="text-lg font-semibold text-white">Template Start</h2>
      <FormField
        control={form.control}
        name="templateStart"
        render={({ field }) => (
          <FormItem className="mt-4">
            <FormControl>
              <RadioGroup
                value={field.value ?? "ai_generate"}
                onValueChange={field.onChange}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
              >
                {TEMPLATE_STARTS.map((id) => {
                  const selected = field.value === id;
                  const inputId = `template-start-${id}`;
                  return (
                    <label
                      key={id}
                      htmlFor={inputId}
                      data-testid={`template-card-${id}`}
                      data-state={selected ? "checked" : "unchecked"}
                      className={cn(
                        "flex cursor-pointer items-center justify-center rounded-lg border-2 bg-zinc-950 px-4 py-5 text-center text-sm font-medium text-white transition",
                        selected ? "border-white" : "border-zinc-800 hover:border-zinc-600",
                      )}
                    >
                      <RadioGroupItem id={inputId} value={id} className="sr-only" />
                      {TEMPLATE_LABELS[id]}
                    </label>
                  );
                })}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </section>
  );
}
