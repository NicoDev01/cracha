import type { NextConfig } from "next";

/**
 * Sent with every response. The CSP is deliberately narrow: it forbids framing
 * (clickjacking on the dashboard), <base> rewrites and plugins, but sets no
 * script-src — the root layout's theme script is inline, and a nonce would
 * force every prerendered page to render per request.
 */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  // Cloudflare Workers optimizations
  serverExternalPackages: [],
  
  // Image optimization for Cloudflare
  images: {
    unoptimized: true,
  },

  // SVG support for Turbopack (Next.js 15)
  turbopack: {
    rules: {
      '*.svg': {
        as: '*.js',
        loaders: ['@svgr/webpack'],
      },
    },
  },

  // SVG support for Webpack (fallback)
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack", "url-loader"],
    });
    return config;
  },
};

export default nextConfig;
