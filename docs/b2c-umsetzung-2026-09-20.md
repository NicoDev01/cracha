# B2C-Verbesserungen vom 20. September 2026

## Implementiert

Das bestehende Design, die Infrastruktur und der Tarif bleiben erhalten: 100 Start-Credits, 1 Credit pro indexierter Seite, 5 pro Antwort, Pakete zu 10/25/50 Euro. Credits sind feste Nutzungseinheiten, keine Abrechnung nach tatsächlich erzeugten Modell-Tokens.

### Chat und Antworten

- Besitzergebundener Browser-Verlauf mit mehreren Unterhaltungen je Wissensbasis, wiederhergestellten Datumstypen, Export und Löschung. Bei Abmeldung/Kontowechsel wird der lokale Verlauf entfernt. Nicht zuordenbare Verläufe aus dem bisherigen Speicherformat werden nicht in ein anderes Konto übernommen: **vor dem Update wichtige bestehende Chats exportieren**.
- Stream-Ereignisse bleiben an ihre ursprüngliche Unterhaltung gebunden. Wechsel und Stoppen brechen den Transport ab. Eingaben bleiben bei fehlgeschlagenen Anfragen erhalten; „Erneut versuchen“ füllt die Frage zur kontrollierten erneuten Übermittlung ein.
- Kosten, Guthaben, Aufladung, Rückerstattungsinformationen und Supportreferenzen sind sichtbar. Hilfreich-/Nicht-hilfreich-Markierungen bleiben lokal und erscheinen im Markdown-Export; sie werden nicht als zentral erfasste Produktanalyse ausgegeben.
- Ein wiederholter Request mit derselben ID kann keinen zweiten kostenpflichtigen Modelllauf auslösen. Serverseitige Ratenlimits gelten für Chat, Sitemap-Analyse und Checkout.
- Explizites Modell-Tokenlimit, fehlender Streamabschluss, ungültige Frames und Zeitüberschreitungen werden als Fehler behandelt. Vollständig unbelegte Listen fallen nicht mehr auf den ursprünglichen ungeprüften Text zurück. Vollständigkeitsbehauptungen werden auf die bereitgestellten Quellen begrenzt.
- Technische Fehler werden erstattet. Stoppen nach bereits ausgegebenem Antworttext bleibt berechnet; sonst ließen sich Antworten durch Abbruch direkt vor dem Abschluss beliebig kostenlos erzeugen. Diese Regel steht im Chat und in den Bedingungen.
- AI-Gateway-Inhaltslogging wird für die Generation explizit deaktiviert. Providerfehler werden nicht als rohe Inhalte protokolliert.

### Crawl und Abrechnung

- PostgreSQL vergibt maximal eine offene Crawl-Reservierung pro Konto unter einer Kontosperre. Ein bloßer KV-Statuscheck entscheidet das nicht mehr.
- Eine Wissensbasis wird erst nach erfolgreicher Abrechnung für Chat freigegeben. Auch ein verspätet auf „active“ gesetzter abgebrochener Crawl umgeht diese Freigabe nicht.
- Der Crawler schreibt seinen Endstatus dauerhaft und meldet die Abrechnung unabhängig vom Browser zurück. Ein geplanter Modal-Lauf versucht fehlgeschlagene Rückmeldungen erneut. Unbestätigte Endzustände werden nicht durch die Statusbereinigung gelöscht.
- Reservierungen werden nicht allein wegen ihres Alters freigegeben. Bei ungewisser Zustellung bleibt die deterministische Job-ID verfügbar; ältere Reservierungen werden beim Guthabenabruf mit dem tatsächlichen Crawlerstatus abgeglichen.
- Preisvorschau, tatsächlich bezahlbarer Umfang, Restguthaben und verbleibende Fragen stehen vor dem Start. Monitor und Verlauf unterscheiden abgerufene, indexierte und übersprungene Seiten sowie teilweise Indexierung.
- Stripe-Zahlungen werden gegen Checkout, Paketpreis und tatsächliche Zahlung geprüft. Rückzahlungen werden kumulativ abgezogen, Zahlungsstreitigkeiten sperren die Nutzung und gewonnene Streitigkeiten geben nur den berechtigten Anteil wieder frei. Wiederholte und verspätete Ereignisse erzeugen keine zusätzlichen Credits. Bereits verbrauchte zurückgebuchte Credits können einen sichtbaren Fehlbetrag verursachen.
- Checkout prüft EUR-Bruttopreise mit inklusiver Steuerbehandlung, sammelt die Rechnungsadresse und korrigiert die Adresse vorhandener Kunden. Neue frei einlösbare Rabattcodes werden nicht angeboten; bestehende vollständig rabattierte Sessions können abgeschlossen werden.
- Der sofortige Leistungsbeginn wird serverseitig verlangt und mit Text, Version und Zeitpunkt gespeichert. Ein pauschaler Widerrufsverzicht wurde entfernt. Rechnungen und eine Statusabfrage nach Checkout ergänzen die Buchungsübersicht.

