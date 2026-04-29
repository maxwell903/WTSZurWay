import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // jsdom (pulled in transitively by isomorphic-dompurify, used by the
  // visitor-side rich-text renderer) reads `browser/default-stylesheet.css`
  // via fs.readFileSync(path.resolve(__dirname, ...)) at module load. When
  // webpack bundles it into .next/server/vendor-chunks, __dirname no longer
  // points at jsdom's package dir and the read fails with ENOENT. Marking
  // both as server-external makes Node require() them from node_modules at
  // runtime, preserving __dirname.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
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
