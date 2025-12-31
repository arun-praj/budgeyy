import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['http://localhost:3000', 'http://192.168.1.91:3000', '192.168.1.91'],
  // cacheComponents: true, // Disabled to fix dynamic route build issue
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
