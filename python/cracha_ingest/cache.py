"""
Advanced RAG - Query Caching

Implementiert intelligentes Caching für häufige Queries zur Reduzierung
von Kosten und Latenz bei wiederholten Anfragen.
"""

import hashlib
import json
import time
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict


@dataclass
class CacheEntry:
    """Cache-Eintrag für Query-Ergebnisse"""
    query_hash: str
    tenant_id: str
    results: List[Dict[str, Any]]
    embedding: List[float]
    timestamp: float
    hit_count: int = 1
    ttl_seconds: int = 3600  # 1 Stunde default


class QueryCache:
    """
    In-Memory Query Cache für Advanced RAG.
    
    Best Practice: Caching für häufige Fragen reduziert Redundanzen
    und Kosten erheblich, besonders bei FAQ-ähnlichen Queries.
    """
    
    def __init__(self, max_entries: int = 1000, default_ttl: int = 3600):
        self.cache: Dict[str, CacheEntry] = {}
        self.max_entries = max_entries
        self.default_ttl = default_ttl
        self.stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0,
            "total_queries": 0
        }
    
    def _generate_cache_key(self, query: str, tenant_id: str, 
                          filters: Optional[Dict[str, Any]] = None) -> str:
        """Generiert einen eindeutigen Cache-Key"""
        cache_data = {
            "query": query.lower().strip(),
            "tenant_id": tenant_id,
            "filters": filters or {}
        }
        
        cache_string = json.dumps(cache_data, sort_keys=True)
        return hashlib.md5(cache_string.encode()).hexdigest()
    
    def get(self, query: str, tenant_id: str, 
            filters: Optional[Dict[str, Any]] = None) -> Optional[CacheEntry]:
        """
        Holt Ergebnis aus dem Cache.
        
        Args:
            query: Suchanfrage
            tenant_id: Tenant-ID
            filters: Optionale Filter
            
        Returns:
            Cache-Eintrag oder None
        """
        self.stats["total_queries"] += 1
        cache_key = self._generate_cache_key(query, tenant_id, filters)
        
        if cache_key not in self.cache:
            self.stats["misses"] += 1
            return None
        
        entry = self.cache[cache_key]
        
        # TTL-Check
        if time.time() - entry.timestamp > entry.ttl_seconds:
            del self.cache[cache_key]
            self.stats["misses"] += 1
            return None
        
        # Hit-Count erhöhen
        entry.hit_count += 1
        self.stats["hits"] += 1
        
        return entry
    
    def put(self, query: str, tenant_id: str, results: List[Dict[str, Any]], 
            embedding: List[float], filters: Optional[Dict[str, Any]] = None,
            ttl_seconds: Optional[int] = None) -> None:
        """
        Speichert Ergebnis im Cache.
        
        Args:
            query: Suchanfrage
            tenant_id: Tenant-ID
            results: Suchergebnisse
            embedding: Query-Embedding
            filters: Optionale Filter
            ttl_seconds: Time-to-live in Sekunden
        """
        cache_key = self._generate_cache_key(query, tenant_id, filters)
        
        # Eviction wenn Cache voll
        if len(self.cache) >= self.max_entries:
            self._evict_lru()
        
        entry = CacheEntry(
            query_hash=cache_key,
            tenant_id=tenant_id,
            results=results,
            embedding=embedding,
            timestamp=time.time(),
            ttl_seconds=ttl_seconds or self.default_ttl
        )
        
        self.cache[cache_key] = entry
    
    def _evict_lru(self) -> None:
        """Entfernt den am wenigsten genutzten Eintrag (LRU)"""
        if not self.cache:
            return
        
        # Finde Eintrag mit niedrigstem hit_count und ältestem timestamp
        lru_key = min(
            self.cache.keys(),
            key=lambda k: (self.cache[k].hit_count, self.cache[k].timestamp)
        )
        
        del self.cache[lru_key]
        self.stats["evictions"] += 1
    
    def invalidate_tenant(self, tenant_id: str) -> int:
        """
        Invalidiert alle Cache-Einträge für einen Tenant.
        
        Args:
            tenant_id: Tenant-ID
            
        Returns:
            Anzahl invalidierter Einträge
        """
        keys_to_remove = [
            key for key, entry in self.cache.items()
            if entry.tenant_id == tenant_id
        ]
        
        for key in keys_to_remove:
            del self.cache[key]
        
        return len(keys_to_remove)
    
    def clear(self) -> None:
        """Leert den gesamten Cache"""
        self.cache.clear()
        self.stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0,
            "total_queries": 0
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Gibt Cache-Statistiken zurück"""
        total_queries = self.stats["total_queries"]
        hit_rate = (self.stats["hits"] / total_queries * 100) if total_queries > 0 else 0
        
        return {
            **self.stats,
            "hit_rate_percent": round(hit_rate, 2),
            "cache_size": len(self.cache),
            "max_entries": self.max_entries
        }
    
    def get_popular_queries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Gibt die beliebtesten Queries zurück"""
        sorted_entries = sorted(
            self.cache.values(),
            key=lambda x: x.hit_count,
            reverse=True
        )
        
        return [
            {
                "tenant_id": entry.tenant_id,
                "hit_count": entry.hit_count,
                "age_hours": (time.time() - entry.timestamp) / 3600
            }
            for entry in sorted_entries[:limit]
        ]


# Global Cache Instance (kann in Worker als Singleton verwendet werden)
_global_cache: Optional[QueryCache] = None


def get_global_cache() -> QueryCache:
    """Gibt die globale Cache-Instanz zurück"""
    global _global_cache
    if _global_cache is None:
        _global_cache = QueryCache()
    return _global_cache


def clear_global_cache() -> None:
    """Leert den globalen Cache"""
    global _global_cache
    if _global_cache:
        _global_cache.clear()