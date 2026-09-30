---
name: cracha-werbevideo
description: Stil- und Produktionsleitfaden für CraCha-Werbevideos in Remotion (video/). Kombiniert kinetische Showreel-Motion (Referenz 1), minimalistische UI-Bühne mit Haptik-Sounds (Referenz 2) und beat-getaktetes, freundliches Marketing-Pacing (Referenz 3). Verwenden, wenn ein neues Promo-, Werbe- oder Social-Video für CraCha geplant, gebaut, überarbeitet oder personalisiert wird.
---

# CraCha-Werbevideo

Ein Werbevideo nach diesem Skill fühlt sich an wie **ein ruhiges Produkt-UI auf warmer Bühne (2), das im Takt der Musik schneidet (3) und an den Wendepunkten mit kinetischer Typo und Morphs explodiert (1)**.

Die Einzelanalyse mit Zeitmarken steht in [references/analyse.md](references/analyse.md), der erste CraCha-Entwurf in [references/storyboard-30s.md](references/storyboard-30s.md).

## 1. Die drei Zutaten

| Aus | Übernehmen | Nicht übernehmen |
|---|---|---|
| **1 Showreel** | Kapitel à 1 Takt (2 s), Match-Cuts (Buchstaben → Punkte → nächste Szene), Iris-Wipe aus einem Punkt, Squash & Stretch mit Motion Blur, Form-Morphs mit Geisterspuren, Kinetic-Type-Finale (ein Wort pro Beat, Hintergrund wechselt mit), HUD-Rahmen, Logo aus Partikeln | 3D-Punktwolken, Truchet-Muster, Easing-Demo: Selbstzweck ohne Produktbezug |
| **2 Minimal-UI** | Warmes Off-White, eine Akzentfarbe, nur das eine Element im Bild, echte UI als Held, Tipp-/Klick-Foley ohne Musik, Wort-für-Wort-Pillen, vertikales Listen-Rad, Logo aus Pillen gemorpht, ruhiger Dauer-Push-in der Kamera | Weißes UI auf weißem Grund ohne Kontrast bei kleinen Größen, lange Wartezeiten auf Fortschrittsbalken |
| **3 Marketing-Pacing** | Schnitt/Wendung auf jedem 2. Beat (≈ 1 s), Headlines Wort für Wort mit Blur-In, ein Schlüsselwort in Akzentfarbe, Orbit mit Zähler („48 Seiten erfasst“), Haken-Belohnung, Chat-Blasen, Deny/Allow-Klick, Dreiklang („Ask. Analyze. Make changes.“), Durchstreichen, Endkarte mit URL-Pille | Maskottchen (CraCha hat keins, siehe Entscheidungen), fremde Markenlogos |

## 2. Look

**Zwei Welten, eine Palette.** Die Produktwelt ist hell und ruhig (2), die Punchline-Welt ist vollflächig und laut (1). Gewechselt wird nur per Iris, Wipe oder Match-Cut, nie per Crossfade.

| Token | Wert | Einsatz |
|---|---|---|
| `paper` | `#f5f0e9` | Produktwelt, Endkarte (wie `film15/look.ts`) |
| `ink` | `#17120f` | Text, dunkle Punchline-Frames, HUD |
| `accent` | `#ea580c` | Einziges Akzent-Orange: Schlüsselwort, Pillen, Vollflächen-Frame |
| `flash` | `#465fff` | Nur in Kinetic-Type-Frames als Kontrastfläche (Dashboard-Blau); nie in der UI-Welt |
| `card` | `#ffffff` | UI-Container, Schatten aus `theme.ts` (`SHADOW`, `SHADOW_SM`) |

Regeln: pro Frame höchstens zwei Farbflächen plus Tinte. Keine Verläufe auf UI, keine Glows. Leichtes Filmkorn (2–3 % Opazität) auf Vollflächen ist erlaubt.

**Schrift** (vorhandene Fonts zuerst, Display-Font im Rig prüfen):

| Rolle | Schrift | Stil |
|---|---|---|
| Kinetic Type (1) | Urbanist 800, Versalien, Tracking −2 %; Alternative mit breiterem Schnitt im Rig testen (ungeprüft: Archivo Black / Unbounded über `@remotion/google-fonts`) | 220–320 px, randfüllend |
| Headline (3) | Urbanist 700, Tracking −3 %, Zeilenabstand 0,95 | 96–140 px, Schlüsselwort in `accent` |
| Kontrapunkt (1/2) | Serif kursiv, z. B. Instrument Serif Italic (ungeprüft, im Rig laden) | Unterzeile wie „motion designer“ |
| UI (2) | Inter 400–600 | echte Dashboard-Beschriftung |
| HUD (1) | JetBrains Mono (in `film15/look.ts` geladen), 14 px, Versalien, Tracking +10 % | Ecken, Kapitel, Timecode |

