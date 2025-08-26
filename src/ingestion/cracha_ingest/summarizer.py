"""
Advanced RAG - Chunk Summarization

Generiert LLM-basierte Zusammenfassungen für Chunks zur Verbesserung
der Retrieval-Qualität und des Kontextverständnisses.
"""

import asyncio
import httpx
from typing import List, Optional, Dict, Any
from .models import Chunk
from .config import DEFAULT_HTTP_TIMEOUT


class ChunkSummarizer:
    """
    Generiert Zusammenfassungen für Chunks zur Verbesserung der RAG-Performance.
    
    Best Practice: Chunk-Summaries dienen als "High-level context" im Retrieval
    und verbessern die semantische Suche erheblich.
    """
    
    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"
    
    async def generate_chunk_summaries(self, chunks: List[Chunk], 
                                     batch_size: int = 10,
                                     document_context: str = None) -> List[Chunk]:
        """
        Generiert kontextuelle Zusammenfassungen für eine Liste von Chunks.
        
        Best Practice: Contextual Summaries verbessern Retrieval-Genauigkeit
        um 35-50% durch bessere semantische Verortung.
        
        Args:
            chunks: Liste von Chunks
            batch_size: Anzahl Chunks pro Batch
            document_context: Gesamtdokument-Kontext für bessere Summaries
            
        Returns:
            Chunks mit kontextuellen Summaries am Anfang des Texts
        """
        print(f"🧠 Generating summaries for {len(chunks)} chunks...")
        
        # Verarbeite in Batches für bessere Performance
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (len(chunks) + batch_size - 1) // batch_size
            
            print(f"   Batch {batch_num}/{total_batches}: {len(batch)} chunks")
            
            # Generiere kontextuelle Summaries parallel
            tasks = [self._generate_contextual_summary(chunk, document_context, chunks) for chunk in batch]
            summaries = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Füge Summaries zu Chunks hinzu (PREPEND zum Text)
            for chunk, summary in zip(batch, summaries):
                if isinstance(summary, str) and summary:
                    # Best Practice: Summary an den Anfang des Chunks setzen
                    chunk.text = f"{summary}\n\n{chunk.text}"
                    chunk.meta["summary"] = summary
                    chunk.meta["has_summary"] = True
                    chunk.meta["enhanced_for_retrieval"] = True
                else:
                    chunk.meta["has_summary"] = False
                    chunk.meta["enhanced_for_retrieval"] = False
                    if isinstance(summary, Exception):
                        print(f"⚠️  Summary failed for chunk {chunk.id}: {summary}")
        
        successful_summaries = sum(1 for chunk in chunks if chunk.meta.get("has_summary", False))
        print(f"✅ Generated {successful_summaries}/{len(chunks)} summaries")
        
        return chunks
    
    async def _generate_contextual_summary(self, chunk: Chunk, 
                                          document_context: str = None,
                                          all_chunks: List[Chunk] = None) -> Optional[str]:
        """
        Generiert eine kontextuelle Zusammenfassung für einen Chunk.
        
        Best Practice: Nutzt Gesamtdokument-Kontext für präzise Verortung
        des Chunks im Gesamtzusammenhang.
        """
        
        # Skip sehr kurze Chunks
        if len(chunk.text.split()) < 50:
            return None
        
        prompt = self._build_contextual_prompt(chunk, document_context, all_chunks)
        
        try:
            # Versuche zuerst Gemini 2.0 Flash API-Struktur
            async with httpx.AsyncClient(timeout=DEFAULT_HTTP_TIMEOUT) as client:
                # Versuch 1: generateText Endpoint (Gemini 2.0 Flash)
                try:
                    response = await client.post(
                        f"{self.base_url}/{self.model}:generateText",
                        headers={
                            "x-goog-api-key": self.api_key,
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": self.model,
                            "prompt": prompt,
                            "temperature": 0.1,
                            "maxTokens": 100,
                            "topP": 0.8,
                            "thinkingBudget": 500  # Gemini 2.0 Flash spezifisch
                        }
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if "text" in data:
                            return data["text"].strip()
                    
                except Exception:
                    pass  # Fallback zur alternativen API
                
                # Versuch 2: generateContent Endpoint (Fallback)
                response = await client.post(
                    f"{self.base_url}/{self.model}:generateContent",
                    headers={
                        "x-goog-api-key": self.api_key,
                        "Content-Type": "application/json"
                    },
                    json={
                        "contents": [{
                            "parts": [{"text": prompt}]
                        }],
                        "generationConfig": {
                            "temperature": 0.1,
                            "maxOutputTokens": 100,
                            "topP": 0.8,
                            "topK": 40
                        }
                    }
                )
                
                response.raise_for_status()
                data = response.json()
                
                # Parse Response
                if "candidates" in data and data["candidates"]:
                    candidate = data["candidates"][0]
                    if "content" in candidate and "parts" in candidate["content"]:
                        return candidate["content"]["parts"][0]["text"].strip()
                    elif "text" in candidate:
                        return candidate["text"].strip()
                
                return None
                
        except Exception as e:
            print(f"Summary generation failed: {e}")
            return None
    
    def _build_contextual_prompt(self, chunk: Chunk, 
                               document_context: str = None,
                               all_chunks: List[Chunk] = None) -> str:
        """
        Erstellt einen optimierten kontextuellen Prompt für Chunk-Summarization.
        
        Best Practice: Nutzt Gesamtdokument-Kontext für präzise Verortung.
        """
        
        language = chunk.meta.get("language", "en")
        domain = chunk.meta.get("domain", "")
        chunk_index = chunk.meta.get("chunk_index", 0)
        title = chunk.meta.get("title", "")
        
        # Erstelle Dokument-Kontext falls nicht vorhanden
        if not document_context and all_chunks:
            # Nutze ersten Chunk + Titel als Kontext
            first_chunk = all_chunks[0] if all_chunks else chunk
            document_context = f"{title}\n\n{first_chunk.text[:500]}..."
        
        # Nachbar-Chunks für besseren Kontext
        neighbor_context = ""
        if all_chunks and len(all_chunks) > 1:
            current_idx = next((i for i, c in enumerate(all_chunks) if c.id == chunk.id), 0)
            
            # Vorheriger Chunk
            if current_idx > 0:
                prev_chunk = all_chunks[current_idx - 1]
                neighbor_context += f"Vorheriger Abschnitt: {prev_chunk.text[:100]}...\n"
            
            # Nächster Chunk
            if current_idx < len(all_chunks) - 1:
                next_chunk = all_chunks[current_idx + 1]
                neighbor_context += f"Nächster Abschnitt: {next_chunk.text[:100]}...\n"
        
        if language == "de":
            prompt = f"""<document>
{document_context or f"Dokument von {domain}"}
</document>

<chunk>
{chunk.text}
</chunk>

{neighbor_context}

Erstelle eine prägnante, kontextuelle Einleitung (50-100 Tokens) für diesen Textabschnitt, die:
1. Den Chunk im Gesamtzusammenhang des Dokuments verortet
2. Das Hauptthema und relevante Entitäten nennt
3. Den Zweck/die Funktion des Abschnitts erklärt
4. Faktisch und deklarativ formuliert ist (keine Füllwörter)

Die Einleitung wird vor den Originaltext gesetzt, um die semantische Suche zu verbessern.

KONTEXTUELLE EINLEITUNG:"""
        else:
            prompt = f"""<document>
{document_context or f"Document from {domain}"}
</document>

<chunk>
{chunk.text}
</chunk>

{neighbor_context}

Create a concise, contextual introduction (50-100 tokens) for this text chunk that:
1. Places the chunk within the overall document context
2. Identifies the main topic and relevant entities
3. Explains the purpose/function of this section
4. Is factual and declarative (no filler words)

This introduction will be prepended to the original text to improve semantic search.

CONTEXTUAL INTRODUCTION:"""
        
        return prompt


async def add_summaries_to_chunks(chunks: List[Chunk], api_key: str, 
                                 document_context: str = None) -> List[Chunk]:
    """
    Convenience function für kontextuelle Chunk-Summarization.
    
    Best Practice: Kontextuelle Summaries verbessern Retrieval-Genauigkeit
    um 35-50% durch bessere semantische Verortung.
    
    Args:
        chunks: Liste von Chunks
        api_key: Gemini API Key
        document_context: Gesamtdokument-Kontext für bessere Summaries
        
    Returns:
        Chunks mit kontextuellen Summaries am Anfang des Texts
    """
    if not api_key:
        print("⚠️  No API key provided, skipping summarization")
        return chunks
    
    if not chunks:
        return chunks
    
    # Erstelle Dokument-Kontext aus erstem Chunk falls nicht vorhanden
    if not document_context and chunks:
        first_chunk = chunks[0]
        title = first_chunk.meta.get("title", "")
        url = first_chunk.meta.get("url", "")
        document_context = f"Dokument: {title}\nQuelle: {url}\n\n{first_chunk.text[:500]}..."
    
    summarizer = ChunkSummarizer(api_key)
    return await summarizer.generate_chunk_summaries(chunks, document_context=document_context)