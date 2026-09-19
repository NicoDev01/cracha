# DACH: Nutzer gewinnen und zur ersten hilfreichen Antwort führen

Stand: 19.09.2026. Befunde und umgesetzte Produktänderungen sind von Hypothesen und noch offenen Prüfungen getrennt.

## Die grundlegende Diagnose

CraCha wurde bisher online gestellt, aber laut Betreiber noch nicht gezielt verbreitet. Fehlende Registrierungen beweisen damit weder fehlenden Bedarf noch ausschließlich Bot-Traffic. Die früher exportierten Cloudflare-Requests zählen technische Anfragen, keine einzelnen Interessenten. Cachequote und CPU-P90 erklären für sich keine Registrierungsabbrüche.

Die vorherige Dashboard-Prüfung dokumentierte EU-Ausschluss in Cloudflare Web Analytics. Deutschland und Österreich fehlen damit in dieser Messung; die Schweiz ist kein EU-Mitglied. Die Einstellung wurde in dieser Runde nicht erneut im Dashboard kontrolliert oder geändert. Aus den sichtbaren Besuchen lässt sich daher keine belastbare DACH-Conversion-Rate ableiten. Der aktuelle Browserzugang liefert keine verbundenen Browser, sodass auch keine aktuelle Search-Console- oder Analytics-Adminprüfung möglich war.

Eine Suchabfrage nach der Domain lieferte keine belastbaren passenden Ergebnisse. Das beweist NICHT, dass Google die Website nicht indexiert hat. Maßgeblich sind URL-Prüfung und Indexierungsberichte der Search Console. Rankings, Suchvolumen und organische Nachfrage wurden nicht behauptet oder geschätzt.

## Positionierung als überprüfbare Hypothese

DACH ist die Sprach- und Marktregion, noch keine hinreichend genaue Zielgruppe. Als erster Test eignen sich deutschsprachige Berater, Mitarbeitende kleiner Agenturen und Personen mit wiederkehrender Recherche in öffentlichen Produkt- oder Hilfedokumentationen. Gemeinsam ist ihnen eine Aufgabe: verstreute Informationen zusammenführen und mit Originalquellen prüfen.

Die Entscheidung ist vorläufig. Falls die ersten Gespräche überwiegend einen Website-Supportbot zum Einbetten verlangen, ist das ein anderes Produktbedürfnis. Dann die Nachfrage dokumentieren und über den Produktschwerpunkt entscheiden, statt bereits vorhandene Einbettung zu versprechen.

## Konkrete Änderungen dieser Runde

| Befund | Änderung | Erwarteter Nutzen, noch kein gemessener Effekt |
|---|---|---|
| Headline konnte einen eingebetteten Supportbot versprechen | Nutzen auf Website-Recherche mit Quellen ausgerichtet, Nutzung im eigenen Konto erklärt | Passendere Erwartungen vor der Anmeldung |
| 100 Seiten als Standard konnten 100 Start-Credits vollständig verbrauchen | Crawl-Standard 20 Seiten, Erklärung 20 + 16 × 5 = 100 | Erste Fragen ohne sofortigen Kauf ermöglichen |
| Leeres Dashboard bot fast nur einen Button | Drei kurze Schritte und Link zur Anleitung | Nächste Handlung verständlich machen |
| Kosten und Grenzen erst spät erkennbar | Öffentliche Credit-Erklärung und native aufklappbare FAQ | Unsicherheit vor der Registrierung reduzieren |
| Wenig hilfreicher indexierbarer Inhalt neben Landingpage und Rechtstexten | `/website-mit-ki-durchsuchen` mit Anleitung, Beispielfragen, Grenzen, eigenem Canonical und Metadaten | Inhalt passend zur tatsächlichen Rechercheaufgabe |
| Sitemap behauptete bei jedem Build neue Inhaltsänderungen | Automatisches `lastModified = new Date()` entfernt | Keine künstlichen Änderungsdaten |
| Navigation mit bloßen Fragmenten versagte auf Unterseiten | Startseitenanker mit `/` und echte Anleitung verlinkt, mobile Navigation folgt normalen Links | Nutzbare Navigation auf allen öffentlichen Seiten |
| Pauschale Zusagen zu Vollständigkeit, Dauer und KI-Richtigkeit | Aussagen auf erreichbare Seiten und prüfbare Quellen begrenzt | Vertrauen durch zutreffende Erwartungen |
| Anbieterlogos kamen vor der Erklärung des Nutzens | Techniklogo-Sektion aus der Startseitenreihenfolge entfernt | Den Einstieg auf die Nutzeraufgabe konzentrieren |

