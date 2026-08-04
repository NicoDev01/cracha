# Sicherheit

## Zugangsdaten

Frühere Repository-Dateien enthielten produktive Zugangsdaten. Das Entfernen aus dem aktuellen Stand macht bestehende Git-Historie nicht geheim. Die aktiven CraCha-Service-Tokens wurden am 4. August 2026 neu erstellt; alte Runtime-Secrets wurden aus Cloudflare und Modal entfernt. Externe Anbieter-Schlüssel, die noch außerhalb von CraCha existieren, müssen im jeweiligen Anbieter-Dashboard widerrufen werden:

- Cloudflare API Token und Global API Key
- Supabase Service-Role- und JWT-Schlüssel, soweit exponiert
- Google/Gemini- und OpenAI-Schlüssel
- Crawl4AI-/Modal-Service-Schlüssel

Danach gehören Geheimnisse ausschließlich in Cloudflare Secrets, Modal Secrets oder GitHub Actions Secrets. Sie dürfen weder in `wrangler.jsonc` noch in Shell-Skripten oder Frontend-Bundles stehen.

## Laufzeitgrenzen

- Browserzugriffe auf den RAG-Worker benötigen eine gültige Supabase-Sitzung.
- Wissensbasen werden serverseitig ihrem Eigentümer zugeordnet.
- Crawler und Ingestion verwenden getrennte, zeitnah rotierbare Service-Tokens.
- Der Crawler lehnt lokale, private und reservierte Zieladressen ab und respektiert standardmäßig `robots.txt`.
