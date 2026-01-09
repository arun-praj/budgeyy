import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  allowedDevOrigins: ['http://localhost:3000', 'http://192.168.1.91:3000', '192.168.1.91'],
  cacheComponents: true, // Enabled for Next.js 16 caching
  serverExternalPackages: ["sharp", "postgres", "drizzle-orm"],
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
