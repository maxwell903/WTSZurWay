import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Trace from the monorepo root so pnpm-symlinked Next internals can be
  // followed across the symlink boundary.
  outputFileTracingRoot: join(__dirname, "../../"),
  // Workaround for vercel/next.js#83248 — `next/dist/compiled/source-map` is
  // dynamically required by Next's runtime error formatter and missed by the
  // static tracer. Force-include it (and a couple of other commonly-missed
  // compiled internals) so the function bundle is self-contained.
  outputFileTracingIncludes: {
    "/**/*": [
      "../../node_modules/.pnpm/next@*/node_modules/next/dist/compiled/source-map/**/*",
      "../../node_modules/.pnpm/next@*/node_modules/next/dist/compiled/source-map08/**/*",
    ],
  },
};

export default nextConfig;
