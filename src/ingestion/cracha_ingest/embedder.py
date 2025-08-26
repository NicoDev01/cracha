"""
CraCha Ingestion Pipeline - Multi-Provider Embeddings

Unterstützt verschiedene Embedding-Provider mit Kostenoptimierung,
Retry-Logic und Batch-Processing für maximale Effizienz.
"""

import httpx
import os
import asyncio
import backoff
import time
from typing import List, Dict, Any, Literal, Optional, Tuple
from .models import EmbeddingCost


class EmbeddingProvider:
    """Base class für Embedding-Provider"""
    
    def __init__(self, provider_name: str, dimensions: int, cost_per_1k: float):
        self.provider_name = provider_name
        self.dimensions = dimensions
        self.cost_per_1k = cost_per_1k
        self.request_count = 0
        self.total_tokens = 0
        self.total_cost = 0.0
    
    async def embed(self, texts: List[str]) -> List[List[float]]:
        """Erstellt Embeddings für Text-Liste"""
        raise NotImplementedError
    
    def estimate_cost(self, texts: List[str]) -> float:
        """Schätzt Kosten für Text-Liste"""
        total_tokens = sum(len(text.split()) * 1.3 for text in texts)  # Rough estimate
        return (total_tokens / 1000) * self.cost_per_1k
    
    def get_stats(self) -> Dict[str, Any]:
        """Gibt Provider-Statistiken zurück"""
        return {
            "provider": self.provider_name,
            "requests": self.request_count,
            "total_tokens": self.total_tokens,
            "total_cost": self.total_cost,
            "avg_cost_per_request": self.total_cost / max(self.request_count, 1)
        }


