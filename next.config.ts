import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output bundles only what the server needs, which keeps
  // cPanel uploads small and lets Passenger start `server.js` directly.
  output: "standalone",
  poweredByHeader: false,
  // Keep uploads (private CVs), sources and secrets out of the deploy bundle.
  outputFileTracingExcludes: {
    "*": ["./uploads/**", "./src/**", "./scripts/**", "./deploy/**", "./.env*", "./drizzle/**", "./*.md"],
  },
  // Content is read from PostgreSQL at request time and cached with tags,
  // so the build never needs a database connection.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      // CV uploads and media uploads go through Server Actions.
      bodySizeLimit: "12mb",
    },
  },
  serverExternalPackages: ["pg", "bcryptjs", "sanitize-html", "nodemailer"],
  images: {
    // cPanel hosts often lack sharp; serve uploaded images as-is.
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
