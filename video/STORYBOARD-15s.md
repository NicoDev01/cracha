# CraCha – 15-Sekunden-Produktfilm „Ein Container“

## Film in einem Satz

Ein einziges weißes UI-Element verwandelt sich ohne Schnitt von der Adresszeile über den Crawl zur belegten Antwort. So sieht man, dass CraCha aus einer URL eine Wissensbasis macht, die mit Quelle antwortet.

**Der Kniff:** Das Auge muss nie springen. Jede Funktion entsteht aus der Form davor. Das Eingabefeld wächst zur Karte, die Karte zum Fortschritt, der Fortschritt zum Chat, eine Fußnote zur Quelle und der Container am Ende zum Logo.

## Eckdaten

| | |
|---|---|
| Länge | 15,0 s = 30 Beats bei 120 BPM (1 Beat = 0,5 s = 30 Frames) |
| Format | 1920 × 1080, 16:9, 60 fps |
| Bühne | warmes Off-White `#f5f0e9`, Tinte `#17120f`, **eine** Akzentfarbe Orange `#ea580c` (Landingpage) |
| Schrift | Urbanist (Headlines, wie Landingpage) und Inter (UI, wie Dashboard) |
| Bewegung | Federn mit minimalem Überschwingen, Größe, Eckenradius und Inhalt morphen gemeinsam, Inhalt tauscht hinter kurzer Unschärfe (≈ 6 px, 0,2 s) |
| Verboten | hüpfendes Easing, Glows, Verläufe auf UI-Flächen, Partikel, Leerlauf ohne Bewegung |
| Ton | im Code synthetisiert: 120 BPM, weicher Kick auf jedem Beat, Hi-Hats, Bass, Pad. UI-Klicks auf Cursor-Aktionen, leiser Whoosh auf jedem Morph |

## Material und Belege

- **Logo:** echter Wortmarken-Pfad aus `public/images/logo/logo.svg`.
- **UI:** Das Dashboard liegt hinter dem Login, deshalb gibt es keine Screenshots. Die Oberflächen werden 1:1 aus dem Quellcode nachgebaut, mit echten Beschriftungen, Abständen und Komponenten aus `crawl-config-form.tsx`, `crawl-monitor.tsx`, `search-progress.tsx`, `citation.tsx` und `source.tsx`.
- **Abweichung:** Im Dashboard ist die Akzentfarbe Blau (`brand-500 #465fff`). Der Film nutzt das Orange der Landingpage, damit es nur eine Akzentfarbe gibt.
- **Beispieldaten:** Die Beispiel-Domain `docs.example.com` ist reserviert und gehört keiner Firma. Die Zahlen (48 Seiten, Backups 30/90 Tage) sind fiktiv.
- **Belegbare Aussagen:** bis zu 500 Seiten pro Crawl und bis zu 5 Ebenen Tiefe (Slider-Grenzen im Formular, Features-Sektion), Quellen unter jeder Antwort sowie 100 Start-Credits gratis (Hero).
- **Bewusst weggelassen:** Content-Check, BYOK-Gemini und das Löschen oder Neu-Einlesen von Wissensbasen. In 15 s ist dafür kein Platz ohne Hektik.

## Beat Sheet

`b` = Beat, Zeit in Sekunden. Der Container ist immer im Bild, nur der Hook davor ist reine Typo.

