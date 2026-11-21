# Katzengarten

Handy-App (PWA) im Cartoon-Stil: Du trinkst Wasser, dein Kätzchen bekommt dafür Milch und wird gross. Grosse Katzen ziehen in den Katzengarten. Zusammen mit einer Freundin.
Projekt für das Modul Vibe Coding, HF Interaction Design. Ersetzt die Trink-Pflanze-App (bleibt als Backup im Ordner daneben). Aufbau, Regeln und Knöpfe sind von dort übernommen, überall sind Katzen statt Pflanzen.

## App starten

1. Im Terminal in den Projektordner wechseln.
2. `python3 -m http.server 8000` starten.
3. Im Browser http://localhost:8000 öffnen (Handy-Ansicht, z. B. 390 × 844).

Online mit Server (empfohlen): Vercel-Projekt «katzengarten» (Team lamo), Datenbank Upstash Redis (Free, Frankfurt), Zugangsdaten als KV_REST_API_URL / KV_REST_API_TOKEN. Jeder Push auf GitHub veröffentlicht neu.
Ohne Server: https://ezam05.github.io/katzengarten/ (Uhr-Ansicht: …/uhr.html)

Figurenblatt aller Katzen: http://localhost:8000/test-katzen.html
Regeln prüfen: `node tests/regeln.test.mjs`

## So funktioniert es

- **Trinken = Füttern:** Tropfen-Knopf → 1 dl, 2,5 dl oder 5 dl. Das Kätzchen bekommt **automatisch** gleich viel Milch: Die Flasche giesst in den Napf, das Kätzchen schleckt und wird grösser. Die Flasche zeigt, wie viel Milch es heute schon bekommen hat.
- **Wann wächst die Katze?** In **4 Stufen**: Baby → Kätzchen (ab ⅓ der Milch) → junge Katze (ab ⅔) → gross. Bei jeder neuen Stufe gibt es Konfetti und «Ich bin jetzt ein Kätzchen! 🎉». Gross ist sie nach «Tage × 2 Liter» Wasser (Toastkatze 14 l, also etwa 7 Tage mit 2 l). Das Tagesziel bleibt 2 l, Milch gibt es **ohne Grenze**, wer mehr trinkt, ist schneller. Den Balken antippen sagt, wie viel bis zur nächsten Stufe fehlt (die Striche im Balken sind die Stufen).
- **Münzen:** Jeder Tag mit 2 l gibt bei der Abrechnung um 4 Uhr früh 1 🪙 und Streak +1 (nicht sofort, deshalb sagt die Katze «Morgen früh gibt es 🪙»).
- **Erster Start:** Kurze Erklärung, eigener Name, erstes Kätzchen aus 3 wählen (Toast-, Tiger- oder Glückskatze, gratis) und benennen.
- **Gross:** Konfetti, Knopf «In den Katzengarten bringen». Danach kommt ein neues Baby (im Laden gewählte Art, sonst die gleiche).
- **Wollknäuel:** Neben jeder Katze liegt ein Wollknäuel (Startseite und Garten). Zieht man ihn auf die Katze, legt sie sich auf den Rücken und spielt damit (Haltung «spielen» in `katze.js`). Sie spielt, bis etwas Neues passiert (Getränk, Wasser von der Uhr, neuer Tag) oder man wieder etwas antippt. Vorlagen: 4 Bilder spielender Katzen (lokal, nicht veröffentlicht).
- **Töne:** Miau beim Antippen, Schnurren beim Streicheln, Plätschern bei der Milch. Im Browser erzeugt (`js/ton.js`, keine Tondateien). Knopf 🔊/🔇 rechts oben. Auf dem iPhone stumm, wenn der Lautlos-Schalter an ist.
- **Antippen:** Katze federt und miaut. **Streicheln** (mit dem Finger darüber fahren): Augen zu, schnurren, Herzen.
- **Katzengarten:** schwebende Insel in Isometrie. **Ab 3 Katzen** wird die Insel grösser (7 × 7 Felder, mehr Kissen und Bäume, breiter als der Bildschirm, mit dem Finger wischen), ab 7 Katzen kommt alle 3 Katzen eine Reihe dazu. Die Katzen schlendern herum, sitzen, schlafen (am liebsten auf den rosa Kissen). Antippen = Miau und Name, streicheln = schnurren, lange drücken und ziehen = Katze woanders hinsetzen.
- **Laden** (unten links oder gelbes Plus): Katzen mit Münzen freischalten. Jeder Tag mit 2 l gibt 1 🪙.
- **Freundin** (runder Knopf oben rechts): ihre Katze, ihr Wasserstand, Anstupsen, ihr Katzengarten.
- **Kollegin einladen:** In der Freundin-Karte «📨 Kollegin einladen» schickt den Link zur App. Wer ihn öffnet, bekommt **eine eigene Katze und einen eigenen Garten** (gespeichert auf dem eigenen Handy). Mit «🐾 Meine Katze schicken» schickt man sich gegenseitig die eigene Katze samt Garten als Link. Öffnet die andere den Link, fragt die App «… als Freundin speichern?», danach sieht sie die Katze unter dem runden Knopf oben rechts und «… Katzengarten ansehen». Es ist ein Stand zum Zeitpunkt des Schickens. «Anstupsen» schickt eine Nachricht «Trink was! 💧».
- **Abhauen:** Die Katze stirbt nie, aber sie haut ab, wenn du an einem Tag unter 1 l trinkst oder zwei Tage hintereinander unter 1,5 l. Vorher warnt sie («Trink heute mehr, sonst hau ich ab! 🧳»). Dann bleiben Pfotenspuren und ein Zettel. Mit **4 🪙 holst du sie zurück** (Milch bleibt, Streak ist weg), oder du holst ein neues Kätzchen.
- **Apple Watch** (Uhr-Knopf unter der Freundin): schickt einen Link auf `uhr.html` mit deiner Katze und wie viel du heute noch trinken musst. Auf der Uhr den Link in Nachrichten antippen. Der Link zeigt den Stand vom Moment des Schickens; auf demselben Gerät zeigt `uhr.html` immer den aktuellen Stand.

