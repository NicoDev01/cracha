# Plan: CraCha auf Englisch

Stand: 18.10.2026. Ziel: cracha-app.com vollständig zweisprachig (DE/EN), mit automatischer Sprachwahl, Umschalter im Header und einer englischen Version, die verkauft und nicht nur übersetzt.

---

## 1. Kurzfassung

- **Machbar, aber kein Wochenendprojekt.** In `src/` stecken in rund 93 Dateien deutsche Texte, dazu Fehlermeldungen im RAG-Worker, zwei Auth-Mails, eine Erinnerungsmail, Rechtstexte, Blog, Video und OG-Bild.
- **Deutsch bleibt, wo es ist** (`/`, `/preise` …). Englisch kommt unter `/en/…` mit englischen Pfaden (`/en/pricing`). Damit bleiben alle heutigen Google-Rankings und Links unverändert.
- **Sprachwahl nach Browsersprache, nicht nach Standort.** Das Land dient nur als Ersatz, wenn der Browser keine Sprache meldet. Begründung in Abschnitt 3.
- **Vor dem Verkauf ins Ausland stehen Steuer und Recht.** Englisch anzeigen ist einfach. Englischsprachigen Kunden aus anderen Ländern Credits verkaufen hat Umsatzsteuer- und Verbraucherrechtsfolgen (Abschnitt 8). Das gehört vor den Livegang, nicht danach.

---

## 2. Technischer Ansatz

| Baustein | Entscheidung | Warum |
|---|---|---|
| Bibliothek | **next-intl 4.x** (aktuell 4.14.9, unterstützt Next 16 laut `peerDependencies`, geprüft via npm am 18.10.2026) | Bringt Sprach-Routing, Erkennung, übersetzte Pfade, Plural- und Zahlenformate und Typprüfung der Schlüssel mit. Der Weg aus der Next-Doku (`node_modules/next/dist/docs/01-app/02-guides/internationalization.md`) wäre Eigenbau für genau diese Teile. |
| Texte | `messages/de.json`, `messages/en.json`, je Bereich gruppiert (`landing`, `pricing`, `dashboard`, `errors` …) | Eine Stelle pro Sprache, prüfbar auf Vollständigkeit. |
| Marketing-URLs | `localePrefix: "as-needed"`: Deutsch ohne Präfix, Englisch unter `/en`, englische Pfadnamen | Bestehende URLs bleiben, englische URLs sind SEO-tauglich. |
| Dashboard und Login | **keine** Sprach-URL, Sprache aus Cookie bzw. Nutzerprofil | Hinter dem Login gibt es kein SEO. Ein Präfix würde nur Links und Redirects verkomplizieren. |
| `<html lang>` | pro Sprache setzen (heute fest `lang="de"` in `src/app/layout.tsx:50`) | Screenreader, Übersetzungs-Popups des Browsers, SEO. |
| Proxy | Erkennung in die bestehende `src/middleware.ts` einbauen (Next 16 nennt das „Proxy“) | Kein zweiter Einstiegspunkt. |

### Englische Pfade

| Deutsch | Englisch |
|---|---|
| `/` | `/en` |
| `/preise` | `/en/pricing` |
| `/beispiele` | `/en/examples` |
| `/website-mit-ki-durchsuchen` | `/en/search-a-website-with-ai` |
| `/dokumentation-durchsuchen` | `/en/search-documentation` |
| `/kundenwebsite-durchsuchen` | `/en/search-client-websites` |
| `/blog`, `/blog/[slug]` | `/en/blog`, `/en/blog/[slug]` |
| `/impressum`, `/datenschutz`, `/nutzungsbedingungen`, `/widerrufsbelehrung` | `/en/legal-notice`, `/en/privacy`, `/en/terms`, `/en/withdrawal` |

Die genauen englischen Slugs legen wir nach der Keyword-Prüfung fest (Abschnitt 5).

---

## 3. Wie die Sprache gewählt wird

**Reihenfolge, die erste passende Regel gewinnt:**

1. **Die URL.** Wer auf `/en/…` landet, bekommt Englisch, wer auf eine deutsche URL landet, Deutsch. Das gilt immer, auch für Google.
2. **Die eigene Wahl.** Ein Klick auf DE/EN setzt ein Cookie. Danach wird nie wieder automatisch umgeleitet.
3. **Die Browsersprache** (`Accept-Language`). Nur beim ersten Besuch und nur auf der Startseite `/`: Steht Deutsch nirgends in den Sprachen des Browsers, geht es einmal nach `/en`.
4. **Das Land** (Cloudflare-Header `CF-IPCountry`). Nur wenn der Browser gar keine Sprache meldet: DE, AT, CH, LI → Deutsch, sonst Englisch.

