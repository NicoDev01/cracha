@echo off
REM Cloudflare Workers Authentication & Deployment Script for Windows

echo 🚀 Setting up Cloudflare Workers deployment...

REM Check if wrangler is authenticated
echo 🔐 Checking Wrangler authentication...
wrangler whoami
if %ERRORLEVEL% neq 0 (
    echo ❌ Wrangler not authenticated. Please run:
    echo    wrangler login
    echo Then run this script again.
    pause
    exit /b 1
)

echo ✅ Wrangler is authenticated!
echo 📦 All environment variables are configured in wrangler.toml
echo 🚀 Ready to deploy: npm run deploy

echo.
echo 💡 Next steps:
echo    1. npm run build:cf
echo    2. npm run deploy
echo.
pause