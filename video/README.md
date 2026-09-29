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

Komposition `CraChaExplainer` (1920×1080, 60 fps, 34 s) im ruhigen Morph-Stil des Promos: Problem (Klicken durch Unterseiten) → URL → Crawl bis in die tiefste Ebene → Wissensbasis → Frage → Antwort mit Quelle → CTA. Zeitmarken in `src/explainer/timeline.ts`.

```bash
npm run render:explainer   # schreibt out/cracha-explainer.mp4
npm run poster:explainer   # schreibt out/cracha-explainer-poster.png
```
