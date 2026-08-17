import type { NextConfig } from "next";
import path from "path";

const backendBase = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000")
  .replace(/\/api\/?$/, "")
  .replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Fix workspace root detection with multiple lockfiles
  outputFileTracingRoot: path.join(__dirname),

  // Proxy /api/* to Django backend — ALWAYS ensuring trailing slash for Django endpoints
  async rewrites() {
    return [
      {
        source: "/api/:path*/",
        destination: `${backendBase}/api/:path*/`,
      },
      {
        source: "/api/:path*",
        destination: `${backendBase}/api/:path*/`,
      },
    ];
  },

  // Allow images from external domains
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;
