import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root so Next.js does not warn about a stray
  // `package-lock.json` it may find above this repo on the user's machine.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
