"use client";

import {
  ImageAttachmentInput,
  type ImageAttachmentInputHandle,
} from "@/components/setup-form/image-attachment-input";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import type { SetupFormValues } from "@/lib/setup-form/types";
import { cn } from "@/lib/utils";
import { Paperclip } from "lucide-react";
import { useRef } from "react";
import { useController, useFormContext } from "react-hook-form";

const PLACEHOLDER =
  "How would you like me to…? Describe your ideal website — pages, features, tone, inspiration sites, and anything else that matters.";

const DISCLAIMER = "Inspiration only — we won't copy designs pixel-for-pixel.";

export function CustomInstructionsSection() {
  const form = useFormContext<SetupFormValues>();
  const inputRef = useRef<ImageAttachmentInputHandle | null>(null);
  const images = useController({ control: form.control, name: "inspirationImages" });

  const attached = images.field.value ?? [];

  return (
    <section className="rounded-lg bg-zinc-900 p-6">
      <FormField
        control={form.control}
        name="customInstructions"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="relative">
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  rows={4}
                  placeholder={PLACEHOLDER}
                  className={cn(
                    "min-h-[140px] max-h-[280px] resize-y",
                    "border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500",
                    "pr-12 focus-visible:ring-zinc-400",
                  )}
                />
                <button
                  type="button"
                  aria-label="Attach inspiration images"
                  data-testid="custom-instructions-attach"
                  onClick={() => inputRef.current?.openFileDialog()}
                  className="absolute right-3 bottom-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <p data-testid="custom-instructions-disclaimer" className="mt-2 text-xs text-zinc-500">
        {DISCLAIMER}
      </p>
      <ImageAttachmentInput
        ref={inputRef}
        value={attached}
        onChange={(next) => images.field.onChange(next)}
        thumbnailsClassName="mt-3"
      />
    </section>
  );
}
