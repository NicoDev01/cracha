# Cracha: erste aktive Nutzer und verlässlicher Betrieb

Stand: 18. September 2026. Arbeitsplan, keine Zusage für Wachstum.

## Ausgangslage

Die vorherige Live-Prüfung zeigte vier Supabase-Accounts; der jüngste stammt
vom 20. August. Cloudflare Web Analytics schließt EU-Besucher aus. Deshalb
sind die dort sichtbaren 90 Besuche in 30 Tagen keine vollständige Grundlage
für eine Conversion-Rate. Die 70.780 Requests stammen aus der kontoweiten
30-Tage-Ansicht und sind keine Nutzerzahl.

Bei der Prüfung am 18.09. verwendete Supabase trotz E-Mail-Bestätigung den
eingebauten Maildienst, der nur an Team-Adressen liefert. Laut Übergabe vom
19.09. ist inzwischen Resend SMTP aktiv; erste Bestätigungsmails landen im Spam.
Die öffentliche DNS-Prüfung findet SPF und DKIM, aber noch keinen DMARC-Eintrag.
Der Google-Einstieg wurde bis zur Google-Anmeldeseite geprüft; ein vollständiger
neuer Account wurde in dieser Prüfung nicht angelegt.

## Erfolg definieren

Ein aktivierter Nutzer hat mit einer eigenen öffentlichen Website eine
Wissensbasis erstellt und mindestens eine hilfreiche Antwort mit überprüfbarer
Quelle erhalten. Ein wiederkehrender Nutzer nutzt Cracha an einem anderen Tag
erneut. Requests, Registrierungen und bezahlte Kunden separat ausweisen.

Erstes Lernziel: fünf Personen aus derselben Zielgruppe bei ihrem echten
Anwendungsfall beobachten. Das ist eine kleine qualitative Probe und kein
statistischer Nachweis für Produktnachfrage.

## Reihenfolge

1. **Einstieg funktionsfähig machen.** Eigenen SMTP-Versand mit verifizierter
   Absenderdomain einrichten. Registrierung mit einer externen Adresse samt
   Bestätigung und erster Nutzung testen; separat Google mit einem neuen
   Konto prüfen. Es müssen weder Zahlungsdaten noch ein Kauf für den Test
   erforderlich sein. Im Code sind 100 Start-Credits vorgesehen; den tatsächlich
   vergebenen Kontostand beim Test prüfen.
2. **Besucher nachvollziehbar begleiten.** Ausprobieren führt zu Registrierung,
   bestehende Sessions weiterhin zum Dashboard. Rechtstext-Links müssen
   funktionieren, Bestätigungsanweisungen sichtbar bleiben.
3. **Messung für die Zielgruppe herstellen.** EU-Ausschluss bewusst entscheiden
   und die Datenverarbeitung passend dokumentieren. Vor einer neuen
   Tracking-Integration prüfen, was vorhandene Web Analytics und serverseitige
   Erfolgsereignisse leisten. Keine E-Mails, Prompts oder gecrawlten Inhalte
   in Marketing-Events übernehmen.
4. **Einen Anwendungsfall gewinnen.** Erst danach gezielt Besucher auf eine
   nachvollziehbare Demonstration lenken. Keine breite Anzeigenkampagne,
   solange Registrierung und erste Antwort nicht nachweislich funktionieren.

## Zielgruppe als prüfbare Hypothese

Bis zur Rückmeldung des Betreibers: deutschsprachige Personen, die regelmäßig
in umfangreichen öffentlichen Produkt- oder Hilfedokumentationen recherchieren.
Das passt zur vorhandenen Funktion: Website einlesen, Fragen stellen, Quellen
prüfen. Ein eingebetteter Supportbot auf der Website des Kunden wird damit
nicht versprochen.

Vorschlag für die Botschaft:

> Finde Antworten in umfangreichen Website-Dokumentationen – mit Links zu den
> Originalstellen. Starte mit einer Website und prüfe die erste Antwort selbst.

Die Demo sollte eine erlaubte öffentliche Quelle, eine konkrete Frage, die
tatsächliche Antwort samt Quellenlink und die benötigten Schritte zeigen.
Keine simulierten Ergebnisse als echte Produktergebnisse ausgeben.

## Erster Versuch über zwei Wochen

