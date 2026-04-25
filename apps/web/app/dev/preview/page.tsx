import { Renderer } from "@/components/renderer";
import { parseSiteConfig } from "@/lib/site-config";
import { notFound } from "next/navigation";
import { previewFixture } from "./fixtures";

export default function DevPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const config = parseSiteConfig(previewFixture);
  return <Renderer config={config} page="home" mode="preview" />;
}
