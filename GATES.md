# Cracha: Auslieferung und Abrechnung

Stand: 2026-09-19. Bestehende 100 Start-Credits bleiben gemäß aktuellem Fahrplan unverändert.

- [ ] G1: Registrierungseinstieg, Rechtstexte und dauerhafte Bestätigungsanweisung funktionieren.
  EVIDENCE: pending
- [x] G2: Frontend und RAG bestehen Typprüfung und Tests.
  CHECK: npm run check
  EXPECT: passed
  EVIDENCE: exit=0; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\nico_\Desktop\Projekte\cracha; path=3e8a513af202/39 entries; EXPECT=matched; output-sha256=d35c814a1cc2780696b48d4af882e8d8c0dca1af25c2c25bdc4d3eb45576eaa2; output-bytes=10095
- [x] G3: Python-Regressionsprüfungen bestehen.
  CHECK: venv\Scripts\python.exe -m pytest services/crawler/tests evals/test_evaluate.py -q
  EXPECT: passed
  EVIDENCE: exit=0; shell=C:\windows\system32\cmd.exe; cwd=C:\Users\nico_\Desktop\Projekte\cracha; path=3e8a513af202/39 entries; EXPECT=matched; output-sha256=a9b8db4200209af456218105e6e47e9a99c751bc299761d155872bd5a9243f0c; output-bytes=1027
- [ ] G4: Cloudflare-Produktionsbuild ist erfolgreich und veröffentlichtes Verhalten ist geprüft.
  EVIDENCE: pending
- [x] G5: DNS-Befund und Grenzen der Spam-Diagnose sind anhand öffentlicher Antworten dokumentiert.
  EVIDENCE: 2026-09-19; Resolve-DnsName gegen 1.1.1.1, 8.8.8.8 und arvind.ns.cloudflare.com; send/rsend CNAME sichtbar, DKIM TXT vorhanden; DMARC zunächst NXDOMAIN, bei Nachprüfung auch autoritativ TXT mit p=none vorhanden. Dokumentiert in docs/saas-startplan-und-analyse.md.
- [ ] G6: Fehlgeschlagene und unbeantwortbare Chats erstatten Credits idempotent; Crawl-Abbruch bereinigt den Hold.
  EVIDENCE: Anwendungstests für Refund und Cancel bestanden; reale SQL-Nebenläufigkeit und Prozessabbrüche sind nicht abgenommen.
- [ ] G7: Übrige Freigabepunkte des SaaS-Plans sind implementiert und praktisch abgenommen.
  EVIDENCE: pending; Kontolöschung, verifizierte Bonusvergabe, serverseitiger Crawl-Abschluss, Netzwerkschutz, Zahlungsabgleich, RAG-Evaluation und echte Pilotnutzer bleiben eigenständige offene Ergebnisse. Eine Dokumentation dieser Punkte bedeutet keine Implementierung.
