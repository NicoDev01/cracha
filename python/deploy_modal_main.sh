#!/bin/bash

echo "🚀 Deploying main.py to Modal.com..."

# Make sure Modal is installed
echo "📦 Checking Modal installation..."
pip install modal

# Deploy the Modal app
echo "☁️ Deploying main.py API to Modal.com..."
modal deploy modal_main_api.py

echo "✅ Main.py API deployment complete!"
echo ""
echo "🔗 Your API endpoints:"
echo "- Crawl: https://nico-gt91--cracha-main-api-crawl-web-endpoint.modal.run"
echo "- Health: https://nico-gt91--cracha-main-api-health-web-endpoint.modal.run"
echo ""
echo "🧪 Test your API:"
echo "curl -X POST https://nico-gt91--cracha-main-api-crawl-web-endpoint.modal.run \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"url\": \"https://example.com\","
echo "    \"tenant_id\": \"test\","
echo "    \"user_id\": \"test-user\","
echo "    \"type\": \"single\""
echo "  }'"