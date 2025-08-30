#!/bin/bash
# Cloudflare Workers Authentication & Deployment Script

echo "🚀 Setting up Cloudflare Workers deployment..."

# Check if wrangler is authenticated
echo "🔐 Checking Wrangler authentication..."
if ! wrangler whoami > /dev/null 2>&1; then
    echo "❌ Wrangler not authenticated. Please run:"
    echo "   wrangler login"
    echo "Then run this script again."
    exit 1
fi

echo "✅ Wrangler is authenticated!"
echo "📦 All environment variables are configured in wrangler.toml"
echo "🚀 Ready to deploy: npm run deploy"

echo ""
echo "💡 Next steps:"
echo "   1. npm run build:cf"
echo "   2. npm run deploy"
echo ""