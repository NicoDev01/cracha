# CraCha Ingestion Pipeline

Schlanke und effiziente Ingestion Pipeline für das CraCha RAG-System mit Website-Crawling, intelligenter Chunking und Multi-Provider Embeddings.

## 🏗️ Architektur

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Modal.com     │    │    Gemini AI     │    │   Cloudflare    │
│   Crawl4AI      │───▶│   Embeddings     │───▶│   Vectorize     │
│   Service       │    │ (768/1536/3072D) │    │   Storage       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📁 Projekt-Struktur

```
ingestion/
├── cracha_ingest/          # Core Ingestion Module
│   ├── __init__.py         # Package Initialization
│   ├── models.py           # Pydantic Data Models
│   ├── chunker.py          # Smart Text Chunking
│   ├── embedder.py         # Multi-Provider Embeddings
│   ├── gemini_batch.py     # Gemini Batch Processing
│   └── vectorize_client.py # Cloudflare Vectorize Client
├── crawl4ai_client.py      # High-level Crawling Interface
├── crawler_client.py       # Modal.com Crawl4AI Client
├── main.py                 # CLI Interface
├── pyproject.toml          # Dependencies & Config
└── .env                    # Environment Variables
```

## 🚀 Features

- **Website Crawling**: Modal.com Crawl4AI Service für zuverlässiges Crawling
- **Smart Chunking**: Markdown-Header-respektierendes Chunking mit Kontext-Erhaltung
- **Multi-Provider Embeddings**: Gemini (768/1536/3072D), OpenAI mit automatischer Kostenoptimierung
- **Batch Processing**: Gemini Batch Mode für 50% Kostenreduktion bei großen Mengen
- **Vector Storage**: Cloudflare Vectorize mit Namespace-basierter Multi-Tenancy
- **Cost Tracking**: Vollständige Kosten- und Performance-Metriken

## 🛠️ Setup

### 1. Environment Variables

Konfiguriere `.env`:

```bash
# AI Provider Keys
VERTEX_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_key

# Cloudflare
VECTORIZE_API_TOKEN=your_vectorize_token
VECTORIZE_ACCOUNT_ID=your_account_id
CLOUDFLARE_ACCOUNT_ID=your_account_id

# Crawl4AI Service (Modal.com)
CRAWL4AI_BASE_URL=https://your-modal-service
CRAWL4AI_API_KEY=your_modal_api_key
```

### 2. Installation

```bash
# Dependencies installieren
pip install -e .

# Oder mit Poetry
poetry install
```

## 📖 Usage

### CLI Interface

#### 🌐 Website Crawling & Ingestion

```bash
# Einzelne Website crawlen und ingestieren
python main.py crawl --url https://example.com --tenant-id my-tenant

# Mit spezifischem Embedding-Model
python main.py crawl --url https://example.com --tenant-id my-tenant --embedding-model gemini-1536

# Rekursives Crawling (mehrere Seiten)
python main.py crawl --url https://example.com --tenant-id my-tenant --type recursive --max-depth 3 --limit 50

# Sitemap-basiertes Crawling
python main.py crawl --url https://example.com/sitemap.xml --tenant-id my-tenant --type sitemap

# Batch-Crawling (URLs aus Datei)
python main.py crawl --url https://example.com --tenant-id my-tenant --type batch --urls-file urls.txt

# Dry-Run (Kosten-Schätzung ohne Ausführung)
python main.py crawl --url https://example.com --tenant-id my-tenant --dry-run

# Mit Force (keine Kosten-Bestätigung)
python main.py crawl --url https://example.com --tenant-id my-tenant --force
```

#### 📄 Datei-basierte Ingestion

```bash
# Markdown-Datei ingestieren
python main.py ingest --input document.md --tenant-id my-tenant --url https://source.com

# JSON-Datei (z.B. von Crawl4AI)
python main.py ingest --input crawl_result.json --tenant-id my-tenant

# Mit Custom-Chunking
python main.py ingest --input doc.md --tenant-id my-tenant --max-tokens 500 --overlap 100

# Dry-Run für Kosten-Schätzung
python main.py ingest --input doc.md --tenant-id my-tenant --dry-run
```

#### 🔧 Utility Commands

```bash
# Verfügbare Embedding-Provider anzeigen
python main.py providers

# Provider-Benchmark durchführen
python main.py benchmark
```

#### 📊 CLI Parameter

**Crawl Parameter:**
- `--tenant-id`: Eindeutige Tenant-ID (erforderlich)
- `--url`: Website-URL zum Crawlen (erforderlich)
- `--type`: `single`, `batch`, `sitemap`, `recursive` (default: single)
- `--embedding-model`: `gemini-768`, `gemini-1536`, `gemini-3072`, `openai-small`, `openai-large`
- `--max-depth`: Maximale Crawl-Tiefe für recursive (default: 3)
- `--max-concurrent`: Maximale parallele Crawls (default: 5)
- `--limit`: Maximale Anzahl Seiten (default: 100)
- `--urls-file`: Datei mit URLs für batch crawl (eine pro Zeile)
- `--dry-run`: Nur Kosten-Schätzung, keine Ausführung
- `--force`: Keine Kosten-Bestätigung

