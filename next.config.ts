import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
