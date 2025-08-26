#!/bin/bash

# Deploy CraCha main.py to Modal.com
echo "🚀 Deploying CraCha main.py to Modal.com..."

# Check if modal is installed
if ! command -v modal &> /dev/null; then
    echo "❌ Modal CLI not found. Installing..."
    pip install modal
fi

# Check if logged in to Modal
if ! modal token list &> /dev/null; then
    echo "🔐 Please login to Modal.com first:"
    echo "Run: modal token new"
    exit 1
fi

# Create secrets if they don't exist
echo "🔑 Setting up Modal secrets..."
modal secret create cracha-secrets \
    OPENAI_API_KEY="$OPENAI_API_KEY" \
    GEMINI_API_KEY="$GEMINI_API_KEY" \
    CLOUDFLARE_ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID" \
    CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" \
    VECTORIZE_INDEX_ID="$VECTORIZE_INDEX_ID" \
    KV_NAMESPACE_ID="$KV_NAMESPACE_ID" \
    DATABASE_URL="$DATABASE_URL" \
    --force

# Deploy the app
echo "📦 Deploying Modal app..."
modal deploy modal_main_api.py

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your API endpoints:"
echo "POST https://your-app-name--cracha-main-api-crawl-web-endpoint.modal.run/crawl"
echo "GET  https://your-app-name--cracha-main-api-health-web-endpoint.modal.run/health"
echo ""
echo "💡 Get your exact URLs with: modal app list"