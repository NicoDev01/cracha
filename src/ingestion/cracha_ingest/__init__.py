"""
CraCha Ingestion Pipeline - Core Module

Provides clean interfaces for:
- Text chunking with smart structure awareness
- Multi-provider embeddings (Gemini, OpenAI)
- Vectorize client for Cloudflare storage
- Pydantic models for data validation
"""

# Core Models
from .models import (
    Chunk,
    BatchRequest,
    IngestionJob,
    EmbeddingCost,
    TenantConfig
)

# Processing Components
from .chunker import SmartChunker
from .embedder import (
    MultiProviderEmbedder,
    GeminiEmbeddingProvider,
    OpenAIEmbeddingProvider,
    embed_texts,
    get_cheapest_embeddings
)
from .vectorize_client import VectorizeManager

# Configuration
from . import config

# Advanced RAG Components
from .summarizer import ChunkSummarizer, add_summaries_to_chunks
from .cache import QueryCache, get_global_cache, clear_global_cache
from .filters import MetadataFilter, FilterCriteria

# Convenience imports for common usage
__all__ = [
    # Models
    "Chunk",
    "BatchRequest", 
    "IngestionJob",
    "EmbeddingCost",
    "TenantConfig",
    
    # Core Components
    "SmartChunker",
    "MultiProviderEmbedder",
    "VectorizeManager",
    
    # Provider Classes
    "GeminiEmbeddingProvider",
    "OpenAIEmbeddingProvider",
    
    # Convenience Functions
    "embed_texts",
    "get_cheapest_embeddings",
    
    # Configuration
    "config",
    
    # Advanced RAG
    "ChunkSummarizer",
    "add_summaries_to_chunks", 
    "QueryCache",
    "get_global_cache",
    "clear_global_cache",
    "MetadataFilter",
    "FilterCriteria"
]

# Version info
__version__ = "1.0.0"
__author__ = "CraCha Team"