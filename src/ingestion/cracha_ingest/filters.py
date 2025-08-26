"""
Advanced RAG - Metadaten-Filter

Implementiert intelligente Filterung basierend auf Metadaten für
präzisere Retrieval-Ergebnisse und bessere Performance.
"""

from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta
from dataclasses import dataclass


@dataclass
class FilterCriteria:
    """Kriterien für Metadaten-Filterung"""
    
    # Content-Filter
    content_type: Optional[str] = None  # "markdown", "html", "pdf"
    language: Optional[str] = None      # "de", "en"
    document_type: Optional[str] = None # "webpage", "documentation", "article"
    
    # Domain/Source-Filter
    domain: Optional[str] = None
    url_pattern: Optional[str] = None
    
    # Content-Eigenschaften
    min_word_count: Optional[int] = None
    max_word_count: Optional[int] = None
    has_code: Optional[bool] = None
    has_links: Optional[bool] = None
    has_lists: Optional[bool] = None
    
    # Qualitäts-Filter
    min_complexity_score: Optional[int] = None
    max_complexity_score: Optional[int] = None
    max_reading_time: Optional[int] = None
    
    # Zeit-Filter
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    max_age_hours: Optional[int] = None
    
    # Chunk-spezifische Filter
    section_type: Optional[str] = None  # "content", "header", "footer"
    min_chunk_index: Optional[int] = None
    max_chunk_index: Optional[int] = None


