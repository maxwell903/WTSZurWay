"use client";

import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PALETTES } from "@/lib/setup-form/palettes";
import { PALETTE_IDS, type SetupFormValues } from "@/lib/setup-form/types";
import { cn } from "@/lib/utils";
import { useFormContext } from "react-hook-form";

export function ColorSchemeSection() {
  const form = useFormContext<SetupFormValues>();

  return (
    <section className="rounded-lg bg-zinc-900 p-6">
      <h2 className="text-lg font-semibold text-white">
        Color Scheme<span className="ml-0.5 text-red-500">*</span>
      </h2>
      <FormField
        control={form.control}
        name="palette"
        render={({ field }) => (
          <FormItem className="mt-4">
            <FormControl>
              <RadioGroup
                value={field.value ?? ""}
                onValueChange={field.onChange}
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
              >
                {PALETTE_IDS.map((id) => {
                  const palette = PALETTES[id];
                  const selected = field.value === id;
                  const inputId = `palette-${id}`;
                  return (
                    <label
                      key={id}
                      htmlFor={inputId}
                      data-testid={`palette-card-${id}`}
                      data-state={selected ? "checked" : "unchecked"}
                      className={cn(
                        "flex cursor-pointer flex-col gap-3 rounded-lg border-2 bg-zinc-950 p-3 transition",
                        selected ? "border-white" : "border-zinc-800 hover:border-zinc-600",
                      )}
                    >
                      <RadioGroupItem id={inputId} value={id} className="sr-only" />
                      <div className="flex gap-1">
                        {palette.swatches.map((swatch) => (
                          <div
                            key={`${id}-${swatch}`}
                            className="h-6 w-6 rounded-full"
                            style={{ background: swatch }}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-white">{palette.label}</span>
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