## Katzen

Vorlagen: `bilder/vorlagen/katzen/`. Die Figuren sind in `js/katze.js` selbst gezeichnet (Formen, keine Bilder), damit sie sich bewegen und wachsen können.

| Katze | Tage | Vorlage |
|---|---|---|
| Toastkatze (orange getigert im Toastbrot) | 7, gratis | toastkatze.png |
| Mollige Tigerkatze (grau, Schnurrhaare) | 10 | tigerkatze.png |
| Glückskatze (dreifarbig, Glöckchen) | 14 | glueckskatze.png |
| Wolkenkatze (Langhaar, blaue Augen) | 21 | wolkenkatze.png |
| Kleiner Tiger (orange, «王» auf der Stirn) | 30 | Tiger-Bilder vom 2026-11-21 |

Jede Katze hat den Stil ihrer Vorlage: Glückskatze dicke schwarze Linie mit Lücken und sehr grossen Augen, Wolkenkatze steht auf 4 Beinen mit Flauschkanten und Wolkenschwanz, Tigerkatze als Bohne mit Tusche-Linie und Aquarell, Toastkatze mit dünner Linie, Brot mit Poren und Lachmund.

Haltungen: sitzen, laufen (von der Seite), schlafen (eingerollt). Zustände: glücklich, traurig, hungrig, gestreichelt, gross.

## Demo-Leiste

Der Knopf «🧪 Demo» ist versteckt. **3× schnell auf das Holzschild (Wasserstand) tippen** schaltet ihn ein oder aus. Darin: Uhrzeit, Zustand erzwingen, Milch-Schieber, Tag abrechnen, 3 Tage überspringen, Münzen +10, 3 Beispiel-Katzen in den Garten, Freundin (trinkt, stupst, Katze gross), alles zurücksetzen.

## Entscheidungen