**Ingest Parameter:**
- `--input`: Input-Datei (markdown, JSON, etc.) (erforderlich)
- `--tenant-id`: Tenant-Identifier (erforderlich)
- `--url`: Quell-URL (falls anders als input)
- `--embedding-model`: Embedding-Model (default: gemini-768)
- `--max-tokens`: Maximale Tokens pro Chunk (default: 300)
- `--overlap`: Überlappung zwischen Chunks (default: 50)
- `--dry-run`: Preview ohne Embedding-Erstellung
- `--force`: Kosten-Bestätigung überspringen
- `--skip-vectorize`: Nur Embeddings, kein Vectorize Upload
- `--cleanup`: Alte Versionen nach Upload löschen

### Programmatic Usage

```python
from cracha_ingest import MultiProviderEmbedder, VectorizeClient
from crawl4ai_client import crawl_website_to_chunks

# Website crawlen
chunks = await crawl_website_to_chunks(
    url="https://example.com",
    tenant_id="my-tenant",
    embedding_model="gemini-768"
)

# Embeddings erstellen
embedder = MultiProviderEmbedder()
embeddings = await embedder.embed(
    texts=[chunk.content for chunk in chunks],
    provider="gemini-768"
)

# In Vectorize speichern
client = VectorizeClient()
await client.upsert_chunks(chunks, namespace="my-tenant")
```

## 🔧 Konfiguration

### Embedding Provider

- **gemini-768**: Schnell, kostengünstig (empfohlen für die meisten Anwendungen)
- **gemini-1536**: Ausgewogen zwischen Qualität und Kosten
- **gemini-3072**: Höchste Qualität für anspruchsvolle Anwendungen
- **openai-small**: OpenAI text-embedding-3-small (1536D)
- **openai-large**: OpenAI text-embedding-3-large (3072D)

### Chunking-Parameter (Best Practices)

```python
# Optimiert für gemini-embedding-001
MAX_TOKENS = 800       # Tokens (Best Practice: 500-1000)
OVERLAP = 120          # Token-Überlappung (15% von MAX_TOKENS)
```

**Chunking Best Practices:**
- **500-1000 Tokens** pro Chunk (nicht Zeichen!)
- **10-20% Overlap** für Kontext-Erhaltung
- **Ein Gedanke pro Chunk** - logische Sinnabschnitte
- **Chunk-Grenzen** an Absatz- oder Satzende

## 📊 Performance

- **Crawling**: ~2-5 Sekunden pro Seite
- **Chunking**: ~100ms pro Dokument
- **Embeddings**: 
  - Gemini: 15-20 texts/sec
  - OpenAI: 10-15 texts/sec
- **Vectorize Upload**: ~50 chunks/sec

## 💰 Kosten

- **Gemini Embeddings**: $0.15 per 1M tokens
- **OpenAI Embeddings**: $0.02 per 1M tokens (small), $0.13 per 1M tokens (large)
- **Cloudflare Vectorize**: $0.40 per 1M queries, $5.00 per 1M stored dimensions

## 🧪 Testing

```bash
# Unit Tests
pytest tests/

# Integration Tests
python -m pytest tests/integration/

# Performance Tests
python -m pytest tests/performance/
```

## 📝 Logs

Alle Operationen werden strukturiert geloggt:

```json
{
  "timestamp": "2025-01-08T10:30:00Z",
  "level": "INFO",
  "message": "Chunks processed successfully",
  "tenant_id": "my-tenant",
  "chunks_count": 15,
  "processing_time": 1.38,
  "estimated_cost": 0.000001
}
```

## 🔍 Query Commands (Cloudflare Worker)

Nach der Ingestion können Queries über die Cloudflare Worker API gestellt werden:

### HTTP API Queries

```bash
# Basic RAG Query
curl -X POST https://your-worker.your-subdomain.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Was ist CraCha?",
    "tenant_id": "cracha-768",
    "max_results": 5
  }'

# Query mit Sprach-Spezifikation
curl -X POST https://your-worker.your-subdomain.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is machine learning?",
    "tenant_id": "my-tenant",
    "language": "en",
    "max_results": 10
  }'

# HyDE-aktivierte Query mit Re-Ranking
curl -X POST https://your-worker.your-subdomain.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Erkläre mir Embeddings",
    "tenant_id": "my-tenant",
    "use_hyde": true,
    "rerank": true
  }'
```

### Query Parameter

- `query`: Suchfrage (erforderlich)
- `tenant_id`: Tenant-ID (erforderlich)
- `max_results`: Anzahl Ergebnisse (default: 5)
- `language`: Sprache (`de`, `en`)
- `use_hyde`: HyDE aktivieren (default: true)
- `rerank`: LLM Re-Ranking (default: true)

## 🔗 Integration

Diese Pipeline integriert sich nahtlos mit:
- **Cloudflare Workers**: RAG Query Processing
- **Modal.com**: Crawl4AI Service
- **Vectorize**: Vector Storage
- **Analytics**: Usage & Performance Tracking

## 📚 API Reference

Detaillierte API-Dokumentation findest du in den Docstrings der jeweiligen Module:

- `cracha_ingest.models`: Datenmodelle
- `cracha_ingest.embedder`: Embedding-Provider
- `cracha_ingest.chunker`: Text-Chunking
- `cracha_ingest.vectorize_client`: Vectorize-Integration