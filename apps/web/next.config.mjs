import { dirname } from "node:path";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Trace from the monorepo root so pnpm-symlinked Next.js internals
  // (e.g. `next/dist/compiled/source-map`) are included in the Vercel
  // serverless bundle. Setting this to `__dirname` (apps/web) silences a
  // local `package-lock.json` warning but breaks production tracing on
  // Vercel — see DECISIONS.md "2026-04-27 — Sprint 14.5".
  outputFileTracingRoot: join(__dirname, "../../"),
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
