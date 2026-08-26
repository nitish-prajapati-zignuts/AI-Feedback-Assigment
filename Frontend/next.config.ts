import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.16.1.52", "localhost:3000", "127.0.0.1:3000"],
};

export default nextConfig;

