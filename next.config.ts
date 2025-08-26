import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Workers optimizations
  serverExternalPackages: [],
  
  // Environment variables
  env: {
    NEXT_PUBLIC_CRACHA_WORKER_URL: process.env.NEXT_PUBLIC_CRACHA_WORKER_URL || 'https://cracha-worker-rag.aimpact-agency.workers.dev',
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  },
  
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