- **2026-11-21**: Neuer Ordner `Katzengarten-App`, kopiert von der Pflanzen-App. Pflanze → Katze überall (Startseite, Laden, Garten, Freundin). Wunsch Elyna: «die Katzen sollen mit den Pflanzen ersetzt werden».
- **2026-11-21**: Hintergrund der Startseite ist das Bild `bilder/hintergrund.webp` (Wiese mit Bäumen). Die Katze sitzt **auf dem Boden** der Wiese, kein Baumstumpf, kein Topf.
- **2026-11-21**: Wachsen geht nur über **Milch füttern** (Flasche antippen), nicht mehr über die Abrechnung. Milch gibt es nur für heute getrunkenes Wasser; was am Abend noch in der Flasche ist, verfällt um 4 Uhr. So zählt das tägliche Trinken weiter.
- ~~**2026-11-21**: Die Katze **stirbt nie**. Zu wenig trinken macht sie traurig oder hungrig, kostet die Streak, aber keine Milch.~~ (ersetzt am 2026-11-21: Wunsch Elyna «sie stirbt nicht, aber die Katze haut ab»)
- **2026-11-21**: Die Katze **haut ab** unter 1 l an einem Tag oder bei zwei Tagen hintereinander unter 1,5 l (gleiche Grenzen wie früher das Sterben der Pflanze). Ein grosses Kätzchen, das auf den Garten wartet, haut nicht ab. Danach: neues Baby, Milch und Streak bei 0.
- **2026-11-21**: Apple Watch (Wunsch: Katze und wie viel noch zu trinken): Eigene Seite `uhr.html` für den kleinen Bildschirm, mit Ring für die Wassermenge. Die Uhr kann keine Web-App installieren, öffnet aber Links aus Nachrichten. Live-Daten auf der Uhr gehen erst mit Konten und Datenbank.
- **2026-11-21 (Abend)**: ~~Füttern durch Antippen der Flasche, höchstens 2 l pro Tag~~ → Wunsch Elyna: Füttern geschieht **automatisch beim Trinken**, 2 l sind **nicht mehr die Grenze** (jetzt 3 l Milch pro Tag; offene Frage, ob gar keine Grenze).
- **2026-11-21 (Abend)**: Garten ab 3 Katzen grösser (Wunsch). Die Felder bleiben gleich gross, die Insel wird breiter und lässt sich wischen.
- **2026-11-21 (Abend)**: Kollegin: ohne Server über Links (einladen, eigene Katze schicken). Der Link wird beim Öffnen genau geprüft (nur bekannte Katzenarten, Zahlen begrenzt, keine HTML-Zeichen in Namen).
- **2026-11-21 (Abend)**: Eigener Usertest, siehe `USERTEST.md`. Gleich behoben: Katze nach dem Trinken 45 Minuten zufrieden, «Rückgängig» unter dem Balken, Flasche «heute … l», Einladen oben, Streichel-Hinweis.
- **2026-11-21 (Nacht)**: Antworten Elyna auf die Usertest-Fragen: keine Milch-Grenze, Tagesziel 2 l · Abgehauene Katze für 4 🪙 zurückholen, Streak ist weg · 1 🪙 pro 2-Liter-Tag reicht · Wachsen in Stufen · Erster Start mit Name und Kätzchen · Demo-Knopf verstecken · Uhr zeigt nur an.
- **2026-11-21**: Neue Art «Kleiner Tiger» (30 Tage) nach Elynas Vorgaben. Die 4 Katzen haben je den Stil ihrer Vorlage.
- **2026-11-21**: Veröffentlicht über GitHub Pages (öffentlich, Elynas Wunsch). Die Bildvorlagen bleiben lokal (`.gitignore`), weil es fremde Illustrationen sind.
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
- [x] App-Symbol, Startbildschirm (manifest)
- [x] Uhr-Ansicht für die Apple Watch (Link-Stand), auf der echten Uhr getestet am 2026-11-21
- [x] GitHub und Webseite zum Testen (GitHub Pages)
- [x] Automatisch füttern, bis 3 l Milch, Garten ab 3 Katzen grösser, Kollegin einladen (Links)
- [x] Eigener Usertest (`USERTEST.md`)
- [x] Wachsen in Stufen, Zurückholen für 4 🪙, Erster Start, Demo versteckt, keine Milch-Grenze
- [ ] Ohne Internet (Service Worker)
- [ ] Vercel, Konten und Datenbank, damit Uhr und Freundin live sind (Ablauf: bilder/vorlagen/ablauf-webseite.png)
- [ ] Scriptable-Widget