Es wurde kein neuer Trackingdienst, keine Cookie-Abfrage, keine automatische E-Mail-Sequenz, kein Tarifwechsel und keine künstliche Aktivität zum Wachhalten von Supabase eingeführt. Die Anleitung enthält Formulierungshilfen, keine vorgetäuschte Live-Demo. Das vorhandene Design und die Produktvorschau bleiben grundsätzlich bestehen.

## Was jetzt Vorrang hat

### 1. Einen vollständigen echten Ablauf nachweisen

Mit einer externen Testadresse registrieren, Bestätigung empfangen, Link öffnen, tatsächliche 100 Credits kontrollieren, eine erlaubte öffentliche Quelle mit höchstens 20 Seiten einlesen, erste sinnvolle Frage stellen und die verlinkte Quelle vergleichen. Danach an einem anderen Tag erneut anmelden und dieselbe Wissensbasis verwenden. Keine personenbezogenen Mailheader oder Kontodaten öffentlich in die Dokumentation übernehmen.

Bestanden heißt: Die Person erreicht ohne Eingriff in Datenbanken eine hilfreiche, überprüfbare Antwort. Ein erfolgreicher HTTP-Aufruf, ein Screenshot oder ein grüner Unit-Test reicht dafür nicht. Die bestehende SMTP-/Spam- und SQL-Abnahme bleibt offen; siehe `saas-startplan-und-analyse.md`.

### 2. Fünf Personen mit derselben wiederkehrenden Aufgabe beobachten

Zunächst fünf passende Kontakte aus dem bestehenden beruflichen Netzwerk ansprechen. Nicht nach allgemeinem Gefallen fragen, sondern: Welche Website durchsuchst du regelmäßig? Welche konkrete Frage hattest du zuletzt? Wie löst du das heute? Was passiert, wenn du die Antwort nicht findest?

Die Person bringt eine eigene Aufgabe mit. Im 20-minütigen Test nicht jeden Schritt erklären: beobachten, wo sie stockt. Erfassen: Einstieg verstanden, Mail angekommen, erste Quelle eingelesen, Frage beantwortet, Quelle trägt die Aussage, erneute Nutzung. Zeit bis zur ersten hilfreichen Antwort messen, ohne ein willkürliches Leistungsversprechen daraus zu machen.

Entwurfsnachricht zur manuellen Verwendung (nicht versendet):

> Ich entwickle CraCha für die Recherche in umfangreichen Websites. Du kannst Inhalte einlesen und Fragen mit Quellenlinks stellen. Recherchierst du regelmäßig in einer Produkt- oder Hilfedokumentation? Ich suche fünf Personen, die es mit einer eigenen Aufgabe ausprobieren und mir zeigen, wo es noch hakt. Für den Einstieg sind keine Zahlungsdaten nötig.

### 3. Messung für Deutschland, Österreich und die Schweiz klären

Im Cloudflare-Dashboard den tatsächlichen EU-Ausschluss kontrollieren und eine bewusste Entscheidung über Messung und dokumentierte Datenverarbeitung treffen. Nicht aus fehlenden EU-Ereignissen auf fehlende Nutzer schließen. Ohne passende Messgrundlage vorerst das qualitative Pilotprotokoll nutzen.