class MetadataFilter:
    """
    Advanced RAG Metadaten-Filter für präzise Retrieval-Kontrolle.
    
    Best Practice: Metadaten-Filter vor Vektorsuche anwenden reduziert
    Suchraum und verbessert Präzision erheblich.
    """
    
    @staticmethod
    def apply_filters(chunks_metadata: List[Dict[str, Any]], 
                     criteria: FilterCriteria) -> List[int]:
        """
        Wendet Filter auf Chunk-Metadaten an.
        
        Args:
            chunks_metadata: Liste von Chunk-Metadaten
            criteria: Filter-Kriterien
            
        Returns:
            Liste von Indizes der gefilterten Chunks
        """
        filtered_indices = []
        
        for i, meta in enumerate(chunks_metadata):
            if MetadataFilter._matches_criteria(meta, criteria):
                filtered_indices.append(i)
        
        return filtered_indices
    
    @staticmethod
    def _matches_criteria(meta: Dict[str, Any], criteria: FilterCriteria) -> bool:
        """Prüft ob Metadaten den Kriterien entsprechen"""
        
        # Content-Type Filter
        if criteria.content_type and meta.get("content_type") != criteria.content_type:
            return False
        
        # Language Filter
        if criteria.language and meta.get("language") != criteria.language:
            return False
        
        # Document-Type Filter
        if criteria.document_type and meta.get("document_type") != criteria.document_type:
            return False
        
        # Domain Filter
        if criteria.domain and criteria.domain not in meta.get("domain", ""):
            return False
        
        # URL Pattern Filter
        if criteria.url_pattern and criteria.url_pattern not in meta.get("url", ""):
            return False
        
        # Word Count Filter
        word_count = meta.get("word_count", 0)
        if criteria.min_word_count and word_count < criteria.min_word_count:
            return False
        if criteria.max_word_count and word_count > criteria.max_word_count:
            return False
        
        # Content-Eigenschaften Filter
        if criteria.has_code is not None and meta.get("has_code", False) != criteria.has_code:
            return False
        if criteria.has_links is not None and meta.get("has_links", False) != criteria.has_links:
            return False
        if criteria.has_lists is not None and meta.get("has_lists", False) != criteria.has_lists:
            return False
        
        # Komplexitäts-Filter
        complexity = meta.get("complexity_score", 5)
        if criteria.min_complexity_score and complexity < criteria.min_complexity_score:
            return False
        if criteria.max_complexity_score and complexity > criteria.max_complexity_score:
            return False
        
        # Reading Time Filter
        if criteria.max_reading_time and meta.get("reading_time", 0) > criteria.max_reading_time:
            return False
        
        # Zeit-Filter
        created_at = meta.get("created_at", 0)
        if created_at > 0:
            created_datetime = datetime.fromtimestamp(created_at)
            
            if criteria.created_after and created_datetime < criteria.created_after:
                return False
            if criteria.created_before and created_datetime > criteria.created_before:
                return False
            if criteria.max_age_hours:
                max_age = datetime.now() - timedelta(hours=criteria.max_age_hours)
                if created_datetime < max_age:
                    return False
        
        # Section-Type Filter
        if criteria.section_type and meta.get("section_type") != criteria.section_type:
            return False
        
        # Chunk-Index Filter
        chunk_index = meta.get("chunk_index", 0)
        if criteria.min_chunk_index and chunk_index < criteria.min_chunk_index:
            return False
        if criteria.max_chunk_index and chunk_index > criteria.max_chunk_index:
            return False
        
        return True
    
    @staticmethod
    def create_smart_filters(query: str, context: Dict[str, Any] = None) -> FilterCriteria:
        """
        Erstellt intelligente Filter basierend auf Query-Analyse.
        
        Args:
            query: Suchanfrage
            context: Zusätzlicher Kontext
            
        Returns:
            Optimierte Filter-Kriterien
        """
        criteria = FilterCriteria()
        query_lower = query.lower()
        
        # Sprach-Detection
        german_indicators = ["was", "wie", "wo", "wann", "warum", "welche", "der", "die", "das", "ist", "sind"]
        if any(word in query_lower for word in german_indicators):
            criteria.language = "de"
        
        # Code-bezogene Queries
        code_indicators = ["code", "function", "class", "method", "api", "programming", "syntax"]
        if any(word in query_lower for word in code_indicators):
            criteria.has_code = True
            criteria.min_complexity_score = 3
        
        # Dokumentations-Queries
        doc_indicators = ["documentation", "docs", "guide", "tutorial", "how to", "anleitung"]
        if any(word in query_lower for word in doc_indicators):
            criteria.document_type = "documentation"
            criteria.section_type = "content"
        
        # Aktualitäts-Filter für News/Updates
        recent_indicators = ["new", "latest", "recent", "update", "neu", "aktuell", "neueste"]
        if any(word in query_lower for word in recent_indicators):
            criteria.max_age_hours = 168  # 1 Woche
        
        # Komplexitäts-Filter basierend auf Query-Länge
        if len(query.split()) > 10:  # Komplexe Frage
            criteria.min_word_count = 100  # Längere, detailliertere Chunks
        
        return criteria
    
    @staticmethod
    def get_filter_stats(chunks_metadata: List[Dict[str, Any]], 
                        criteria: FilterCriteria) -> Dict[str, Any]:
        """
        Gibt Statistiken über Filter-Anwendung zurück.
        
        Args:
            chunks_metadata: Chunk-Metadaten
            criteria: Filter-Kriterien
            
        Returns:
            Filter-Statistiken
        """
        total_chunks = len(chunks_metadata)
        filtered_indices = MetadataFilter.apply_filters(chunks_metadata, criteria)
        filtered_count = len(filtered_indices)
        
        return {
            "total_chunks": total_chunks,
            "filtered_chunks": filtered_count,
            "filter_ratio": filtered_count / total_chunks if total_chunks > 0 else 0,
            "reduction_percent": (1 - filtered_count / total_chunks) * 100 if total_chunks > 0 else 0
        }


def create_domain_filter(domain: str) -> FilterCriteria:
    """Erstellt Filter für spezifische Domain"""
    return FilterCriteria(domain=domain)


def create_language_filter(language: str) -> FilterCriteria:
    """Erstellt Filter für spezifische Sprache"""
    return FilterCriteria(language=language)


def create_recency_filter(max_age_hours: int) -> FilterCriteria:
    """Erstellt Filter für aktuelle Inhalte"""
    return FilterCriteria(max_age_hours=max_age_hours)


def create_content_type_filter(content_type: str, has_code: bool = None) -> FilterCriteria:
    """Erstellt Filter für Content-Typ"""
    return FilterCriteria(content_type=content_type, has_code=has_code)