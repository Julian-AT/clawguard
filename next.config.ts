import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Avoid Turbopack bundling native/optional deps pulled by bash-tool */
  serverExternalPackages: ["bash-tool", "@vercel/sandbox", "just-bash", "@mongodb-js/zstd"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
