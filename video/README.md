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

Komposition `CraChaAd` (1920×1080, 60 fps, 36,5 s) nach dem Skill `.claude/skills/cracha-werbevideo`: minimalistisch auf Weiß, Voice-over (Gemini TTS „Puck“, ein Take in `public/ad-vo-take.wav`) auf dem Beat eines Lyria-3-Takes (`public/ad-music-take3.mp3`, 120 BPM). Zeitmarken, Musikschnitt und Sprechphrasen stehen in `src/ad/cues.json`, der Sprechertext in `src/ad/vo-script.json`.

```bash
npm run audio:ad    # schneidet Musik und Stimme, erzeugt die Soundeffekte (auch für die Studio-Vorschau nötig)
npm run render:ad   # schreibt out/cracha-ad.mp4
npm run poster:ad   # schreibt out/cracha-ad-poster.png
npm run vo:ad       # neuer Sprecher-Take (ein paar Cent), listet die Phrasen für vo.clips
```

## Spot (18,5 s)

Komposition `CraChaSpot` (1920×1080, 60 fps, 18,5 s): Kurzfassung des Werbevideos, Problem → Lösung → Vorteil → CTA. Ein Element verwandelt sich nacheinander in Logo, Eingabefeld, Startseite, Wissensbasis und Chat-Frage; schnelle Bewegungen bekommen echte Bewegungsunschärfe (`@remotion/motion-blur`, Zeitfenster `blur` in der Cue-Datei). Ablauf in [STORYBOARD-spot.md](STORYBOARD-spot.md), Zeitmarken in `src/spot/cues.json`, Sprechertext in `src/spot/vo-script.json`, Sprecher-Take in `public/spot/vo-take3.wav`. Die Musik ist der vorhandene Lyria-Take, auf Beat-Grenzen neu geschnitten.

```bash
npm run audio:spot    # schneidet Musik und Stimme, erzeugt die Soundeffekte (auch für die Studio-Vorschau nötig)
npm run render:spot   # schreibt out/cracha-spot.mp4
npm run poster:spot   # schreibt out/cracha-spot-poster.png
npm run vo:spot       # neuer Sprecher-Take (ein paar Cent), listet die Phrasen für vo.clips
node scripts/word-onsets.mjs public/spot/vo-take3.wav 1.9 4.6   # Wortanfänge in einem Stück des Takes
node scripts/transcribe.mjs out/spot-mix.wav                     # Kontrolle: Transkript und Bewertung
```