**HUD-Rahmen (1):** Eckwinkel in allen vier Ecken, oben rechts Kapitel („02 · CRAWL“), unten links Timecode, unten rechts Takt-Anzeige (vier Quadrate, das aktive gefüllt). Opazität 35 %, in der hellen Welt `ink`, in Vollflächen invertiert. Er bindet alle Szenen zu einem Film.

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
- **Dramaturgie (Ref. 1 misst ≈ 128 BPM, Ref. 3 ≈ 120 BPM):**
  - Hook laut, 1 Idee pro Beat.
  - Produktteil „Breakdown“: Musik ausgedünnt oder tiefpassgefiltert, UI-Foley vorn (Ref. 2 ist bis 15,7 s fast stumm).
  - Drop auf die Antwort bzw. den Beweis, ab dann Schnitt jeden 2. Beat.
  - Kinetic-Type-Finale: 1 Wort pro Beat.
  - Endkarte: 2 Takte Stillstand, Ausklang.
- **Wendung alle 1–2 s** (Ref. 3). Nichts steht länger als 2 Takte ohne neue Information.
- **Foley (Haptik aus 2):** Tastatur pro Zeichen (leicht zufällig in Tonhöhe und Lautstärke), Klick auf jeden Cursor-Klick, weicher Whoosh auf Morph und Kamera, Pop auf Pillen und Haken, Tick pro Zählerschritt. Quellen: `@remotion/sfx` (MIT-Paket, Lizenz jedes Sounds einzeln prüfen) oder synthetisch per `scripts/make-sfx.mjs`.
- **Musik:** synthetisch aus den Cues (`scripts/make-music.mjs`) oder Lyria (`scripts/make-bed.mjs`), Drop per `music.offset` auf die Bildmarke legen.

## 5. Inhalt

- Nur belegbare Aussagen (Stand `STORYBOARD-15s.md`): bis 500 Seiten pro Crawl, bis 5 Ebenen, jede Antwort mit Quelle, 100 Start-Credits gratis. Neue Zahlen vorher im Code oder auf der Landingpage belegen.
- UI 1:1 aus dem Quellcode nachbauen (Dashboard liegt hinter Login). Beispiel-Domain `docs.example.com`.
- Pro Szene **eine** Botschaft, maximal 5 Wörter Bildschirmtext außerhalb der UI.
- Deutsch, Du-Form, kurze Imperative und Nominalsätze („Link rein.“, „Frag.“, „Mit Quelle.“).

## 6. Arbeitsablauf

1. **Brief:** Länge, Format (16:9, 9:16, 1:1), Ziel (Anwerben, Launch, Feature), Personalisierung (Zielgruppe, Beispiel-Website, Claim) festhalten.
2. **Beat-Sheet** als `STORYBOARD-<name>.md` nach dem Muster in `references/storyboard-30s.md`: Szene, Beats, Welt (hell/voll), Match-Cut rein/raus, Bildschirmtext, Ton.
3. **Cues:** `src/<name>/cues.json` in Beats; Musik und SFX lesen dieselbe Datei.
4. **Rig:** HUD, Blur-In-Wort, Slam, Iris, Morph-Container, Cursor, Orbit, Zähler als Komponenten in `src/<name>/kit.tsx`. Vorhanden und zuerst wiederverwenden: `explainer/kit.tsx` (`Kinetic`, `Headline`, `Pointer`, `Ripple`, `MotionBlur`, `pressAt`, `sp`), `film15/look.ts` (Palette `K`, `settle`, `glide`, JetBrains Mono), `film15/Box.tsx`, `MorphBox.tsx`, `Logo.tsx`.
5. **Standbilder:** je Szene ein `remotion still`, als Contact Sheet prüfen (Lesbarkeit, eine Botschaft, Palette).
6. **Bewegung:** Szene für Szene im Studio, danach komplette Renderprüfung auf Takt (`ffmpeg` Frames bei Beat-Marken).
7. **Ton:** Musik und SFX erzeugen, Pegel: Musik −14 LUFS, Foley deutlich hörbar, im Produktteil über der Musik.
8. **Render:** `npm run typecheck`, dann `remotion render <Id> out/<name>.mp4 --crf=16`, Poster-Frame auf der Endkarte.

## 7. Personalisierung

Alles Variable steht als Props an der Komposition (`defaultProps` + Zod-Schema, falls nötig): `domain`, `question`, `answer`, `sourceTitle`, `claim`, `cta`, `accent`, `format`. Varianten entstehen über neue Props, nicht über kopierte Szenen.

## Offene Entscheidungen

- **Maskottchen:** Ref. 3 lebt stark von seiner Figur. Optionen: keins (Logo übernimmt die Rolle), oder eine abstrakte Figur aus dem CraCha-Logo (Punkt/Pille mit Augen).
- **Voice-over:** Ref. 1–3 haben keins. Empfehlung: ohne, damit der Beat trägt.
- **Display-Schrift:** Urbanist 800 oder eine breitere Grotesk für Kinetic Type.
