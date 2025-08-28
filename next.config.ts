import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Workers optimizations
  serverExternalPackages: [],
  
  // Environment variables - explicitly define all required variables
  env: {
    // Supabase Environment Variables (required for auth)
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ncfrgsqfnccjfyezxjsj.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnJnc3FmbmNjamZ5ZXp4anNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NTg0NDAsImV4cCI6MjA3MDQzNDQ0MH0.Q3OaTFVoPtcC1VLYI1hZAJrDtXLNaMnfjCPx9bvogmk',
    
    // Worker URLs
    NEXT_PUBLIC_CRACHA_WORKER_URL: process.env.NEXT_PUBLIC_CRACHA_WORKER_URL || 'https://cracha-worker-rag.aimpact-agency.workers.dev',
    NEXT_PUBLIC_ADMIN_WORKER_URL: process.env.NEXT_PUBLIC_ADMIN_WORKER_URL || 'https://cracha-admin-worker.aimpact-agency.workers.dev',
    
    // Application Config
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || 'development',
    NEXT_PUBLIC_USE_REAL_API: process.env.NEXT_PUBLIC_USE_REAL_API || 'true',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8787',
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
