# CraCha Crawler

Modal-Service für öffentlich erreichbare Websites. Er crawlt mit Crawl4AI, extrahiert bereinigtes Markdown und synchronisiert vollständige Seiten mit dem RAG-Worker.

## Lokal prüfen

```bash
python -m pip install -e ".[dev]"
ruff check .
pytest
```

## Modal

1. Secret `cracha-crawler-secrets` mit `RAG_API_URL`, `RAG_INGEST_SECRET` und `CRAWLER_API_SECRET` anlegen.
2. `modal serve modal_app.py` für Entwicklung.
3. `modal deploy modal_app.py` für Produktion.

Der ausgegebene ASGI-Endpunkt wird im Frontend als `MODAL_CRAWLER_URL` hinterlegt.