### Produkt und Kommunikation

- Tatsächlich verwendeter Header und Navigation zeigen Guthaben und funktionierende Konto-/Support-Ziele. Die funktionslose Benachrichtigungsattrappe ist entfernt.
- Konto-Seite mit optionalem Namen, Passwort-Reset, Datenexporthinweis und ausdrücklich als Anfrage gekennzeichneter Kontolöschung. Eine automatisierte Löschung mit vollständigem Datenabgleich und Belegaufbewahrung wird nicht vorgetäuscht.
- Registrierung mit optionalem Namen, beschrifteten Passwortschaltern, Bestätigungs-Mail erneut senden und Adresskorrektur. Die zusätzliche Supabase-Signup-Hook-Funktion verhindert die Umgehung der hinterlegten Wegwerf-Domainliste über direkte API-Aufrufe, **sobald sie aktiviert wurde**.
- Landingpage mit gemeinsamem Tarif, Rechenbeispiel, Paketpreisen, klarer Credit-Erklärung und als redaktionell geprüft gekennzeichnetem Beispiel mit MDN-Quelle. Datenschutz, Nutzungsbedingungen und Widerruf beschreiben die tatsächlich verwendeten Dienste und die Browserhistorie.
- Release-ID und ein öffentlicher Smoke-Test prüfen nach künftigen Deployments, dass die richtige Version und die aktuelle Preiskommunikation unter der öffentlichen Domain ankommen.

## Vor Produktionsfreigabe auszuführen

