import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Allow all origins during development
  },
  eslint: {
    // Don't lint during build for the data directory
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
