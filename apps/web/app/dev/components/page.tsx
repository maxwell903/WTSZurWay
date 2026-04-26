import { Renderer } from "@/components/renderer";
import { parseSiteConfig } from "@/lib/site-config";
import { notFound } from "next/navigation";
import { sprint5Fixture } from "./fixtures";

export default function DevComponentsPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const config = parseSiteConfig(sprint5Fixture);
  return <Renderer config={config} page="home" mode="preview" />;
}
