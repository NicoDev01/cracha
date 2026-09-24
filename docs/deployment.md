# Deployment & Release Runbook

## 1. Migrationsreihenfolge (Supabase PostgreSQL)

Vor dem Ausrollen neuer Dienstversionen müssen alle Datenbankmigrationen angewendet werden.
`supabase db push` wendet automatisch alle ausstehenden Migrationen im Ordner `supabase/migrations/` in chronologischer Reihenfolge (anhand der Zeitstempel) an:

```bash
# Vorschau der anstehenden Migrationen
supabase db push --dry-run

# Migrationen anwenden
supabase db push
```

Falls Migrationen manuell oder per `psql` eingespielt werden, muss exakt folgende Reihenfolge eingehalten werden:

```bash
# 1. Billing-Guards (Idempotenz, Kontensperren, atomare Guthaben-Transaktionen)
psql "$DATABASE_URL" -f supabase/migrations/20260920090000_billing_guards.sql

# 2. Signup-E-Mail-Guard (Verhinderung von Wegwerf-E-Mails bei Registrierung)
psql "$DATABASE_URL" -f supabase/migrations/20260920091000_signup_email_guard.sql

# 3. Wissensbasis-Quota-Guards (Atomare Slot-Allokation, Max. 25 Wissensbasen, Row-Locks, Sync-Tracking)
psql "$DATABASE_URL" -f supabase/migrations/20260920100000_database_quota_guards.sql
```

## 2. Preflight-Prüfung (Release-Gate)

Voraussetzung: Migrationen (Abschnitt 1) sind angewendet und der Auth-Hook (Abschnitt 3) ist aktiviert und manuell nachgewiesen. Erst dann wird `CONFIRM_AUTH_HOOK_BEFORE_USER_CREATED=true` gesetzt. Der Deploy-Workflow (`.github/workflows/deploy.yml`) führt diesen Preflight vor jedem Ausrollen selbst aus.

Führe vor jedem Deployment das Preflight-Skript gegen die Ziel-Supabase-Instanz aus:

```bash
NEXT_PUBLIC_SUPABASE_URL="<ziel-url>" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
CRACHA_SERVICE_TOKEN="<service-token>" \
MODAL_CRAWLER_URL="<crawler-url>" \
CONFIRM_AUTH_HOOK_BEFORE_USER_CREATED="true" \
npx tsx scripts/preflight-release.ts
```

Das Skript verifiziert:
- Erreichbarkeit der Supabase-Instanz
- Vorhandensein aller RPC-Funktionen (`credit_spend`, `credit_hold`, `credit_settle`, `credit_release`, `credit_state`, `bind_crawl_hold`, `database_allocate`, `database_deallocate`, `database_sync_batch`, `database_count`, `database_claim_delete`)
- Vorhandensein der Tabellen `credit_accounts`, `credit_entries`, `credit_holds`, `crawl_access`, `billing_payments`, `request_limits`, `user_databases`, `user_database_syncs`, `user_database_deletions`
- Crawler-Service Health und Abrechnungsprotokoll (`billing_protocol: 1`, `settlement_configured: true`)
- Bestätigung des manuellen Auth-Hook-Gates (`CONFIRM_AUTH_HOOK_BEFORE_USER_CREATED=true`)
- Bricht mit Exit-Code 1 ab, falls erforderliche Schema-Elemente fehlen, der Crawler nicht bereit ist, service_role keine Ausführungsrechte hat oder manuelle Gates unbestätigt sind.

## 3. Supabase Auth Hook: Before User Created (Manuelles Release-Gate)

> **Wichtig:** Das Anlegen der SQL-Funktion `public.before_user_created` reicht **nicht** aus, um den Hook zu aktivieren. Supabase aktiviert Auth-Hooks nicht automatisch per Migration.

### Aktivierungsschritte im Supabase Dashboard:
1. Öffne das Supabase-Projekt im Web-Dashboard.
2. Navigiere zu **Authentication** → **Hooks**.
3. Wähle den Hook-Typ **"Before User Created"** aus.
4. Konfiguriere als Ziel-Funktion (Postgres function) `public.before_user_created`.
5. Speichere die Konfiguration.
6. **Manueller Nachweis:** Führe einen Test-Registrierungsversuch mit einer Wegwerf-Domain (z. B. `test@10minutemail.com`) durch. Der Registrierungsversuch muss mit Status 400 und Meldung „Bitte verwende eine dauerhafte E-Mail-Adresse.“ abgewiesen werden.

## 4. Secret-Rotation und Betriebsnachweise

Alle im Audit genannten Schlüssel wurden dokumentiert. Da diese Arbeit in einer isolierten Entwicklungsumgebung stattfand, ist der Status produktiver Secrets transparent auszuweisen:

| Anbieter / Dienst | Zweck / Schlüssel | Status in Produktion | Erforderliche Maßnahme vor Livegang |
|---|---|---|---|
| **Stripe** | `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET` | Unbekannt / Nicht verifiziert | Im Stripe Dashboard neue Keys erzeugen, Webhook-Endpoint prüfen, alte Keys widerrufen. |
| **Supabase** | `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET` | Unbekannt / Nicht verifiziert | In Supabase Settings -> API rotieren, falls Altschlüssel je exponiert waren. |
| **Cloudflare** | `CLOUDFLARE_API_TOKEN`, `INGEST_SECRET`, `QUERY_SECRET` | Unbekannt / Nicht verifiziert | Cloudflare Dashboard: Tokens prüfen und erneuern; Secrets via `wrangler secret put` setzen. |
| **Modal** | `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET`, `CRAWLER_API_SECRET` | Unbekannt / Nicht verifiziert | Im Modal-Dashboard Secret `cracha-crawler-secrets-v2` prüfen und deployen. |
| **KI-Anbieter** | Gemini / Groq / OpenAI (Betreiber-Keys) | Unbekannt / Nicht verifiziert | Betreiber-Schlüssel prüfen; BYOK-Schlüssel der Nutzer verbleiben clientseitig. |

## 5. Deployment-Reihenfolge der Dienste

Nach erfolgreichem Preflight und aktivierten Auth-Hooks erfolgt das Deployment in dieser verbindlichen Reihenfolge:

### Schritt 1: Cloudflare RAG-Worker
Die Durable-Object-Migration `v1-knowledge-base-coordinator` steht in `workers/rag-api/wrangler.jsonc` und wird mit diesem regulären Worker-Deployment angewendet. Ein zusätzliches, vorgezogenes `wrangler deploy` ist nicht nötig.

```bash
cd workers/rag-api
npx wrangler secret put INGEST_SECRET
npx wrangler secret put QUERY_SECRET
npm run deploy
```

### Schritt 2: Modal Crawler
```bash
cd services/crawler
modal secret create cracha-crawler-secrets-v2 \
  RAG_API_URL="<rag-worker-url>" \
  RAG_INGEST_SECRET="<ingest-secret>" \
  CRAWLER_API_SECRET="<crawler-secret>" \
  CRAWLER_SETTLEMENT_URL="https://<frontend-url>/api/internal/crawl-settlement"
modal deploy modal_app.py
```

### Schritt 3: Frontend-Worker (OpenNext Cloudflare)
```bash
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put MODAL_CRAWLER_URL
npx wrangler secret put CRAWLER_API_SECRET
npx wrangler secret put RAG_QUERY_SECRET
npx wrangler secret put STRIPE_API_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put RESEND_API_KEY
npm run deploy
```

`RESEND_API_KEY` ist optional und wird nicht aus GitHub geschrieben, der Deploy lässt ihn also stehen. Der Worker startet stündlich (`triggers.crons` in `wrangler.jsonc`, Handler in `custom-worker.ts`) den Versand der einmaligen Erinnerungs-E-Mail an bestätigte Konten, die 24 bis 72 Stunden nach der Registrierung noch keine Website eingelesen haben. Ohne Schlüssel versendet er nichts und protokolliert `"configured":false`. Der Schlüssel braucht in Resend nur die Berechtigung „Sending access“ für die Domain `cracha-app.com`. Kontrolle:

```bash
npx wrangler tail cracha --format pretty --search activation_reminders
```

Den Einstiegs-Funnel (Registriert → bestätigt → Website eingelesen → Antwort → an 2+ Tagen aktiv → Kauf) liefert im Supabase-SQL-Editor, optional für einen Zeitraum der Registrierung:

```sql
select * from public.product_funnel();
select * from public.product_funnel('2026-09-01', '2026-10-01');
```

## 6. Endabnahme & Smoke-Test

1. **Health-Checks:** `/health` bzw. Basispfade beider Backend-Dienste liefern HTTP 200.
2. **Quota & Atomizität:** Im Dashboard 24 Wissensbasen anlegen; bei parallelem Anlegen der 25. und 26. darf nur genau ein Slot bewilligt werden; der zweite liefert HTTP 402 / Quota-Fehler.
3. **Crawl & Löschung:** Während eines aktiven Crawls den Lösch-Button betätigen: HTTP 409 Conflict muss das Löschen verhindern.
4. **SSRF-Schutz:** Crawl-Auftrag mit `http://127.0.0.1:8080` oder `http://169.254.169.254` einstellen: Muss sofort blockiert werden (`UnsafeUrlError`).
5. **BYOK-Isolation:** Key im Dialog eingeben; danach abmelden. Neuer Login mit anderem Konto: Der Key darf nicht vorhanden sein.
6. **Fragelimit:** Im Chat Frage mit >4.000 Zeichen absenden: Wird vor Abbuchung mit Fehler 400 abgewiesen.
