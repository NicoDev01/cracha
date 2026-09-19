# CraCha: Status quo, Traffic-Analyse & Umsetzungsplan

Stand: 19. September 2026

---

## 1. Aktueller Projektstatus

* **Codebase & Tests:** Prüfung nach den Fairness-Korrekturen: 106 Frontend-/Server-Tests, 70 RAG-Tests, 80 Crawler-Tests und 11 Eval-Tests bestanden (267 gesamt), beide TypeScript-Prüfungen erfolgreich. Das ist kein Nachweis vollständiger Produktionsreife: reale Registrierung, SQL-Nebenläufigkeit, Zahlungen und Zustellbarkeit sind dadurch nicht abgedeckt.
* **E-Mail-Infrastruktur:**
  * Eigener Resend-Account eingerichtet (`smtp.resend.com`).
  * Öffentlicher DNS-Check am 19.09.2026: DKIM und SPF auffindbar; `_dmarc.cracha-app.com` liefert NXDOMAIN bei 1.1.1.1, 8.8.8.8 und dem autoritativen Nameserver `arvind.ns.cloudflare.com`.
  * Laut Nutzerübergabe ist Custom SMTP im Supabase-Dashboard aktiv und versendet als `auth@cracha-app.com`. In dieser Prüfung nicht erneut im Dashboard verifiziert.
  * *Aktuelle Hürde:* Erste Testmails landen im Spam-Ordner (Ursachen & Lösung in Abschnitt 4).
* **Lokaler Frontend-Stand:**
  * Haupt-CTA auf der Landingpage leitet direkt zu `/register` (statt `/login`).
  * Registrierungsformular behält die Bestätigungsanweisung dauerhaft sichtbar.
  * 100 Start-Credits sind hinterlegt (ausreichend für ~100 Seiten oder 20 Fragen).

---

## 2. Kritische Analyse der Zahlen (Warum bisher 0 aktive Nutzer?)

* **70.000 Cloudflare-Requests ≠ 70.000 Besucher:**
  Ein Seitenaufruf kann mehrere HTML-, JavaScript-, CSS-, Font- und Bildanfragen auslösen. Dazu kommen automatisierte Zugriffe. Aus den aggregierten Requests lässt sich weder die Zahl menschlicher Besucher noch der Bot-Anteil zuverlässig zurückrechnen. Unterschiedliche Exportzeiträume und Messbereiche dürfen nicht vermischt werden.
* **Cloudflare Web Analytics (90 Besuche in 30 Tagen):**
  In diesem Projekt war „Enable, excluding visitor data in EU“ eingestellt. Das ist eine konkrete Messlücke für EU-Besucher, keine Aussage über eine allgemeine Standardeinstellung. Die Zahl tatsächlich entgangener Besuche ist unbekannt.
* **Technischer Blocker bei Supabase:**
  Supabase Auth verlangte E-Mail-Bestätigung, hatte aber bis heute keinen externen SMTP-Dienst. Die Standard-Mails wurden nur an autorisierte Team-Mitglieder zugestellt. Externe Nutzer erhielten nie eine Bestätigungsmail und wurden mit `Email not confirmed` abgewiesen. Registrierungen waren technisch faktisch blockiert.

---

## 3. Kritische Prüfung des GPT-Astra-Plans

Astra hat eine tiefgehende Bestandsaufnahme geliefert, verfällt jedoch in **klassisches Over-Engineering** für ein Produkt vor dem ersten Nutzer.

### Was an Astras Befund korrekt und sofort relevant ist:
1. **Fehlender SMTP-Versand:** Absolut korrekt, war der Blocker #1 für Neuregistrierungen. (Jetzt über Resend gelöst).
2. **Crawl-Settlement am Browser:** Abrechnung erfolgt im Status-Polling des Frontends. Schließt der Nutzer den Tab, hängt die Abrechnung im 24h-Reaper.
3. **Chat-Credits ohne Erstattung bei Fehler:** `spendChatCredits` bucht vor Retrieval ab. Scheitert die RAG-API (500) oder findet keine Quellen, sind 5 Credits verloren.
4. **Stripe-Paket Diskrepanz:** Kommentar in `wrangler.jsonc` nannte 2.500/7.000/15.000 Credits, der Code in `credits.ts` definiert 1.250/3.500/7.500 Credits.

