# Katzengarten 🐾

Handy-App (PWA) im Cartoon-Stil: Du trinkst Wasser, dein Kätzchen bekommt dafür Milch und wird gross. Grosse Katzen ziehen in deinen Katzengarten. Dazu ein Widget für den iPhone-Startbildschirm und eine Ansicht für die Apple Watch.

**App:** https://katzengarten.vercel.app · **Widget:** [`widget/Katzengarten.js`](widget/Katzengarten.js) (Scriptable) · **Uhr:** https://katzengarten.vercel.app/uhr.html

Projekt im Modul Vibe Coding, HF Interaction Design, Schule für Gestaltung Zürich, Herbst 2026.

## Problem

Junge Erwachsene wissen, dass sie etwa 2 Liter Wasser am Tag trinken sollten, und haben oft sogar eine Flasche dabei. Im Alltag zwischen Schule, Arbeit und unterwegs vergessen sie es trotzdem und merken es erst am Abend: Kopfweh, Müdigkeit, schlechte Konzentration. Normale Trink-Apps zählen nur Zahlen. Sie sind langweilig und nach ein paar Tagen vergessen.

## Idee

Katzengarten macht aus Trinken Fürsorge. Jedes Glas Wasser wird zu Milch für ein Kätzchen, das man vom Baby bis zur grossen Katze aufzieht. Wer genug trinkt, sieht es wachsen und sammelt Katzen im eigenen Katzengarten. Wer zu wenig trinkt, dessen Kätzchen haut ab.

Allein ist Trinken langweilig, darum trinkt man zusammen. In der Freunde-Liste sieht man, wie es den Freundinnen geht: wie gross ihre Katze schon ist und ob sie heute noch trinken müssen. So motiviert man sich gegenseitig. Hängt eine Freundin hinterher, stupst man sie an, und sie bekommt eine Nachricht aufs Handy: «Trink was! 💧».

Das Widget auf dem Startbildschirm und die Apple Watch zeigen auf einen Blick, wie viel heute noch fehlt, ohne dass man die App öffnen muss.

> Für junge Erwachsene, die im Alltag vergessen, genug zu trinken, entwickle ich eine App, mit der sie zusammen mit ihren Freundinnen Kätzchen grossziehen, indem sie Wasser trinken und sich gegenseitig anstupsen, wenn sie unterwegs, in der Schule oder bei der Arbeit sind.

**Zielgruppe:** Freundinnen Anfang 20, Handy immer in der Hand, trinken zu wenig.
**Ziel pro Tag:** 2 Liter Wasser, Tee oder Mineralwasser, verteilt von 8 bis 22 Uhr.

## Weg der Webseite

Entwicklung → GitHub (`ezam05/katzengarten`) → Vercel (Webseite und Server) → App auf dem Handy (iPhone und Android) und Apple Watch → Widget (Scriptable). Alle Nutzerinnen haben eine eigene Nummer, ihr Stand liegt in einer Datenbank (Upstash Redis), damit Freundinnen, Uhr und Widget den gleichen Stand sehen.

## Widget

`widget/Katzengarten.js` für die Gratis-App Scriptable. Zeigt deine Katze in einem Wasser-Ring und **wie viel du heute noch trinken musst**, dazu Name, Stufe und Streak. Die Katze schaut hungrig, wenn du hinter dem Plan bist. Grössen: klein, mittel, gross (mit den Katzen aus dem Garten) und Sperrbildschirm.

1. In der App: Uhr-Knopf → «Widget-Code kopieren».
2. Script in Scriptable anlegen und einmal öffnen, den Code einfügen.
3. Startbildschirm gedrückt halten → ＋ → Scriptable → Widget hinzufügen → Script «Katzengarten».

