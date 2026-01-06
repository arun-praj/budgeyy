import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  allowedDevOrigins: ['http://localhost:3000', 'http://192.168.1.91:3000', '192.168.1.91'],
  // cacheComponents: true, // Disabled to fix dynamic route build issue
  serverExternalPackages: ["sharp"],
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
