"""Crawler Client für den Modal.com Crawl4AI Service.

Dieser Client bietet eine einfache Schnittstelle zum Modal.com Crawl4AI Service.
Er unterstützt sowohl asynchrone als auch synchrone Aufrufe für die Verwendung in
verschiedenen Umgebungen, insbesondere in Streamlit.
"""

import os
import asyncio
import aiohttp
from typing import List, Dict, Any, Optional
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type


class CrawlerClient:
    """Client für den Modal.com Crawl4AI Service."""
    
    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None):
        """Initialisiert den Crawler Client.
        
        Args:
            base_url: Basis-URL des Modal.com Services. Wenn nicht angegeben, wird
                     die Umgebungsvariable MODAL_API_URL verwendet.
            api_key: API-Schlüssel für die Authentifizierung. Wenn nicht angegeben, wird
                    die Umgebungsvariable MODAL_API_KEY verwendet.
        """
        # Basis-URL aus Parameter oder Umgebungsvariable
        self.base_url = base_url or os.environ.get("MODAL_API_URL", "")
        if not self.base_url:
            # Fallback: Verwende die bekannte URL-Struktur
            self.base_url = "https://nico-gt91--crawl4ai-service"
        
        # API-Schlüssel aus Parameter oder Umgebungsvariable
        self.api_key = api_key or os.environ.get("MODAL_API_KEY", "")
        if not self.api_key:
            raise ValueError("API-Schlüssel muss angegeben werden oder in MODAL_API_KEY gesetzt sein")
        
        # Endpunkte basierend auf der Modal.com URL-Struktur
        self.single_endpoint = f"{self.base_url}-crawl-single.modal.run"
        self.batch_endpoint = f"{self.base_url}-crawl-batch.modal.run"
        self.recursive_endpoint = f"{self.base_url}-crawl-recursive.modal.run"
        self.sitemap_endpoint = f"{self.base_url}-crawl-sitemap.modal.run"
        self.health_endpoint = f"{self.base_url}-health-check.modal.run"
    
    def _add_performance_optimizations(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Fügt Performance-Optimierungen zu Crawl-Requests hinzu."""
        # Text-Only Mode für 3-4x Speedup
        payload.update({
            "text_only": True,  # Deaktiviert Bilder, JS, GPU-Rendering
            "scan_full_page": True,  # Vollständiger Scan für dynamische Inhalte
            "scroll_delay": 0.5,  # Minimaler Delay für Lazy Loading
            "session_reuse": True,  # Browser-Session wiederverwenden
            "remove_boilerplate": True,  # Boilerplate-Content entfernen
            "extract_main_content": True,  # Nur Hauptinhalt extrahieren
        })
        return payload

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((aiohttp.ClientError, asyncio.TimeoutError))
    )
    async def _make_api_request(self, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Macht einen API-Request zum Modal.com Service mit Retry-Logik.
        
        Args:
            endpoint: API-Endpunkt
            payload: Request-Payload als Dictionary
            
        Returns:
            API-Response als Dictionary
            
        Raises:
            ValueError: Bei API-Fehlern
            aiohttp.ClientError: Bei Netzwerkfehlern
        """
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        timeout = aiohttp.ClientTimeout(total=300)  # 5 Minuten Timeout
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(endpoint, json=payload, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise ValueError(f"API request failed with status {response.status}: {error_text}")
                
                return await response.json()
    
    async def health_check(self) -> Dict[str, Any]:
        """Führt einen Health-Check des Services durch.
        
        Returns:
            Dictionary mit Health-Status
        """
        async with aiohttp.ClientSession() as session:
            async with session.get(self.health_endpoint) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise ValueError(f"Health check failed with status {response.status}: {error_text}")
                
                return await response.json()
    
    async def crawl_single(self, url: str, cache_mode: str = "BYPASS", text_only: bool = True) -> Dict[str, Any]:
        """Crawlt eine einzelne URL und gibt das Ergebnis zurück.
        
        Args:
            url: Die zu crawlende URL
            cache_mode: Cache-Modus (BYPASS, USE_CACHE, REFRESH_CACHE)
            text_only: Text-Only Mode für 3-4x Speed Boost (Crawl4AI v0.4.1+)
            
        Returns:
            Dictionary mit dem Crawling-Ergebnis
        """
        payload = {
            "url": url,
            "cache_mode": cache_mode,
            "text_only": text_only,  # 2025 Performance Feature
            "disable_images": True,
            "disable_javascript": text_only
        }
        
        # Performance-Optimierungen hinzufügen
        payload = self._add_performance_optimizations(payload)
        return await self._make_api_request(self.single_endpoint, payload)
    
    async def crawl_batch(self, urls: List[str], max_concurrent: int = 10) -> Dict[str, Any]:
        """Crawlt mehrere URLs parallel und gibt die Ergebnisse zurück.
        
        Args:
            urls: Liste der zu crawlenden URLs
            max_concurrent: Maximale Anzahl paralleler Crawling-Prozesse
            
        Returns:
            Dictionary mit den Crawling-Ergebnissen
        """
        payload = {
            "urls": urls,
            "max_concurrent": max_concurrent
        }
        return await self._make_api_request(self.batch_endpoint, payload)
    
    async def crawl_recursive(self, start_url: str, max_depth: int = 3, max_concurrent: int = 5,
                            limit: Optional[int] = 100, exclude_external_links: bool = True,
                            exclude_domains: List[str] = None, exclude_social_media_links: bool = True,
                            url_filter: str = None, include_patterns: List[str] = None,
                            include_domains: List[str] = None, **kwargs) -> Dict[str, Any]:
        """Crawlt eine Website rekursiv mit URL-Filterung und gibt die Ergebnisse zurück.
        
        Args:
            start_url: Start-URL für das rekursive Crawling
            max_depth: Maximale Tiefe für das rekursive Crawling
            max_concurrent: Maximale Anzahl paralleler Crawling-Prozesse
            limit: Maximale Anzahl zu crawlender URLs
            exclude_external_links: Nur interne Links crawlen (default: True)
            exclude_domains: Liste von Domains, die ausgeschlossen werden sollen
            exclude_social_media_links: Social Media Links ausschließen (default: True)
            url_filter: Pattern-Filter für URLs (z.B. "tutorial")
            include_patterns: URL-Muster die eingeschlossen werden sollen (z.B. ["*tutorial*", "*docs*"])
            include_domains: Domains die eingeschlossen werden sollen (z.B. ["docs.python.org"])
            
        Returns:
            Dictionary mit den Crawling-Ergebnissen
        """
        payload = {
            "start_url": start_url,
            "max_depth": max_depth,
            "max_concurrent": max_concurrent,
            "limit": limit,
            # URL-Filter Parameter (Exclude)
            "exclude_external_links": exclude_external_links,
            "exclude_domains": exclude_domains or [],
            "exclude_social_media_links": exclude_social_media_links,
        }
        
        # URL-Pattern-Filter hinzufügen (Exclude)
        if url_filter:
            payload["url_pattern_filter"] = url_filter
            
        # Include-Filter hinzufügen (Präziser!)
        if include_patterns:
            payload["include_url_patterns"] = include_patterns
        if include_domains:
            payload["include_domains"] = include_domains
            
        # Performance-Optimierungen hinzufügen
        payload = self._add_performance_optimizations(payload)
        return await self._make_api_request(self.recursive_endpoint, payload)
    
    async def crawl_sitemap(self, sitemap_url: str, max_concurrent: int = 10) -> Dict[str, Any]:
        """Crawlt alle URLs in einer Sitemap und gibt die Ergebnisse zurück.
        
        Args:
            sitemap_url: URL der Sitemap
            max_concurrent: Maximale Anzahl paralleler Crawling-Prozesse
            
        Returns:
            Dictionary mit den Crawling-Ergebnissen
        """
        payload = {
            "sitemap_url": sitemap_url,
            "max_concurrent": max_concurrent
        }
        return await self._make_api_request(self.sitemap_endpoint, payload)
    
    # Synchrone Wrapper für Streamlit-Kompatibilität
    def health_check_sync(self) -> Dict[str, Any]:
        """Synchroner Wrapper für health_check."""
        return asyncio.run(self.health_check())
    
    def crawl_single_sync(self, url: str, cache_mode: str = "BYPASS") -> Dict[str, Any]:
        """Synchroner Wrapper für crawl_single."""
        return asyncio.run(self.crawl_single(url, cache_mode))
    
    def crawl_batch_sync(self, urls: List[str], max_concurrent: int = 10) -> Dict[str, Any]:
        """Synchroner Wrapper für crawl_batch."""
        return asyncio.run(self.crawl_batch(urls, max_concurrent))
    
    def crawl_recursive_sync(self, start_url: str, max_depth: int = 3, max_concurrent: int = 5,
                           limit: Optional[int] = 100) -> Dict[str, Any]:
        """Synchroner Wrapper für crawl_recursive."""
        return asyncio.run(self.crawl_recursive(start_url, max_depth, max_concurrent, limit))
    
    def crawl_sitemap_sync(self, sitemap_url: str, max_concurrent: int = 10) -> Dict[str, Any]:
        """Synchroner Wrapper für crawl_sitemap."""
        return asyncio.run(self.crawl_sitemap(sitemap_url, max_concurrent))


# Beispielverwendung und Test
if __name__ == "__main__":
    import sys
    
    # Konfiguration für Tests
    API_KEY = "042656740A2A4C26D541F83E2585E4676830C26F5D1F5A4BD54C99ECE22AA4A9"
    BASE_URL = "https://nico-gt91--crawl4ai-service"
    
    if len(sys.argv) < 2:
        print("Verwendung: python crawler_client.py <url>")
        print("Beispiel: python crawler_client.py https://example.com")
        sys.exit(1)
    
    url = sys.argv[1]
    
    # Erstelle Client
    client = CrawlerClient(base_url=BASE_URL, api_key=API_KEY)
    
    print(f"Testing Crawler Client with URL: {url}")
    print("=" * 50)
    
    try:
        # Test Health Check
        print("1. Testing Health Check...")
        health = client.health_check_sync()
        print(f"   Status: {health.get('status')}")
        print(f"   Service: {health.get('service')}")
        
        # Test Single URL Crawling
        print(f"\n2. Testing Single URL Crawling...")
        result = client.crawl_single_sync(url)
        
        if result.get("success"):
            print("   ✅ Crawling erfolgreich!")
            print(f"   URL: {result.get('url')}")
            print(f"   Markdown-Länge: {len(result.get('markdown', ''))} Zeichen")
            
            # Zeige ersten Teil des Markdown-Inhalts
            markdown = result.get("markdown", "")
            if markdown:
                preview = markdown[:200] + "..." if len(markdown) > 200 else markdown
                print(f"   Inhalt-Vorschau: {preview}")
        else:
            print("   ❌ Crawling fehlgeschlagen!")
            print(f"   Fehler: {result.get('error')}")
    
    except Exception as e:
        print(f"❌ Test fehlgeschlagen: {e}")
        sys.exit(1)
    
    print("\n✅ Crawler Client Test erfolgreich abgeschlossen!")