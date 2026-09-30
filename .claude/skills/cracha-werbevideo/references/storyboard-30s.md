# Entwurf: CraCha-Werbevideo „Frag deine Website“ (30 s)

Erster Plan nach dem Skill, noch nicht gebaut. Zum Personalisieren sind Domain, Frage, Antwort, Claim und CTA Props.

## Eckdaten

| | |
|---|---|
| Länge | 30,0 s = 60 Beats = 15 Takte bei 120 BPM |
| Format | 1920×1080, 60 fps (9:16-Variante über Layout-Props) |
| Welten | **Voll** (Vollfläche `accent`/`ink`/`flash`, Kinetic Type) und **Hell** (`paper`, UI) |
| Ton | Musik aus Cues; Breakdown im Produktteil mit UI-Foley vorn; Drop auf die Antwort |
| Bildschirmtext | Hook und Finale groß, sonst echte UI-Beschriftung |

## Beat-Sheet

| # | Zeit | Beats | Welt | Was passiert | Übergang raus | Ton |
|---|---|---|---|---|---|---|
| **1 Punkt** | 0,0–2,0 | b0–b3 | Voll `ink` | HUD zeichnet sich („01 · FRAGE“). Orange Punkt pulsiert auf jedem Beat, Ringe dehnen sich (Ref. 1) | Punkt → Iris in `accent` | Kick ab b0, Riser |
| **2 Hook** | 2,0–4,0 | b4–b7 | Voll | Ein Wort pro Beat, Hintergrund wechselt jedes Mal: **„SUCHEN.“** (`accent`) · **„KLICKEN.“** (`ink`) · **„SCROLLEN.“** (`flash`) · **„NICHTS.“** (`paper`, Wort als Outline-Tapete wie „NEVER“) | Buchstaben von „NICHTS.“ schrumpfen zu Punkten, einer bleibt | Slam je Beat |
| **3 Link** | 4,0–7,0 | b8–b13 | Hell | Der Punkt wird zum Cursor, der Cursor zieht die Eingabe-Pille auf. `docs.example.com` tippt sich, Klick auf **„Analysieren“** (Ref. 2) | Pille wächst nach unten zur Karte | Breakdown: Musik gefiltert, Tippen, Klick |
| **4 Crawl** | 7,0–11,0 | b14–b21 | Hell | Aus der Karte fliegen Seiten als Punkte auf einen Orbit (Ref. 3), Zähler **„12 → 31 → 48 Seiten erfasst“**, Knoten verbinden sich zu Ebenen (Match-Cut Punkt → Knoten, Ref. 1). HUD „02 · CRAWL“ | Orbit zieht sich zusammen, Haken ploppt | Tick pro Seite, steigende Tonhöhe |
| **5 Bereit** | 11,0–12,0 | b22–b23 | Hell | Haken mit Schockwelle, Pille **„Wissensbasis bereit ✓“** (Ref. 3) | Pille morpht zum Chatfenster | Pop, Stille auf b23 |
| **6 Frage** | 12,0–14,0 | b24–b27 | Hell | Chat öffnet sich, Frage tippt: **„Wie lange werden Backups aufbewahrt?“**, Senden | Blase fährt hoch | **Drop auf b24**, Klick |
| **7 Antwort** | 14,0–17,0 | b28–b33 | Hell | Antwort streamt, **„30 Tage“** und **„90 Tage“** bekommen `accent`-Pillen (Ref. 2). Fußnote ② → Hover-Karte mit Zitat (Match-Cut Chip → Karte). HUD „03 · QUELLE“ | Karte kollabiert zum Punkt | Pop je Pille, Whoosh |
| **8 Dreiklang** | 17,0–20,0 | b34–b39 | Hell → Voll | **„Link rein.“ / „Frag.“ / „Mit Quelle.“** je 2 Beats, Blur-In, letzte Zeile `accent` (Ref. 3) | Iris in `ink` | Snare-Fill |
| **9 Beweis** | 20,0–24,0 | b40–b47 | Voll | Kinetic Type, ein Element pro Beat, Hintergründe wechseln: **„500“** Seiten (Zähler rollt) · **„5“** Ebenen · **„1 Klick“** · **„0 Raten.“** Die Zahl ist jeweils randfüllend, Einheit als Serif-Kursiv darunter (Ref. 1) | Letzte Ziffer „0“ wird Ring | Slam je Beat |
| **10 Durchstreichen** | 24,0–26,0 | b48–b51 | Hell | **„Kein Suchen. Kein Raten.“** grau, `accent`-Strich streicht durch (Ref. 3) | Striche werden Partikel | Swish |
| **11 Logo** | 26,0–30,0 | b52–b59 | Voll `accent` → Hell | Schockwellen-Ring, Partikel ziehen sich zur **CraCha-Wortmarke** (Ref. 1). Claim **„Frag deine Website.“**, URL-Pille **„100 Start-Credits gratis →“** (Ref. 3), HUD-Zeile „CRAWL · INDEX · CHAT · MIT QUELLE“. Stillstand ab b56 | – | Schlussakkord b52, Ausklang |

## Rhythmus der Belohnungen

Hook-Wörter (2–4 s), Link getippt (5,5 s), Zähler steigt (7–11 s), Haken (11 s), Drop mit Frage (12 s), Pillen in der Antwort (15 s), Quelle (16 s), Dreiklang (17–20 s), Zahlen (20–24 s), Logo (26 s).

## Personalisierung (Props)

`domain`, `question`, `answer` (mit markierten Schlüsselwörtern), `sourceTitle`, `hookWords[4]`, `triad[3]`, `proof[4]`, `claim`, `cta`, `format` (`16:9` | `9:16` | `1:1`).

## Zu klären vor dem Bau

- Stimmen die Beweise „1 Klick“ und „0 Raten“ als Aussage, oder nur belegbare Zahlen (500 Seiten, 5 Ebenen, Quelle bei jeder Antwort)?
- Maskottchen ja/nein.
- Display-Schrift für Kinetic Type.
