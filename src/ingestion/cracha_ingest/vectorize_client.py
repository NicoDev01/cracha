"""
CraCha Ingestion Pipeline - Cloudflare Vectorize Client

Cloudflare Vectorize Integration mit Namespace-basierter Multi-Tenancy,
Batch-Upserts, Versionierung und Usage-Metrics.
"""

import httpx
import os
import asyncio
import time
import hashlib
import json
from typing import List, Dict, Any, Optional, Tuple
from .models import Chunk, BatchRequest


class VectorizeClient:
    """
    Cloudflare Vectorize Client mit Multi-Tenancy und Batch-Processing.
    """
    
    def __init__(self, account_id: Optional[str] = None, api_token: Optional[str] = None):
        """
        Initialisiert Vectorize Client.
        
        Args:
            account_id: Cloudflare Account ID (default: aus ENV)
            api_token: Vectorize API Token (default: aus ENV)
        """
        self.account_id = (account_id or os.getenv("VECTORIZE_ACCOUNT_ID", "")).strip()
        self.api_token = (api_token or os.getenv("VECTORIZE_API_TOKEN", "")).strip()
        self.global_api_key = os.getenv("GLOBAL_API_KEY", "").strip()
        
        if not self.account_id:
            raise ValueError("VECTORIZE_ACCOUNT_ID environment variable or account_id required")
        
        # Verwende Bearer Token (funktioniert mit curl)
        if self.api_token:
            self.headers = {
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json"
            }
        elif self.global_api_key:
            self.headers = {
                "X-Auth-Key": self.global_api_key,
                "X-Auth-Email": os.getenv("CLOUDFLARE_EMAIL", "").strip(),
                "Content-Type": "application/json"
            }
        else:
            raise ValueError("VECTORIZE_API_TOKEN or GLOBAL_API_KEY environment variable required")
        
        self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/vectorize/v2/indexes"
        
        # Statistiken
        self.stats = {
            "requests": 0,
            "vectors_upserted": 0,
            "vectors_queried": 0,
            "total_latency": 0.0,
            "errors": 0
        }
    
    async def create_index(self, index_name: str, dimensions: int, 
                          metric: str = "cosine") -> Dict[str, Any]:
        """
        Erstellt einen neuen Vectorize Index.
        
        Args:
            index_name: Name des Index
            dimensions: Embedding-Dimensionen
            metric: Distanz-Metrik (cosine, euclidean, dot-product)
            
        Returns:
            Index-Informationen
        """
        payload = {
            "name": index_name,
            "config": {
                "dimensions": dimensions,
                "metric": metric
            }
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.base_url,
                json=payload,
                headers=self.headers
            )
            
            if response.status_code == 409:
                # Index existiert bereits
                return await self.get_index(index_name)
            
            response.raise_for_status()
            return response.json()
    
    async def get_index(self, index_name: str) -> Dict[str, Any]:
        """
        Holt Index-Informationen.
        
        Args:
            index_name: Name des Index
            
        Returns:
            Index-Informationen
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/{index_name}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def list_indexes(self) -> List[Dict[str, Any]]:
        """
        Listet alle verfügbaren Indexes auf.
        
        Returns:
            Liste von Index-Informationen
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                self.base_url,
                headers=self.headers
            )
            response.raise_for_status()
            data = response.json()
            return data.get("result", [])
    
    async def upsert_chunks(self, index_name: str, chunks: List[Chunk], 
                           namespace: Optional[str] = None) -> Dict[str, Any]:
        """
        Upserted Chunks in Vectorize mit Namespace-Support.
        
        Args:
            index_name: Name des Index
            chunks: Liste von Chunk-Objekten
            namespace: Namespace für Multi-Tenancy
            
        Returns:
            Upsert-Response
        """
        if not chunks:
            return {"success": True, "count": 0}
        
        # Chunks in Vectorize-Format konvertieren
        vectors = []
        for chunk in chunks:
            if not chunk.embedding:
                raise ValueError(f"Chunk {chunk.id} has no embedding")
            
            vector_data = {
                "id": chunk.id,
                "values": chunk.embedding,
                "metadata": {
                    "text": chunk.text[:1000],  # Truncate für Metadata-Limits
                    "url": chunk.meta.get("url", ""),
                    "title": chunk.meta.get("title", ""),
                    "chunk_index": chunk.meta.get("chunk_index", 0),
                    "tenant_id": namespace or chunk.meta.get("tenant_id", ""),
                    "version": chunk.version,
                    "created_at": chunk.created_at
                }
            }
            
            # Namespace hinzufügen falls spezifiziert
            if namespace:
                vector_data["namespace"] = namespace
            
            vectors.append(vector_data)
        
        return await self._batch_upsert(index_name, vectors)
    
    async def _batch_upsert(self, index_name: str, vectors: List[Dict[str, Any]], 
                           batch_size: int = 500) -> Dict[str, Any]:
        """
        Führt Batch-Upsert mit konfigurierbarer Batch-Größe durch.
        
        Args:
            index_name: Name des Index
            vectors: Liste von Vector-Objekten
            batch_size: Anzahl Vektoren pro Batch
            
        Returns:
            Aggregierte Upsert-Response
        """
        if not vectors:
            return {"success": True, "count": 0}
        
        total_upserted = 0
        errors = []
        start_time = time.time()
        
        # Verarbeite in Batches
        for i in range(0, len(vectors), batch_size):
            batch = vectors[i:i + batch_size]
            
            try:
                result = await self._upsert_batch(index_name, batch)
                total_upserted += len(batch)
                
                # Kurze Pause zwischen Batches um Rate Limits zu vermeiden
                if i + batch_size < len(vectors):
                    await asyncio.sleep(0.1)
                    
            except Exception as e:
                errors.append(f"Batch {i//batch_size + 1}: {str(e)}")
                self.stats["errors"] += 1
        
        # Statistiken aktualisieren
        duration = time.time() - start_time
        self.stats["requests"] += len(range(0, len(vectors), batch_size))
        self.stats["vectors_upserted"] += total_upserted
        self.stats["total_latency"] += duration
        
        return {
            "success": len(errors) == 0,
            "total_upserted": total_upserted,
            "total_vectors": len(vectors),
            "batches": len(range(0, len(vectors), batch_size)),
            "duration": duration,
            "errors": errors
        }
    
    async def _upsert_batch(self, index_name: str, vectors: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Upserted einen einzelnen Batch von Vektoren.
        """
        # Convert to NDJSON format (newline-delimited JSON) - optimized for Cloudflare
        ndjson_data = '\n'.join(json.dumps(vector, separators=(',', ':')) for vector in vectors)
        
        # Debug: Print first vector to see format
        print(f"DEBUG: First vector format: {json.dumps(vectors[0], indent=2)}")
        print(f"DEBUG: NDJSON data (first 200 chars): {ndjson_data[:200]}...")
        
        # Update headers for NDJSON
        headers = {**self.headers, "Content-Type": "application/x-ndjson"}
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/{index_name}/upsert",
                content=ndjson_data,
                headers=headers
            )
            
            # Debug: Print response details on error
            if response.status_code != 200:
                print(f"DEBUG: Response status: {response.status_code}")
                print(f"DEBUG: Response headers: {dict(response.headers)}")
                print(f"DEBUG: Response body: {response.text}")
            
            response.raise_for_status()
            return response.json()
    
    async def query_vectors(self, index_name: str, query_vector: List[float], 
                           top_k: int = 10, namespace: Optional[str] = None,
                           filter_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Führt Vector-Similarity-Search durch.
        
        Args:
            index_name: Name des Index
            query_vector: Query-Embedding
            top_k: Anzahl Ergebnisse
            namespace: Namespace für Multi-Tenancy
            filter_metadata: Metadata-Filter
            
        Returns:
            Query-Ergebnisse
        """
        payload = {
            "vector": query_vector,
            "topK": top_k,
            "return_metadata": True
        }
        
        if namespace:
            payload["namespace"] = namespace
        
        if filter_metadata:
            payload["filter"] = filter_metadata
        
        start_time = time.time()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/{index_name}/query",
                json=payload,
                headers=self.headers
            )
            response.raise_for_status()
            result = response.json()
        
        # Statistiken aktualisieren
        duration = time.time() - start_time
        self.stats["requests"] += 1
        self.stats["vectors_queried"] += top_k
        self.stats["total_latency"] += duration
        
        return result
    
    async def delete_vectors(self, index_name: str, vector_ids: List[str], 
                           namespace: Optional[str] = None) -> Dict[str, Any]:
        """
        Löscht Vektoren aus dem Index.
        
        Args:
            index_name: Name des Index
            vector_ids: Liste von Vector-IDs
            namespace: Namespace für Multi-Tenancy
            
        Returns:
            Delete-Response
        """
        payload = {"ids": vector_ids}
        
        if namespace:
            payload["namespace"] = namespace
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(
                f"{self.base_url}/{index_name}/vectors",
                json=payload,
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def delete_by_metadata(self, index_name: str, metadata_filter: Dict[str, Any],
                                namespace: Optional[str] = None) -> Dict[str, Any]:
        """
        Löscht Vektoren basierend auf Metadata-Filter.
        
        Args:
            index_name: Name des Index
            metadata_filter: Metadata-Filter für Löschung
            namespace: Namespace für Multi-Tenancy
            
        Returns:
            Delete-Response
        """
        payload = {"filter": metadata_filter}
        
        if namespace:
            payload["namespace"] = namespace
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(
                f"{self.base_url}/{index_name}/vectors",
                json=payload,
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def cleanup_old_versions(self, index_name: str, url: str, 
                                  current_version: str, namespace: Optional[str] = None) -> Dict[str, Any]:
        """
        Bereinigt alte Chunk-Versionen für eine URL.
        
        Args:
            index_name: Name des Index
            url: Quell-URL
            current_version: Aktuelle Version (wird nicht gelöscht)
            namespace: Namespace für Multi-Tenancy
            
        Returns:
            Cleanup-Response
        """
        # Filter für alte Versionen
        metadata_filter = {
            "url": url,
            "version": {"$ne": current_version}
        }
        
        return await self.delete_by_metadata(index_name, metadata_filter, namespace)
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Gibt Client-Statistiken zurück.
        
        Returns:
            Statistiken-Dictionary
        """
        avg_latency = (
            self.stats["total_latency"] / max(self.stats["requests"], 1)
            if self.stats["requests"] > 0 else 0
        )
        
        return {
            **self.stats,
            "avg_latency": avg_latency,
            "success_rate": (
                (self.stats["requests"] - self.stats["errors"]) / max(self.stats["requests"], 1)
                if self.stats["requests"] > 0 else 1.0
            )
        }
    
    def reset_stats(self):
        """Setzt Statistiken zurück."""
        self.stats = {
            "requests": 0,
            "vectors_upserted": 0,
            "vectors_queried": 0,
            "total_latency": 0.0,
            "errors": 0
        }


class VectorizeManager:
    """
    High-Level Manager für Vectorize-Operationen mit automatischer
    Index-Verwaltung und Batch-Request-Verarbeitung.
    """
    
    def __init__(self, default_index: str = "cracha-768"):
        """
        Initialisiert VectorizeManager.
        
        Args:
            default_index: Standard-Index-Name
        """
        self.client = VectorizeClient()
        self.default_index = default_index
        self._index_cache = {}
    
    async def ensure_index(self, index_name: str, dimensions: int) -> Dict[str, Any]:
        """
        Stellt sicher, dass Index existiert (erstellt falls nötig).
        
        Args:
            index_name: Name des Index
            dimensions: Embedding-Dimensionen
            
        Returns:
            Index-Informationen
        """
        if index_name in self._index_cache:
            return self._index_cache[index_name]
        
        try:
            index_info = await self.client.get_index(index_name)
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                # Index existiert nicht, erstelle ihn
                index_info = await self.client.create_index(index_name, dimensions)
            else:
                raise
        
        self._index_cache[index_name] = index_info
        return index_info
    
    async def process_batch_request(self, batch_request: BatchRequest) -> Dict[str, Any]:
        """
        Verarbeitet BatchRequest mit automatischer Index-Verwaltung.
        
        Args:
            batch_request: BatchRequest-Objekt
            
        Returns:
            Processing-Ergebnisse
        """
        if not batch_request.chunks:
            return {"success": True, "message": "No chunks to process"}
        
        # Bestimme Embedding-Dimensionen
        dimensions = None
        for chunk in batch_request.chunks:
            if chunk.embedding:
                dimensions = len(chunk.embedding)
                break
        
        if not dimensions:
            raise ValueError("No embeddings found in chunks")
        
        # Stelle sicher, dass Index existiert
        await self.ensure_index(self.default_index, dimensions)
        
        # Upsert Chunks
        namespace = batch_request.get_namespace()
        result = await self.client.upsert_chunks(
            self.default_index, 
            batch_request.chunks, 
            namespace
        )
        
        return {
            "success": result["success"],
            "tenant_id": batch_request.tenant_id,
            "namespace": namespace,
            "chunks_processed": len(batch_request.chunks),
            "embedding_model": batch_request.embedding_model,
            "total_tokens": batch_request.get_total_tokens(),
            "upsert_result": result
        }
    
    async def search_similar(self, query_embedding: List[float], tenant_id: str,
                           top_k: int = 10, metadata_filter: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Sucht ähnliche Vektoren für einen Tenant.
        
        Args:
            query_embedding: Query-Embedding
            tenant_id: Tenant-ID für Namespace
            top_k: Anzahl Ergebnisse
            metadata_filter: Zusätzliche Metadata-Filter
            
        Returns:
            Search-Ergebnisse
        """
        return await self.client.query_vectors(
            self.default_index,
            query_embedding,
            top_k=top_k,
            namespace=tenant_id,
            filter_metadata=metadata_filter
        )
    
    async def cleanup_tenant_data(self, tenant_id: str) -> Dict[str, Any]:
        """
        Bereinigt alle Daten eines Tenants.
        
        Args:
            tenant_id: Tenant-ID
            
        Returns:
            Cleanup-Ergebnisse
        """
        metadata_filter = {"tenant_id": tenant_id}
        return await self.client.delete_by_metadata(
            self.default_index,
            metadata_filter,
            namespace=tenant_id
        )


# Convenience Functions
async def upsert_chunks_simple(chunks: List[Chunk], tenant_id: str, 
                              index_name: str = "cracha-768") -> Dict[str, Any]:
    """
    Convenience Function für einfaches Chunk-Upsert.
    """
    client = VectorizeClient()
    return await client.upsert_chunks(index_name, chunks, namespace=tenant_id)


async def search_chunks(query_embedding: List[float], tenant_id: str,
                       top_k: int = 10, index_name: str = "cracha-768") -> Dict[str, Any]:
    """
    Convenience Function für einfache Chunk-Suche.
    """
    client = VectorizeClient()
    return await client.query_vectors(index_name, query_embedding, top_k, namespace=tenant_id)


# Export
__all__ = [
    "VectorizeClient",
    "VectorizeManager", 
    "upsert_chunks_simple",
    "search_chunks"
]