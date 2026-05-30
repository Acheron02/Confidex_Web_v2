import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-ecc2a0799f8246b7b169e34efc3e0b53.r2.dev",
      },
    ],
  },
};

export default nextConfig;
