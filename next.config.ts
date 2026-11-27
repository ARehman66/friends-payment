import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the default Next.js "N" dev badge
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
