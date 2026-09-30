# Analyse der drei Referenzvideos

Gemessen am 30.09.2026 aus Einzelbildern (4–20 fps) und einer Energie-/Onset-Analyse der Tonspur. Zeiten in Sekunden. Die Originale liegen nicht im Repo (`Downloads/1.mp4`, `2.mp4`, `3.mp4`).

## Video 1: Motion-Showreel („CLAUDE · motion designer“)

**Eckdaten:** 1920×1080, 60 fps, 15,0 s. Musik mit durchgehendem Kick, gemessen ≈ 128 BPM (Onsets alle 0,47 s; das HUD behauptet 120 BPM). Break bei 9,0–11,3 s, danach Kick zurück für das Kinetic-Type-Finale.

**Palette:** Fast-Schwarz `#0e0e10`, Koralle `#ee4b3a`, Creme `#f0ede6`, Elektroblau `#2e2ef0`, Limette `#ddff44` (nur ein Frame). Pro Frame maximal zwei Flächenfarben.

**Typo:** extrabreite, schwere Grotesk in Versalien (randfüllend), kursive Serif als Kontrapunkt („motion designer“), Mono für das HUD.

**HUD:** Eckwinkel, oben rechts Kapitel („01 · IDENTITY“ … „07 · END“), unten links Timecode und Fortschrittslinie, unten rechts „120 BPM ▪▫▫▫ BAR 3/8“. Hält sieben sehr unterschiedliche Kapitel zusammen.

| Zeit | Kapitel | Was passiert | Technik |
|---|---|---|---|
| 0,0–1,7 | Identity | Kleiner Ring → roter Punkt → Strahlen schießen zum Asterisk, Ringe dehnen sich, Schriftkreis rotiert | Aufbau aus einem Punkt, konzentrische Ringe mit Versatz |
| 1,7–1,9 | Übergang | Asterisk kollabiert in 0,1 s zum weißen Punkt | Kollaps zum Punkt |
| 1,9–2,1 | Übergang | Creme-Kreis explodiert aus dem Punkt, darin sofort ein roter Kreis (Doppel-Iris), violetter Farbsaum am Rand | Iris-Wipe mit Chroma-Saum |
| 2,0–2,5 | Titel | „CLAUDE“ baut sich Buchstabe für Buchstabe auf, Buchstaben wachsen von unten (Masken), Linie oben zeichnet sich | Maskierter Buchstaben-Reveal |
| 2,5–3,2 | Titel | Buchstaben werden nacheinander schmal gestaucht (Breite animiert), Serif-Unterzeile blendet ein | Squash & Stretch auf Glyphen |
| 3,2–3,5 | Übergang | Buchstaben schrumpfen einzeln zu Punkten, die Punkte fliegen weiter; diagonaler weicher Wipe auf Creme | **Match-Cut:** Buchstaben → Punkte → Bälle der nächsten Szene |
| 3,5–5,6 | Easing | „Six ways to get from A to B.“ Sechs Bälle mit linear, ease-in-out, expo-out, back-out, elastic, bounce; Geisterspuren zeigen Geschwindigkeit | Motion Blur + Trail |
| 5,3–5,7 | Übergang | Bälle fliegen weg, ein blauer Ball füllt als Iris das Bild | Ball wird Hintergrund |
| 5,7–7,4 | Morphing | Kreis → Dreieck → Stern → Quadrat, die 12 Satelliten morphen synchron mit; rote Outline-Echos hinter der Form | Pfad-Morph + Geisterkopien |
| 7,4–7,6 | Übergang | Quadrat wird 3×3-Raster auf Schwarz, Bögen drehen sich ein | Form → Muster |
| 7,6–9,6 | Systems | Truchet-Muster, Kacheln drehen wellenförmig, rote Welle läuft durch | Kachel-Rotation mit Phasenversatz |
| 9,6–11,1 | Depth | Punktgitter → 3D-Kugel → Torus, rote Punkte als Akzent (Musik-Break) | 3D-Punktwolke |
| 11,1–11,3 | Stille | Schwarz, fast leer | Atempause vor dem Drop |
| 11,3–13,0 | Kinetic Type | „EASE“ (rot) · „IN.“ (schwarz) · „EASE“ (blau, riesig) · „OUT.“ (blau) · „NEVER“ (Limette, dann als Outline-Tapete) · „LINEAR.“ (schwarz, Zoom durch mit Blur); **ein Wort pro Beat, Hintergrund wechselt mit jedem Wort**, roter Punkt als Satzzeichen | Slam, Stretch, Repeat-Tiling, Zoom-Through |
| 13,0–15,0 | End | Roter Grund, Schockwellen-Ring, Partikel ziehen sich zum schwarzen Asterisk, „CLAUDE“ + „motion designer“ + Zeile „SHOWREEL 2026 · 15 SECONDS · EVERY FRAME WRITTEN IN CODE · AVAILABLE FOR NEW PROJECTS“ | Logo aus Partikeln, Lockup |

