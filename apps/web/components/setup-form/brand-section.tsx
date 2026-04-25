"use client";

// Sprint 2c hand-off: this section's body now hosts <LogoUpload>. The
// section heading + container are unchanged from Sprint 2a so the
// Sprint-2a-owned brand-section.test.tsx assertions ("Company Logo" header,
// "Drop your logo here", "PNG, SVG, JPG") continue to render.

import { LogoUpload } from "@/components/setup-form/logo-upload";

export function BrandSection() {
  return (
    <section className="rounded-lg bg-zinc-900 p-6">
      <h2 className="text-lg font-semibold text-white">Company Logo</h2>
      <div className="mt-4">
        <LogoUpload />
      </div>
    </section>
  );
}
