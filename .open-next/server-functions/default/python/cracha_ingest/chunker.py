"""
CraCha Ingestion Pipeline - Smart Chunking

Intelligenter Chunking-Algorithmus der Markdown-Struktur respektiert,
semantische Brüche vermeidet und Sliding Window für besseren Kontext nutzt.
"""

import re
import tiktoken
import hashlib
from typing import List, Iterator, Optional, Tuple
from .models import Chunk


class SmartChunker:
    """
    Intelligenter Chunker für Markdown-Dokumente mit struktureller Awareness.
    """
    
    def __init__(self, max_tokens: int = None, overlap: int = None, model: str = "cl100k_base"):
        """
        Initialisiert den SmartChunker.
        
        Args:
            max_tokens: Maximale Token-Anzahl pro Chunk (Best Practice: 500-1000)
            overlap: Overlap zwischen Chunks in Tokens (Best Practice: 10-20% = 80-200)
            model: Tiktoken-Model für Token-Counting
        """
        from .config import DEFAULT_MAX_TOKENS, DEFAULT_OVERLAP
        
        self.max_tokens = max_tokens or DEFAULT_MAX_TOKENS
        self.overlap = overlap or DEFAULT_OVERLAP
        self.encoder = tiktoken.get_encoding(model)
        
        # Markdown-Header Patterns (H1-H6)
        self.header_pattern = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)
        
        # Paragraph-Trenner
        self.paragraph_separator = re.compile(r'\n\s*\n')
    
    def chunk_markdown(self, text: str, tenant_id: str, url: str) -> List[Chunk]:
        """
        Chunked Markdown-Text mit struktureller Awareness.
        
        Args:
            text: Markdown-Text zum Chunken
            tenant_id: Tenant-Identifier
            url: Quell-URL für Metadaten
            
        Returns:
            Liste von Chunk-Objekten
        """
        if not text.strip():
            return []
        
        # Content-Hash für Versionierung
        content_hash = hashlib.md5(text.encode()).hexdigest()[:8]
        
        # Strukturelles Chunking
        chunks = list(self._smart_chunk_with_structure(text, content_hash, tenant_id, url))
        
        # Fallback: Einfaches Chunking wenn strukturelles fehlschlägt
        if not chunks:
            chunks = list(self._simple_chunk(text, content_hash, tenant_id, url))
        
        return chunks
    
    def _smart_chunk_with_structure(self, text: str, content_hash: str, 
                                  tenant_id: str, url: str) -> Iterator[Chunk]:
        """
        Strukturelles Chunking das Markdown-Header respektiert.
        """
        sections = self._split_by_headers(text)
        
        current_chunk = ""
        current_tokens = 0
        chunk_index = 0
        current_header_context = ""
        
        for section_type, content, header_level in sections:
            section_tokens = len(self.encoder.encode(content))
            
            # Header-Kontext aktualisieren
            if section_type == "header":
                current_header_context = content
                
            # Wenn Section zu groß, teile sie weiter auf
            if section_tokens > self.max_tokens:
                # Aktuellen Chunk abschließen falls vorhanden
                if current_chunk.strip():
                    yield self._create_chunk(
                        current_chunk, chunk_index, content_hash, 
                        tenant_id, url, current_header_context
                    )
                    chunk_index += 1
                
                # Große Section in Paragraphen aufteilen
                for sub_chunk in self._chunk_large_section(content, content_hash, 
                                                         tenant_id, url, chunk_index, 
                                                         current_header_context):
                    yield sub_chunk
                    chunk_index += 1
                
                current_chunk = ""
                current_tokens = 0
                
            # Section passt in aktuellen Chunk
            elif current_tokens + section_tokens <= self.max_tokens:
                current_chunk += "\n" + content if current_chunk else content
                current_tokens += section_tokens
                
            # Section passt nicht, neuen Chunk starten
            else:
                if current_chunk.strip():
                    # Sliding Window: Behalte letzten Teil für Kontext
                    overlap_content = self._extract_overlap(current_chunk)
                    
                    yield self._create_chunk(
                        current_chunk, chunk_index, content_hash,
                        tenant_id, url, current_header_context
                    )
                    chunk_index += 1
                    
                    # Neuer Chunk mit Overlap
                    current_chunk = overlap_content + "\n" + content if overlap_content else content
                    current_tokens = len(self.encoder.encode(current_chunk))
                else:
                    current_chunk = content
                    current_tokens = section_tokens
        
        # Letzten Chunk abschließen
        if current_chunk.strip():
            yield self._create_chunk(
                current_chunk, chunk_index, content_hash,
                tenant_id, url, current_header_context
            )
    
    def _split_by_headers(self, text: str) -> List[Tuple[str, str, int]]:
        """
        Teilt Text an Markdown-Headern auf.
        
        Returns:
            Liste von (type, content, header_level) Tupeln
        """
        sections = []
        lines = text.split('\n')
        current_section = []
        current_header_level = 0
        
        for line in lines:
            header_match = self.header_pattern.match(line)
            
            if header_match:
                # Vorherige Section abschließen
                if current_section:
                    sections.append((
                        "content", 
                        '\n'.join(current_section).strip(),
                        current_header_level
                    ))
                    current_section = []
                
                # Header als eigene Section
                header_level = len(header_match.group(1))
                sections.append((
                    "header",
                    line.strip(),
                    header_level
                ))
                current_header_level = header_level
            else:
                current_section.append(line)
        
        # Letzte Section
        if current_section:
            sections.append((
                "content",
                '\n'.join(current_section).strip(),
                current_header_level
            ))
        
        return [(t, c, l) for t, c, l in sections if c.strip()]
    
    def _chunk_large_section(self, content: str, content_hash: str, tenant_id: str, 
                           url: str, start_index: int, header_context: str) -> Iterator[Chunk]:
        """
        Chunked große Sections in Paragraphen.
        """
        paragraphs = self.paragraph_separator.split(content)
        
        current_chunk = ""
        current_tokens = 0
        chunk_index = start_index
        
        for paragraph in paragraphs:
            if not paragraph.strip():
                continue
                
            para_tokens = len(self.encoder.encode(paragraph))
            
            # Paragraph passt in aktuellen Chunk
            if current_tokens + para_tokens <= self.max_tokens:
                current_chunk += "\n\n" + paragraph if current_chunk else paragraph
                current_tokens += para_tokens
                
            # Paragraph passt nicht
            else:
                if current_chunk.strip():
                    yield self._create_chunk(
                        current_chunk, chunk_index, content_hash,
                        tenant_id, url, header_context
                    )
                    chunk_index += 1
                
                # Sehr langer Paragraph: Forciert aufteilen
                if para_tokens > self.max_tokens:
                    for sub_chunk in self._force_split_paragraph(
                        paragraph, content_hash, tenant_id, url, chunk_index, header_context
                    ):
                        yield sub_chunk
                        chunk_index += 1
                    current_chunk = ""
                    current_tokens = 0
                else:
                    current_chunk = paragraph
                    current_tokens = para_tokens
        
        # Letzten Chunk abschließen
        if current_chunk.strip():
            yield self._create_chunk(
                current_chunk, chunk_index, content_hash,
                tenant_id, url, header_context
            )
    
    def _force_split_paragraph(self, paragraph: str, content_hash: str, tenant_id: str,
                             url: str, start_index: int, header_context: str) -> Iterator[Chunk]:
        """
        Forciert das Aufteilen sehr langer Paragraphen.
        """
        sentences = re.split(r'[.!?]+\s+', paragraph)
        
        current_chunk = ""
        current_tokens = 0
        chunk_index = start_index
        
        for sentence in sentences:
            if not sentence.strip():
                continue
                
            sentence_tokens = len(self.encoder.encode(sentence))
            
            if current_tokens + sentence_tokens <= self.max_tokens:
                current_chunk += ". " + sentence if current_chunk else sentence
                current_tokens += sentence_tokens
            else:
                if current_chunk.strip():
                    yield self._create_chunk(
                        current_chunk + ".", chunk_index, content_hash,
                        tenant_id, url, header_context
                    )
                    chunk_index += 1
                
                current_chunk = sentence
                current_tokens = sentence_tokens
        
        if current_chunk.strip():
            yield self._create_chunk(
                current_chunk + ".", chunk_index, content_hash,
                tenant_id, url, header_context
            )
    
    def _simple_chunk(self, text: str, content_hash: str, tenant_id: str, url: str) -> Iterator[Chunk]:
        """
        Fallback: Einfaches Paragraph-basiertes Chunking.
        """
        paragraphs = self.paragraph_separator.split(text)
        
        current_chunk = ""
        current_tokens = 0
        chunk_index = 0
        
        for paragraph in paragraphs:
            if not paragraph.strip():
                continue
                
            para_tokens = len(self.encoder.encode(paragraph))
            
            if current_tokens + para_tokens <= self.max_tokens:
                current_chunk += "\n\n" + paragraph if current_chunk else paragraph
                current_tokens += para_tokens
            else:
                if current_chunk.strip():
                    yield self._create_chunk(
                        current_chunk, chunk_index, content_hash,
                        tenant_id, url, ""
                    )
                    chunk_index += 1
                
                current_chunk = paragraph
                current_tokens = para_tokens
        
        if current_chunk.strip():
            yield self._create_chunk(
                current_chunk, chunk_index, content_hash,
                tenant_id, url, ""
            )
    
    def _extract_overlap(self, text: str) -> str:
        """
        Extrahiert Overlap-Text für Sliding Window.
        """
        if self.overlap <= 0:
            return ""
        
        # Nimm letzten Satz oder letzten Teil
        sentences = re.split(r'[.!?]+\s+', text)
        if len(sentences) > 1:
            overlap_text = sentences[-1]
            overlap_tokens = len(self.encoder.encode(overlap_text))
            
            if overlap_tokens <= self.overlap:
                return overlap_text
        
        # Fallback: Letzten Teil nach Token-Limit
        tokens = self.encoder.encode(text)
        if len(tokens) > self.overlap:
            overlap_tokens = tokens[-self.overlap:]
            return self.encoder.decode(overlap_tokens)
        
        return text
    
    def _create_chunk(self, text: str, index: int, content_hash: str, 
                     tenant_id: str, url: str, header_context: str) -> Chunk:
        """
        Erstellt Chunk-Objekt mit Metadaten.
        """
        # URL-Hash für kurze IDs (max 64 bytes für Vectorize)
        import hashlib
        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        chunk_id = f"{tenant_id}::{url_hash}::v{content_hash}::{index}"
        
        # Titel aus Text extrahieren
        title = self._extract_title(text, header_context)
        
        return Chunk(
            id=chunk_id,
            text=text.strip(),
            embedding=[],  # Wird später gefüllt
            meta={
                "tenant_id": tenant_id,
                "url": url,
                "chunk_index": index,
                "content_hash": content_hash,
                "title": title,
                "header_context": header_context,
                "token_count": len(self.encoder.encode(text))
            },
            version=content_hash
        )
    
    def _extract_title(self, text: str, header_context: str) -> str:
        """
        Extrahiert aussagekräftigen Titel für Chunk.
        """
        if header_context:
            return header_context.lstrip('#').strip()
        
        # Ersten Satz als Titel
        first_sentence = re.split(r'[.!?]+', text)[0].strip()
        if len(first_sentence) > 100:
            return first_sentence[:97] + "..."
        
        return first_sentence or "Unbekannt"


