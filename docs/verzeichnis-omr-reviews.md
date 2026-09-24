# CraCha in Software-Verzeichnisse eintragen – Start mit OMR Reviews

Stand: 24.09.2026. Eins nach dem anderen: erst OMR Reviews, danach entscheiden wir über das nächste Verzeichnis.

## Welches Verzeichnis zuerst

| Verzeichnis | Passt zu CraCha? | Kosten | Hürde |
|---|---|---|---|
| **OMR Reviews** | Ja: größte deutschsprachige Plattform für B2B-Software im DACH-Raum | Basisprofil kostenlos ([OMR](https://omr.com/en/reviews/b2b/pricing)) | Formular ausfüllen, Profil pflegen, danach Bewertungen sammeln |
| AlternativeTo | Derzeit nicht: Eingetragene Apps müssen Englisch unterstützen ([FAQ](https://alternativeto.net/faq)), CraCha ist nur deutsch | kostenlos, Prüfung dauert laut FAQ oft Monate (5 USD für Vorziehen) | – |
| Product Hunt, Capterra, G2 | Eher später, englischsprachiges Publikum | ungeprüft, Wissensstand | ungeprüft, Wissensstand |

**Empfehlung: OMR Reviews.** Deutschsprachig, B2B, kostenlos und genau das Publikum (Agenturen, Berater, Teams). Die bezahlten Pakete (ab 575 €/Monat im Jahresvertrag) brauchst du nicht.

Wichtig zu wissen: Ohne Bewertungen steht das Profil zwar online, rankt in den Kategorien aber weit hinten. Der OMR Score richtet sich nach Anzahl und Qualität der Bewertungen, das Top-Rated-Badge gibt es erst ab zehn Bewertungen mit NPS von mindestens 8 in drei Monaten ([OMR](https://omr.com/de/reviews/contenthub/omr-reviews-software-kategorien)). Der Eintrag ist also Schritt 1, Bewertungen deiner Pilotnutzer sind Schritt 2.

## Schritt-für-Schritt

### Schritt 1: Material vorbereiten (ca. 30 Minuten)

1. **Logo:** [`docs/assets/cracha-logo-512.png`](assets/cracha-logo-512.png), die Wortmarke auf weißem Quadrat, 512 × 512 px.
2. **3 bis 5 Screenshots** in 16:9, am besten 1920 × 1080:
   - Formular „Website einlesen“ mit eingetragener Start-Adresse
   - Fortschritt beim Einlesen
   - Chat mit einer Antwort und sichtbaren Quellenlinks
   - Content-Check mit einem gefundenen Widerspruch
   - Übersicht mit Wissensbasen und Guthaben
   Nimm eine öffentliche Website, die du zeigen darfst, und blende deine E-Mail-Adresse aus.
3. **Optional: Video.** Das Promo-Video von der Startseite (`public/videos/cracha-promo.mp4`) passt.
4. Die Texte unten in eine Notiz kopieren.

### Schritt 2: Software anmelden (ca. 10 Minuten)

1. Öffne [omr.com/de/reviews](https://omr.com/de/reviews).
2. Klick auf **„Software anbieten“** (englische Seite: „List your Software“).
3. Füll den Fragebogen zu Firma und Produkt aus. Nimm die Angaben aus dem Impressum.
4. Absenden. OMR meldet sich laut eigener Aussage danach bei dir.

Offen, weil nicht öffentlich beschrieben: ob OMR eine Firma voraussetzt oder dich als Einzelperson einträgt. Falls die Frage kommt, antworte wahrheitsgemäß.

### Schritt 3: Profil im OMR Manager ausfüllen (ca. 30 Minuten)

Nach der Freischaltung meldest du dich im OMR Manager an. Das Profil hat diese Bereiche ([Success Hub](https://hi.omr.com/de/success-hub/getting-started)):

1. **Logo & Produkttexte:** Logo hochladen, Texte unten einfügen.
2. **Profilbild & -video:** Screenshot „Chat mit Quellenlinks“ als Profilbild, optional das Video.
3. **Links & Call-to-Actions:** Website `https://cracha-app.com`, Button zu `https://cracha-app.com/register`.
4. **Allgemeine Features:** Liste unten.
5. **Screenshots & Videos:** die Bilder aus Schritt 1, jeweils mit kurzer Bildunterschrift.
6. **Preispläne:** Tabelle unten.
7. **Kategorien:** Nimm aus dem Angebot die passendsten, etwa KI-Assistent/KI-Chatbot, Wissensmanagement oder Enterprise Search. Lieber zwei genau passende als fünf ungefähre.

### Schritt 4: Erste Bewertungen

1. Wenn deine Pilotnutzer CraCha ein paar Mal genutzt haben, bitte sie um eine ehrliche Bewertung auf OMR Reviews. OMR bietet dafür im Manager Bewertungskampagnen an.
2. Keine gekauften, erfundenen oder eigenen Bewertungen. Freunde nur, wenn sie CraCha wirklich nutzen.
3. Kurze Nachricht zum Anpassen:

> Hi …, danke, dass du CraCha ausprobiert hast! Würdest du deine Erfahrung in ein paar Sätzen auf OMR Reviews teilen? Positiv wie kritisch hilft mir beides: [Link zum Profil]. Dauert etwa 5 Minuten.

### Schritt 5: Danach

- Das Profil gelegentlich aktualisieren, wenn sich Preise oder Funktionen ändern.
- Auf jede Bewertung antworten, besonders auf kritische.
- Danach besprechen wir das nächste Verzeichnis.

## Texte zum Einfügen

Alle Angaben entsprechen dem aktuellen Stand der App (Tarif in `src/lib/credit-tariff.ts`). Ändern sich Preise, bitte hier und bei OMR anpassen.

**Produktname:** CraCha

**Slogan (kurz):**
Verwandle Websites in Wissensbasen – jede Antwort mit Link zur Originalseite.

**Kurzbeschreibung (ca. 300 Zeichen):**
CraCha liest eine komplette Website ein, zum Beispiel eine Produktdokumentation, ein Hilfe-Center oder die Website eines Kunden, und beantwortet deine Fragen daraus. Jede Antwort verlinkt die Seiten, auf die sie sich stützt. Du startest mit 100 Credits gratis, ohne Kreditkarte und ohne Abo.

**Ausführliche Beschreibung:**
Die Antwort steht irgendwo auf einer großen Website, aber die Suche findet sie nicht? CraCha macht aus einer Website eine durchsuchbare Wissensbasis.

So funktioniert es: Du gibst eine Start-Adresse ein. CraCha findet die Unterseiten über die Sitemap oder die interne Verlinkung und liest bis zu 500 Seiten pro Durchgang ein. Mit Mustern beschränkst du das Einlesen auf einen Bereich, etwa `/docs/`. Danach stellst du deine Fragen im Chat, auch auf Deutsch zu einer englischen Website.

CraCha antwortet nur aus den eingelesenen Seiten und sagt es, wenn sie die Antwort nicht enthalten. Unter jeder Antwort stehen die Quellseiten als Links, damit du jede Aussage im Original prüfen kannst. Mit dem Content-Check prüfst du eigene Texte wie Entwürfe, Angebote oder Preislisten gegen die Website und findest Widersprüche und veraltete Angaben.

Für wen: Agenturen, die sich schnell in die Website eines Kunden einarbeiten. Entwicklerinnen und Entwickler, die in großen Dokumentationen suchen. Beraterinnen, Berater und Teams, die regelmäßig in denselben Hilfe-Centern oder Förderseiten recherchieren.

Grenzen: CraCha liest öffentlich erreichbare HTML-Seiten, keine PDFs und keine Bereiche hinter einem Login. Ändert sich die Website, liest du sie neu ein.

Preise: 100 Start-Credits gratis. Danach Credit-Pakete als einmalige Aufladung, ohne Abo. Eine eingelesene Seite kostet 1 Credit, eine beantwortete Frage 5 Credits.

**Features:**
- Ganze Website per Start-Adresse einlesen (Sitemap oder interne Links)
- Bis zu 500 Seiten pro Einlesevorgang, bis zu 25 Wissensbasen pro Konto
- Einlesen auf Bereiche beschränken (Muster wie `/docs/`)
- Chat mit Quellenlinks zu jeder Antwort
- Antworten nur aus den eingelesenen Inhalten
- Content-Check: eigene Texte gegen die Website prüfen
- Wissensbasis bei Änderungen neu einlesen
- Chatverlauf exportieren
- Anmeldung mit E-Mail oder Google
- Kein Abo, Bezahlung pro Nutzung

**Preispläne:**

| Paket | Preis (einmalig, inkl. gesetzlicher USt.) | Credits | Entspricht etwa |
|---|---|---|---|
| Start-Guthaben | 0 € | 100 | 20 Seiten und 16 Fragen |
| Start | 10 € | 1.250 | 1.250 Seiten oder 250 Fragen |
| Plus | 25 € | 3.500 | 3.500 Seiten oder 700 Fragen |
| Pro | 50 € | 7.500 | 7.500 Seiten oder 1.500 Fragen |