class GeminiEmbeddingProvider(EmbeddingProvider):
    """Google Gemini Embedding Provider"""
    
    def __init__(self, dimensions: int = 768):
        # Gemini Embedding-001 Preise: $0.15 per 1M tokens
        cost_map = {768: 0.00015, 1536: 0.00015, 3072: 0.00015}
        super().__init__(f"gemini-embedding-001-{dimensions}", dimensions, cost_map.get(dimensions, 0.00015))
        
        self.api_key = os.getenv("VERTEX_KEY")
        if not self.api_key:
            raise ValueError("VERTEX_KEY environment variable required for Gemini")
        
        # Clean API key (remove potential whitespace/newlines)
        self.api_key = self.api_key.strip()
        
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent"
        self.max_batch_size = 50  # Größere Batches für bessere Performance
    
    @backoff.on_exception(
        backoff.expo,
        (httpx.HTTPError, httpx.TimeoutException),
        max_time=60,
        max_tries=3
    )
    async def embed(self, texts: List[str]) -> List[List[float]]:
        """Erstellt Gemini Embeddings mit Retry-Logic und Progress Tracking"""
        if not texts:
            return []
        
        print(f"🔮 Processing {len(texts)} texts...")
        start_time = time.time()
        
        # Für große Batches: Verwende Batch Mode (50% günstiger, keine Rate Limits)
        # Reduziere Threshold für häufigere Batch-Nutzung
        if len(texts) >= 25:  # Reduziert von 50 auf 25
            try:
                batch_embeddings = await self._embed_with_batch_mode(texts)
                if batch_embeddings:
                    total_time = time.time() - start_time
                    print(f"🚀 {len(batch_embeddings)} embeddings created with Batch Mode in {total_time:.2f}s "
                          f"(50% cost reduction + no rate limits!)")
                    return batch_embeddings
            except Exception as e:
                print(f"⚠️  Batch Mode failed, falling back to real-time API: {e}")
        
        # Fallback: Standard parallel processing
        print(f"Using parallel processing with batches of {self.max_batch_size}...")
        all_embeddings = []
        total_batches = (len(texts) + self.max_batch_size - 1) // self.max_batch_size
        
        for batch_num, i in enumerate(range(0, len(texts), self.max_batch_size), 1):
            batch = texts[i:i + self.max_batch_size]
            
            batch_start = time.time()
            batch_embeddings = await self._embed_batch(batch)
            batch_time = time.time() - batch_start
            
            all_embeddings.extend(batch_embeddings)
            
            # Progress Update
            progress = (batch_num / total_batches) * 100
            texts_per_sec = len(batch) / batch_time if batch_time > 0 else 0
            
            print(f"   Batch {batch_num}/{total_batches} ({progress:.1f}%) - "
                  f"{len(batch_embeddings)}/{len(batch)} embeddings - "
                  f"{texts_per_sec:.1f} texts/sec")
        
        total_time = time.time() - start_time
        success_rate = len(all_embeddings) / len(texts) * 100
        
        print(f"✅ {len(all_embeddings)} embeddings created with {self.provider_name} in {total_time:.2f}s "
              f"({success_rate:.1f}% success rate)")
        
        return all_embeddings
    
    async def _embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Verarbeitet einen Batch von Texten mit parallelen Requests"""
        
        async def embed_single_text(client: httpx.AsyncClient, text: str, index: int) -> tuple[int, List[float]]:
            """Embeddet einen einzelnen Text und gibt Index + Embedding zurück"""
            payload = {
                "content": {
                    "parts": [{"text": text}]
                },
                "taskType": "RETRIEVAL_DOCUMENT",  # Optimiert für RAG/Retrieval
                "outputDimensionality": self.dimensions
            }
            
            response = await client.post(
                f"{self.base_url}?key={self.api_key}",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            # Debug: Print actual dimensions received (nur beim ersten)
            if response.status_code == 200 and index == 0:
                result = response.json()
                if "embedding" in result and "values" in result["embedding"]:
                    actual_dims = len(result["embedding"]["values"])
                    print(f"DEBUG: Requested {self.dimensions} dimensions, got {actual_dims} dimensions")
            
            response.raise_for_status()
            data = response.json()
            
            # Statistiken aktualisieren
            self.request_count += 1
            estimated_tokens = len(text.split()) * 1.3
            self.total_tokens += estimated_tokens
            self.total_cost += (estimated_tokens / 1000) * self.cost_per_1k
            
            # Embeddings extrahieren
            embedding_data = data.get("embedding", {})
            values = embedding_data.get("values", [])
            
            return index, values if values else []
        
        # Ultra-fast concurrency for large batches (Crawl4AI 2025 optimization)
        try:
            import psutil
            available_memory_gb = psutil.virtual_memory().available / (1024**3)
            
            if len(texts) > 100:
                # Ultra-fast mode: Higher concurrency for large batches
                max_concurrent = min(30, max(10, int(available_memory_gb * 4)))  # 4 requests per GB RAM
                print(f"🚀 Ultra-fast mode: {max_concurrent} concurrent (based on {available_memory_gb:.1f}GB available)")
            else:
                max_concurrent = min(20, max(5, int(available_memory_gb * 2)))  # Standard mode
                print(f"   Memory-adaptive concurrency: {max_concurrent} (based on {available_memory_gb:.1f}GB available)")
        except ImportError:
            # Fallback: Conservative but safe concurrency
            max_concurrent = 15
            print(f"   Using default concurrency: {max_concurrent}")
        
        semaphore = asyncio.Semaphore(max_concurrent)  # Adaptive concurrency
        
        async def bounded_embed(client: httpx.AsyncClient, text: str, index: int):
            async with semaphore:
                try:
                    return await embed_single_text(client, text, index)
                except Exception as e:
                    print(f"Warning: Failed to embed text {index}: {e}")
                    return index, []
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Erstelle Tasks für alle Texte
            tasks = [bounded_embed(client, text, i) for i, text in enumerate(texts)]
            
            # Führe alle Tasks parallel aus
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Sortiere Ergebnisse nach Index und extrahiere Embeddings
            all_embeddings = [None] * len(texts)
            for result in results:
                if isinstance(result, tuple) and len(result) == 2:
                    index, embedding = result
                    if embedding:  # Nur nicht-leere Embeddings
                        all_embeddings[index] = embedding
            
            # Filtere None-Werte heraus
            return [emb for emb in all_embeddings if emb is not None]
    
    async def _embed_with_batch_mode(self, texts: List[str]) -> List[List[float]]:
        """
        Gemini Batch Mode für ultra-effiziente Embedding-Generierung.
        50% cost reduction + no rate limits für bulk processing.
        """
        if len(texts) < 50:
            return None
        
        print(f"🚀 Using Gemini Batch Mode for {len(texts)} texts (50% cost reduction!)")
        
        # JSONL-Datei erstellen
        batch_requests = []
        for i, text in enumerate(texts):
            request = {
                "custom_id": f"embedding_{i}",
                "method": "POST", 
                "url": "/models/gemini-embedding-001:embedContent",
                "body": {
                    "content": {"parts": [{"text": text}]},
                    "taskType": "RETRIEVAL_DOCUMENT",
                    "outputDimensionality": self.dimensions
                }
            }
            batch_requests.append(json.dumps(request))
        
        # Temporäre JSONL-Datei
        from pathlib import Path
        batch_file = Path(f"batch_{int(time.time())}.jsonl")
        batch_file.write_text('\n'.join(batch_requests))
        
        try:
            # Batch-Job erstellen
            async with httpx.AsyncClient(timeout=120.0) as client:
                with open(batch_file, 'rb') as f:
                    response = await client.post(
                        "https://generativelanguage.googleapis.com/v1beta/batches",
                        headers={"x-goog-api-key": self.api_key},
                        files={"file": f}
                    )
                
                response.raise_for_status()
                batch_data = response.json()
                batch_id = batch_data["id"]
                
                print(f"📋 Batch job created: {batch_id}")
                
                # Auf Completion warten
                embeddings = await self._wait_for_batch_completion(batch_id)
                print(f"✅ Batch completed: {len(embeddings)} embeddings generated")
                return embeddings
                
        finally:
            # Cleanup
            try:
                batch_file.unlink()
            except Exception as e:
                print(f"⚠️  Could not delete batch file {batch_file}: {e}")
    
    async def _wait_for_batch_completion(self, batch_id: str, max_wait: int = 3600) -> List[List[float]]:
        """Wartet auf Batch-Completion und gibt Embeddings zurück"""
        start_time = time.time()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            while time.time() - start_time < max_wait:
                # Status prüfen
                response = await client.get(
                    f"https://generativelanguage.googleapis.com/v1beta/batches/{batch_id}",
                    headers={"x-goog-api-key": self.api_key}
                )
                
                response.raise_for_status()
                batch_status = response.json()
                
                status = batch_status["status"]
                print(f"Batch {batch_id} status: {status}")
                
                if status == "completed":
                    # Ergebnisse herunterladen
                    output_file_id = batch_status["output_file_id"]
                    
                    file_response = await client.get(
                        f"https://generativelanguage.googleapis.com/v1beta/files/{output_file_id}/content",
                        headers={"x-goog-api-key": self.api_key}
                    )
                    
                    file_response.raise_for_status()
                    
                    # Parse JSONL-Ergebnisse
                    embeddings = []
                    for line in file_response.text.strip().split('\n'):
                        result = json.loads(line)
                        if result.get("response", {}).get("body", {}).get("embedding"):
                            values = result["response"]["body"]["embedding"]["values"]
                            embeddings.append(values)
                    
                    return embeddings
                
                elif status == "failed":
                    raise Exception(f"Batch job failed: {batch_status}")
                
                # Warte 30 Sekunden vor nächster Prüfung
                await asyncio.sleep(30)
        
        raise TimeoutError(f"Batch job {batch_id} did not complete within {max_wait} seconds")


class OpenAIEmbeddingProvider(EmbeddingProvider):
    """OpenAI Embedding Provider"""
    
    def __init__(self, model: str = "text-embedding-3-small", dimensions: int = 1536):
        super().__init__(f"openai-{model}", dimensions, 0.000020)
        
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY environment variable required for OpenAI")
        
        # Clean API key (remove potential whitespace/newlines)
        self.api_key = self.api_key.strip()
        
        self.model = model
        self.base_url = "https://api.openai.com/v1/embeddings"
        self.max_batch_size = 2048  # OpenAI Limit
    
    @backoff.on_exception(
        backoff.expo,
        (httpx.HTTPError, httpx.TimeoutException),
        max_time=60,
        max_tries=3
    )
    async def embed(self, texts: List[str]) -> List[List[float]]:
        """Erstellt OpenAI Embeddings mit Retry-Logic"""
        if not texts:
            return []
        
        # Batch-Processing
        all_embeddings = []
        for i in range(0, len(texts), self.max_batch_size):
            batch = texts[i:i + self.max_batch_size]
            batch_embeddings = await self._embed_batch(batch)
            all_embeddings.extend(batch_embeddings)
        
        return all_embeddings
    
    async def _embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Verarbeitet einen Batch von Texten"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "input": texts,
                "model": self.model,
                "dimensions": self.dimensions
            }
            
            response = await client.post(
                self.base_url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
            )
            
            response.raise_for_status()
            data = response.json()
            
            # Statistiken aktualisieren
            self.request_count += 1
            usage = data.get("usage", {})
            tokens_used = usage.get("total_tokens", 0)
            self.total_tokens += tokens_used
            self.total_cost += (tokens_used / 1000) * self.cost_per_1k
            
            # Embeddings extrahieren
            embeddings = []
            for embedding_data in data.get("data", []):
                embeddings.append(embedding_data["embedding"])
            
            return embeddings


class MultiProviderEmbedder:
    """
    Multi-Provider Embedder mit automatischer Provider-Auswahl
    und Kostenoptimierung.
    """
    
    def __init__(self):
        self.providers: Dict[str, EmbeddingProvider] = {}
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Initialisiert verfügbare Provider"""
        try:
            # Gemini Embedding-001 Provider (verschiedene Dimensionen)
            if os.getenv("VERTEX_KEY"):
                self.providers["gemini-768"] = GeminiEmbeddingProvider(768)
                self.providers["gemini-1536"] = GeminiEmbeddingProvider(1536)
                self.providers["gemini-3072"] = GeminiEmbeddingProvider(3072)
        except Exception as e:
            print(f"Warning: Gemini provider not available: {e}")
        
        try:
            # OpenAI Provider
            if os.getenv("OPENAI_API_KEY"):
                self.providers["openai-small"] = OpenAIEmbeddingProvider(
                    "text-embedding-3-small", 1536
                )
                self.providers["openai-large"] = OpenAIEmbeddingProvider(
                    "text-embedding-3-large", 3072
                )
        except Exception as e:
            print(f"Warning: OpenAI provider not available: {e}")
    
    def get_available_providers(self) -> List[str]:
        """Gibt Liste verfügbarer Provider zurück"""
        return list(self.providers.keys())
    
    def get_cheapest_provider(self) -> str:
        """Gibt günstigsten Provider zurück"""
        if not self.providers:
            raise ValueError("No embedding providers available")
        
        cheapest = min(self.providers.items(), key=lambda x: x[1].cost_per_1k)
        return cheapest[0]
    
    def get_provider_info(self, provider_name: str) -> Dict[str, Any]:
        """Gibt Provider-Informationen zurück"""
        if provider_name not in self.providers:
            raise ValueError(f"Provider {provider_name} not available")
        
        provider = self.providers[provider_name]
        return {
            "name": provider.provider_name,
            "dimensions": provider.dimensions,
            "cost_per_1k_tokens": provider.cost_per_1k,
            "stats": provider.get_stats()
        }
    
    async def embed(self, texts: List[str], 
                   provider: Literal["gemini-768", "gemini-1536", "gemini-3072", 
                                   "openai-small", "openai-large"] = "gemini-768") -> List[List[float]]:
        """
        Erstellt Embeddings mit spezifiziertem Provider.
        
        Args:
            texts: Liste von Texten
            provider: Provider-Name
            
        Returns:
            Liste von Embedding-Vektoren
        """
        if provider not in self.providers:
            available = ", ".join(self.get_available_providers())
            raise ValueError(f"Provider {provider} not available. Available: {available}")
        
        if not texts:
            return []
        
        start_time = time.time()
        embeddings = await self.providers[provider].embed(texts)
        duration = time.time() - start_time
        
        print(f"✅ {len(texts)} embeddings created with {provider} in {duration:.2f}s")
        return embeddings
    
    async def embed_with_cost_tracking(self, texts: List[str], 
                                     provider: str = "gemini-768") -> Tuple[List[List[float]], EmbeddingCost]:
        """
        Erstellt Embeddings mit detailliertem Kosten-Tracking.
        
        Returns:
            Tuple von (embeddings, cost_info)
        """
        if provider not in self.providers:
            provider = self.get_cheapest_provider()
            print(f"Provider not available, using cheapest: {provider}")
        
        # Kosten vor Request schätzen
        estimated_tokens = sum(len(text.split()) * 1.3 for text in texts)
        
        # Embeddings erstellen
        embeddings = await self.embed(texts, provider)
        
        # Kosten-Objekt erstellen
        cost = EmbeddingCost.calculate(provider, int(estimated_tokens))
        
        return embeddings, cost
    
    async def benchmark_providers(self, test_texts: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Benchmarkt alle verfügbaren Provider mit Test-Texten.
        
        Returns:
            Dictionary mit Provider-Performance-Daten
        """
        results = {}
        
        for provider_name in self.get_available_providers():
            try:
                start_time = time.time()
                embeddings = await self.embed(test_texts, provider_name)
                duration = time.time() - start_time
                
                provider = self.providers[provider_name]
                estimated_cost = provider.estimate_cost(test_texts)
                
                results[provider_name] = {
                    "success": True,
                    "duration": duration,
                    "embeddings_count": len(embeddings),
                    "dimensions": provider.dimensions,
                    "estimated_cost": estimated_cost,
                    "cost_per_1k": provider.cost_per_1k,
                    "throughput": len(test_texts) / duration
                }
                
            except Exception as e:
                results[provider_name] = {
                    "success": False,
                    "error": str(e)
                }
        
        return results
    
    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """Gibt Statistiken aller Provider zurück"""
        return {name: provider.get_stats() for name, provider in self.providers.items()}


# Convenience Functions
async def embed_texts(texts: List[str], 
                     provider: str = "gemini-768") -> List[List[float]]:
    """
    Convenience Function für einfaches Embedding.
    """
    embedder = MultiProviderEmbedder()
    return await embedder.embed(texts, provider)


async def get_cheapest_embeddings(texts: List[str]) -> Tuple[List[List[float]], str, float]:
    """
    Erstellt Embeddings mit günstigstem Provider.
    
    Returns:
        Tuple von (embeddings, provider_name, estimated_cost)
    """
    embedder = MultiProviderEmbedder()
    cheapest_provider = embedder.get_cheapest_provider()
    
    embeddings, cost = await embedder.embed_with_cost_tracking(texts, cheapest_provider)
    
    return embeddings, cheapest_provider, cost.total_cost


# Export
__all__ = [
    "MultiProviderEmbedder",
    "GeminiEmbeddingProvider", 
    "OpenAIEmbeddingProvider",
    "embed_texts",
    "get_cheapest_embeddings"
]