Den Weg getrennt auswerten: qualifizierter Besuch → Einstieg → Registrierung abgeschickt → E-Mail bestätigt → Quelle bereit → hilfreiche Antwort → spätere Nutzung. Accountzahlen allein zeigen keine Aktivierung. Serverseitige Erfolgsereignisse können technische Schritte später zuverlässig zählen; „hilfreich“ braucht Nutzerfeedback. Technische Request-Logs sind kein Ersatz für diese Messung.

Keine E-Mail-Adressen, Prompts, Quelleninhalte oder vollständigen URLs in Marketing-Events speichern. Eigene Tests als solche kennzeichnen. UTM-Links können Kanäle kennzeichnen, aber die aktuelle Anwendung implementiert keine neue dauerhafte UTM-Zuordnung; bloße URL-Parameter ergeben noch keinen Conversion-Bericht.

### 4. Auffindbarkeit gezielt ausbauen

Search Console: Domaininhaberschaft prüfen, `/sitemap.xml` einreichen, Startseite und Leitfaden mit der URL-Prüfung kontrollieren. Danach tatsächliche Suchanfragen, Impressionen, Klicks und Indexierungsgründe auswerten. Ohne Zugang kann diese Abnahme nicht automatisch erfolgen.

Als Themenhypothesen eignen sich „Website mit KI durchsuchen“, „Fragen an eine Website stellen“ und „Produktdokumentation durchsuchen“. Keine gemessenen Suchvolumina. Die Ausrichtung muss zu den beobachteten Aufgaben passen. Keine nahezu identischen Seiten für Deutschland, Österreich und Schweiz: Eine gute deutschsprachige Anleitung bedient zunächst alle drei Märkte.

Nach erfolgreichen Piloten eine echte Fallstudie veröffentlichen: konkrete Aufgabe, erlaubte Quelle, Originalfrage, tatsächliches Ergebnis, überprüfte Quellen, Zeitaufwand und Grenzen. Nur mit Zustimmung und ohne vertrauliche Inhalte. Daraus einen passenden Beitrag im vorhandenen beruflichen Netzwerk ableiten. In Fachcommunities nur passend zu deren Regeln und erkennbarem Bedarf veröffentlichen. Keine automatisierte Massenansprache.

### 5. Nachfrage vor weiteren großen Funktionen prüfen

Noch keinen Pflicht-Erklärungslayer, komplexe Produkttour, breite Anzeigenkampagne oder öffentliche KI-Demo bauen. Die Anleitung und kurze Hilfen an der jeweiligen Handlung reichen als erster Versuch. Eine kostenlose anonyme Live-Demo würde zusätzlich Kosten- und Missbrauchsschutz benötigen. Wenn mehrere Testpersonen trotz Anleitung denselben Schritt nicht verstehen, genau diese Stelle verbessern.

Entscheidungsregeln statt erfundener Conversion-Ziele:
- Passende Personen verstehen den Nutzen nicht: Beispiele und Botschaft überarbeiten.
- Registrierung wird begonnen, aber nicht bestätigt: Zustellung und Auth-Ablauf prüfen.
- Quelle wird eingelesen, aber keine Frage gestellt: Guthaben, Fertigstatus und Chat-Einstieg prüfen.
- Antworten helfen nicht: Quellenauswahl, Retrieval und Antwortqualität an diesen Fällen untersuchen.
- Gute erste Antwort, aber keine Wiederkehr: Häufigkeit und Bedeutung der Aufgabe prüfen.
- Wiederkehrende Nutzung: Ähnliche Personen über denselben Kanal gewinnen und erst danach weitere Kanäle testen.

## Kostenfreier Betrieb bleibt eine Randbedingung

Mehr Landingpage-Besuche halten eine Supabase-Datenbank nicht automatisch aktiv. Auch eine bessere Landingpage garantiert keine regelmäßige Backend-Nutzung. Solange der kostenlose Tarif genutzt wird, den Zustand vor Pilotterminen prüfen und ein pausiertes Projekt rechtzeitig wiederherstellen. Echte Nutzung ist das Produktziel; künstliche Besuche sind kein Beleg dafür. Kein automatisches Upgrade wurde vorgenommen.

