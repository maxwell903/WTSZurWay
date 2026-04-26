import { Renderer } from "@/components/renderer";
import { parseSiteConfig } from "@/lib/site-config";
import { notFound } from "next/navigation";
import { repeaterDevFixture } from "./fixtures";

// Sprint 9 dev preview. Mirrors `/dev/preview` and `/dev/components`: a
// hard-coded SiteConfig rendered in `mode="preview"` so the smoke test can
// exercise the Repeater pipeline without dragging in the real Aurora editor.
export default function DevRepeaterPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const config = parseSiteConfig(repeaterDevFixture);
  return <Renderer config={config} page="home" mode="preview" />;
}