### Wo Astra over-engineered (Verstoß gegen YAGNI & Senior-Dev-Prinzipien):
1. **D1-Migration & KV-Ablösung:**
   * *Korrektur zum vorgeschlagenen Plan:* Vorgesehen war Supabase als transaktionale Quelle für Guthaben, Aufträge und harte Limits, nicht eine D1-Migration oder der vollständige Ersatz von KV.
   * *Aktuelle Priorität:* Gezielte Fehlerkorrekturen vor Architekturumbau. Eine Tragfähigkeit für 1.000 Nutzer ist nicht gemessen; die bestehenden Tests beweisen insbesondere nicht die SQL-Nebenläufigkeit.
2. **Startguthaben auf 50 Credits kürzen:**
   * Der frühere Plan verwendete 50 Credits. Der aktuelle Fahrplan behält 100 Credits bei; bestehende Guthaben werden nicht verändert.
   * Bei den bisherigen, nicht aktuell gemessenen Schätzungen ergeben 100 Seiten etwa 0,02 USD oder 20 Antworten etwa 0,10 USD. „Weniger als ein Cent“ war rechnerisch falsch. Weitere Kosten und Fehlversuche sind darin nicht vollständig enthalten.
3. **Komplexe DSGVO-Löschkaskade & Zahlungsstreitfall-Ledger:**
   * *Astras Vorschlag:* Eigenes Rückerstattungs-, Chargeback- und Kaskaden-Löschsystem für unvollständige Orders.
   * *Aktuelle Priorität:* Automatisierung proportional zum tatsächlichen Bedarf. Kontolöschung und nachvollziehbare Behandlung von Zahlungen bleiben offene Produktanforderungen; geringe Nutzerzahlen machen sie nicht grundsätzlich irrelevant.

---

## 4. Warum landen die Mails im Spam & Wie lösen wir das?

**Gemessener DNS-Stand am 19.09.2026:**

| Name | Ergebnis |
|---|---|
| `send.cracha-app.com` | CNAME `send.forge.rmta.net`; Ziel liefert SPF-TXT und MX |
| `rsend.cracha-app.com` | CNAME `rsend.forge.rmta.net` |
| `resend._domainkey.cracha-app.com` | Öffentlicher DKIM-Schlüssel als TXT vorhanden |
| `_dmarc.cracha-app.com` | NXDOMAIN, auch am autoritativen Cloudflare-Nameserver |

Die sichtbaren CNAME-Ziele sprechen gegen den behaupteten Proxy-Fehler. TXT- und MX-Einträge besitzen ohnehin keinen HTTP-Proxy-Schalter. DNS-Werte immer mit den tatsächlich von Resend angezeigten Vorgaben vergleichen, nicht durch pauschale Beispielwerte ersetzen.

Als vorsichtiger Einstieg ist ein TXT-Eintrag `_dmarc` mit `v=DMARC1; p=none` vorgesehen. Er veröffentlicht eine DMARC-Policy ohne Zurückweisung von Nachrichten. Er garantiert weder DMARC-PASS noch Posteingangszustellung. Keine nicht existierende Reporting-Mailbox eintragen.

Die konkrete Mail muss separat untersucht werden: Gmail → „Original anzeigen“ → `Authentication-Results`, `From`, `Return-Path` und DKIM-Signatur. SPF prüft den Envelope-Absender, der eine Subdomain sein kann. DMARC benötigt einen bestandenen, zur sichtbaren From-Domain ausgerichteten SPF- oder DKIM-Nachweis. Weiterleitungen können die Auswertung beeinflussen.

Auch drei PASS-Ergebnisse schließen Inhalts-, Link-, IP-Reputations- oder empfängerbezogene Probleme nicht aus. Eine feste Zahl von 5–10 geöffneten Mails ist kein belastbarer Zustellbarkeitsnachweis. Eine tatsächlich erwünschte Mail kann als „Kein Spam“ markiert werden; keine künstlichen Öffnungs- oder Versandkampagnen durchführen.

