# CraCha

CraCha crawlt öffentliche Websites, überführt bereinigtes Markdown in eine mandantengetrennte Wissensbasis und beantwortet Fragen mit belegten Originalquellen.

## Architektur

- `src/`: Next.js-/OpenNext-Frontend auf Cloudflare Workers
- `workers/rag-api/`: authentifizierte Retrieval-API mit Cloudflare AI Search
- `services/crawler/`: rekursiver Crawl4AI-Service auf Modal
- `evals/`: reproduzierbare Retrieval-Smoke-Tests

Der Crawler speichert bereinigte Seiten mit Quellenmetadaten. AI Search übernimmt Chunking, BGE-M3-Embeddings, Keyword-Index, Reciprocal Rank Fusion und BGE-Reranking. Eine Wissensbasis entspricht einer AI-Search-Instanz. Die belegte Antwort erzeugt Workers AI mit Llama 3.3 70B Fast.

## Lokal prüfen

```bash
npm ci
npm run type-check
npm --prefix workers/rag-api ci
npm run rag:typecheck
npm run rag:test

python -m pip install -e "services/crawler[dev]"
python -m pytest services/crawler/tests
python -m ruff check services/crawler evals
```

Lokale Variablen stehen in `.env.example`, `workers/rag-api/.dev.vars.example` und `services/crawler/.env.example`.

## Deployment

Die drei Komponenten werden aus diesem Repository gebaut und per GitHub Actions veröffentlicht. Voraussetzungen, Secret-Namen und Reihenfolge stehen in [docs/deployment.md](docs/deployment.md).

Produktiv erreichbar: [cracha.aimpact-agency.workers.dev](https://cracha.aimpact-agency.workers.dev)

## Dokumentation

- [Systemarchitektur](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Sicherheit](SECURITY.md)
- [Cloudflare AI Search: Hybrid Search](https://developers.cloudflare.com/ai-search/configuration/indexing/hybrid-search/)
- [Cloudflare AI Search: Reranking](https://developers.cloudflare.com/ai-search/configuration/retrieval/reranking/)
- [Crawl4AI: Deep Crawling](https://docs.crawl4ai.com/core/deep-crawling/)
- [Modal: Job Queues](https://modal.com/docs/guide/job-queue)
