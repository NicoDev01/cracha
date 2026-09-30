# CraCha Promo-Video

Motion-Graphics-Clip (1920×1080, 60 fps, 33 s), gebaut mit [Remotion](https://www.remotion.dev). Alle Beats stehen in `src/timeline.ts`, geteilte Positionen in `src/layout.ts`.

```bash
npm ci
npm run studio   # Vorschau mit Timeline im Browser
npm run render   # schreibt out/cracha-promo.mp4
```

Lizenz: Remotion ist für Einzelpersonen und Firmen bis 3 Personen kostenlos, darüber braucht es eine [Company License](https://www.remotion.pro/license).

## 15-Sekunden-Produktfilm

Komposition `CraCha15` (1920×1080, 60 fps, 15 s): ein Container ohne Schnitt, Storyboard in [STORYBOARD-15s.md](STORYBOARD-15s.md), Zeitmarken in `src/film15/cues.json`. Die Musik wird aus denselben Zeitmarken synthetisiert.

```bash
npm run music:15   # schreibt public/film15.wav (für die Studio-Vorschau)
npm run render:15  # schreibt out/cracha-15s.mp4
npm run poster:15  # schreibt out/cracha-15s-poster.png
```

## Erklärvideo

Komposition `CraChaExplainer` (1920×1080, 60 fps, 44,5 s) mit deutschem Voice-over, Musik und Soundeffekten. Dunkle Problemwelt (Hook, Klick-Chaos, „nichts.“), beim Musik-Drop öffnet sich die helle Lösungswelt: Link rein → Crawl über vier Ebenen → Wissensbasis → Frage → Antwort mit Quelle → Vergleich mit KI-Suche → CTA. Alle Zeitmarken stehen in `src/explainer/cues.json`, der Sprechertext in `src/explainer/vo-script.json`.

```bash
npm run render:explainer   # erzeugt die Soundeffekte und schreibt out/cracha-explainer.mp4
npm run poster:explainer   # schreibt out/cracha-explainer-poster.png
```

Voice-over (Gemini TTS, Stimme „Puck“) und Musik (Lyria 3) liegen eingecheckt in `public/`; neu erzeugen kostet ein paar Cent über OpenRouter (`OPENROUTER_API_KEY` aus `../.env.local`):

```bash
npm run vo:explainer    # spricht alle Zeilen neu und transkribiert sie zur Kontrolle
npm run bed:explainer   # neue Musik; danach "music.offset" in cues.json auf den Drop legen
```

## Werbevideo

Komposition `CraChaAd` (1920×1080, 60 fps, 36 s) nach dem Skill `.claude/skills/cracha-werbevideo`: Kinetic-Type-Hook, Klick-Dschungel, Crawl über Dutzende Unterseiten, Chat mit Quelle und markierter Stelle, Kinetic-Type-Finale auf dem Drop. Zeitmarken in `src/ad/cues.json`, Musik ist ein Lyria-3-Take (`public/ad-music-take3.mp3`, 120 BPM).

```bash
npm run audio:ad    # schneidet die Musik und erzeugt die Soundeffekte (auch für die Studio-Vorschau nötig)
npm run render:ad   # schreibt out/cracha-ad.mp4
npm run poster:ad   # schreibt out/cracha-ad-poster.png
npm run music:ad    # neuer Lyria-Take (kostet ein paar Cent), danach Offset und Schnitt in cues.json anpassen
```
