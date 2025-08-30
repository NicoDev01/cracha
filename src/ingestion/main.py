#!/usr/bin/env python3
"""
CraCha Ingestion Pipeline - CLI Interface mit Crawl4AI Integration

Command-Line Interface für die CraCha Ingestion Pipeline mit
Web Crawling, Document Processing, Cost Estimation und Progress Tracking.
"""

import argparse
import asyncio
import json
import sys
import time
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables from .env files
load_dotenv('../.env.local')  # Priorität: .env.local
load_dotenv('../.env')        # Fallback: .env

# Local imports
from cracha_ingest import (
    Chunk, BatchRequest, IngestionJob, EmbeddingCost, TenantConfig,
    SmartChunker, MultiProviderEmbedder, VectorizeManager
)
from cracha_ingest.database_registry import DatabaseRegistry, register_tenant_database
from crawl4ai_client import Crawl4AIClient, crawl_website_to_chunks
from performance_monitor import monitor


# Logging Setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)


class CraChaIngestionCLI:
    """
    Hauptklasse für die CraCha Ingestion CLI.
    """
    
    def __init__(self):
        self.embedder = MultiProviderEmbedder()
        self.chunker = SmartChunker()
        
        # Database Registry für Tenant-Tracking
        try:
            self.database_registry = DatabaseRegistry()
        except Exception as e:
            logger.warning(f"⚠️  Cloudflare KV Database Registry not available: {e}")
            logger.info("🔄 Using Mock Database Registry for development")
            from cracha_ingest.mock_database_registry import MockDatabaseRegistry
            self.database_registry = MockDatabaseRegistry()
        
        # Vectorize Manager nur wenn Keys verfügbar
        try:
            self.vectorize_manager = VectorizeManager()
            self.vectorize_available = True
        except ValueError as e:
            logger.warning(f"⚠️  Vectorize not available: {e}")
            self.vectorize_manager = None
            self.vectorize_available = False
        
    async def ingest_document(self, args) -> Dict[str, Any]:
        """
        Hauptfunktion für Dokument-Ingestion.
        
        Args:
            args: CLI-Argumente
            
        Returns:
            Ingestion-Ergebnisse
        """
        logger.info(f"🚀 Starting ingestion for tenant: {args.tenant_id}")
        
        # Erstelle Ingestion Job
        job = IngestionJob(
            tenant_id=args.tenant_id,
            source_url=args.url or args.input,
            source_type="markdown"  # Fixed: use valid source_type
        )
        
        try:
            # 1. Lade Dokument
            logger.info(f"📄 Loading document: {args.input}")
            content = await self._load_document(args.input)
            
            # 2. Chunking
            logger.info(f"🧩 Chunking document with max_tokens={args.max_tokens}, overlap={args.overlap}")
            self.chunker.max_tokens = args.max_tokens
            self.chunker.overlap = args.overlap
            
            chunks = self.chunker.chunk_markdown(content, args.tenant_id, args.url or args.input)
            job.total_chunks = len(chunks)
            job.total_tokens = sum(chunk.get_token_count() for chunk in chunks)
            
            logger.info(f"✅ Created {len(chunks)} chunks ({job.total_tokens} total tokens)")
            
            # 3. Kosten-Schätzung
            cost = EmbeddingCost.calculate(args.embedding_model, job.total_tokens)
            job.estimated_cost = cost.total_cost
            
            logger.info(f"💰 Estimated cost: ${cost.total_cost:.6f} ({args.embedding_model})")
            
            # 4. Dry-Run Check
            if args.dry_run:
                logger.info("🔍 Dry-run mode - stopping before embedding creation")
                return self._create_dry_run_result(job, chunks, cost)
            
            # 5. Kosten-Bestätigung
            if not args.force and cost.total_cost > 0.01:  # > 1 Cent
                if not self._confirm_cost(cost):
                    logger.info("❌ Ingestion cancelled by user")
                    return {"success": False, "message": "Cancelled by user"}
            
            # 6. Embeddings erstellen
            logger.info(f"🔮 Creating embeddings with {args.embedding_model}...")
            job.status = "processing"
            
            texts = [chunk.text for chunk in chunks]
            embeddings, actual_cost = await self.embedder.embed_with_cost_tracking(
                texts, args.embedding_model
            )
            
            # 7. Embeddings zu Chunks hinzufügen
            for chunk, embedding in zip(chunks, embeddings):
                chunk.embedding = embedding
                job.processed_chunks += 1
                
                # Progress Update
                if job.processed_chunks % 10 == 0:
                    progress = job.get_progress()
                    logger.info(f"📊 Progress: {progress:.1f}% ({job.processed_chunks}/{job.total_chunks})")
            
            logger.info(f"✅ Created {len(embeddings)} embeddings")
            
            # 8. Vectorize Upsert
            vectorize_result = None
            if not args.skip_vectorize:
                if not self.vectorize_available:
                    logger.warning("⚠️  Vectorize not available - skipping upsert (use --skip-vectorize to suppress this warning)")
                else:
                    logger.info("📤 Upserting to Vectorize...")
                    
                    batch_request = BatchRequest(
                        tenant_id=args.tenant_id,
                        chunks=chunks,
                        embedding_model=args.embedding_model
                    )
                    
                    vectorize_result = await self.vectorize_manager.process_batch_request(batch_request)
                    
                    if vectorize_result["success"]:
                        logger.info(f"✅ Successfully upserted {vectorize_result['chunks_processed']} chunks")
                        # Ensure tenant exists and update ingestion stats for frontend listing
                        await self._ensure_tenant_exists(args.tenant_id)
                        await self._update_ingestion_stats(
                            args.tenant_id,
                            document_count=len(set(chunk.meta.get("url", "") for chunk in chunks)),
                            vector_count=vectorize_result.get("upsert_result", {}).get("total_vectors")
                                if isinstance(vectorize_result, dict) else len(chunks),
                            last_crawl=int(time.time())
                        )
                    else:
                        logger.error(f"❌ Vectorize upsert failed: {vectorize_result}")
                        job.mark_failed("Vectorize upsert failed")
                        return self._create_error_result(job, "Vectorize upsert failed")
            
            # 9. Cleanup alte Versionen
            if args.cleanup and not args.skip_vectorize and self.vectorize_available:
                logger.info("🧹 Cleaning up old versions...")
                # TODO: Implement cleanup logic
                
            # 10. Job abschließen
            job.mark_completed()
            logger.info(f"🎉 Ingestion completed successfully in {time.time() - job.created_at:.2f}s")
            
            return self._create_success_result(job, chunks, actual_cost, vectorize_result)
            
        except Exception as e:
            logger.error(f"❌ Ingestion failed: {e}")
            job.mark_failed(str(e))
            return self._create_error_result(job, str(e))

    async def _ensure_tenant_exists(self, tenant_id: str):
        """Create a tenant record in the Worker DO if it doesn't exist."""
        import os
        import httpx
        base_url = os.getenv('CRACHA_WORKER_URL') or os.getenv('NEXT_PUBLIC_CRACHA_WORKER_URL')
        if not base_url:
            logger.warning("No CRACHA_WORKER_URL set; skipping tenant creation")
            return
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Try get first
                r = await client.get(f"{base_url}/tenant/{tenant_id}")
                if r.status_code == 200:
                    return
                # Create if missing
                payload = {"id": tenant_id, "name": tenant_id}
                cr = await client.post(f"{base_url}/tenant", json=payload)
                if cr.status_code not in (200, 201):
                    logger.warning(f"Failed to ensure tenant exists: {cr.status_code} {cr.text}")
        except Exception as e:
            logger.warning(f"Tenant ensure failed: {e}")

    async def _update_ingestion_stats(self, tenant_id: str, *, document_count: int, vector_count: int, last_crawl: int):
        """Update ingestion stats in the Worker DO for display in frontend."""
        import os
        import httpx
        base_url = os.getenv('CRACHA_WORKER_URL') or os.getenv('NEXT_PUBLIC_CRACHA_WORKER_URL')
        if not base_url:
            return
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                payload = {
                    "document_count": document_count,
                    "vector_count": vector_count,
                    "last_crawl": last_crawl,
                }
                await client.post(f"{base_url}/tenant/{tenant_id}/ingestion-stats", json=payload)
        except Exception as e:
            logger.warning(f"Update ingestion stats failed: {e}")
    
    async def _load_document(self, input_path: str) -> str:
        """
        Lädt Dokument aus verschiedenen Quellen.
        
        Args:
            input_path: Pfad zur Datei oder JSON-Dump
            
        Returns:
            Dokument-Inhalt als String
        """
        path = Path(input_path)
        
        if not path.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        content = path.read_text(encoding='utf-8')
        
        # JSON-Format (z.B. von Crawl4AI)
        if input_path.endswith('.json'):
            try:
                data = json.loads(content)
                if 'markdown' in data:
                    return data['markdown']
                elif 'content' in data:
                    return data['content']
                else:
                    raise ValueError("JSON must contain 'markdown' or 'content' field")
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON format: {e}")
        
        # Plain text/markdown
        return content
    
    def _detect_source_type(self, input_path: str) -> str:
        """Erkennt Quell-Typ basierend auf Dateiendung."""
        if input_path.endswith('.json'):
            return 'markdown'  # JSON enthält meist Markdown
        elif input_path.endswith('.md'):
            return 'markdown'
        elif input_path.endswith('.html'):
            return 'html'
        elif input_path.endswith('.pdf'):
            return 'pdf'
        else:
            return 'text'
    
    def _confirm_cost(self, cost: EmbeddingCost) -> bool:
        """
        Fragt Benutzer nach Kosten-Bestätigung.
        
        Args:
            cost: EmbeddingCost-Objekt
            
        Returns:
            True wenn bestätigt
        """
        print(f"\n💰 Cost Estimation:")
        print(f"   Provider: {cost.provider}")
        print(f"   Tokens: {cost.tokens:,}")
        print(f"   Cost: ${cost.total_cost:.6f}")
        print()
        
        response = input("Continue with ingestion? [y/N]: ").strip().lower()
        return response in ['y', 'yes']
    
    def _create_dry_run_result(self, job: IngestionJob, chunks: List[Chunk], 
                              cost: EmbeddingCost) -> Dict[str, Any]:
        """Erstellt Dry-Run Ergebnis."""
        return {
            "success": True,
            "dry_run": True,
            "job": job.model_dump(),
            "chunks_preview": [
                {
                    "id": chunk.id,
                    "text_preview": chunk.text[:100] + "..." if len(chunk.text) > 100 else chunk.text,
                    "token_count": chunk.get_token_count(),
                    "meta": chunk.meta
                }
                for chunk in chunks[:5]  # Erste 5 Chunks
            ],
            "cost_estimate": cost.model_dump(),
            "total_chunks": len(chunks)
        }
    
    def _create_success_result(self, job: IngestionJob, chunks: List[Chunk], 
                              cost: EmbeddingCost, vectorize_result: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Erstellt Success-Ergebnis."""
        return {
            "success": True,
            "job": job.model_dump(),
            "chunks_processed": len(chunks),
            "actual_cost": cost.model_dump(),
            "vectorize_result": vectorize_result,
            "duration": job.completed_at - job.created_at if job.completed_at else 0
        }
    
    def _create_error_result(self, job: IngestionJob, error: str) -> Dict[str, Any]:
        """Erstellt Error-Ergebnis."""
        return {
            "success": False,
            "job": job.model_dump(),
            "error": error
        }
    
    async def list_providers(self, args) -> Dict[str, Any]:
        """
        Listet verfügbare Embedding-Provider auf.
        """
        logger.info("📋 Available embedding providers:")
        
        providers = self.embedder.get_available_providers()
        
        if not providers:
            logger.warning("❌ No embedding providers available (check API keys)")
            return {"success": False, "providers": []}
        
        provider_info = []
        for provider in providers:
            info = self.embedder.get_provider_info(provider)
            provider_info.append(info)
            
            logger.info(f"  • {provider}: {info['dimensions']}D, ${info['cost_per_1k_tokens']:.6f}/1k tokens")
        
        cheapest = self.embedder.get_cheapest_provider()
        logger.info(f"💰 Cheapest provider: {cheapest}")
        
        return {
            "success": True,
            "providers": provider_info,
            "cheapest": cheapest
        }
    
    async def benchmark_providers(self, args) -> Dict[str, Any]:
        """
        Benchmarkt alle verfügbaren Provider.
        """
        logger.info("🏃 Benchmarking embedding providers...")
        
        # Test-Texte
        test_texts = [
            "Das ist ein Test-Text für das Embedding-Benchmarking.",
            "CraCha ist ein RAG-as-a-Service System.",
            "Cloudflare Workers bieten ultra-niedrige Latenz.",
            "Vector-Embeddings ermöglichen semantische Suche.",
            "Multi-Provider-Architektur optimiert Kosten und Performance."
        ]
        
        results = await self.embedder.benchmark_providers(test_texts)
        
        logger.info("📊 Benchmark Results:")
        for provider, result in results.items():
            if result["success"]:
                logger.info(f"  • {provider}: {result['duration']:.2f}s, "
                          f"{result['throughput']:.1f} texts/s, "
                          f"${result['estimated_cost']:.6f}")
            else:
                logger.error(f"  • {provider}: FAILED - {result['error']}")
        
        return {
            "success": True,
            "benchmark_results": results,
            "test_texts_count": len(test_texts)
        }
    
    async def list_databases(self, args) -> Dict[str, Any]:
        """
        Listet alle Datenbanken eines Users auf.
        """
        if not self.database_registry:
            logger.error("❌ Database Registry not available")
            return {"success": False, "error": "Database Registry not configured"}
        
        logger.info(f"📋 Listing databases for user: {args.user_id}")
        
        try:
            databases = await self.database_registry.list_user_databases(args.user_id)
            
            if not databases:
                logger.info("📭 No databases found for this user")
                return {
                    "success": True,
                    "user_id": args.user_id,
                    "databases": [],
                    "count": 0
                }
            
            logger.info(f"📊 Found {len(databases)} databases:")
            for db in databases:
                logger.info(f"  • {db['name']} ({db['id']})")
                logger.info(f"    📄 Documents: {db.get('document_count', 0)}")
                logger.info(f"    🕒 Created: {db.get('created_at', 'Unknown')}")
                if db.get('last_crawl'):
                    logger.info(f"    🔄 Last Crawl: {db['last_crawl']}")
                logger.info(f"    🌐 Source: {db.get('source_url', 'N/A')}")
                logger.info("")
            
            return {
                "success": True,
                "user_id": args.user_id,
                "databases": databases,
                "count": len(databases)
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to list databases: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_database_info(self, args) -> Dict[str, Any]:
        """
        Holt detaillierte Informationen zu einer Datenbank.
        """
        if not self.database_registry:
            logger.error("❌ Database Registry not available")
            return {"success": False, "error": "Database Registry not configured"}
        
        logger.info(f"🔍 Getting info for database: {args.tenant_id}")
        
        try:
            db_info = await self.database_registry.get_database(args.tenant_id)
            
            if not db_info:
                logger.error(f"❌ Database '{args.tenant_id}' not found")
                return {"success": False, "error": "Database not found"}
            
            logger.info(f"📊 Database Information:")
            logger.info(f"  • Name: {db_info['name']}")
            logger.info(f"  • ID: {db_info['id']}")
            logger.info(f"  • User ID: {db_info['user_id']}")
            logger.info(f"  • Description: {db_info.get('description', 'N/A')}")
            logger.info(f"  • Source URL: {db_info.get('source_url', 'N/A')}")
            logger.info(f"  • Document Count: {db_info.get('document_count', 0)}")
            logger.info(f"  • Created: {db_info.get('created_at', 'Unknown')}")
            logger.info(f"  • Last Updated: {db_info.get('last_updated', 'Unknown')}")
            logger.info(f"  • Last Crawl: {db_info.get('last_crawl', 'Never')}")
            logger.info(f"  • Status: {db_info.get('status', 'Unknown')}")
            
            return {
                "success": True,
                "database": db_info
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get database info: {e}")
            return {"success": False, "error": str(e)}
    
    async def delete_database(self, args) -> Dict[str, Any]:
        """
        Löscht eine Datenbank aus dem Registry und Vectorize.
        """
        if not self.database_registry:
            logger.error("❌ Database Registry not available")
            return {"success": False, "error": "Database Registry not configured"}
        
        # Confirmation check
        if not args.force:
            logger.warning(f"⚠️  This will permanently delete database '{args.tenant_id}'")
            logger.warning("⚠️  All vectors and metadata will be lost!")
            
            try:
                confirm = input("Type 'DELETE' to confirm: ").strip()
                if confirm != 'DELETE':
                    logger.info("❌ Deletion cancelled")
                    return {"success": False, "cancelled": True}
            except (EOFError, KeyboardInterrupt):
                logger.info("❌ Deletion cancelled")
                return {"success": False, "cancelled": True}
        
        logger.info(f"🗑️  Deleting database: {args.tenant_id}")
        
        try:
            # Get database info first
            db_info = await self.database_registry.get_database(args.tenant_id)
            if not db_info:
                logger.error(f"❌ Database '{args.tenant_id}' not found in registry")
                return {"success": False, "error": "Database not found"}
            
            # Delete from Vectorize (all vectors in namespace)
            if self.vectorize_manager:
                try:
                    logger.info("🗑️  Deleting vectors from Vectorize...")
                    vectorize_result = await self.vectorize_manager.cleanup_tenant_data(args.tenant_id)
                    logger.info(f"✅ Vectorize cleanup completed")
                except Exception as e:
                    logger.warning(f"⚠️  Vectorize cleanup failed: {e}")
            
            # Delete from registry
            registry_success = await self.database_registry.delete_database(args.tenant_id)
            
            if registry_success:
                logger.info(f"✅ Database '{args.tenant_id}' deleted successfully")
                return {
                    "success": True,
                    "tenant_id": args.tenant_id,
                    "deleted_database": db_info
                }
            else:
                logger.error(f"❌ Failed to delete database from registry")
                return {"success": False, "error": "Registry deletion failed"}
            
        except Exception as e:
            logger.error(f"❌ Failed to delete database: {e}")
            return {"success": False, "error": str(e)}
    
    async def register_database(self, args) -> Dict[str, Any]:
        """
        Registriert eine existierende Datenbank im Registry.
        """
        if not self.database_registry:
            logger.error("❌ Database Registry not available")
            return {"success": False, "error": "Database Registry not configured"}
        
        logger.info(f"📝 Registering database: {args.tenant_id} for user: {args.user_id}")
        
        try:
            db_info = await self.database_registry.register_database(
                tenant_id=args.tenant_id,
                user_id=args.user_id,
                name=args.name or args.tenant_id,
                description=args.description,
                source_url=args.source_url
            )
            
            logger.info(f"✅ Database registered successfully:")
            logger.info(f"  • Name: {db_info['name']}")
            logger.info(f"  • ID: {db_info['id']}")
            logger.info(f"  • User: {db_info['user_id']}")
            logger.info(f"  • Created: {db_info['created_at']}")
            
            return {
                "success": True,
                "database": db_info
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to register database: {e}")
            return {"success": False, "error": str(e)}
    
    async def crawl_and_ingest(self, args) -> Dict[str, Any]:
        """
        Crawlt Website und ingestiert in Vectorize.
        """
        logger.info(f"🚀 Starting crawl and ingest for tenant: {args.tenant_id}")
        logger.info(f"🌐 URL: {args.url}")
        logger.info(f"📊 Type: {args.type}")
        
        # Performance-Monitoring starten
        monitor.start_monitoring()
        
        try:
            # Prepare crawl parameters with URL filters
            crawl_kwargs = {
                "max_concurrent": args.max_concurrent,
                # URL-Filter Parameter (Exclude)
                "url_filter": args.url_filter,
                "exclude_domains": args.exclude_domains or [],
                "exclude_external_links": args.exclude_external,
                "exclude_social_media_links": args.exclude_social_media,
                # URL-Filter Parameter (Include) - Präziser!
                "include_patterns": args.include_patterns or [],
                "include_domains": args.include_domains or [],
            }
            
            if args.type == "batch" and args.urls_file:
                # Load URLs from file
                urls = []
                with open(args.urls_file, 'r') as f:
                    urls = [line.strip() for line in f if line.strip()]
                crawl_kwargs["urls"] = urls
                logger.info(f"📄 Loaded {len(urls)} URLs from {args.urls_file}")
            elif args.type == "recursive":
                crawl_kwargs.update({
                    "max_depth": args.max_depth,
                    "limit": args.limit
                })
            
            # Crawl website to chunks
            crawl_start = time.time()
            chunks = await crawl_website_to_chunks(
                args.url,
                args.tenant_id,
                args.type,
                args.embedding_model,
                **crawl_kwargs
            )
            crawl_duration = time.time() - crawl_start
            
            if not chunks:
                logger.error("❌ No chunks created from crawl")
                return {"success": False, "error": "No content crawled"}
            
            logger.info(f"✅ Created {len(chunks)} chunks from crawl")
            
            # Record crawl performance
            pages_crawled = len(set(chunk.meta.get("url", "") for chunk in chunks))
            monitor.record_crawl_complete(pages_crawled, crawl_duration)
            
            # Cost estimation
            total_tokens = int(sum(len(chunk.text.split()) * 1.3 for chunk in chunks))
            cost = EmbeddingCost.calculate(args.embedding_model, total_tokens)
            
            logger.info(f"💰 Estimated cost: ${cost.total_cost:.6f} ({cost.provider})")
            
            # Dry run check
            if args.dry_run:
                logger.info("🔍 Dry-run mode - stopping before embedding creation")
                return self._create_dry_run_result(
                    IngestionJob(
                        tenant_id=args.tenant_id,
                        source_url=args.url,
                        source_type="markdown",
                        embedding_model=args.embedding_model,
                        chunk_count=len(chunks),
                        total_tokens=int(total_tokens)
                    ),
                    chunks,
                    cost
                )
            
            # Cost confirmation
            if not args.force and not self._confirm_cost(cost):
                logger.info("❌ Ingestion cancelled by user")
                return {"success": False, "cancelled": True}
            
            # Create embeddings
            logger.info(f"🔮 Creating embeddings with {args.embedding_model}...")
            embedding_start = time.time()
            
            # Filter out chunks that are too short for embeddings
            valid_chunks = []
            texts = []
            for chunk in chunks:
                if len(chunk.text.strip()) >= 10:  # Minimum text length
                    valid_chunks.append(chunk)
                    texts.append(chunk.text)
                else:
                    logger.warning(f"Skipping chunk {chunk.id} - too short ({len(chunk.text)} chars)")
            
            if not valid_chunks:
                logger.error("❌ No valid chunks for embedding")
                return {"success": False, "error": "No valid chunks for embedding"}
            
            embeddings = await self.embedder.embed(texts, args.embedding_model)
            embedding_duration = time.time() - embedding_start
            
            # Add embeddings to valid chunks
            chunks_with_embeddings = []
            successful_embeddings = 0
            for chunk, embedding in zip(valid_chunks, embeddings):
                if embedding and len(embedding) > 0:  # Ensure embedding is valid
                    chunk.embedding = embedding
                    chunks_with_embeddings.append(chunk)
                    successful_embeddings += 1
                else:
                    logger.warning(f"Skipping chunk {chunk.id} - no embedding generated")
            
            chunks = chunks_with_embeddings  # Use only chunks with valid embeddings
            
            # Record embedding performance
            monitor.record_embedding_complete(len(valid_chunks), successful_embeddings, embedding_duration)
            
            # Optional: Generate summaries for Advanced RAG
            if args.generate_summaries:
                logger.info("🧠 Generating chunk summaries for Advanced RAG...")
                from cracha_ingest.summarizer import add_summaries_to_chunks
                import os
                
                api_key = os.getenv("VERTEX_KEY")
                if api_key:
                    # Erstelle Dokument-Kontext für bessere Summaries
                    if chunks:
                        first_chunk = chunks[0]
                        doc_context = f"Dokument: {first_chunk.meta.get('title', '')}\nQuelle: {first_chunk.meta.get('url', '')}"
                        chunks = await add_summaries_to_chunks(chunks, api_key, doc_context)
                    else:
                        chunks = await add_summaries_to_chunks(chunks, api_key)
                else:
                    logger.warning("⚠️  VERTEX_KEY not found, skipping summarization")
            
            logger.info(f"✅ Created {len(embeddings)} embeddings")
            
            # Upsert to Vectorize
            logger.info("📤 Upserting to Vectorize...")
            
            # Ultra-fast vectorize batching
            if len(chunks) > 1000:
                max_batch_size = 1000  # Larger batches for big datasets
                logger.info(f"🚀 Ultra-fast vectorize mode: {max_batch_size} chunks per batch")
            else:
                max_batch_size = 500
            total_upserted = 0
            
            # Parallel batch processing for ultra-fast upload
            if len(chunks) > 1000:
                # Process multiple batches in parallel
                import asyncio
                
                async def process_batch(batch_chunks, batch_num, total_batches):
                    logger.info(f"📤 Processing batch {batch_num}/{total_batches} ({len(batch_chunks)} chunks)")
                    
                    batch_request = BatchRequest(
                        tenant_id=args.tenant_id,
                        chunks=batch_chunks,
                        embedding_model=args.embedding_model
                    )
                    
                    batch_result = await self.vectorize_manager.process_batch_request(batch_request)
                    
                    if batch_result["success"]:
                        logger.info(f"✅ Batch {batch_num} completed: {batch_result['chunks_processed']} chunks")
                        return batch_result["chunks_processed"]
                    else:
                        logger.error(f"❌ Batch {batch_num} failed: {batch_result}")
                        return 0
                
                # Create batch tasks
                batch_tasks = []
                total_batches = (len(chunks) + max_batch_size - 1) // max_batch_size
                
                for i in range(0, len(chunks), max_batch_size):
                    batch_chunks = chunks[i:i + max_batch_size]
                    batch_num = (i // max_batch_size) + 1
                    
                    task = process_batch(batch_chunks, batch_num, total_batches)
                    batch_tasks.append(task)
                
                # Process batches with limited concurrency (avoid overwhelming Vectorize)
                max_concurrent_batches = 3
                results = []
                
                for i in range(0, len(batch_tasks), max_concurrent_batches):
                    concurrent_tasks = batch_tasks[i:i + max_concurrent_batches]
                    batch_results = await asyncio.gather(*concurrent_tasks, return_exceptions=True)
                    results.extend(batch_results)
                
                total_upserted = sum(r for r in results if isinstance(r, int))
                
            else:
                # Sequential processing for smaller datasets
                for i in range(0, len(chunks), max_batch_size):
                    batch_chunks = chunks[i:i + max_batch_size]
                    batch_num = (i // max_batch_size) + 1
                    total_batches = (len(chunks) + max_batch_size - 1) // max_batch_size
                    
                    logger.info(f"📤 Processing batch {batch_num}/{total_batches} ({len(batch_chunks)} chunks)")
                    
                    # Create batch request
                    batch_request = BatchRequest(
                        tenant_id=args.tenant_id,
                        chunks=batch_chunks,
                        embedding_model=args.embedding_model
                    )
                    
                    batch_result = await self.vectorize_manager.process_batch_request(batch_request)
                    
                    if not batch_result["success"]:
                        logger.error(f"❌ Batch {batch_num} failed: {batch_result}")
                        return {"success": False, "error": f"Batch {batch_num} failed", "details": batch_result}
                    
                    total_upserted += batch_result["chunks_processed"]
                    logger.info(f"✅ Batch {batch_num} completed: {batch_result['chunks_processed']} chunks")
            
            upsert_result = {
                "success": True,
                "chunks_processed": total_upserted,
                "batches_processed": total_batches
            }
            
            if upsert_result["success"]:
                logger.info(f"✅ Successfully upserted {upsert_result['chunks_processed']} chunks")
                logger.info(f"🎉 Crawl and ingest completed successfully!")
                
                # Finalize performance monitoring
                monitor.record_cost(cost.total_cost)
                monitor.finalize_monitoring()
                
                # Print performance summary
                monitor.metrics.print_summary()
                grade = monitor.get_performance_grade()
                logger.info(f"🏆 Performance Grade: {grade}")
                
                # Register database in registry for frontend listing
                if self.database_registry:
                    try:
                        # Extract user_id from tenant_id or use default
                        user_id = getattr(args, 'user_id', 'default_user')
                        
                        # Debug: Print registration attempt
                        logger.info(f"🔍 Registering database in registry: tenant_id={args.tenant_id}, user_id={user_id}")
                        
                        # Register or update database
                        await self.database_registry.register_database(
                            tenant_id=args.tenant_id,
                            user_id=user_id,
                            name=args.tenant_id,  # Use tenant_id as display name
                            description=f"Crawled from {args.url}",
                            source_url=args.url
                        )
                        
                        # Update document count
                        await self.database_registry.increment_document_count(
                            args.tenant_id, 
                            pages_crawled
                        )
                        
                        logger.info(f"✅ Database {args.tenant_id} registered in registry")
                        
                    except Exception as e:
                        logger.warning(f"⚠️  Failed to register database in registry: {e}")
                
                # Legacy: Ensure tenant exists and update ingestion stats for frontend listing
                try:
                    await self._ensure_tenant_exists(args.tenant_id)
                    await self._update_ingestion_stats(
                        args.tenant_id,
                        document_count=pages_crawled,
                        vector_count=upsert_result.get("chunks_processed", 0),
                        last_crawl=int(time.time())
                    )
                except Exception as e:
                    logger.warning(f"⚠️  Failed to sync tenant stats to Worker: {e}")

            else:
                logger.error(f"❌ Vectorize upsert failed: {upsert_result}")
                return {"success": False, "error": "Vectorize upsert failed", "details": upsert_result}
            
            return {
                "success": True,
                "tenant_id": args.tenant_id,
                "source_url": args.url,
                "crawl_type": args.type,
                "chunks_created": len(chunks),
                "chunks_upserted": upsert_result["chunks_processed"],
                "embedding_model": args.embedding_model,
                "total_tokens": int(total_tokens),
                "cost": cost.total_cost,
                "upsert_result": upsert_result
            }
            
        except Exception as error:
            logger.error(f"❌ Crawl and ingest failed: {error}")
            return {"success": False, "error": str(error)}


def create_parser() -> argparse.ArgumentParser:
    """
    Erstellt CLI-Argument-Parser.
    """
    parser = argparse.ArgumentParser(
        description="CraCha Ingestion Pipeline CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic ingestion
  python main.py ingest --input doc.md --tenant-id my-tenant --url https://example.com

  # With custom settings
  python main.py ingest --input doc.json --tenant-id my-tenant --embedding-model openai-small --max-tokens 500

  # Dry run (no embeddings created)
  python main.py ingest --input doc.md --tenant-id my-tenant --dry-run

  # List available providers
  python main.py providers

  # Benchmark providers
  python main.py benchmark
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Ingest Command (File-based)
    ingest_parser = subparsers.add_parser('ingest', help='Ingest document into vector database')
    ingest_parser.add_argument('--input', '-i', required=True, help='Input file (markdown, JSON, etc.)')
    ingest_parser.add_argument('--tenant-id', '-t', required=True, help='Tenant identifier')
    ingest_parser.add_argument('--url', '-u', help='Source URL (if different from input)')
    ingest_parser.add_argument('--embedding-model', '-m', default='gemini-768',
                              choices=['gemini-768', 'gemini-1536', 'gemini-3072', 'openai-small', 'openai-large'],
                              help='Embedding model to use')
    ingest_parser.add_argument('--max-tokens', type=int, default=800, help='Maximum tokens per chunk (Best Practice: 500-1000)')
    ingest_parser.add_argument('--overlap', type=int, default=120, help='Overlap between chunks (Best Practice: 10-20% of max-tokens)')
    ingest_parser.add_argument('--dry-run', action='store_true', help='Show preview without creating embeddings')
    ingest_parser.add_argument('--force', action='store_true', help='Skip cost confirmation')
    ingest_parser.add_argument('--skip-vectorize', action='store_true', help='Skip Vectorize upsert (embeddings only)')
    ingest_parser.add_argument('--cleanup', action='store_true', help='Clean up old versions after upsert')
    
    # Crawl Command (Web-based)
    crawl_parser = subparsers.add_parser('crawl', help='Crawl website and ingest into vector database')
    crawl_parser.add_argument('--url', '-u', required=True, help='URL to crawl')
    crawl_parser.add_argument('--tenant-id', '-t', required=True, help='Tenant identifier')
    crawl_parser.add_argument('--type', choices=['single', 'batch', 'sitemap', 'recursive'], 
                             default='single', help='Crawl type')
    crawl_parser.add_argument('--embedding-model', '-m', default='gemini-768',
                             choices=['gemini-768', 'gemini-1536', 'gemini-3072', 'openai-small', 'openai-large'],
                             help='Embedding model to use')
    crawl_parser.add_argument('--max-depth', type=int, default=3, help='Max depth for recursive crawl')
    crawl_parser.add_argument('--max-concurrent', type=int, default=5, help='Max concurrent crawls')
    crawl_parser.add_argument('--limit', type=int, default=100, help='Max pages to crawl')
    crawl_parser.add_argument('--urls-file', help='File with URLs for batch crawl (one per line)')
    crawl_parser.add_argument('--dry-run', action='store_true', help='Show preview without creating embeddings')
    crawl_parser.add_argument('--force', action='store_true', help='Skip cost confirmation')
    crawl_parser.add_argument('--cleanup', action='store_true', help='Clean up old versions after upsert')
    crawl_parser.add_argument('--generate-summaries', action='store_true', help='Generate LLM summaries for chunks (Advanced RAG)')
    crawl_parser.add_argument('--ultra-fast', action='store_true', help='Ultra-fast mode: Higher concurrency and larger batches')
    crawl_parser.add_argument('--chunk-size', type=int, default=800, help='Optimal chunk size in tokens (500-1000 recommended)')
    crawl_parser.add_argument('--chunk-overlap', type=int, default=120, help='Chunk overlap in tokens (10-20% of chunk-size)')
    crawl_parser.add_argument('--url-filter', type=str, help='Only crawl URLs containing this pattern (e.g., "tutorial")')
    crawl_parser.add_argument('--exclude-domains', type=str, nargs='*', help='Domains to exclude from crawling')
    crawl_parser.add_argument('--exclude-external', action='store_true', help='Only crawl internal links (same domain)')
    crawl_parser.add_argument('--exclude-social-media', action='store_true', help='Exclude social media links')
    crawl_parser.add_argument('--include-patterns', type=str, nargs='*', help='URL patterns to include (e.g., "*tutorial*" "*docs*")')
    crawl_parser.add_argument('--include-domains', type=str, nargs='*', help='Domains to include (e.g., "docs.python.org")')
    crawl_parser.add_argument('--user-id', type=str, default='default_user', help='User ID (owner of the database)')
    
    # Ingest Parser - Summary Option
    ingest_parser.add_argument('--generate-summaries', action='store_true', help='Generate LLM summaries for chunks (Advanced RAG)')
    ingest_parser.add_argument('--user-id', type=str, default='default_user', help='User ID (owner of the database)')
    
    # Providers Command
    subparsers.add_parser('providers', help='List available embedding providers')
    
    # Benchmark Command
    subparsers.add_parser('benchmark', help='Benchmark all available providers')
    
    # Database Management Commands
    databases_parser = subparsers.add_parser('databases', help='List all databases for a user')
    databases_parser.add_argument('--user-id', '-u', required=True, help='User ID to list databases for')
    
    db_info_parser = subparsers.add_parser('database-info', help='Get detailed database information')
    db_info_parser.add_argument('--tenant-id', '-t', required=True, help='Tenant ID (database name)')
    
    db_delete_parser = subparsers.add_parser('database-delete', help='Delete a database')
    db_delete_parser.add_argument('--tenant-id', '-t', required=True, help='Tenant ID (database name)')
    db_delete_parser.add_argument('--force', action='store_true', help='Skip confirmation')
    
    # Register existing database
    db_register_parser = subparsers.add_parser('database-register', help='Register an existing database')
    db_register_parser.add_argument('--tenant-id', '-t', required=True, help='Tenant ID (database name)')
    db_register_parser.add_argument('--user-id', '-u', required=True, help='User ID (owner)')
    db_register_parser.add_argument('--name', '-n', help='Display name for database')
    db_register_parser.add_argument('--description', '-d', help='Description')
    db_register_parser.add_argument('--source-url', '-s', help='Source URL')
    
    return parser


async def main():
    """
    Hauptfunktion der CLI.
    """
    parser = create_parser()
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    cli = CraChaIngestionCLI()
    
    try:
        if args.command == 'ingest':
            result = await cli.ingest_document(args)
        elif args.command == 'crawl':
            result = await cli.crawl_and_ingest(args)
        elif args.command == 'providers':
            result = await cli.list_providers(args)
        elif args.command == 'benchmark':
            result = await cli.benchmark_providers(args)
        elif args.command == 'databases':
            result = await cli.list_databases(args)
        elif args.command == 'database-info':
            result = await cli.get_database_info(args)
        elif args.command == 'database-delete':
            result = await cli.delete_database(args)
        elif args.command == 'database-register':
            result = await cli.register_database(args)
        else:
            parser.print_help()
            return
        
        # Output result as JSON for programmatic use
        if not result["success"]:
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("❌ Interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())