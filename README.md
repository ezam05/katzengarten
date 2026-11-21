# Katzengarten

Handy-App (PWA) im Cartoon-Stil: Du trinkst Wasser, dein Kätzchen bekommt dafür Milch und wird gross. Grosse Katzen ziehen in den Katzengarten. Zusammen mit einer Freundin.
Projekt für das Modul Vibe Coding, HF Interaction Design. Ersetzt die Trink-Pflanze-App (bleibt als Backup im Ordner daneben). Aufbau, Regeln und Knöpfe sind von dort übernommen, überall sind Katzen statt Pflanzen.

## App starten

1. Im Terminal in den Projektordner wechseln.
2. `python3 -m http.server 8000` starten.
3. Im Browser http://localhost:8000 öffnen (Handy-Ansicht, z. B. 390 × 844).

Figurenblatt aller Katzen: http://localhost:8000/test-katzen.html
Regeln prüfen: `node tests/regeln.test.mjs`

## So funktioniert es

- **Trinken:** Tropfen-Knopf → 1 dl, 2,5 dl oder 5 dl. Jedes Getränk füllt die **Milchflasche** auf der Wiese.
- **Füttern:** Flasche antippen → sie giesst Milch in den Napf, das Kätzchen schleckt und wird sichtbar grösser.
- **Grosswerden:** Ein Baby braucht so viel Milch wie «Tage × 2 Liter» (Toastkatze 7 Tage = 14 l). Pro Tag trinkt es höchstens 2 l, danach ist es satt.
- **Gross:** Konfetti, Knopf «In den Katzengarten bringen». Danach kommt ein neues Baby (im Laden gewählte Art, sonst die gleiche).
- **Antippen:** Katze federt und miaut. **Streicheln** (mit dem Finger darüber fahren): Augen zu, schnurren, Herzen.
- **Katzengarten:** schwebende Insel in Isometrie. Die Katzen schlendern herum, sitzen, schlafen (am liebsten auf den rosa Kissen). Antippen = Miau und Name, streicheln = schnurren, lange drücken und ziehen = Katze woanders hinsetzen.
- **Laden** (unten links oder gelbes Plus): Katzen mit Münzen freischalten. Jeder Tag mit 2 l gibt 1 🪙.
- **Freundin** (runder Knopf oben rechts): ihre Katze, ihr Wasserstand, Anstupsen, ihr Katzengarten.

## Katzen

Vorlagen: `bilder/vorlagen/katzen/`. Die Figuren sind in `js/katze.js` selbst gezeichnet (Formen, keine Bilder), damit sie sich bewegen und wachsen können.

| Katze | Tage | Vorlage |
|---|---|---|
| Toastkatze (orange getigert im Toastbrot) | 7, gratis | toastkatze.png |
| Mollige Tigerkatze (grau, Schnurrhaare) | 10 | tigerkatze.png |
| Glückskatze (dreifarbig, Glöckchen) | 14 | glueckskatze.png |
| Wolkenkatze (Langhaar, blaue Augen) | 21 | wolkenkatze.png |

Haltungen: sitzen, laufen (von der Seite), schlafen (eingerollt). Zustände: glücklich, traurig, hungrig, gestreichelt, gross.

## Demo-Leiste

Knopf «🧪 Demo» oben: Uhrzeit, Zustand erzwingen, Milch-Schieber, Tag abrechnen, 3 Tage überspringen, Münzen +10, 3 Beispiel-Katzen in den Garten, Freundin (trinkt, stupst, Katze gross), alles zurücksetzen.

## Entscheidungen

- **2026-11-21**: Neuer Ordner `Katzengarten-App`, kopiert von der Pflanzen-App. Pflanze → Katze überall (Startseite, Laden, Garten, Freundin). Wunsch Elyna: «die Katzen sollen mit den Pflanzen ersetzt werden».
- **2026-11-21**: Hintergrund der Startseite ist das Bild `bilder/hintergrund.webp` (Wiese mit Bäumen). Die Katze sitzt **auf dem Boden** der Wiese, kein Baumstumpf, kein Topf.
- **2026-11-21**: Wachsen geht nur über **Milch füttern** (Flasche antippen), nicht mehr über die Abrechnung. Milch gibt es nur für heute getrunkenes Wasser; was am Abend noch in der Flasche ist, verfällt um 4 Uhr. So zählt das tägliche Trinken weiter.
- **2026-11-21**: Die Katze **stirbt nie**. Zu wenig trinken macht sie traurig oder hungrig (Ohren hängen, «Ich hab Hunger auf Milch 🥺»), kostet die Streak, aber keine Milch.
- **2026-11-21**: Abrechnung um 4 Uhr zählt nur noch Streak und Münzen (≥ 2 l: Streak +1, 🪙 +1; 1,25–2 l: Streak bleibt; darunter: Streak 0).
- **2026-11-21**: Neue Katzen bekommen einen zufälligen Namen (Mimi, Mochi, Luna …). Antippen des Namensschilds links vom Balken ändert ihn.
- **2026-11-21**: Im Garten haben die Katzen keine festen Plätze mehr, sie laufen frei herum. Verschieben geht mit lange drücken und ziehen; der Platz wird nicht gespeichert (sie laufen ja wieder weg).
- **2026-11-21**: «Rückgängig» nimmt auch Milch zurück, falls die Milch von diesem Getränk schon gefüttert war.
- **2026-11-21**: Daten liegen im Browser (`localStorage`, Name `katzengarten-v1`). Konten und Datenbank kommen mit dem Server-Schritt.

## Stand

- [x] Katzen zeichnen (4 Arten, Baby bis gross, sitzen/laufen/schlafen)
- [x] Startseite mit Wiese, Napf, Milchflasche, Füttern, Antippen, Streicheln
- [x] Katzengarten in Isometrie (schlendern, schlafen, tragen)
- [x] Laden, Freundin (Beispieldaten), Demo-Leiste
- [ ] Erster Start (Name), App-Symbol, ohne Internet (manifest, sw.js)
- [ ] GitHub → Vercel, Konten und Datenbank (Ablauf: bilder/vorlagen/ablauf-webseite.png)
- [ ] Scriptable-Widget
