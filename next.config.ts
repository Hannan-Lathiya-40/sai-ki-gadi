import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local LAN access to the Next.js 16 dev server without blocking API fetches.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "10.220.119.203",
    "192.168.1.4",
  ],
};

export default nextConfig;
