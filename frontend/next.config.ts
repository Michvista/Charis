import type { NextConfig } from "next";
import path from "path";

const backendBase = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000")
  .replace(/\/api\/?$/, "")
  .replace(/\/+$/, "");

const stylingBase = (process.env.NEXT_PUBLIC_STYLING_URL || "http://localhost:3300")
  .replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Fix workspace root detection with multiple lockfiles
  outputFileTracingRoot: path.join(__dirname),

  // Proxy /api/* to Django backend and /styling-api/* to Styling service — eliminates CORS
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
      {
        source: "/styling-api/:path*",
        destination: `${stylingBase}/:path*`,
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
