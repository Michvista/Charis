import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix workspace root detection with multiple lockfiles
  outputFileTracingRoot: path.join(__dirname),

  // Proxy /api/* and /auth/* to Django backend — eliminates CORS in browser
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/:path*`,
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
