import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Avoid deployment failure on Vercel due to deprecated next lint in Next.js 15
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Enforce strict 0 error TypeScript check during build
    ignoreBuildErrors: false,
  },
  experimental: {
    webpackBuildWorker: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
