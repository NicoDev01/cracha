# Abnahme: Schutz gegen SSRF und DNS-Rebinding im Crawler

Stand: 24.09.2026. Ergebnis: **bestanden**, 29 von 29 Prüfungen, der Köder-Server wurde kein einziges Mal erreicht.

## Was geprüft wurde

Der Crawler ruft Adressen ab, die Nutzer eingeben. Ohne Schutz könnte jemand ihn auf interne Ziele lenken: den eigenen Rechner (`127.0.0.1`), private Netze oder den Metadaten-Dienst der Cloud (`169.254.169.254`). DNS-Rebinding umgeht eine einfache Prüfung, indem ein Name bei der Prüfung auf eine öffentliche und beim Verbindungsaufbau auf eine interne Adresse zeigt.

Der Crawler schützt drei Wege (`services/crawler/cracha_crawler/security.py`):

- **HTTP-Client** (Sitemaps, robots.txt, direkte Abrufe): `SSRFSafeNetworkBackend` löst den Namen einmal auf, prüft jede Adresse und verbindet sich mit genau der geprüften IP.
- **Browser** (Chromium über Crawl4AI): Aller Verkehr läuft über `SafeEgressProxy`, der dieselbe Prüfung macht. `--proxy-bypass-list=<-loopback>` verhindert, dass Chromium `localhost` am Proxy vorbeischickt.
- **Weiterleitungen**: Jeder Sprung wird neu geprüft.

## Wie geprüft wurde

`services/crawler/acceptance/ssrf_acceptance.py` startet einen Köder-Server und versucht ihn über alle bekannten Umwege zu erreichen. Gezählt wird, ob eine Anfrage ankommt, nicht nur, ob eine Fehlermeldung erscheint.

Der Lauf findet auf Modal im Produktions-Image statt (`acceptance/modal_ssrf_acceptance.py`). Lokal ist der Test wertlos: Router wie die FritzBox verwerfen DNS-Antworten mit privaten Adressen, die Rebinding-Domain kommt dort nie bei `127.0.0.1` an.

```bash
cd services/crawler
../../venv/Scripts/python.exe -m modal run acceptance/modal_ssrf_acceptance.py
```

## Ergebnis

| Bereich | Fälle | Ergebnis |
|---|---|---|
| Adressformen | `localhost`, `localtest.me`, `*.nip.io` auf 127/10/169.254, `2130706433`, `0x7f000001`, `127.1`, `0`, `[::1]`, `[::ffff:127.0.0.1]`, `metadata.google.internal`, `file:`, `gopher:`, Zugangsdaten in der URL | alle abgewiesen |
| HTTP-Client | nip.io auf Loopback, DNS-Rebinding (20 Versuche, Domain lieferte nachweislich `127.0.0.1`), öffentliche Weiterleitung auf Loopback und auf `169.254.169.254` | 0 Treffer am Köder |
| Browser | direkte Navigation auf `127.0.0.1`, `localhost`, nip.io, `[::1]`, DNS-Rebinding (10 Versuche), `fetch` und `<img>` aus Seitenskripten | 0 Treffer am Köder |
| Gegenprobe | `example.com` über Client und Browser | erreichbar |

Die IP-Einstufung (`_is_public`) wurde zusätzlich unter Python 3.12 (Produktion) und 3.14 (lokal) mit privaten, reservierten, IPv4-gemappten, 6to4- und NAT64-Adressen geprüft: keine Abweichung.

## Grenzen

- Die Rebinding-Domain `rbndr.us` und `httpbin.org` sind fremde Dienste. Fallen sie aus, schlägt die Prüfung „rebinding domain really alternates“ fehl, statt fälschlich zu bestehen.
- Nicht geprüft: UDP aus dem Browser (WebRTC) läuft nicht über den Proxy, ein Seitenskript könnte also UDP-Pakete an interne Adressen schicken. Schließen ließe sich das mit dem Chromium-Flag `--force-webrtc-ip-handling-policy=disable_non_proxied_udp` in `crawl.py`.
- Öffentliche Hosts auf beliebigen Ports sind erlaubt.