**Warum Browsersprache vor Standort:**
- Eine Deutsche in New York will Deutsch, ein englischsprachiger Entwickler in Berlin will Englisch. Die Browsersprache trifft das, der Standort nicht.
- In der Schweiz spricht ein großer Teil Französisch oder Italienisch, für sie ist Englisch die bessere Wahl. Die Browsersprache erkennt das.
- Google rät von automatischen Weiterleitungen nach Sprache ab, weil Nutzer und Suchmaschinen sonst Sprachversionen nicht erreichen ([Google Search Central](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)). Deshalb leiten wir nur einmal, nur von `/` und nie Bots um. Jede Version bleibt über ihre eigene URL, den Umschalter und `hreflang` erreichbar.

**Zu prüfen:** `CF-IPCountry` setzt Cloudflare nur, wenn die IP-Geolocation in der Zone aktiv ist ([Cloudflare-Doku](https://developers.cloudflare.com/fundamentals/reference/http-headers/)). Ob er bei OpenNext in der Middleware ankommt, testen wir in Phase 1.

### Umschalter im Header

- Ganz rechts in `navbar.tsx` und `mobile-nav.tsx`: **DE | EN**, die aktive Sprache hervorgehoben.
- Der Umschalter springt auf **dieselbe Seite** in der anderen Sprache (`/preise` ↔ `/en/pricing`), nicht auf die Startseite.
- Im Dashboard sitzt er im Konto-Menü und speichert die Wahl auch im Nutzerprofil, damit Mails in der richtigen Sprache kommen.

---

## 4. Vollständige Inventur: was übersetzt werden muss

Abhaken, nichts davon darf am Ende fehlen.

### Öffentliche Seiten
- [ ] Landingpage: Hero, Video-Label, Schritte, Beispiele-Teaser, „Die KI-Suche sucht“, Features, FAQ, Schluss-CTA (`src/components/landing/sections/*`, `src/lib/marketing/faq.ts`)
- [ ] Navigation, Mobile-Navigation, Footer, Cookie- oder Hinweisbanner (`src/components/landing/layout/*`)
- [ ] `/beispiele` mit allen zehn Beispielen und Beispielfragen (`src/lib/marketing/examples.ts`)
- [ ] `/preise` inklusive Paketnamen, Rechenbeispielen und Preis-FAQ
- [ ] `/website-mit-ki-durchsuchen`, `/dokumentation-durchsuchen`, `/kundenwebsite-durchsuchen` (`use-case-page.tsx` und Inhalte)
- [ ] Blog-Übersicht und beide Artikel (`src/content/blog/*`, `facts.ts`)
- [ ] Rechtstexte: Impressum, Datenschutz, Nutzungsbedingungen, Widerrufsbelehrung (siehe Abschnitt 8)
- [ ] 404- und Fehlerseiten (`not-found.tsx`, `error.tsx`, `global-error.tsx`)

### Anmeldung und Konto
- [ ] Login, Registrierung, Passwort vergessen, neues Passwort, Fehlerseite des Auth-Codes (`src/app/(auth)/*`, `src/app/reset-password/*`, `src/components/auth/*`)
- [ ] Supabase-Mails „E-Mail bestätigen“ und „Passwort zurücksetzen“ (`docs/email-templates/*`, im Supabase-Dashboard hinterlegt). Supabase kennt pro Mail nur eine Vorlage, also zweisprachig per Bedingung auf `user_metadata.locale`.
- [ ] Erinnerungsmail (`src/lib/email/activation-reminder.ts`)
- [ ] Kauf-Zustimmungstext vor dem Checkout (`src/lib/purchase-consent.ts`). Rechtlich relevant.
- [ ] Konto löschen inklusive Dialog (`src/lib/account-deletion.ts`, `dashboard/account`)

### Dashboard
- [ ] Übersicht, erste Schritte, Wissensbasen-Liste, Statusmeldungen (`src/components/dashboard/overview/*`)
- [ ] Crawl-Formular, Fortschritt, Ergebnis-Labels mit Pluralformen (`crawl-progress.ts`, `crawl-monitor`)
- [ ] Chat: Eingabe, Content-Check-Hinweise, Quellenliste, Modellanzeige (`src/components/dashboard/chat/*`, `src/lib/chat/*`)
- [ ] Toasts und Fehlermeldungen in den Stores (`src/stores/*`)
- [ ] Seitentitel und Beschreibungen der Dashboard-Seiten

### Server
- [ ] Fehlermeldungen der API-Routen (`src/app/api/**`, rund 10 Dateien). Umbau auf Fehlercodes, die das Frontend übersetzt, statt fertiger deutscher Sätze.
- [ ] Fehlermeldungen des RAG-Workers (`workers/rag-api/src/*`, 8 Dateien), gleiches Prinzip
- [ ] Stripe Checkout: heute fest `locale: 'de'` (`src/app/api/stripe/checkout/route.ts:62`), künftig aus der Nutzersprache
- [ ] Zahlen- und Datumsformate: 28 Stellen mit festem `de-DE`. Englisch zeigt „€10“ statt „10 €“.

### Bereits sprachneutral
- **KI-Antworten:** Der Systemprompt lässt in der Sprache der Frage antworten (`src/lib/server/generation.ts:216`). Wer englisch fragt, bekommt Englisch. Nur die Content-Check-Berichtsstruktur nennt deutsche Überschriften als Beispiel (`generation.ts:231`). Prüfen, ob englische Entwürfe englische Überschriften bekommen.

### SEO und Medien
- [ ] Metadaten je Seite und Sprache (Titel, Beschreibung, Keywords, Open Graph mit `locale: en_US`)
- [ ] `hreflang` für `de`, `en` und `x-default` auf jeder öffentlichen Seite, plus Sitemap mit beiden Sprachen (`src/app/sitemap.ts`)
- [ ] Canonical je Sprache
- [ ] JSON-LD: Organisation, SoftwareApplication und FAQPage auf Englisch mit `inLanguage`
- [ ] OG-Bild (`opengraph-image.png`) prüfen, ob es Text enthält. Falls ja, eine englische Fassung.
- [ ] Promo-Video: deutscher Sprecher und deutscher Text. Englische Fassung im bestehenden Remotion-Projekt (`video/`) rendern. Bis dahin auf `/en` nur das Standbild zeigen.
- [ ] `robots.ts`: `/en` erst freigeben, wenn alles übersetzt ist (bis dahin `noindex`)

---

## 5. Gute englische Texte statt Übersetzung

- **Transkreation, nicht Wort für Wort.** Die englische Seite bekommt dieselbe Positionierung (KI-Suche vs. vorab gelesene Website), aber Formulierungen, die auf Englisch natürlich klingen.
- **Der Slogan funktioniert auf Englisch sogar besser:** „Don't ask the internet. Ask the website.“
- **Eigene Keyword-Prüfung für Englisch.** Kandidaten: „chat with a website“, „search a website with AI“, „ask questions about a website“, „AI website search“. Suchvolumen ungeprüft. Die englischen Slugs und Titel richten wir danach aus.
- **Englische Wettbewerber sind andere.** Im englischsprachigen Markt sind „chat with website“-Tools dichter (Chatbase, SiteGPT, DocsBot …). Die Abgrenzung „Werkzeug für dich, nicht Bot für deine Kunden“ muss auf Englisch noch deutlicher sein.
- **Glossar, damit überall dieselben Begriffe stehen:**

| Deutsch | Englisch |
|---|---|
| Wissensbasis | knowledge base |
| einlesen | read / crawl (in der UI: „add a website“) |
| Start-Credits | free credits |
| Content-Check | Content Check |
| KI-Suche | AI search |
| Quelle | source |
| du | you (locker, wie im Deutschen) |

- **Ablauf:** Ich schreibe alle englischen Texte zuerst in ein Review-Dokument wie `docs/website-texte-neu.md`. Du gibst frei, dann baue ich ein. Für Landingpage und Rechtstexte empfehle ich zusätzlich einen kurzen Blick von jemandem mit Englisch als Muttersprache.

---

## 6. Wie wir sicherstellen, dass nichts vergessen wird

1. **Schlüssel-Gleichheit als Test:** Ein Test schlägt fehl, wenn `en.json` einen Schlüssel aus `de.json` nicht hat oder umgekehrt.
2. **Typprüfung:** next-intl prüft Schlüssel per TypeScript. Ein Tippfehler im Schlüssel bricht den Typecheck.
3. **Suche nach festen deutschen Texten:** Ein CI-Schritt sucht in `src/components` und `src/app` nach Umlauten und typischen deutschen Wörtern außerhalb von `messages/` und Tests. Treffer müssen begründet sein (z. B. Impressum).
4. **Smoke-Test erweitern:** `scripts/smoke-release.mjs` prüft zusätzlich `/en` auf die englische Überschrift und `hreflang`.
5. **Klicktest im Browser** durch alle Seiten und den ganzen Ablauf auf Englisch: registrieren, bestätigen, Website einlesen, fragen, Credits kaufen (Stripe-Testmodus), Konto löschen.

---

## 7. Phasen

| Phase | Inhalt | Sichtbar für Besucher? |
|---|---|---|
| 0 | Entscheidungen aus Abschnitt 9, Steuer- und Rechtsfragen klären | nein |
| 1 | next-intl einbauen, alle deutschen Texte in `de.json` verschieben, `html lang`, Umschalter vorbereiten. Deutsch sieht danach exakt aus wie vorher. | nein |
| 2 | Englische Marketing-Texte schreiben (Review-Dokument), einbauen, `/en` mit `noindex` live | nur über direkten Link |
| 3 | Auth, Dashboard, API- und Worker-Fehler, Mails, Stripe-Sprache, Zahlenformate | nur über direkten Link |
| 4 | Rechtstexte, Blog, OG-Bild, englisches Video | nur über direkten Link |
| 5 | Prüfungen aus Abschnitt 6, dann `noindex` raus, Erkennung und Umschalter an, Sitemap einreichen | ja |

Phase 1 ist reine Umbauarbeit ohne sichtbare Änderung. Danach kann jede Phase einzeln deployt werden, ohne dass Deutsch leidet.

---

## 8. Steuer und Recht (vor Phase 5 klären)

Das ist keine Rechtsberatung. Diese Punkte gehören vor den Livegang zu Steuerberatung oder Anwalt:

- **Umsatzsteuer bei Verkäufen an Privatkunden im EU-Ausland:** Für elektronische Dienstleistungen an Verbraucher in anderen EU-Ländern läuft die Umsatzsteuer über das One-Stop-Shop-Verfahren mit einer Meldung im eigenen Land ([EU-Kommission, OSS](https://vat-one-stop-shop.ec.europa.eu/one-stop-shop/declare-and-pay-oss_en)). Ob und ab welchem Umsatz das für CraCha greift, ist ungeprüft. Eine Schwelle von 10.000 € EU-weit ist Wissensstand, auf der Seite nicht bestätigt.
- **Verkäufe außerhalb der EU** (z. B. Großbritannien, Schweiz, USA) haben eigene Regeln. Ungeprüft, Wissensstand: Großbritannien verlangt bei digitalen Leistungen an Privatkunden eine Registrierung ab dem ersten Verkauf.
- **Preise „inkl. USt.“** stimmen dann je nach Land nicht mehr pauschal. Stripe Tax wäre eine Option.
- **Vertragssprache:** Wird der Vertrag auf Englisch geschlossen, müssen Pflichtinformationen wie Widerrufsbelehrung und Nutzungsbedingungen in dieser Sprache vorliegen. Üblich: deutsche Fassung verbindlich, englische als Übersetzung mit Hinweis. Ob das für Verbraucher reicht, prüfen lassen.
- **Impressum und Datenschutz:** englische Fassungen sind unproblematisch, das deutsche Impressum bleibt.
- **Übergangslösung:** Englische Seiten können live gehen, bevor der Verkauf ins Ausland geklärt ist, solange Käufe bis dahin auf Deutschland beschränkt oder klar geregelt sind.

---

## 9. Entscheidungen für dich

1. **URL-Schema:** Deutsch ohne Präfix, Englisch unter `/en` (Empfehlung), oder beide mit Präfix (`/de`, `/en`)? Beide mit Präfix würde alle heutigen URLs ändern.
2. **Automatische Weiterleitung:** einmalig auf der Startseite nach Browsersprache (Empfehlung), oder gar nicht weiterleiten und nur einen Hinweis „Also available in English“ einblenden?
3. **Englisch nur anzeigen oder auch verkaufen?** Davon hängt ab, wie dringend Abschnitt 8 ist.
4. **Video:** englische Fassung rendern oder auf `/en` vorerst nur das Standbild?
5. **Blog:** beide Artikel übersetzen oder für Englisch eigene Artikel zu englischen Suchbegriffen schreiben?
6. **Muttersprachliches Review** für Landingpage und Rechtstexte: ja oder nein?
