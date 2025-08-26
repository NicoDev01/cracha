#!/usr/bin/env python3
"""
Test Script für Gemini 2.0 Flash API-Struktur
"""

import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

async def test_gemini_api():
    """Testet die korrekte Gemini 2.0 Flash API-Struktur"""
    
    api_key = os.getenv("VERTEX_KEY")
    if not api_key:
        print("❌ VERTEX_KEY nicht gesetzt!")
        return
    
    print(f"🔧 API Key: {api_key[:10]}...{api_key[-4:]}")
    
    # Test 1: Gemini 2.0 Flash Text Generation
    print("\n🧪 Test 1: Gemini 2.0 Flash Text Generation")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateText",
                headers={
                    "x-goog-api-key": api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gemini-2.0-flash-exp",
                    "prompt": "Erstelle eine kurze Zusammenfassung (max. 50 Wörter): Python ist eine Programmiersprache.",
                    "temperature": 0.1,
                    "maxTokens": 100,
                    "thinkingBudget": 500
                }
            )
            
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text[:500]}...")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Gemini 2.0 Flash API funktioniert!")
                if "text" in data:
                    print(f"Generated text: {data['text']}")
                else:
                    print(f"Response structure: {list(data.keys())}")
            else:
                print(f"❌ API Fehler: {response.status_code}")
                
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    # Test 2: Alternative API-Struktur (falls erste fehlschlägt)
    print("\n🧪 Test 2: Alternative API-Struktur (generateContent)")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent",
                headers={
                    "x-goog-api-key": api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "contents": [{
                        "parts": [{"text": "Erstelle eine kurze Zusammenfassung (max. 50 Wörter): Python ist eine Programmiersprache."}]
                    }],
                    "generationConfig": {
                        "temperature": 0.1,
                        "maxOutputTokens": 100,
                        "topP": 0.8
                    }
                }
            )
            
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text[:500]}...")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Alternative API funktioniert!")
                if "candidates" in data and data["candidates"]:
                    content = data["candidates"][0]["content"]["parts"][0]["text"]
                    print(f"Generated text: {content}")
                else:
                    print(f"Response structure: {list(data.keys())}")
            else:
                print(f"❌ API Fehler: {response.status_code}")
                
    except Exception as e:
        print(f"❌ Exception: {e}")


if __name__ == "__main__":
    asyncio.run(test_gemini_api())