#!/usr/bin/env python3
"""
Crawl4AI Client für CraCha Ingestion Pipeline
Integriert mit Modal.com Crawl4AI Service
"""

import os
import time
import hashlib
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from crawler_client import CrawlerClient
from cracha_ingest.models import Chunk

load_dotenv('../.env.local')


class Crawl4AIClient(CrawlerClient):
    """Crawl4AI Client für CraCha Ingestion Pipeline"""
    
    def __init__(self):
        # Verwende Environment Variables
        base_url = os.getenv("CRAWL4AI_BASE_URL", "https://nico-gt91--crawl4ai-service")
        api_key = os.getenv("CRAWL4AI_API_KEY")
        
        if not api_key:
            raise ValueError("CRAWL4AI_API_KEY environment variable is required")
        
        super().__init__(base_url=base_url, api_key=api_key)
    
    async def health_check(self) -> bool:
        """Prüft ob der Crawl4AI Service verfügbar ist"""
        try:
            result = await super().health_check()
            return result.get("status") == "healthy"
        except Exception:
            return False


async def crawl_website_to_chunks(url: str, tenant_id: str, crawl_type: str = "single", 
                                 embedding_model: str = "gemini-768", **kwargs) -> List[Chunk]:
    """
    Crawlt eine Website und konvertiert sie zu Chunks
    
    Args:
        url: URL zum crawlen
        tenant_id: Tenant ID
        crawl_type: "single", "batch", "sitemap", "recursive"
        embedding_model: Embedding-Modell
        **kwargs: Zusätzliche Parameter für Crawl-Methoden
        
    Returns:
        Liste von Chunk-Objekten
    """
    client = Crawl4AIClient()
    
    # Health check
    if not await client.health_check():
        raise Exception("Crawl4AI service is not available")
    
    # Crawl basierend auf Typ
    if crawl_type == "single":
        result = await client.crawl_single(url)
        results = [result] if result.get("success") else []
    elif crawl_type == "batch":
        urls = kwargs.get("urls", [url])
        batch_result = await client.crawl_batch(urls, kwargs.get("max_concurrent", 10))
        results = batch_result.get("results", []) if isinstance(batch_result, dict) else []
    elif crawl_type == "sitemap":
        sitemap_result = await client.crawl_sitemap(url, kwargs.get("max_concurrent", 10))
        results = sitemap_result.get("results", []) if isinstance(sitemap_result, dict) else []
    elif crawl_type == "recursive":
        # Erweiterte Parameter für URL-Filterung
        recursive_params = {
            "max_depth": kwargs.get("max_depth", 3),
            "max_concurrent": kwargs.get("max_concurrent", 5),
            "limit": kwargs.get("limit", 100),
            # URL-Filter Parameter (Exclude)
            "exclude_external_links": kwargs.get("exclude_external_links", True),  # Default: nur interne Links
            "exclude_domains": kwargs.get("exclude_domains", []),
            "exclude_social_media_links": kwargs.get("exclude_social_media_links", True),
            "url_filter": kwargs.get("url_filter"),  # Pattern-Filter
            # URL-Filter Parameter (Include) - Präziser!
            "include_patterns": kwargs.get("include_patterns", []),
            "include_domains": kwargs.get("include_domains", []),
        }
        
        recursive_result = await client.crawl_recursive(url, **recursive_params)
        results = recursive_result.get("results", []) if isinstance(recursive_result, dict) else []
    else:
        raise ValueError(f"Unknown crawl_type: {crawl_type}")
    
    # Konvertiere Crawl-Ergebnisse zu Chunks
    all_chunks = []
    
    for result in results:
        if not result.get("success") or not result.get("markdown"):
            print(f"⚠️  Skipping failed crawl: {result.get('url', 'unknown')}")
            continue
        
        page_url = result["url"]
        markdown = result["markdown"]
        
        # Content-Bereinigung (Best Practice)
        markdown = clean_content(markdown)
        
        # Content Hash für Versionierung
        content_hash = hashlib.md5(markdown.encode()).hexdigest()[:8]
        
        # Chunking
        text_chunks = smart_chunk_text(markdown)
        
        chunk_index = 0
        for text in text_chunks:
            # Skip chunks that are too short
            if len(text.strip()) < 10:
                continue
                
            chunk_id = f"{tenant_id}::{hashlib.md5(page_url.encode()).hexdigest()[:8]}::v{content_hash}::{chunk_index}"
            
            chunk = Chunk(
                id=chunk_id,
                text=text.strip(),
                embedding=[],  # Will be filled later
                meta={
                    "tenant_id": tenant_id,
                    "url": page_url,
                    "chunk_index": chunk_index,
                    "content_hash": content_hash,
                    "title": extract_title_from_text(text),
                    "crawl_type": crawl_type,
                    "source": "crawl4ai",
                    # Erweiterte Metadaten für Advanced RAG (Best Practice)
                    "content_type": "markdown",
                    "language": "de" if "de.wikipedia.org" in page_url or "german" in page_url.lower() else "en",
                    "domain": page_url.split("//")[1].split("/")[0] if "//" in page_url else "",
                    "word_count": len(text.split()),
                    "char_count": len(text),
                    "created_at": int(time.time()),
                    # Advanced RAG Metadaten für effiziente Filterung
                    "document_type": "webpage",
                    "section_type": "content",  # content, header, footer, sidebar
                    "reading_time": max(1, len(text.split()) // 200),  # Minuten
                    "complexity_score": min(10, len(text.split()) // 50),  # 1-10 basierend auf Länge
                    "has_code": "```" in text or "<code>" in text,
                    "has_links": "[" in text and "](" in text,
                    "has_lists": text.count("- ") > 2 or text.count("* ") > 2,
                    # Performance-Metadaten für zweistufige Suche
                    "token_count": len(text.split()) * 1.3,  # Geschätzte Token-Anzahl
                    "semantic_density": len(set(text.lower().split())) / len(text.split()) if text.split() else 0,
                    "crawl_timestamp": int(time.time()),
                    "processing_version": "2025.1"  # Für Index-Versionierung
                },
                version=content_hash
            )
            all_chunks.append(chunk)
            chunk_index += 1
    
    print(f"📄 Created {len(all_chunks)} chunks from {len([r for r in results if r.get('success')])} pages")
    return all_chunks


def smart_chunk_text(text: str, max_chars: int = 8000, overlap: int = 500) -> List[str]:
    """Intelligente Text-Chunking-Funktion mit Qualitätskontrolle"""
    if len(text.strip()) <= max_chars:
        return [text.strip()] if len(text.strip()) >= 10 else []
    
    chunks = []
    start = 0
    text = text.strip()
    
    while start < len(text):
        end = start + max_chars
        
        # Versuche an natürlichen Grenzen zu brechen
        if end < len(text):
            # 1. Versuche Absatz-Ende
            last_paragraph = text.rfind('\n\n', start, end)
            if last_paragraph > start + 100:
                end = last_paragraph
            else:
                # 2. Versuche Satz-Ende
                last_sentence = text.rfind('. ', start, end)
                if last_sentence > start + 100:
                    end = last_sentence + 1
                else:
                    # 3. Versuche Wort-Ende
                    last_space = text.rfind(' ', start, end)
                    if last_space > start + 100:
                        end = last_space
        
        chunk = text[start:end].strip()
        
        # Nur Chunks hinzufügen, die lang genug sind
        if len(chunk) >= 10:
            chunks.append(chunk)
        
        # Nächster Start mit Overlap
        next_start = end - overlap
        if next_start <= start + 50:
            next_start = start + 50
        
        start = next_start
        
        # Verhindere Endlos-Schleife
        if start >= len(text) - 10:
            break
    
    return chunks


def clean_content(text: str) -> str:
    """
    Bereinigt Content von irrelevanten Inhalten (Best Practice).
    
    Entfernt:
    - Boilerplate-Text
    - Navigationsleisten
    - Repetitive Inhalte
    - Übermäßige Whitespace
    """
    import re
    
    # Entferne übermäßige Whitespace
    text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    
    # Entferne häufige Boilerplate-Patterns (erweitert)
    boilerplate_patterns = [
        r'Cookie.*?akzeptieren.*?\n',
        r'Diese Website verwendet Cookies.*?\n',
        r'Impressum\s*\|\s*Datenschutz.*?\n',
        r'Navigation überspringen.*?\n',
        r'Zum Hauptinhalt springen.*?\n',
        r'©.*?\d{4}.*?\n',
        r'Alle Rechte vorbehalten.*?\n',
        # Python.org spezifische Patterns
        r'\[\s*!\[Python logo\].*?\]\(.*?\)',
        r'Greek \| Ελληνικά.*?Traditional Chinese \| 繁體中文',
        r'Theme Auto Light Dark',
        r'#### Previous topic.*?#### Next topic.*?\n',
        r'### This page.*?### Navigation.*?\n',
        r'\* \[index\].*?\* \[next\].*?\n',
        r'dev \(3\.15\).*?2\.6\n',
        r'Report a bug.*?Show source.*?\n',
    ]
    
    for pattern in boilerplate_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    
    # Entferne repetitive Zeilen (mehr als 3x identisch)
    lines = text.split('\n')
    cleaned_lines = []
    line_counts = {}
    
    for line in lines:
        line = line.strip()
        if not line:
            cleaned_lines.append('')
            continue
            
        line_counts[line] = line_counts.get(line, 0) + 1
        
        # Nur hinzufügen wenn nicht zu repetitiv
        if line_counts[line] <= 3:
            cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines).strip()


def extract_title_from_text(text: str) -> str:
    """Extrahiert Titel aus Text"""
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith('#'):
            return line.strip('#').strip()
        elif line and len(line) < 100:
            return line
    return text[:50] + "..." if len(text) > 50 else text