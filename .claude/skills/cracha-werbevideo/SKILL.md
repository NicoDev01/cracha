---
name: cracha-werbevideo
description: Stil- und Produktionsleitfaden für CraCha-Werbevideos in Remotion (video/). Kombiniert kinetische Showreel-Motion (Referenz 1), minimalistische UI-Bühne mit Haptik-Sounds (Referenz 2) und beat-getaktetes, freundliches Marketing-Pacing (Referenz 3). Verwenden, wenn ein neues Promo-, Werbe- oder Social-Video für CraCha geplant, gebaut, überarbeitet oder personalisiert wird.
---

# CraCha-Werbevideo

Ein Werbevideo nach diesem Skill ist **minimalistisch auf Weiß (2, 3): ein Element im Fokus, ein professionelles Voice-over erzählt, Schnitte und Wendungen liegen auf dem Beat (3), und die Übergänge sind Morphs, Whips und Kollaps-zum-Punkt (1)**. Text auf dem Bildschirm nur, wo er selbst die Grafik ist.

Die Einzelanalyse mit Zeitmarken steht in [references/analyse.md](references/analyse.md), das gebaute Beispiel (`CraChaAd`) in [references/storyboard-ad.md](references/storyboard-ad.md).

## 1. Die drei Zutaten

| Aus | Übernehmen | Nicht übernehmen |
|---|---|---|
| **1 Showreel** | Kapitel à 1 Takt (2 s), Match-Cuts (Buchstaben → Punkte → nächste Szene), Iris-Wipe aus einem Punkt, Squash & Stretch mit Motion Blur, Form-Morphs mit Geisterspuren, Wort-für-Wort-Finale auf dem Beat, Logo-Auftritt mit Schockwellen-Ring | Wechselnde Vollflächen, HUD, 3D-Punktwolken, Muster: zu viel im Bild |
| **2 Minimal-UI** | Warmes Off-White, eine Akzentfarbe, nur das eine Element im Bild, echte UI als Held, Tipp-/Klick-Foley ohne Musik, Wort-für-Wort-Pillen, vertikales Listen-Rad, Logo aus Pillen gemorpht, ruhiger Dauer-Push-in der Kamera | Weißes UI auf weißem Grund ohne Kontrast bei kleinen Größen, lange Wartezeiten auf Fortschrittsbalken |
| **3 Marketing-Pacing** | Schnitt/Wendung auf jedem 2. Beat (≈ 1 s), Headlines Wort für Wort mit Blur-In, ein Schlüsselwort in Akzentfarbe, Orbit mit Zähler („48 Seiten erfasst“), Haken-Belohnung, Chat-Blasen, Deny/Allow-Klick, Dreiklang („Ask. Analyze. Make changes.“), Durchstreichen, Endkarte mit URL-Pille | Maskottchen (CraCha hat keins), fremde Markenlogos |

## 2. Look

**Eine weiße Bühne.** Kein Wechsel der Hintergrundfarbe, keine Vollflächen, kein HUD, kein Korn. UI ohne Rahmen, wo es geht (Chat = nur Blasen, keine Fensterkarte).

| Token | Wert | Einsatz |
|---|---|---|
| `paper` | `#ffffff` | Hintergrund, immer |
| `ink` | `#141110` | Text, Frage-Blase, Punkt |
| `accent` | `#ea580c` | Einziges Signal: Satzzeichen im Wort-Stapel, Button, Haken, Markierung |
| `soft` / `line` | `#f5f2ee` / `#ece8e3` | Antwort-Blase, Skeleton-Zeilen, Umrisse |
| `accentMark` | `#ffd6b8` | Textmarker in Antwort und Quelle |

Schatten weich und neutral (`SHADOW_SOFT`, `SHADOW_TINY` in `src/ad/kit.tsx`). Keine Verläufe, keine Glows.

**Schrift:**

| Rolle | Schrift | Stil |
|---|---|---|
| Wort-Stapel | Archivo variabel, `'wdth' 112, 'wght' 900`, normale Schreibung, Tracking −3,5 % | passt sich an: ein Wort bis 340 px, vier Zeilen ≈ 200 px |
| Claim | Instrument Serif Italic | „Frag deine Website.“ |
| UI | Inter 400–700 | echte Beschriftung, 36–50 px, damit sie auf dem Handy lesbar bleibt |

## 3. Bewegung

Kurven liegen in `video/src/theme.ts` (`ease`, `prog`, `track`). Zusätzlich:

| Name | Kurve | Wofür |
|---|---|---|
| `ease.inOut` | `bezier(.76,0,.24,1)` | Kamera, Container-Morph, Wipes (Standard) |
| `ease.out` | `bezier(.16,1,.3,1)` | Auftritte, Text-Blur-In |
| `expoOut` | `bezier(.19,1,.22,1)` | Slams in Kinetic Type |
| `ease.back` | `bezier(.34,1.56,.64,1)` | Pillen, Haken, Icons „ploppen“ (freundlich, aus 3) |
| `spring({damping: 14, mass: .6})` | Remotion `spring` | Orbit-Icons, Zähler-Chips |

Bausteine:

0. **Wort-Stapel (3, der Hook-Effekt):** ein Wort erscheint groß in der Mitte; jedes neue Wort ploppt darunter auf, der Block schiebt sich nach oben und verkleinert sich, bis alle Zeilen passen (Federn für das Gewicht jeder Zeile, Größe = min(Maximalgröße, Breite, Höhe/n)). Abgang: Whip nach oben mit Unschärfe oder Kollaps zum Punkt. `Stack` in `src/ad/kit.tsx`.
1. **Blur-In-Wort (3):** jedes Wort `opacity 0→1`, `blur 12→0 px`, `y +24→0`, 0,35 s `ease.out`, Versatz 1 Beat/2 zwischen Wörtern.
2. **Slam (1):** Wort kommt mit `scaleX 1.6→1`, `scaleY 0.6→1` in 0,2 s `expoOut`, dazu Richtungs-Motion-Blur (`@remotion/motion-blur` `CameraMotionBlur`, `shutterAngle 180`, `samples 8`).
3. **Kollaps zum Punkt → Iris (1):** Form schrumpft in 0,1 s auf 12 px Punkt, 1 Beat Pause, Kreis wächst in 0,15 s über die Diagonale; neue Welt liegt im Kreis. Leichter Farbsaum (1–2 px Chroma-Versatz) am Rand.
4. **Match-Cut (1):** das letzte Element einer Szene *ist* das erste der nächsten (Buchstaben → Punkte → Crawl-Knoten, Punkt → Cursor, Pille → Haken, Chip → Hover-Karte).
5. **Form-Morph (1/2):** Kreis → Pille → Karte über Breite, Höhe und Radius gemeinsam (`MorphBox.tsx`); echte Pfad-Morphs mit `@remotion/paths` `interpolatePath` bei gleicher Punktzahl, sonst `flubber` (MIT). 3 Geisterkopien in `accent` mit 40/25/10 % Opazität, je 2 Frames verzögert.
6. **Kamera (2):** Dauer-Push-in 1,00 → 1,04 pro Szene, Schwenks zwischen UI-Teilen `ease.inOut` 0,6 s. Nie statisch länger als 1 s.
7. **Belohnung (3):** Haken ploppt mit `ease.back`, Ring-Schockwelle (Kreis-Outline wächst und blendet aus), optional kurzes Konfetti in Palettenfarben.
8. **Wort-Pille (2):** Wort bekommt eine `accent`-Pille, die von links aufwächst (0,25 s), Text wird weiß.

Verboten: lineare Bewegung (außer als Pointe wie „LINEAR.“ in 1), Crossfades zwischen Welten, mehr als zwei gleichzeitige Hauptbewegungen, Elemente, die nur schweben.

## 4. Timing und Ton

- **Raster:** 120 BPM, 60 fps → 1 Beat = 0,5 s = 30 Frames, 1 Takt = 2 s. Alle Zeitmarken in einer `cues.json` in Beats, wie bei `film15`.
- **Voice-over trägt die Geschichte.** Gemini 3.8 Flash TTS über OpenRouter, Stimme „Puck“, Stil per `speech_metadata`. Das ganze Skript in **einem** Take sprechen lassen (einzelne kurze Zeilen klingen flach und uneinheitlich), mehrere Takes erzeugen, mit einem Audio-Modell bewerten und transkribieren, an den Pausen in Phrasen schneiden und jede Phrase auf einen Beat legen (`vo.clips` in `cues.json`). CraCha als „Kratscha“ schreiben. Das Bild folgt der Stimme; die Musik wird unter der Stimme um ≈ 5 dB abgesenkt.
- **Dramaturgie (Ref. 1 misst ≈ 128 BPM, Ref. 3 ≈ 120 BPM):**
  - Hook laut, 1 Idee pro Beat.
  - Produktteil „Breakdown“: Musik ausgedünnt oder tiefpassgefiltert, UI-Foley vorn (Ref. 2 ist bis 15,7 s fast stumm).
  - Drop auf die Antwort bzw. den Beweis, ab dann Schnitt jeden 2. Beat.
  - Kinetic-Type-Finale: 1 Wort pro Beat.
  - Endkarte: 2 Takte Stillstand, Ausklang.