**Was es cool macht:** jedes Kapitel dauert genau einen Takt; jeder Übergang entsteht aus dem letzten Objekt (Punkt, Buchstabe, Ball, Form). Easing ist extrem: sehr schnelle Starts (expo-out), harte Ankünfte, dazu Motion Blur. Das Finale beschleunigt auf ein Wort pro Beat.

## Video 2: Minimal-Launchvideo („Claude Opus 5.5 for launch videos“)

**Eckdaten:** 1920×1080, 30 fps, 30,0 s. Bis 15,7 s fast stumm (−27 dB Grundpegel) mit reinem UI-Foley: Tippen, Klicks bei 4,1 / 5,96 / 8,4 / 9,4 s. Erst als das erzeugte Video abspielt (15,7 s), setzt Musik mit Achtelnoten (≈ 120 BPM) ein.

**Palette:** warmes Off-White `#eeebe3`, weiße Karten, Tinte, Akzent Rot-Orange `#e8471f` und Koralle `#d97757` (Asterisk). Keine Vollflächen außer einer Karte („And many“).

**Typo:** Serif (Produktname) + Sans (Aussage) als Paar, UI in kleinem Sans.

| Zeit | Was passiert | Technik |
|---|---|---|
| 0,0–4,0 | Titelkarte: „Claude Opus 5.5“ (Serif) blendet ein, „for launch videos“ (Sans) folgt, Block rückt nach links, „Powered by Motion“ klein darunter; Asterisk statisch | Zeilenweises Blur-In, Layout-Verschiebung |
| 4,0–5,9 | Chat-Eingabe unten, Prompt tippt sich, Cursor fährt zum Senden-Button, Klick | Tippen mit Caret, Cursor-Pfad |
| 6,0–10,0 | Nutzerblase oben, Statuskarte „Using Motion“: „Designing…“ → „Adding sound…“ → „Rendering…“, dünner Fortschrittsbalken; Kamera schwebt langsam | Status-Text-Wechsel, Dauer-Push-in |
| 10,0–10,8 | Kamera schwenkt nach rechts auf die Vorschau, das Ergebnisvideo startet | Schwenk statt Schnitt |
| 10,8–13,0 | „We now connect with over +“: jedes Schlüsselwort bekommt eine rote Pille, Icon-Chips hängen sich an, die Zeile scrollt seitlich | Wort-für-Wort-Pillen |
| 13,0–14,0 | „+“-Button riesig, Cursor klickt, Farbe rot → blau | Zoom auf ein Element |
| 14,0–16,0 | Zähler „362 → 440 → 450 Tools“, darunter Halbkreis-Orbit aus App-Icons | Zähler + Orbit |
| 16,0–17,0 | Vertikales Listen-Rad: „Import designs with [Figma]“, Nachbarzeilen blass | Fokuszeile mit Chip |
| 17,0–20,0 | Zurück zum Chat, „Change that.“ tippen, senden, „Refining…“ | Iteration zeigen |
| 20,0–21,0 | v2-Vorschau: Listen-Rad mit neuen Zeilen | Wiederholung mit Variation |
| 21,0–22,5 | Vollflächige rote Karte „And many“ → Karten-Stapel → Icon-Reihe → „More“ im Icon-Kreis | Karten-Morph |
| 23,0–24,5 | Kreis mit rotem Verlauf: „What are you going to build?“, Wort für Wort, „you“ und „build?“ als Pille | Radial-Verlauf, Pillen |
| 24,6–25,7 | Pillen lösen sich vom Text, werden Quadrate und Kreise und **setzen sich zum Replit-Logo zusammen** | Logo aus UI-Formen |
| 26,0–27,0 | Logo + Wortmarke | Lockup |
| 27,0–30,0 | Titelkarte wie am Anfang + „available at motion.so“ | Klammer Anfang/Ende |