## Prüfgrenzen und nächste technische Arbeiten

Diese Runde verbessert Auffindbarkeit, Erwartung und Einstieg. Sie ersetzt keine vollständige Sicherheits-, Zahlungs- oder RAG-Abnahme. Die offenen Themen aus dem bestehenden Plan bleiben: SQL-Buchungsinvarianten, browserunabhängiger Crawl-Abschluss, Kontolöschung, Bonusvergabe, SSRF-/DNS-Rebinding-Schutz und Zahlungsabgleich.

Eine visuelle Browserprüfung und echte Anmeldung waren mangels verbundener Browser nicht möglich. HTML-/Metadatenprüfung, Build und Tests werden separat nachgewiesen. Beim gezielten ESLint-Lauf erschien ein bereits vorhandener Fehler im Datenlade-Effect von `dashboard-overview.tsx` sowie die React-Hook-Form-Compilerwarnung; beide liegen außerhalb der hier geänderten Texte und des Crawl-Standardwerts. Keine Unterdrückung hinzugefügt, kein vollständiger Lint-Erfolg behauptet.

## Primärquellen

- [Google: SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide): nützliche Inhalte, klare Links, verständliche Titel; keine Rankinggarantie.
- [Google: Sitemaps erstellen](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): Sitemap und zutreffende Änderungsdaten.
- [Cloudflare: Web Analytics einrichten](https://developers.cloudflare.com/web-analytics/get-started/): EU-Ausschluss betrifft die Einbindung des Messskripts.
- [Supabase: Pausieren kostenloser Projekte](https://supabase.com/docs/guides/platform/free-project-pausing): Betriebsrisiko unabhängig von Marketingbewertung.

## Ergebnis der Umsetzung und Veröffentlichung

Code-Commit `4d4e2c7` wurde nach `origin/main` gepusht. Lokal: 122 Frontend-/API-Tests erfolgreich, Typprüfung erfolgreich, Cloudflare-Produktionsbuild erfolgreich. Die HTML-Prüfung bestätigt auf Startseite und Leitfaden Deutsch als Dokumentsprache, jeweils ein H1, korrekte Canonicals, Beschreibung und Open-Graph-Bild, funktionierende interne Anker sowie den Leitfaden in der Sitemap. Der gezielte Lint-Lauf aller geänderten Marketingdateien ist erfolgreich; die oben genannten vorhandenen Dashboard-Befunde bleiben bestehen.

**Noch nicht veröffentlicht:** [Deploy 35457983521](https://github.com/NicoDev01/cracha/actions/runs/35457983521) wurde am npm-Sicherheitscheck gestoppt. Der Audit-Endpunkt antwortet lokal mit HTTP 503 und Wartungshinweis; auch die CI meldet einen Audit-Endpunktfehler. Frontend-, Crawler- und RAG-Veröffentlichung wurden übersprungen. Der zuletzt erfolgreiche Produktionsstand bleibt bestehen. Keine Sicherheitssperre wurde umgangen und keine neue Schwachstelle aus diesem Ausfall abgeleitet.

Die [npm-Statusseite](https://status.npmjs.org/) nennt Wartung am 19.09.2026 von 17–19 Uhr UTC (19–21 Uhr Europe/Berlin). Das ist ein angekündigtes Zeitfenster, keine Garantie für die Wiederherstellung. Nach Wiederherstellung den fehlgeschlagenen Deploy erneut starten (Re-run failed jobs). Danach `/`, `/website-mit-ki-durchsuchen`, `/sitemap.xml` und den ausgelieferten Crawl-Standard prüfen; vorbereiteter lokaler Smoke-Check: `venv\Scripts\python.exe tmp/check-dach.py --live`. Die temporäre Prüfdatei ist nicht Bestandteil des Repositorys.