# Convenience Functions für einfache Nutzung
def chunk_markdown(text: str, tenant_id: str, url: str, 
                  max_tokens: int = 300, overlap: int = 50) -> List[Chunk]:
    """
    Convenience Function für Markdown-Chunking.
    """
    chunker = SmartChunker(max_tokens=max_tokens, overlap=overlap)
    return chunker.chunk_markdown(text, tenant_id, url)


def chunk_text_simple(text: str, max_tokens: int = 300) -> List[str]:
    """
    Einfaches Text-Chunking ohne Metadaten (für Tests).
    """
    chunker = SmartChunker(max_tokens=max_tokens, overlap=0)
    paragraphs = re.split(r'\n\s*\n', text)
    
    chunks = []
    current_chunk = ""
    current_tokens = 0
    
    for para in paragraphs:
        if not para.strip():
            continue
            
        para_tokens = len(chunker.encoder.encode(para))
        
        if current_tokens + para_tokens <= max_tokens:
            current_chunk += "\n\n" + para if current_chunk else para
            current_tokens += para_tokens
        else:
            if current_chunk.strip():
                chunks.append(current_chunk.strip())
            current_chunk = para
            current_tokens = para_tokens
    
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    
    return chunks


# Export
__all__ = ["SmartChunker", "chunk_markdown", "chunk_text_simple"]