**Was es minimalistisch macht:** zu jedem Zeitpunkt genau ein Fokus, alles andere 40 % blass oder außerhalb. Keine Deko, die Oberfläche ist die Grafik. Der Ton gibt Haptik: jeder Tastenanschlag und Klick ist hörbar, weil sonst Stille ist.

## Video 3: Marketing-Video („Muse · Let Muse do your marketing“)

**Eckdaten:** 1920×1080, 30 fps, 29,2 s. Intro 0–5 s leise, ab 5,0 s Beat (≈ 120 BPM, synkopierte Hits bei x,01 / x,45 / x,89). Bildwechsel fallen auf volle Sekunden: 5, 7, 8, 11, 12, 14, 19, 20, 21, 24, 25, 27.

**Palette:** Reinweiß, Tinte, Akzentblau `#1d5bf5`, farbige Markenicons als Konfetti. Maskottchen: Plüsch-Figur mit Kopfhörern (3D-Render).

**Typo:** schwere geometrische Sans, enges Tracking, zweizeilige Headlines, Schlüsselwort blau; Eingabefeld in Mono.

| Zeit | Was passiert | Technik |
|---|---|---|
| 0,0–5,0 | „Muse“ schärft sich aus Blur, Maskottchen ploppt daneben, „for marketing“ (blau) Blur-In, dann „Muse + Meta Ads“; ringsum schwebende App-Icons mit Tiefenunschärfe | Blur-In-Wörter, Parallax-Icons |
| 5,0–7,0 | Riesige Eingabezeile im Anschnitt, Mono-Text „Connect Muse to all my marketing tools“ tippt, Kamera zoomt raus | Tippen, Zoom-Out |
| 7,0–8,0 | Klick, Button morpht zum Haken, Pille „Meta Ads connected ✓“ | Button → Haken-Morph |
| 8,0–11,0 | Maskottchen in der Mitte, Icons fliegen auf einen gepunkteten Orbit, Zähler „2 → 8 → 12 → 75+ tools connected“, Konfetti, Figur jubelt | Orbit + Zähler + Konfetti |
| 11,0–14,0 | „Connect it / to all your / marketing tools“, zeilenweise, Icons driften | Headline-Stack |
| 14,0–16,0 | Chat: Frage-Blase, Antwort tippt, „$1,240“ blau hervorgehoben | Chat, Zahlen-Highlight |
| 16,0–18,5 | Karte „Muse wants to make 2 changes“, Balkendiagramm, Deny/Allow, Cursor klickt Allow, „Approved · 2 changes applied“ | Entscheidungs-Klick |
| 19,0 | „✓ Done!“ | Belohnung |
| 19,5–21,0 | „Ask. / Analyze. / Make changes.“ auf je einen Beat | Dreiklang |
| 21,0–24,0 | Maskottchen links, rechts „Let it watch and manage 24/7.“, Benachrichtigungen stapeln sich mit Uhrzeiten (2:14 → 5:40 → 7:30 → 8:00 AM) | Zeitraffer über Benachrichtigungen |
| 24,0–25,0 | „No freelancers. / No agencies.“ grau, blauer Strich streicht durch | Durchstreichen |
| 25,0–27,0 | Maskottchen jongliert Icons | Sympathie-Moment |
| 27,0–29,0 | Endkarte: Maskottchen zeigt auf „Let Muse do your marketing“, blaue URL-Pille „ryze.ai/muse →“, Logo-Zeile unten | Endkarte mit CTA |

**Was das Pacing gut macht:** jede Sekunde eine neue Information, und jede Information ist eine Belohnung (verbunden, Zahl steigt, Haken, Done). Headlines sind kurz und im Rhythmus gesprochen, ohne Sprecher. Freundlichkeit kommt aus runden Formen, dem Maskottchen, `back`-Easing und Konfetti.

## Gemeinsamer Nenner

1. Ein Fokus pro Moment, viel Leerraum.
2. Übergänge aus Objekten, keine Blenden.
3. Schnitt und Wendung im Takt.
4. Wenige Farben, eine davon als Signal.
5. Anfang und Ende sind dieselbe Karte oder dasselbe Symbol (Klammer).