- **Wendung alle 1–2 s** (Ref. 3). Nichts steht länger als 2 Takte ohne neue Information.
- **Foley (Haptik aus 2):** Tastatur pro Zeichen (leicht zufällig in Tonhöhe und Lautstärke), Klick auf jeden Cursor-Klick, weicher Whoosh auf Morph und Kamera, Pop auf Pillen und Haken, Tick pro Zählerschritt. Quellen: `@remotion/sfx` (MIT-Paket, Lizenz jedes Sounds einzeln prüfen) oder synthetisch per `scripts/make-sfx.mjs`.
- **Musik:** Lyria 3 über OpenRouter (`scripts/make-ad-music.mjs`, Struktur im Prompt nach Sekunden). Lyria liefert 80–120 s statt der verlangten Länge, hält aber das Tempo exakt. Mehrere Takes erzeugen, mit `scripts/beat-grid.mjs` Tempo, Beat-Offset und Lautheit pro Takt messen, den Take wählen, dessen Struktur (Intro, Stopp-Beat, Breakdown, Drop) zur Dramaturgie passt, und in dessen eigenes Ende schneiden (gleiche Position in der 4-Takt-Phrase). `scripts/make-ad-audio.mjs` schneidet und synthetisiert die Foley aus `cues.json`.

## 5. Inhalt

- **Keine Zahlen** (Seitenlimits, Ebenen, Credits ändern sich). Nur Funktionen zeigen: Website eingeben, jede Unterseite wird gecrawlt (visuell: Dutzende Seiten), Wissensbasis, Chat, Antwort mit Quelle, Stelle auf der Originalseite markiert. CTA: „Kostenlos starten“ + `cracha-app.com`.
- UI 1:1 aus dem Quellcode nachbauen (Dashboard liegt hinter Login). Beispiel-Domain `docs.example.com`.
- Pro Szene **eine** Botschaft. Was die Stimme sagt, steht nicht zusätzlich als Untertitel im Bild; großer Text nur im Hook-Stapel, im Finale-Stapel und auf der Endkarte.
- Genug Zeit zum Sehen: Suche ≈ 1,5 s, markierte Quelle ≥ 2 s stehen lassen.
- Deutsch, Du-Form, kurze Imperative und Nominalsätze („Link rein.“, „Frag.“, „Mit Quelle.“).

## 6. Arbeitsablauf

1. **Brief:** Länge, Format (16:9, 9:16, 1:1), Ziel (Anwerben, Launch, Feature), Personalisierung (Zielgruppe, Beispiel-Website, Claim) festhalten.
2. **Beat-Sheet** als `STORYBOARD-<name>.md` nach dem Muster in `references/storyboard-ad.md`: Szene, Beats, Welt (hell/voll), Match-Cut rein/raus, Bildschirmtext, Ton.
3. **Cues:** `src/<name>/cues.json` in Beats; Musik und SFX lesen dieselbe Datei.
4. **Rig:** Wort-Stapel, Blur-In-Wort, Slam, Iris, Morph-Container, Cursor, Orbit, Zähler als Komponenten in `src/<name>/kit.tsx`. Vorhanden und zuerst wiederverwenden: `explainer/kit.tsx` (`Kinetic`, `Headline`, `Pointer`, `Ripple`, `MotionBlur`, `pressAt`, `sp`), `film15/look.ts` (Palette `K`, `settle`, `glide`, JetBrains Mono), `film15/Box.tsx`, `MorphBox.tsx`, `Logo.tsx`.
5. **Standbilder:** je Szene ein `remotion still`, als Contact Sheet prüfen (Lesbarkeit, eine Botschaft, Palette).
6. **Bewegung:** Szene für Szene im Studio, danach komplette Renderprüfung auf Takt (`ffmpeg` Frames bei Beat-Marken).
7. **Ton:** Musik und SFX erzeugen, Pegel: Musik −14 LUFS, Foley deutlich hörbar, im Produktteil über der Musik.
8. **Render:** `npm run typecheck`, dann `remotion render <Id> out/<name>.mp4 --crf=16`, Poster-Frame auf der Endkarte.

## 7. Personalisierung

Alles Variable steht als Props an der Komposition (`defaultProps` + Zod-Schema, falls nötig): `domain`, `question`, `answer`, `sourceTitle`, `claim`, `cta`, `accent`, `format`. Varianten entstehen über neue Props, nicht über kopierte Szenen.

## Entscheidungen

- Weißer Hintergrund durchgehend, keine Hintergrundwechsel, kein HUD.
- Kein Maskottchen, keine Zahlen.
- Professionelles Voice-over statt Bildschirmtext.