- **Tage 1–3:** SMTP und Verfügbarkeit klären; E-Mail- und Google-Registrierung,
  Crawl, Credit-Vergabe und erste Antwort durchgehend prüfen.
- **Tage 4–7:** Fünf passende Testpersonen über bestehende Kontakte des
  Betreibers gewinnen. Jede bringt eine eigene Aufgabe mit. Beobachten, wo
  sie ohne Hilfestellung weiterkommt und wo sie abbricht. Ansprache und
  Veröffentlichung erfolgen erst nach konkreter Autorisierung.
- **Tage 8–14:** Eine ehrliche Fallstudie mit Ergebnis und Grenzen erstellen.
  Einen passenden Kanal testen, etwa einen fachlichen Beitrag im bestehenden
  Netzwerk. Kanal mit einem konsistenten UTM-Link kennzeichnen. Keine
  behaupteten Suchvolumina oder erfundenen Kundenstimmen.
- **Auswertung:** Welche Teilnehmer erreichten die erste hilfreiche Antwort?
  Welche kamen später zurück? Welches Hindernis wurde tatsächlich beobachtet?
  Erst daraus die nächste Änderung und weitere Reichweite ableiten.

SEO-Basis (Sitemap, Robots, Canonical und Open Graph) ist im Repository bereits
vorhanden. Als nächster SEO-Schritt eignen sich belastbare Inhalte zum gewählten
Anwendungsfall und die Prüfung der Indexierung in Search Console. Eine
allgemeine Sammlung automatisch erzeugter Keyword-Seiten ersetzt dies nicht.

## Messpunkte und Diagnose

| Messpunkt | Bedeutung bei ausbleibendem Folgeschritt |
|---|---|
| Qualifizierter Besuch → Einstiegsklick | Angebot, Zielgruppe oder Verständlichkeit prüfen |
| Registrierung angezeigt → abgeschickt | Formularhürden und Clientfehler prüfen |
| Abgeschickt → Account bestätigt | Auth-Fehler, Mailversand und Bestätigungslink prüfen |
| Bestätigt → Crawl erfolgreich | Startguthaben, Anleitung und Crawler prüfen |
| Crawl erfolgreich → hilfreiche Antwort | Retrieval, Quellen und Nutzeraufgabe prüfen |
| Erste Antwort → spätere Nutzung | Wiederkehrenden Nutzen prüfen |

Diese Ereigniskette ist ein Messkonzept, noch keine implementierte Erfassung.
Eigene Tests, Bots und organische Nutzung getrennt behandeln. Bei fehlendem
Besucher-Nenner keine Conversion-Rate errechnen. Wenige Fälle qualitativ
bewerten; keine allgemeingültigen Prozentziele aus dieser Stichprobe ableiten.

## Betrieb unabhängig vom Traffic

Supabase kann Free-Projekte bei geringer Aktivität über sieben Tage pausieren.
Ein statischer Startseitenbesuch muss Supabase nicht erreichen. Wachsende
Besucherzahlen garantieren deshalb keinen dauerhaft aktiven Backend-Dienst.

- **Verlässliche Variante:** Pro-Tarif, aktuell ab 25 USD pro Monat;
  tatsächliche Gesamtkosten hängen von Projekten, Compute und Nutzung ab.
  Keine automatische Inaktivitätspause in einer Pro-Organisation. Ein Upgrade
  löst den fehlenden SMTP-Versand nicht automatisch.
- **Ohne zusätzliche Fixkosten:** Pausenrisiko ausdrücklich akzeptieren,
  Projekt vor einer Testeinladung prüfen und bei Bedarf wiederherstellen.
  Eine echte Funktionskontrolle kann Störungen erkennen. Sie ist keine
  zugesicherte Verhinderung der Inaktivitätspause. Kein künstlicher Traffic
  wird als Produktnutzung gezählt.

Offene Entscheidungen: erste Zielgruppe, vorhandene Reichweitenkanäle,
Budget für Betrieb und verfügbarer Mailanbieter samt Absenderdomain.
Kein Tarifwechsel, Mailversand oder Tracking-Umschalten wurde durchgeführt.

## Quellen

- [Supabase: Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supabase: Preise](https://supabase.com/pricing)
- [Supabase: Billing](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase: SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Cloudflare: Web Analytics FAQ](https://developers.cloudflare.com/web-analytics/faq/)
- [Google: Search Essentials](https://developers.google.com/search/docs/essentials)
