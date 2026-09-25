import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Cedar WASM bindings ship a .wasm file loaded via a relative path at
  // runtime - bundling it breaks that path, so keep it external and let
  // Node's normal module resolution handle it.
  serverExternalPackages: ["@cedar-policy/cedar-wasm"],
};

export default nextConfig;
