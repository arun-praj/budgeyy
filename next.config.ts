import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['http://localhost:3000', 'http://192.168.1.73:3000'],
  experimental: {
  },
};

export default nextConfig;
