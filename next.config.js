/** @type {import('next').NextConfig} */
const nextConfig = {
  // Native/WASM image libraries are loaded by Node at runtime rather than bundled (also silences their webpack warnings).
  experimental: { serverComponentsExternalPackages: ["sharp", "heic-convert", "heic-decode", "libheif-js"] },
  // Lets a second dev server (e.g. for testing) run beside the main one without sharing the build cache.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  async headers() {
    return [
      // The service worker must always be revalidated so updates roll out.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
};

module.exports = nextConfig;
