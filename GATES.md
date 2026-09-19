# Cracha: Auslieferung und Abrechnung

Stand: 2026-09-19. Bestehende 100 Start-Credits bleiben gemäß aktuellem Fahrplan unverändert.

- [ ] G1: Registrierungseinstieg, Rechtstexte und dauerhafte Bestätigungsanweisung funktionieren.
  EVIDENCE: Live-Links und Bundle bestätigt; vollständiger interaktiver Registrierungs- und Bestätigungsablauf nicht durchgeführt.
- [x] G2: Frontend und RAG bestehen Typprüfung und Tests.
  CHECK: npm run check
  EXPECT: passed
  EVIDENCE: exit=0; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\nico_\Desktop\Projekte\cracha; path=3e8a513af202/39 entries; EXPECT=matched; output-sha256=d35c814a1cc2780696b48d4af882e8d8c0dca1af25c2c25bdc4d3eb45576eaa2; output-bytes=10095
- [x] G3: Python-Regressionsprüfungen bestehen.
  CHECK: venv\Scripts\python.exe -m pytest services/crawler/tests evals/test_evaluate.py -q
  EXPECT: passed
  EVIDENCE: exit=0; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\nico_\Desktop\Projekte\cracha; path=3e8a513af202/39 entries; EXPECT=matched; output-sha256=a9b8db4200209af456218105e6e47e9a99c751bc299761d155872bd5a9243f0c; output-bytes=1027
- [x] G4: Cloudflare-Produktionsbuild ist erfolgreich und veröffentlichtes Verhalten ist geprüft.
  EVIDENCE: Commit 04b0fc8; npm run build:cf exit=0; GitHub Deploy 35454540547 success; HTTP 200 auf /, /register und beiden Rechtstextseiten, drei Register-Links, neuer CTA und Registrierungsbundle 3vesijrfrdhog.js nachgewiesen.
- [x] G5: DNS-Befund und Grenzen der Spam-Diagnose sind anhand öffentlicher Antworten dokumentiert.
  EVIDENCE: 2026-09-19; Resolve-DnsName gegen 1.1.1.1, 8.8.8.8 und arvind.ns.cloudflare.com; send/rsend CNAME sichtbar, DKIM TXT vorhanden; DMARC zunächst NXDOMAIN, bei Nachprüfung auch autoritativ TXT mit p=none vorhanden. Dokumentiert in docs/saas-startplan-und-analyse.md.
- [ ] G6: Fehlgeschlagene und unbeantwortbare Chats erstatten Credits idempotent; Crawl-Abbruch bereinigt den Hold.
  EVIDENCE: Anwendungstests für Refund und Cancel bestanden; reale SQL-Nebenläufigkeit und Prozessabbrüche sind nicht abgenommen.
- [ ] G7: Übrige Freigabepunkte des SaaS-Plans sind implementiert und praktisch abgenommen.
  EVIDENCE: pending; Kontolöschung, verifizierte Bonusvergabe, serverseitiger Crawl-Abschluss, Netzwerkschutz, Zahlungsabgleich, RAG-Evaluation und echte Pilotnutzer bleiben eigenständige offene Ergebnisse. Eine Dokumentation dieser Punkte bedeutet keine Implementierung.

Aktualisierte CI-Evidenz für G2/G3: Commit 04b0fc8, Lauf https://github.com/NicoDev01/cracha/actions/runs/35454540394 erfolgreich; 122 Frontend-, 70 RAG- und 91 Python-Tests. Die oben gespeicherten lokalen Fingerprints stammen vom vorhergehenden Testlauf; die zusätzliche CI bezieht sich auf den veröffentlichten Code.

## DACH-Einstieg und Auffindbarkeit (19.09.2026)

- [x] D1: Nutzen, Grenzen, Kosten und erster Ablauf sind vor der Anmeldung verständlich sichtbar.
  EVIDENCE: Commit 4d4e2c7; serverseitig erzeugtes HTML enthält Nutzen, 100-Credit-Erklärung, fünf FAQ und Ablauf. Redaktionell geprüft, kein gemessener Nutzereffekt; Veröffentlichung durch D4 noch offen.
- [x] D2: Ein verlinkter deutscher Leitfaden besitzt eigene Metadaten und ist in der Sitemap enthalten.
  EVIDENCE: Build-Prüfung tmp/check-dach.py exit=0, PUBLIC_PAGES_PASS build: /website-mit-ki-durchsuchen mit deutschem HTML, einem H1, eigenem Canonical, Beschreibung, OG-Bild, intakten Startseitenankern und Sitemap-Eintrag. Noch nicht live.
- [x] D3: Der Crawl-Standard lässt vom Startguthaben Raum für erste Fragen; das leere Dashboard erklärt den Einstieg.
  EVIDENCE: CrawlConfigForm defaultValues.limit=20; Hilfetext und Dashboard-Anleitung im erfolgreichen Produktionsbuild. 100 - 20 = 80 Credits für 16 Fragen. Kein interaktiver Browsernachweis.
- [ ] D4: Typprüfung, relevante Tests und Build bestehen; Veröffentlichung und öffentliches HTML sind geprüft.
  EVIDENCE: Lokal 122 Tests und Typprüfung erfolgreich, finaler npm run build:cf exit=0, HTML-Prüfung bestanden. Deploy 35457983521 blockiert: npm audit liefert HTTP 503/Wartung; alle Veröffentlichungsjobs übersprungen. Keine Live-Verifikation des neuen Stands möglich; erneut starten, sobald npm verfügbar ist.
- [x] D5: Priorisierter DACH-Gewinnungsplan und Messlücken sind dokumentiert, ohne Traffic oder Nachfrage zu erfinden.
  EVIDENCE: docs/dach-aktivierung-und-seo.md enthält priorisierte Zielgruppenhypothese, fünf qualitative Piloten, Messkonzept, Search-Console-Schritte und ausdrücklich begrenzte Datenbefunde.
