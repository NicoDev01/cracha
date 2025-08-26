"""
CraCha Ingestion Pipeline - Pydantic Models

Definiert alle Datenstrukturen für die Ingestion Pipeline mit
Validation, Type Safety und Multi-Provider Support.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional, Literal
import time
import hashlib


class Chunk(BaseModel):
    """
    Einzelner Text-Chunk mit Embedding und Metadaten.
    
    Unterstützt flexible Embedding-Dimensionen (768-3072) für
    verschiedene Provider und Kostenoptimierung.
    """
    id: str = Field(..., description="Eindeutige Chunk-ID mit Versionierung")
    text: str = Field(..., min_length=10, max_length=8000, description="Chunk-Text")
    embedding: List[float] = Field(
        default_factory=list, 
        min_length=0, 
        max_length=3072,
        description="Embedding-Vektor (768, 1536 oder 3072 Dimensionen)"
    )
    meta: Dict[str, Any] = Field(default_factory=dict, description="Chunk-Metadaten")
    version: str = Field(default="v1", description="Content-Hash für Versionierung")
    created_at: int = Field(default_factory=lambda: int(time.time()), description="Unix Timestamp")
    
    @validator('embedding')
    def validate_embedding_dimensions(cls, v):
        """Validiert unterstützte Embedding-Dimensionen"""
        if len(v) == 0:
            return v  # Leeres Embedding ist ok (wird später gefüllt)
        
        valid_dims = [768, 1536, 3072]
        if len(v) not in valid_dims:
            raise ValueError(f"Embedding muss {valid_dims} Dimensionen haben, nicht {len(v)}")
        return v
    
    @validator('text')
    def validate_text_content(cls, v):
        """Validiert Text-Inhalt"""
        if not v.strip():
            raise ValueError("Text darf nicht leer sein")
        return v.strip()
    
    def get_token_count(self) -> int:
        """Schätzt Token-Anzahl für Kosten-Berechnung"""
        # Grobe Schätzung: ~4 Zeichen pro Token
        return len(self.text) // 4


class BatchRequest(BaseModel):
    """
    Batch-Request für mehrere Chunks mit Tenant-Konfiguration.
    """
    tenant_id: str = Field(..., min_length=1, description="Tenant-Identifier")
    chunks: List[Chunk] = Field(..., min_length=1, max_length=500, description="Chunk-Liste")
    embedding_model: Literal["gemini-768", "gemini-1536", "openai-small"] = Field(
        default="gemini-768", 
        description="Embedding-Provider und Dimensionen"
    )
    namespace: Optional[str] = Field(None, description="Vectorize Namespace (default: tenant_id)")
    
    @validator('chunks')
    def validate_chunk_consistency(cls, v, values):
        """Validiert Chunk-Konsistenz im Batch"""
        if not v:
            raise ValueError("Mindestens ein Chunk erforderlich")
        
        # Prüfe Embedding-Dimensionen-Konsistenz
        embedding_dims = set()
        for chunk in v:
            if chunk.embedding:
                embedding_dims.add(len(chunk.embedding))
        
        if len(embedding_dims) > 1:
            raise ValueError(f"Inkonsistente Embedding-Dimensionen: {embedding_dims}")
        
        return v
    
    def get_total_tokens(self) -> int:
        """Berechnet Gesamt-Token für Kosten-Schätzung"""
        return sum(chunk.get_token_count() for chunk in self.chunks)
    
    def get_namespace(self) -> str:
        """Gibt Namespace zurück (default: tenant_id)"""
        return self.namespace or self.tenant_id


class TenantConfig(BaseModel):
    """
    Tenant-spezifische Konfiguration für Embedding-Provider.
    """
    tenant_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, description="Tenant-Name")
    embedding_model: Literal["gemini-768", "gemini-1536", "openai-small"] = "gemini-768"
    max_chunk_size: int = Field(default=300, ge=100, le=1000, description="Max Tokens pro Chunk")
    chunk_overlap: int = Field(default=50, ge=0, le=200, description="Overlap zwischen Chunks")
    usage_tier: Literal["free", "pro", "enterprise"] = "free"
    created_at: int = Field(default_factory=lambda: int(time.time()))
    
    @validator('chunk_overlap')
    def validate_overlap(cls, v, values):
        """Overlap darf nicht größer als Chunk-Größe sein"""
        max_chunk_size = values.get('max_chunk_size', 300)
        if v >= max_chunk_size:
            raise ValueError(f"Overlap ({v}) muss kleiner als Chunk-Größe ({max_chunk_size}) sein")
        return v


class IngestionJob(BaseModel):
    """
    Ingestion-Job mit Progress-Tracking.
    """
    job_id: str = Field(default_factory=lambda: hashlib.md5(str(time.time()).encode()).hexdigest()[:8])
    tenant_id: str
    source_url: str
    source_type: Literal["markdown", "html", "pdf", "text"] = "markdown"
    status: Literal["pending", "processing", "completed", "failed"] = "pending"
    total_chunks: int = 0
    processed_chunks: int = 0
    total_tokens: int = 0
    estimated_cost: float = 0.0
    error_message: Optional[str] = None
    created_at: int = Field(default_factory=lambda: int(time.time()))
    completed_at: Optional[int] = None
    
    def get_progress(self) -> float:
        """Berechnet Progress in Prozent"""
        if self.total_chunks == 0:
            return 0.0
        return (self.processed_chunks / self.total_chunks) * 100
    
    def mark_completed(self):
        """Markiert Job als abgeschlossen"""
        self.status = "completed"
        self.completed_at = int(time.time())
    
    def mark_failed(self, error: str):
        """Markiert Job als fehlgeschlagen"""
        self.status = "failed"
        self.error_message = error
        self.completed_at = int(time.time())


class EmbeddingCost(BaseModel):
    """
    Kosten-Tracking für verschiedene Embedding-Provider.
    """
    provider: Literal["gemini-768", "gemini-1536", "openai-small"]
    tokens: int
    cost_per_1k_tokens: float
    total_cost: float
    currency: str = "USD"
    timestamp: int = Field(default_factory=lambda: int(time.time()))
    
    @classmethod
    def calculate(cls, provider: str, tokens: int) -> "EmbeddingCost":
        """Factory Method für Kosten-Berechnung"""
        cost_map = {
            "gemini-768": 0.000031,    # 75% günstiger als 3072D
            "gemini-1536": 0.000062,   # 50% günstiger als 3072D  
            "openai-small": 0.000020   # Günstigste Option
        }
        
        cost_per_1k = cost_map.get(provider, cost_map["gemini-768"])
        total_cost = (tokens / 1000) * cost_per_1k
        
        return cls(
            provider=provider,
            tokens=tokens,
            cost_per_1k_tokens=cost_per_1k,
            total_cost=total_cost
        )


# Export für einfache Imports
__all__ = [
    "Chunk",
    "BatchRequest", 
    "TenantConfig",
    "IngestionJob",
    "EmbeddingCost"
]