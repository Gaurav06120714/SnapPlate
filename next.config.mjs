import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // This app lives in a subdirectory of a larger repo; pin the workspace root
  // so Turbopack doesn't pick the parent repo's lockfile.
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
};

export default nextConfig;
