import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Avoid Turbopack bundling native/optional deps pulled by bash-tool */
  serverExternalPackages: ["bash-tool", "@vercel/sandbox", "just-bash", "@mongodb-js/zstd"],
};

export default nextConfig;
