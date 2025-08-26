#!/usr/bin/env python3
"""
Test script for Modal.com hosted main.py API
"""

import requests
import json
import time

# Your Modal.com API URL (update after deployment)
MODAL_API_URL = "https://your-app-name--cracha-main-api-crawl-web-endpoint.modal.run"

def test_crawl_api():
    """Test the crawl endpoint"""
    
    test_request = {
        "url": "https://example.com",
        "tenant_id": "test-tenant",
        "user_id": "test-user",
        "type": "single",
        "embedding_model": "gemini-768",
        "max_depth": 2,
        "limit": 10,
        "generate_summaries": True,
        "ultra_fast": True,
        "max_concurrent": 3,
        "force": True,
        "cleanup": True,
        "exclude_social_media": True
    }
    
    print("🧪 Testing Modal.com API...")
    print(f"📡 URL: {MODAL_API_URL}/crawl")
    print(f"📋 Request: {json.dumps(test_request, indent=2)}")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{MODAL_API_URL}/crawl",
            json=test_request,
            timeout=300  # 5 minutes
        )
        
        duration = time.time() - start_time
        
        print(f"⏱️  Duration: {duration:.2f}s")
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Success!")
            print(f"📈 Result: {json.dumps(result, indent=2)}")
        else:
            print("❌ Error!")
            print(f"🔍 Response: {response.text}")
            
    except Exception as e:
        print(f"💥 Exception: {str(e)}")

def test_health_api():
    """Test the health endpoint"""
    
    print("\n🏥 Testing health endpoint...")
    
    try:
        response = requests.get(f"{MODAL_API_URL}/health", timeout=30)
        
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Health check passed!")
            print(f"📈 Result: {json.dumps(result, indent=2)}")
        else:
            print("❌ Health check failed!")
            print(f"🔍 Response: {response.text}")
            
    except Exception as e:
        print(f"💥 Exception: {str(e)}")

if __name__ == "__main__":
    print("🚀 Modal.com API Test Suite")
    print("=" * 50)
    
    # Update this URL after deployment
    if "your-app-name" in MODAL_API_URL:
        print("❌ Please update MODAL_API_URL with your actual Modal.com URL")
        print("💡 Get it with: modal app list")
        exit(1)
    
    test_health_api()
    test_crawl_api()