1. Bestehende Chats bei Bedarf exportieren. Neue SQL-Migrationen zunächst in Staging anwenden, dann vor dem Frontend-Release in Produktion: `20260920090000_billing_guards.sql` und `20260920091000_signup_email_guard.sql`. Vorhandene offene Alt-Crawls vorher abschließen/abgleichen; deren alte Job-IDs sind nicht identisch mit den neuen Reservierungsreferenzen.
2. Im Modal-Secret `cracha-crawler-secrets-v2` setzen: `CRAWLER_SETTLEMENT_URL=https://cracha-app.com/api/internal/crawl-settlement`. Der gemeinsame `CRAWLER_API_SECRET` muss mit dem Frontend übereinstimmen. Crawler und Frontend gemeinsam ausrollen. Callbackfehler werden erneut versucht; bis zur Bestätigung bleibt die Wissensbasis gesperrt.
3. In Supabase unter Auth → Hooks → Before User Created `public.before_user_created` auswählen. E-Mail-Bestätigung und die vorhandenen Auth-Ratenlimits aktiv lassen. Eine kleine Domainliste ist kein vollständiger Schutz gegen Mehrfachkonten.
4. Stripe-Pakete prüfen: EUR, 1000/2500/5000 Cent, `tax_behavior=inclusive`, passende Steuercodes/Registrierungen und Stripe Tax. Webhook-Ereignisse: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`, `charge.dispute.funds_reinstated`, `charge.dispute.funds_withdrawn`. Rechnungs-/Belegversand konfigurieren.
5. In Stripe-Testmodus einen Kauf, verzögerte Zahlung, wiederholten Webhook, Teilrückzahlung, vollständige Rückzahlung und Streitigkeit durchspielen. Callback-Ausfall und geschlossenen Browser beim Crawl prüfen. Es wurden hier keine echten Zahlungen ausgelöst und keine Produktionsmigrationen angewandt.
6. Rechtliche Endprüfung einschließlich Einordnung der Leistung, dauerhafter Vertragsbestätigung mit vollständigen Bedingungen/Widerruf, Minderjährigen, Umsatzsteuer und tatsächlicher Aufbewahrungsfristen. Die Implementierung ersetzt diese Prüfung nicht; eine verlinkte Webseite allein ist kein Nachweis einer vollständigen Vertragsbestätigung auf dauerhaftem Datenträger.
7. `evals/README.md` beschreibt 40 kuratierte Fälle aus vier versionierten synthetischen Quellen. Diese Quellen in isolierte Wissensbasen importieren und den echten Retrieval-/Chat-Pfad ausführen. Die lokalen Tests prüfen das Verhalten und das Auswertungswerkzeug; sie belegen keine gemessene Antwortqualität des produktiven Modells.

## Bewusst kein zusätzlicher Komplettumbau

- Keine neue RAG-Plattform, kein externes Analytics-SDK und keine interaktive öffentliche Demo. Für den ersten Pilotlauf mit 5–10 Nutzern Zeit bis zur ersten hilfreichen Antwort, Abbruchstellen, wiederkehrende Nutzung und Kaufbereitschaft erheben. Vorhandene Buchungen/Jobs liefern Nutzungszahlen; freiwillig geteilte Exporte ergänzen Qualitätsfeedback.
- Die bisherige DNS-/URL-Prüfung ist keine vollständige, verbindungsgebundene Netzisolierung des Browsers. DNS-Rebinding und Browser-Unteranfragen bleiben ein Infrastruktur-Härtungspunkt vor einer stärkeren öffentlichen Skalierung. Keine unbelegte Behauptung „SSRF vollständig verhindert“.
- Keine pauschale Margengarantie aus fest verdrahteten Modellkosten. Die entsprechenden irreführenden Tests wurden entfernt. Echte Provider-/Containerkosten und Speicherbestand beobachten, bevor Tarifänderungen oder zusätzliche Aufbewahrungsregeln beschlossen werden.
- Neue Zahlungstabellen verhindern versehentliches kaskadierendes Löschen der Zahlungszuordnung. Der Support braucht einen dokumentierten Lösch-/Aufbewahrungsprozess; keine direkten Auth-Löschungen ohne diesen Abgleich.

## Quellen für die Implementierungsentscheidungen

- [Stripe: Checkout-Sessions abrufen](https://docs.stripe.com/api/checkout/sessions/retrieve), [Sessions nach PaymentIntent suchen](https://docs.stripe.com/api/checkout/sessions/list)
- [Supabase: Before User Created Hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook)
- [BGB §356](https://www.gesetze-im-internet.de/bgb/__356.html), [BGB §312f](https://www.gesetze-im-internet.de/bgb/__312f.html)
- [Cloudflare: AI Gateway Logging](https://developers.cloudflare.com/ai-gateway/observability/logging/)
- [MDN: HTML-Link-Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a)

## Prüfprotokoll

Abschließende Ergebnisse werden nach Integration ergänzt. SQL-Regressionsfälle liegen in `supabase/tests`; `scripts/test-billing.py` verwendet in CI eine leere PostgreSQL-17-Service-Datenbank und prüft zusätzlich parallele Reservierungen und doppelte Chat-Requests. Lokal wurden die SQL-Fälle in PGlite ausgeführt, nicht auf der produktiven Supabase-Datenbank.
