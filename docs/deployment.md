# Deployment

## 1. Zugangsdaten rotieren

Vor dem ersten Deployment alle in [SECURITY.md](../SECURITY.md) genannten Alt-Schlüssel widerrufen. Neue Werte nie in Git speichern.

## 2. Cloudflare RAG-Worker

Im Verzeichnis `workers/rag-api` folgende Secrets setzen:

```bash
npx wrangler secret put INGEST_SECRET
npx wrangler secret put QUERY_SECRET
npm run deploy
```

Der Worker verwendet `DATABASE_REGISTRY` (KV) und die dynamische AI-Search-Namespace-Bindung. Embeddings, Hybrid Search und Reranking laufen vollständig in Cloudflare AI Search.

## 3. Modal Crawler

Modal Secret `cracha-crawler-secrets-v2` anlegen:

- `RAG_API_URL`
- `RAG_INGEST_SECRET` — identisch zu `INGEST_SECRET` des RAG-Workers
- `CRAWLER_API_SECRET`

Dann:

```bash
cd services/crawler
modal deploy modal_app.py
```

Die ausgegebene ASGI-URL als `MODAL_CRAWLER_URL` übernehmen.

## 4. Frontend-Worker

Für den Worker `cracha` setzen:

```bash
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
npx wrangler secret put MODAL_CRAWLER_URL
npx wrangler secret put CRAWLER_API_SECRET
npx wrangler secret put RAG_QUERY_SECRET
npm run deploy
```

Die beiden Supabase-Werte müssen zusätzlich beim OpenNext-Build verfügbar sein. Die Antwortgenerierung nutzt das Workers-AI-Binding `AI`; `GENERATION_MODEL` wird in `wrangler.jsonc` festgelegt.

## 5. GitHub Actions

Repository-Secrets:

- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `RAG_INGEST_SECRET`, `RAG_QUERY_SECRET`
- `CRAWLER_API_SECRET`, `MODAL_CRAWLER_URL`, `RAG_API_URL`
- `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET`

Pushes auf `main` deployen in der Reihenfolge RAG-Worker → Modal-Crawler → Frontend. Pull Requests führen nur Prüfungen aus.

## 6. Abnahme

1. `/health` beider Backend-Dienste liefert einen erfolgreichen Status.
2. Neue Wissensbasis mit einer kleinen Dokumentationsseite anlegen.
3. Crawl abwarten; Status muss `active` werden und `pages_count > 0` zeigen.
4. Eine faktische Frage stellen; Antwort und mindestens ein klickbarer Quellenlink prüfen.
5. Unbeantwortbare Frage stellen; das System darf keine unbelegte Behauptung erzeugen.
6. `evals/evaluate.py` mit einem echten Supabase-Access-Token ausführen.