Quellen: [Google-Absenderrichtlinien](https://support.google.com/mail/answer/81126), [Resend: Gmail-Spam vermeiden](https://resend.com/docs/knowledge-base/how-do-i-avoid-gmails-spam-folder).

---

## 5. Nächste Schritte

### Phase 1: Spam-Check & Deploy (Sofort)
1. Fehlenden DMARC-Eintrag ergänzen; vorhandene Resend-Einträge nicht blind ersetzen. Die öffentliche DNS-Prüfung zeigt keinen Proxy-Fehler.
2. Gmail-Originalheader prüfen; DNS-Auflösbarkeit allein beweist keine bestandene Mail-Authentifizierung.
3. Lokale Frontend-Änderungen (`RegisterForm.tsx`, `hero-landing.tsx`, `app-entry-link.tsx`) commiten und auf Cloudflare deployen.

### Phase 2: Fairness-Fixes im Code
1. **Implementiert, Veröffentlichung separat nachweisen:** Chat-Eingaben und Eigentum werden vor Abbuchung geprüft. Fehler bei Retrieval/Generation, leere Generierung und fehlende Quellen erstatten die Originalabbuchung über einen stabilen Refund-Schlüssel. Fehlgeschlagene Erstattungen werden mit Referenz protokolliert und nicht als erfolgreich ausgegeben.
2. **Implementiert:** Nach bestätigtem Crawl-Abbruch wird der Hold freigegeben. Bei fehlgeschlagener Freigabe bleibt der Job für einen erneuten Versuch erhalten. Bereits abgeschlossene Modal-Jobs lassen sich nicht nachträglich in einen kostenlosen Abbruch umwandeln.
3. **Abgrenzung:** Diese Korrekturen sind kein dauerhaftes, browserunabhängiges Auftragsmodell. Verlorene Erstattungen bei Prozessabbruch, der 24h-Reaper, gleichzeitiger Abschluss/Abbruch und automatische Nachbearbeitung bleiben offen. Eine Modellantwort ohne tatsächlichen Beleg trotz vorhandener Suchtreffer wird damit noch nicht zuverlässig erkannt.
4. **Deployment:** Der Workflow wartet jetzt auf die wiederverwendete CI des gleichen Commits. Python-Eval-Tests sind ebenfalls Teil dieser Prüfung.
5. **Sicherheitsupdates:** Der erste Deploy-Versuch wurde vor jeder Produktionsänderung durch den bestehenden Audit gestoppt. Next.js/ESLint-Konfiguration wurden auf 16.3.5, Wrangler auf 4.131.0 und passende Workers-Typen aktualisiert; betroffene transitive Pakete wurden innerhalb ihrer Versionsbereiche aktualisiert. Der Frontend-Audit ist jetzt ebenfalls verpflichtend. Produktionsabhängigkeiten: kein npm-Audit-Befund; Entwicklungsabhängigkeiten: zwei moderate Vitest-Befunde, keine hohen/kritischen Befunde. Kein öffentlich erreichbarer Vitest-Server wird betrieben.

### Weiterhin offene Freigabepunkte
- Vollständige externe Registrierung einschließlich Bestätigung und erster Quellenantwort praktisch nachweisen.
- DMARC ergänzen und tatsächliche Mailheader prüfen; keine Garantie für Posteingangszustellung.
- Crawl-Abrechnung unabhängig vom Browser, Reservierungsabgleich und konkurrierende Vorgänge testen.
- SQL-Buchungsinvarianten an echter Datenbank prüfen; die neuen Refund-Tests prüfen Anwendungscode und RPC-Aufrufe, nicht PostgreSQL-Nebenläufigkeit.
- Kontolöschung, verifizierte Bonusvergabe, SSRF-/DNS-Rebinding-Schutz, Zahlungen und Rückerstattungen sowie RAG-Qualitätskriterien vollständig abnehmen.
- Echte Pilotnutzer gewinnen und beobachten. Das ist weder durch Tests noch durch den Deploy erledigt.

### Phase 3: Echte Nutzergewinnung (Validierung)
1. 5 Personen aus dem eigenen Netzwerk einladen, eine eigene Website zu crawlen und Fragen zu stellen.
2. Beobachten, an welcher Stelle Nutzer hängenbleiben (Verständlichkeit, Crawl-Dauer, Antwortqualität).