Die Katzenbilder fürs Widget liegen in `bilder/widget/` (je Katze × Stufe × glücklich/hungrig), gerendert aus denselben Zeichnungen wie in der App (`js/katze.js`).

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
- **Münzen:** 1 🪙 pro getrunkenem Liter (sofort, «+1 🪙 für 1 l!», «Rückgängig» nimmt sie wieder weg) · 1 🪙 und Streak +1 für jeden Tag mit 2 l (bei der Abrechnung um 4 Uhr früh) · 2 🪙, wenn eine grosse Katze in den Garten zieht. Später kommen Quizspiele dazu, die auch Münzen geben.
- **Erster Start:** Kurze Erklärung, eigener Name, erstes Kätzchen aus 3 wählen (Toast-, Tiger- oder Glückskatze, gratis) und benennen.
- **Gross:** Konfetti, Knopf «In den Katzengarten bringen». Danach kommt ein neues Baby (im Laden gewählte Art, sonst die gleiche).
- **Wollknäuel:** Neben jeder Katze liegt ein Wollknäuel (Startseite und Garten). Zieht man ihn auf die Katze, legt sie sich auf den Rücken und spielt damit (Haltung «spielen» in `katze.js`). Sie spielt, bis etwas Neues passiert (Getränk, Wasser von der Uhr, neuer Tag) oder man wieder etwas antippt. Vorlagen: 4 Bilder spielender Katzen (lokal, nicht veröffentlicht).
- **Foto-Katze «UU II AA»:** tanzt ständig (alle 53 Bilder der GIF von Tenor). Elynas Bilder, weisser Hintergrund im Browser entfernt (nur Weiss, das mit dem Rand verbunden ist, damit weisses Fell bleibt). Die Drehkatze ist ein Streifen aus 30 Einzelbildern (`bilder/katzen/drehkatze-bilder.png`), der mit CSS durchläuft. Soundeffekt der Drehkatze: `ton/drehkatze.mp3` (Elynas Datei «oiia-oiia-sound.mp3»), es laufen die ersten 3 Sekunden, dann wird ausgeblendet. Mit 🔇 ist er stumm.
- **Geschenk-Link:** `…/#geschenk=<geheimer Code>` gibt einmalig Münzen. Im Code steht nur die Prüfsumme des Codes (`GESCHENKE` in `js/app.js`).
- **Aktionstag 21.11.2026:** Heute sind alle Katzen gratis und man kann im Laden jederzeit wechseln (die Milch kommt mit). Ab 22.11. (4 Uhr) gelten wieder die Münzen; wer eine nicht gekaufte Katze hat, behält sie, bis sie gross ist, danach kommt eine gekaufte. Datum: `AKTIONSTAG` in `js/app.js`.
- **Freunde-Liste:** Runder Knopf oben rechts. Zeigt alle, die die App online nutzen und einen Namen haben (nicht dich selbst): Name, ihre Katze (Art und Stufe), heute getrunken, grüner Punkt «gerade da» (aktiv in den letzten 5 Minuten) oder «zuletzt da: vor …». Sortiert: zuerst «gerade da», dann nach letzter Aktivität. Lädt alle 30 Sekunden neu, solange sie offen ist. Antippen zeigt Katze und Garten (nur ansehen). Server: `api/freunde.js` liefert nur Kennung, Name, Art, Stufe, heute ml, zuletzt aktiv; nie die geheime Nummer. Die App meldet sich jede Minute (solange offen) als aktiv.
- **Hässig:** Mehr als 10× in 15 Sekunden auf die Katze tippen: Sie wird hässig (böse Augen, Ohren flach, faucht, erhobene Pfote mit Krallen), 4 Kratzer ziehen über den Bildschirm, die App wackelt, 3,5 Sekunden lang. UU II AA wird nie hässig.
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
| UU II AA (tanzende Foto-Katze, ganze GIF); 3× schnell antippen → zweite Katze dreht sich 3 s lang, 3× schneller als das Original | 20 | tanzkatze-tenor.gif, drehkatze-original.gif |

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
- **2026-11-21 (Schluss)**: Münzen neu (Wunsch): pro Liter 1, pro 2-Liter-Tag 1, Garten 2. Prüfung: automatischer Durchlauf aller Abläufe ohne JS-Fehler. Behoben: Hochladen hörte nach einem Netzfehler ganz auf; letzte Änderung ging beim Schliessen verloren; Knäuel-Loslassen hing am Element; Töne auf dem iPhone werden bei der ersten Berührung freigeschaltet.
- **2026-11-21**: Neue Art «Kleiner Tiger» (30 Tage) nach Elynas Vorgaben. Die 4 Katzen haben je den Stil ihrer Vorlage.
- **2026-11-21**: Veröffentlicht über GitHub Pages (öffentlich, Elynas Wunsch). Die Bildvorlagen bleiben lokal (`.gitignore`), weil es fremde Illustrationen sind.
- **2026-11-21**: Abrechnung um 4 Uhr zählt nur noch Streak und Münzen (≥ 2 l: Streak +1, 🪙 +1; 1,25–2 l: Streak bleibt; darunter: Streak 0).
- **2026-11-21**: Neue Katzen bekommen einen zufälligen Namen (Mimi, Mochi, Luna …). Antippen des Namensschilds links vom Balken ändert ihn.
- **2026-11-21**: Im Garten haben die Katzen keine festen Plätze mehr, sie laufen frei herum. Verschieben geht mit lange drücken und ziehen; der Platz wird nicht gespeichert (sie laufen ja wieder weg).
- **2026-11-21**: «Rückgängig» nimmt auch Milch zurück, falls die Milch von diesem Getränk schon gefüttert war.
- **2026-11-21**: Daten liegen im Browser (`localStorage`, Name `katzengarten-v1`). Konten und Datenbank kommen mit dem Server-Schritt.
- **2026-11-26**: Abgabe-Check gegen Auftrag und Bewertungsraster. Neu: Scriptable-Widget (Katze + «noch x Liter», Wunsch Elyna), Blatt «Uhr und Widget» hinter dem Uhr-Knopf (erklärt auch den Weg auf die Uhr), App startet ohne Internet (`sw.js`, Netz zuerst, Server-Anfragen nie gespeichert), Name beim ersten Start nötig, Willkommen erklärt Streicheln und die Zahl am Tropfen, beim allerersten Start zuerst hochladen, dann abgleichen (vorher einmal «falsche Nummer» vom Server). UU II AA bleibt (Wunsch Elyna).

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
- [x] Ohne Internet (Service Worker `sw.js`, 2026-11-26)
- [x] Vercel, Nummern und Datenbank, damit Uhr, Freundin und Widget live sind
- [x] Scriptable-Widget (`widget/Katzengarten.js`, 2026-11-26)