| # | Zeit | Beats | Container (Form) | Was passiert | Ton |
|---|---|---|---|---|---|
| **1 Hook** | 0,0–2,0 | b0–b3 | – → Punkt → Pille | Kinetische Typo, 150 px: **„Jede Website.“** (b0) → **„Deine Wissensbasis.“** (b1, „Wissensbasis“ orange). Auf b3 zieht sich die Schrift unscharf zusammen, aus dem Punkt hinter „Wissensbasis.“ wächst der weiße Container. | Kick ab b0, Whoosh b3 |
| **2 Eingabe** | 2,0–3,5 | b4–b6 | Pille 1100 × 104, r 52 | Globus-Icon, Cursor fliegt ein und klickt (b4). `https://docs.example.com` tippt sich (b4–b5). Klick auf **„Analysieren“** (b6), Spinner. | Klick b4, Tippen, Klick b6 |
| **3 Umfang** | 3,5–5,0 | b7–b9 | Pille → Karte 1100 × 430, r 28 | Die Pille wächst nach unten. Hinweisleiste **„48 Seiten in der Sitemap · Alle einlesen“**, Segment **Einzelne Seite / Unterseiten / Sitemap**, das Highlight gleitet auf Sitemap (b7). Schalter an (b8), Klick **„Crawl starten“** (b9). | Whoosh b7, Klicks b8/b9 |
| **4 Crawl** | 5,0–7,5 | b10–b14 | Karte → Fortschrittskarte 1100 × 520, r 28 | Inhalt tauscht hinter Blur. Gesamtbalken **„2/3 Seiten crawlen“** mit Prozent. Pfade rollen durch (`/docs/setup`, `/pricing` …), Zähler **„48 Seiten erfasst“**. Ab b12 **„3/3 Indexieren“**: 48 Segmente leuchten Seite für Seite auf, **„31 von 48 Seiten durchsuchbar · 402 Abschnitte“**. | Ticks auf den Segmenten |
| **5 Bereit** | 7,5–8,0 | b15 | Karte schrumpft 1100 × 300 | Grüner Haken → **„Bereit“**, Button **„Fragen stellen →“**, der Cursor klickt auf b15. | Klick + heller Akkord |
| **6 Frage** | 8,0–9,5 | b16–b18 | Karte → Chatfenster 1300 × 700, r 24 | Header **„CraCha Chat“** mit Wissensbasis-Chip `docs.example.com`. Die Frage tippt sich: **„Wie lange werden Backups aufbewahrt?“** Senden (b18). | Whoosh b16, Klick b18 |
| **7 Suche** | 9,0–10,0 | b18–b19 | Chat | Nutzerblase fährt hoch. **„Durchsuche die Wissensbasis …“**, Geprüfte Quellen zählt hoch auf 48 · 17 Textstellen, dann **„Wähle die passendsten Quellen …“** · 2 ausgewählt. | leises Rauschen |
| **8 Antwort** | 10,0–11,0 | b20–b21 | Chat | Die Antwort streamt: *„Backups werden **30 Tage** aufbewahrt ①. Im Business-Tarif sind es **90 Tage** ②.“* Darunter **„Verwendete Quellen 2“**. | – |
| **9 Beleg** | 11,0–12,0 | b22–b23 | Fußnote ② → Hover-Karte | Cursor auf ②. Der Chip wird orange, **aus dem Chip morpht die Hover-Karte**: *„Abschnitt: Aufbewahrung ↗“* und das Zitat mit markiertem „Business-Tarif“ und „90 Tage“. | Klick b22 |
| **10 Beweis** | 12,0–13,0 | b24–b25 | Chat → Zahlenkarte 760 × 300 | Der Container schrumpft. **„500“** zählt hoch, darunter *„Seiten pro Crawl · 5 Ebenen tief · jede Antwort mit Quelle“*. | Whoosh b24 |
| **11 Logo** | 13,0–15,0 | b26–b29 | Zahlenkarte → Pille → Logo | Die Karte wird zur Pille und löst sich hinter der **CraCha-Wortmarke** auf, die Buchstaben steigen einzeln auf (b26). Die CTA-Pille **„100 Start-Credits gratis“** in Orange (b27), darunter `cracha.aimpact-agency.workers.dev` (b28). Stillstand ab b29, loopfähig über das Off-White. | Schlussakkord b26, Ausklang |

## Belohnungen im Rhythmus

Etwa alle 1,5–2,5 s gibt es eine sichtbare Wendung: Typo → Container (2,0 s), Sitemap gefunden (3,5 s), Segmente leuchten (6,0 s), Bereit (7,5 s), Antwort (10,0 s), Quelle aus der Fußnote (11,0 s), 500 (12,0 s) und Logo (13,0 s).

## Bildschirmtext

Große Typo steht nur im Hook, in der Zahl und im Logo. Sonst spricht die echte UI-Beschriftung, es gibt keine zusätzlichen Untertitel.

## Produktionsstufen

1. Plan (dieses Dokument)
2. Rig: Container, Cursor, Takt-Helfer
3. Standbilder je Abschnitt und Contact Sheet
4. Vollständiger Durchlauf
5. Feinschliff
6. Ton (`scripts/make-music.mjs`)
7. Render: `out/cracha-15s.mp4` und Poster
