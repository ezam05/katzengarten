// app.js – Ablauf, Knöpfe, Speichern der Daten, Demo-Leiste.

import { ARTEN, artNachId, milchBisGross } from './arten.js';
import { zeichneKatze, zufall, wollknaeuel } from './katze.js';
import { miau, schnurrenStart, schnurrenStopp, plaetschern, tonAn, tonEntsperren, datei, fauchen } from './ton.js';
import {
  STUFEN, ZIEL_ML, stufeFuerMilch, groesseFuerMilch, milchFuerStufe, ZURUECKHOLEN_PREIS, tagesSchluessel, zeitImTag, stundeImTag,
  eintraegeVomTag, summeMl, glaeserBisZiel, katzenZustand, milchPortion,
  rechneTagAb, offeneTage, verschiebeTag, SCHWELLE_WEG, SCHWELLE_ZWEITER, MUENZEN_GARTEN, literMuenzen,
} from './regeln.js';

const KATZE_X = 178;    // Boden-Mitte der Katze in der Szene
const KATZE_Y = 694;
const KATZE_MASS = 1.25;
const SPEICHER_NAME = 'katzengarten-v1';
const RUECKGAENGIG_MS = 5000;
const TAG_MS = 24 * 60 * 60 * 1000;
const EINTRAEGE_BEHALTEN_TAGE = 60;
const NAMEN = ['Mimi', 'Mochi', 'Luna', 'Tofu', 'Momo', 'Kiki', 'Nala', 'Pünktli', 'Socke', 'Bijou', 'Gizmo', 'Simba', 'Flocke', 'Muffin', 'Zimt'];

// ---------- Daten und Speichern ----------

// Zufällige Nummer (UUID), z. B. 3f2b…-…
const neueNummer = () => (crypto.randomUUID ? crypto.randomUUID()
  : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
const neuesKonto = () => ({ id: neueNummer(), geheim: neueNummer() });
const istNummer = (t) => typeof t === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(t);

function startDaten() {
  return {
    version: 1,
    katze: { name: 'Mimi', artId: 'toast', milch: 0, status: 'waechst' }, // status: 'waechst' | 'fertig' | 'weg'
    streak: 0,
    vortagMl: null,        // Menge vom letzten abgerechneten Tag (für «zwei Tage unter 1,5 l»)
    gestartet: false,      // Willkommen (Name, erstes Kätzchen) schon gemacht?
    literBonus: { tag: null, anzahl: 0 }, // Münzen für getrunkene Liter, schon vergeben an diesem Tag
    konto: neuesKonto(),   // öffentliche und geheime Nummer für den Server
    demoSichtbar: false,
    ton: true,             // Miau und Schnurren an   // Demo-Knopf zeigen (geheim: 3× schnell auf das Holzschild tippen)
    muenzen: 0,
    abgerechnetBis: null,  // letzter abgerechneter Tag, z. B. '2026-11-06'
    eintraege: [],         // Getränke { ml, zeit }
    fuetterungen: [],      // Milch für die Katze { ml, zeit }
    garten: [],            // { artId, name, datum }
    freigeschaltet: ARTEN.filter((a) => a.gratis).map((a) => a.id),
    naechsteArtId: null,   // im Laden gewählte nächste Katze (null = gleiche Art)
    demoVersatz: 0,        // Demo: so viele Tage ist die Uhr vorgestellt
    name: '',              // eigener Name (kommt beim ersten Start)
    angestupstUm: null,    // wann ich die Freundin zuletzt angestupst habe
    // Beispiel-Freundin, bis der Server die echten Daten liefert
    freundin: {
      beispiel: true,  // wird ersetzt, sobald eine echte Kollegin ihren Link schickt
      name: 'Lea', katzenName: 'Lilo', artId: 'glueck', milch: 16000, status: 'waechst',
      streak: 5, heuteMl: 1400, letzteTrinkZeit: null, stand: null,
      garten: [
        { artId: 'toast', name: 'Brösmeli', datum: '2026-10-12' },
        { artId: 'tiger', name: 'Flocke', datum: '2026-10-22' },
        { artId: 'wolke', name: 'Wölkli', datum: '2026-11-02' },
      ],
    },
  };
}

function datenLaden() {
  try {
    const text = localStorage.getItem(SPEICHER_NAME);
    if (text) {
      const d = JSON.parse(text);
      const s = startDaten();
      const geladen = {
        ...s, ...d,
        katze: { ...s.katze, ...d.katze },
        freundin: { ...s.freundin, ...d.freundin },
        eintraege: Array.isArray(d.eintraege) ? d.eintraege : [],
        fuetterungen: Array.isArray(d.fuetterungen) ? d.fuetterungen : [],
        garten: Array.isArray(d.garten) ? d.garten : [],
      };
      if (!istNummer(d.konto?.id) || !istNummer(d.konto?.geheim)) geladen.konto = neuesKonto();
      // wer schon Daten hat, braucht kein Willkommen mehr
      if (d.gestartet === undefined) geladen.gestartet = geladen.eintraege.length > 0 || geladen.garten.length > 0 || geladen.katze.milch > 0;
      // gratis Arten sind immer freigeschaltet
      geladen.freigeschaltet = [...new Set([...s.freigeschaltet, ...(d.freigeschaltet || [])])];
      return geladen;
    }
  } catch { /* kaputte oder gesperrte Daten: neu anfangen */ }
  return startDaten();
}

function speichern() {
  try {
    localStorage.setItem(SPEICHER_NAME, JSON.stringify(daten));
  } catch { /* z. B. privates Fenster: dann eben ohne Speichern */ }
  spaeterHochladen();
}

let daten = datenLaden();

// Nur für die Demo (wird nicht gespeichert)
const demo = {
  stunde: null,        // simulierte Uhrzeit (8–22) oder null = echte Zeit
  zustand: null,       // erzwungener Zustand oder null = automatisch
};

// ---------- Zeit, Trinken, Milch ----------

function jetzt() {
  const basis = Date.now() + (daten.demoVersatz || 0) * TAG_MS;
  if (demo.stunde === null) return basis;
  return zeitImTag(tagesSchluessel(basis), demo.stunde);
}

const heute = () => tagesSchluessel(jetzt());
const heuteMl = () => summeMl(eintraegeVomTag(daten.eintraege, heute()));
const heuteGefuettert = () => summeMl(eintraegeVomTag(daten.fuetterungen, heute()));
const katzenArt = () => artNachId(daten.katze.artId);
const groesse = (k = daten.katze) => groesseFuerMilch(k.milch, milchBisGross(artNachId(k.artId)));
const stufe = (k = daten.katze) => stufeFuerMilch(k.milch, milchBisGross(artNachId(k.artId)));
let feierBis = 0; // bis wann Konfetti für eine neue Stufe fliegt

function letzteTrinkZeit() {
  const t = jetzt();
  // nur Einträge bis «jetzt» zählen (wichtig, wenn die Demo-Uhr zurückgedreht wird)
  const fruehere = daten.eintraege.filter((e) => e.zeit <= t);
  return fruehere.length ? Math.max(...fruehere.map((e) => e.zeit)) : null;
}

function aktuellerZustand() {
  if (demo.zustand) return demo.zustand;
  if (daten.katze.status === 'weg') return 'weg';
  if (daten.katze.status === 'fertig') return 'fertig';
  return katzenZustand({ heuteMl: heuteMl(), jetzt: jetzt(), letzteTrinkZeit: letzteTrinkZeit() });
}

// ---------- Elemente ----------

const $ = (s) => document.querySelector(s);
const el = {
  huelle: $('#katze-huelle'),
  blase: $('#sprechblase'),
  trinkBlase: $('#trink-blase'),
  herzen: $('#herzen'),
  szene: $('.szene svg'),
  streak: $('#streak-zahl'),
  muenzen: $('#muenzen-zahl'),
  schild: $('#schild-text'),
  flasche: $('#flasche'),
  flascheMilch: $('#flasche-milch'),
  flascheText: $('#flasche-text'),
  napfMilch: $('#napf-milch'),
  strahl: $('#milchstrahl'),
  name: $('#katzen-name'),
  nameKnopf: $('#name-knopf'),
  balkenFuellung: $('#balken-fuellung'),
  balkenText: $('#balken-text'),
  balken: $('#balken'),
  tropfenPlatz: $('#tropfen-platz'),
  tropfenZahl: $('#tropfen-zahl'),
  tropfenKnopf: $('#tropfen-knopf'),
  rueckgaengig: $('#rueckgaengig'),
  aktion: $('#aktion-knopf'),
  aktionZweit: $('#aktion-zweit'),
  ansage: $('#ansage'),
  demoKnopf: $('.demo-knopf'),
  demoPanel: $('#demo-panel'),
  demoMilch: $('#demo-milch'),
  demoMilchText: $('#demo-milch-text'),
  demoStufe: $('#demo-stufe'),
  demoUhr: $('#demo-uhr'),
  demoUhrText: $('#demo-uhr-text'),
  freundinMini: $('#freundin-mini'),
};

let katzenHoehe = 100;
let blaseTimer = null;
let rueckgaengigTimer = null;
let letzteZeichnung = '';
let streichelt = false;     // wird gerade gestreichelt (Augen zu, schnurren)
let fuettertGerade = false; // Milch-Animation läuft

// ---------- Hilfen ----------

function zahl(z) {
  return String(Math.round(z * 100) / 100).replace('.', ',');
}
const liter = (ml) => `${zahl(ml / 1000)} l`;
const dl = (ml) => `${zahl(ml / 100)} dl`;

function uhrText(stunde) {
  const h = Math.floor(stunde), m = Math.round((stunde - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Text von aussen (Eingabe, Link) ohne Zeichen, die HTML verändern könnten
const sauber = (t, max = 14) => String(t ?? '').replace(/[<>&"'`]/g, '').trim().slice(0, max);

const zufallsEintrag = (liste) => liste[Math.floor(Math.random() * liste.length)];

function neuerName() {
  const vergeben = new Set([daten.katze.name, ...daten.garten.map((g) => g.name)]);
  const frei = NAMEN.filter((n) => !vergeben.has(n));
  return zufallsEintrag(frei.length ? frei : NAMEN);
}

function normalerSatz(zustand) {
  const ml = heuteMl();
  const n = glaeserBisZiel(ml);
  if (zustand === 'fertig') return { text: 'Ich bin gross! Ab in den Garten 🏡', dringend: false };
  if (zustand === 'weg') {
    return daten.muenzen >= ZURUECKHOLEN_PREIS
      ? { text: `${daten.katze.name} ist abgehauen… Hol mich zurück! 🪙`, dringend: true }
      : { text: `${daten.katze.name} ist abgehauen… 😿`, dringend: true };
  }
  if (zustand === 'hungrig') return { text: 'Ich hab Hunger auf Milch 🥺', dringend: true };
  const warnung = abhauWarnung();
  if (warnung) return { text: warnung, dringend: true };
  switch (zustand) {
    case 'traurig': return { text: n <= 2 ? `Noch ${n} ${n === 1 ? 'Glas' : 'Gläser'}, dann gibt's Milch 🥛` : 'Trinkst du was? Dann krieg ich Milch 🥛', dringend: false };
    default:
      if (n === 0) return { text: 'Geschafft! 2 Liter 🎉', dringend: false };
      return { text: `Noch ${n} ${n === 1 ? 'Glas' : 'Gläser'} bis zum Ziel!`, dringend: false };
  }
}

// Warnt, bevor das Kätzchen abhaut (Regel in regeln.js: hautAb)
function abhauWarnung() {
  if (daten.katze.status !== 'waechst' || demo.zustand) return null;
  const ml = heuteMl();
  if (daten.vortagMl !== null && daten.vortagMl < SCHWELLE_ZWEITER && ml < SCHWELLE_ZWEITER) {
    return 'Trink heute mehr, sonst hau ich ab! 🧳';
  }
  if (ml < SCHWELLE_WEG && stundeImTag(jetzt()) >= 18) return 'Unter 1 Liter… sonst hau ich ab! 🧳';
  return null;
}

const ANTIPP_SAETZE = {
  gluecklich: ['Miau! 😺', 'Streichel mich mal! 🐾', 'Hihi, das kitzelt!', 'Spielst du mit mir? 🧶'],
  traurig: ['Miau… 😿', 'Streichel mich, das tröstet 🐾', 'Trinkst du mit mir? 💧'],
  hungrig: ['Miaaau! 🥺 Milch?', 'Hunger! 🍼'],
  fertig: ['Ich bin gross geworden! 🎉', 'Bringst du mich in den Garten? 🏡'],
  weg: ['Hier sind nur noch Pfotenspuren… 🐾', 'Hol dir ein neues Kätzchen 🍼'],
};

// Bild, wenn das Kätzchen abgehauen ist: Pfotenspuren und ein Zettel
function wegBild(name) {
  const pfote = (x, y, w) => `<g transform="translate(${x} ${y}) rotate(${w}) scale(.9)" fill="#6B4B33" opacity=".55">
    <ellipse cx="0" cy="3" rx="5" ry="4"/><circle cx="-5.5" cy="-3" r="2"/><circle cx="-2" cy="-6" r="2"/><circle cx="2" cy="-6" r="2"/><circle cx="5.5" cy="-3" r="2"/></g>`;
  let s = '';
  [[-30, -22, 80], [-10, -14, 100], [12, -24, 80], [34, -16, 100], [58, -26, 80], [82, -18, 100]].forEach(([x, y, w]) => { s += pfote(x, y, w); });
  return `<g class="katze zustand-weg">${s}
    <g transform="translate(6 -104) rotate(-6)">
      <rect x="-34" y="-22" width="68" height="40" rx="4" fill="#FFFDF6" stroke="#D9C2A3" stroke-width="1.5"/>
      <text class="t-zettel" x="0" y="-4" text-anchor="middle">Bin weg…</text>
      <text class="t-zettel" x="0" y="11" text-anchor="middle">${name} 🐾</text>
    </g></g>`;
}
const STREICHEL_SAETZE = ['Schnurr… 💕', 'Prrrr… 😻', 'Mehr! 😽', 'Das ist schön… 💗'];

// ---------- Sprechblase ----------

function zeigeBlase(text, dringend, ansagen = true) {
  const hoehe = 40;
  const y = Math.max(KATZE_Y - katzenHoehe * KATZE_MASS - 10, 150);
  const fuellung = dringend ? 'var(--orange)' : 'var(--gelb)';
  const schrift = dringend ? '#FFFFFF' : '#4A3410';
  const breite = Math.min(330, text.length * 8.4 + 34);
  const x = Math.min(Math.max(KATZE_X, breite / 2 + 12), 390 - breite / 2 - 12);
  el.blase.setAttribute('transform', `translate(${x} ${y})`);
  el.blase.innerHTML = `<g class="blase-inhalt">
      <rect class="blase-grund" x="${-breite / 2}" y="${-hoehe - 9}" width="${breite}" height="${hoehe}" rx="20" fill="${fuellung}"/>
      <path d="M${KATZE_X - x - 9} -10 L${KATZE_X - x} 0 L${KATZE_X - x + 9} -10Z" fill="${fuellung}"/>
      <rect class="blase-glanz" x="${-breite / 2 + 12}" y="${-hoehe - 5}" width="${breite - 24}" height="5" rx="2.5" fill="#fff" opacity=".28"/>
      <text class="t-blase" x="0" y="${-hoehe / 2 - 3}" text-anchor="middle" fill="${schrift}">${text}</text>
    </g>`;
  try { // Breite an die echte Textlänge anpassen
    const echt = el.blase.querySelector('text').getComputedTextLength() + 34;
    const grund = el.blase.querySelector('.blase-grund');
    grund.setAttribute('width', echt);
    grund.setAttribute('x', -echt / 2);
    const glanz = el.blase.querySelector('.blase-glanz');
    glanz.setAttribute('width', echt - 24);
    glanz.setAttribute('x', -echt / 2 + 12);
  } catch { /* Schätzung bleibt */ }
  if (ansagen) el.ansage.textContent = text;
}

function zeigeNormaleBlase(ansagen = true) {
  const { text, dringend } = normalerSatz(aktuellerZustand());
  zeigeBlase(text, dringend, ansagen);
}

function kurzeBlase(text, dringend = false, dauer = 2600) {
  zeigeBlase(text, dringend);
  clearTimeout(blaseTimer);
  blaseTimer = setTimeout(() => { blaseTimer = null; zeigeNormaleBlase(false); }, dauer);
}

// ---------- Anzeige ----------

// Name auf das Schild schreiben; lange Namen werden schmaler
function zeigeName(name) {
  const t = el.name;
  if (t.textContent !== name) t.textContent = name;
  t.removeAttribute('textLength');
  t.removeAttribute('lengthAdjust');
  try {
    if (t.getComputedTextLength() > 66) {
      t.setAttribute('textLength', 66);
      t.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    }
  } catch { /* ohne Messung */ }
  el.nameKnopf.setAttribute('aria-label', `${name}. Namen ändern`);
}

// Die Flasche zeigt, wie viel Milch das Kätzchen heute schon bekommen hat (voll = 2 l)
function zeigeFlasche() {
  const ml = heuteGefuettert();
  const h = Math.round(58 * Math.min(1, Math.max(0.15, ml / ZIEL_ML)));
  el.flascheMilch.setAttribute('y', -4 - h);
  el.flascheMilch.setAttribute('height', h);
  el.flascheText.textContent = `heute ${liter(ml)}`;
  el.flasche.setAttribute('aria-label', `Milchflasche: heute ${liter(ml)} Milch bekommen. Milch gibt es automatisch, wenn du trinkst.`);
}

function zeichne() {
  const art = katzenArt();
  const zustand = aktuellerZustand();
  const bild = Date.now() < wuetendBis && zustand !== 'weg' ? 'wuetend' : streichelt ? 'gestreichelt' : zustand;
  const g = demo.zustand === 'fertig' ? 1 : groesse();
  const ml = heuteMl();

  // Katze nur neu zeichnen, wenn sich etwas geändert hat (sonst ruckelt die Animation)
  const feiern = Date.now() < feierBis;
  // Spielen nur, solange die Katze da ist (weg/gross beendet es)
  if (spielt && (daten.katze.status === 'weg' || zustand === 'fertig')) { spielt = false; wolle.el.style.display = ''; setzeWolle(WOLLE_X, WOLLE_Y); }
  const pose = spielt ? 'spielen' : 'sitzen';
  const zweite = Date.now() < zweiteBis && !spielt;
  const schluessel = [art.id, bild, g, feiern, pose, zweite].join('|');
  if (schluessel !== letzteZeichnung && !fuettertGerade) {
    if (zustand === 'weg') {
      el.huelle.innerHTML = wegBild(daten.katze.name);
      katzenHoehe = 128;
    } else {
      const { svg, hoehe } = zeichneKatze({ art, groesse: g, zustand: bild, feiern, pose, zweite });
      el.huelle.innerHTML = svg;
      katzenHoehe = hoehe;
    }
    letzteZeichnung = schluessel;
  }

  zeigeName(daten.katze.name);
  const bisGross = milchBisGross(art);
  el.szene.setAttribute('aria-label', `Dein Kätzchen ${daten.katze.name}, ${art.name}, hat ${liter(daten.katze.milch)} von ${liter(bisGross)} Milch getrunken`);
  el.streak.textContent = daten.streak;
  el.muenzen.textContent = daten.muenzen;
  el.schild.textContent = `💧 ${liter(ml)}`;
  if (!fuettertGerade) zeigeFlasche();

  // Fortschrittsbalken (Milch bis zum Grosswerden)
  const anteil = Math.min(1, daten.katze.milch / bisGross);
  const breite = 134 * anteil;
  el.balkenFuellung.setAttribute('width', breite > 0 && breite < 18 ? 18 : breite);
  el.balkenText.textContent = `🍼 ${zahl(daten.katze.milch / 1000)}/${bisGross / 1000} l`;

  // Tropfen-Knopf: Gläser bis zum Ziel
  const n = glaeserBisZiel(ml);
  el.tropfenZahl.textContent = n > 0 ? n : '✓';
  el.tropfenKnopf.setAttribute('aria-label', `Getränk eintragen. Heute ${liter(ml)}. ` + (n > 0
    ? `Noch ${n} ${n === 1 ? 'Glas' : 'Gläser'} bis zum Ziel`
    : 'Ziel erreicht'));

  // Knopf statt Balken, wenn die Katze gross ist
  if (zustand === 'fertig' && daten.katze.status === 'fertig') {
    el.aktion.textContent = '🏡 In den Katzengarten bringen';
    el.aktion.hidden = false;
  } else if (daten.katze.status === 'weg') {
    const kannZurueck = daten.muenzen >= ZURUECKHOLEN_PREIS;
    el.aktion.textContent = kannZurueck ? `🪙 ${daten.katze.name} zurückholen · ${ZURUECKHOLEN_PREIS} 🪙` : '🍼 Neues Kätzchen holen';
    el.aktion.hidden = false;
    el.aktionZweit.textContent = kannZurueck ? '🍼 Lieber ein neues Kätzchen' : `Zurückholen kostet ${ZURUECKHOLEN_PREIS} 🪙 (du hast ${daten.muenzen})`;
    el.aktionZweit.disabled = !kannZurueck;
  } else {
    el.aktion.hidden = true;
  }
  el.aktionZweit.hidden = daten.katze.status !== 'weg' || el.aktion.hidden;
  el.balken.style.display = el.aktion.hidden ? '' : 'none';

  if (!blaseTimer) zeigeNormaleBlase(false);
  zeichneFreundinMini();
  if (!freundinUi.huelle.hidden) zeichneFreundinKarte();
  aktualisiereDemo(zustand);
}

// ---------- Abrechnung um 4 Uhr ----------

const ABRECHNUNG_SATZ = {
  abgehauen: '',
  geschafft: '2 Liter geschafft! +1 🪙 🔥',
  knapp: 'Gestern war es knapp… 😿',
  streakWeg: 'Streak weg… 😿 Heute neu!',
  ruhe: '',
};

// Rechnet alle abgelaufenen Tage ab (auch verpasste, mit dem, was eingetragen ist – sonst 0 ml).
// Die Katze wächst nur durch Milch, die Abrechnung zählt Streak und Münzen.
function abrechnen() {
  const tag = heute();
  if (!daten.abgerechnetBis) {
    daten.abgerechnetBis = verschiebeTag(tag, -1);
    speichern();
    return;
  }
  const offen = offeneTage(daten.abgerechnetBis, tag);
  if (!offen.length) return;
  spielenEnde(); // ein neuer Tag beginnt

  const verlauf = [];
  for (const tagSchluessel of offen) {
    const ml = summeMl(eintraegeVomTag(daten.eintraege, tagSchluessel));
    const katzeDa = daten.katze.status === 'waechst';
    const { stand, ergebnis } = rechneTagAb({ streak: daten.streak, muenzen: daten.muenzen, vortagMl: daten.vortagMl }, ml, katzeDa);
    Object.assign(daten, stand);
    if (ergebnis === 'abgehauen') daten.katze.status = 'weg';
    verlauf.push({ ml, ergebnis });
  }
  daten.abgerechnetBis = verschiebeTag(tag, -1);

  // alte Einträge aufräumen
  const grenze = verschiebeTag(tag, -EINTRAEGE_BEHALTEN_TAGE);
  daten.eintraege = daten.eintraege.filter((e) => tagesSchluessel(e.zeit) >= grenze);
  daten.fuetterungen = daten.fuetterungen.filter((e) => tagesSchluessel(e.zeit) >= grenze);
  speichern();

  // Rückmeldung: das wichtigste Ereignis zeigen
  const reihenfolge = ['abgehauen', 'streakWeg', 'knapp', 'geschafft', 'ruhe'];
  const wichtigstes = reihenfolge.find((r) => verlauf.some((v) => v.ergebnis === r));
  const letzter = verlauf[verlauf.length - 1];
  const satz = ABRECHNUNG_SATZ[wichtigstes];
  demo.zustand = null; // nach der Abrechnung zählt wieder der echte Zustand
  if (satz) setTimeout(() => kurzeBlase(satz, wichtigstes === 'streakWeg', 4500), 300);
  const anzahl = verlauf.length > 1 ? `${verlauf.length} Tage abgerechnet. ` : '';
  el.ansage.textContent = `${anzahl}Letzter Tag: ${liter(letzter.ml)}. ${satz || ''}`;
}

// ---------- Füttern (automatisch beim Trinken) ----------

// Gibt dem Kätzchen die Milch für das heute getrunkene Wasser. Ergebnis: Menge in ml.
function fuettereAutomatisch() {
  const k = daten.katze;
  if (k.status !== 'waechst') return 0;
  const art = katzenArt();
  const portion = milchPortion({ heuteGetrunken: heuteMl(), heuteGefuettert: heuteGefuettert(), milch: k.milch, bisGross: milchBisGross(art) });
  if (portion <= 0) return 0;
  daten.fuetterungen.push({ ml: portion, zeit: jetzt() });
  k.milch += portion;
  if (k.milch >= milchBisGross(art)) k.status = 'fertig';
  demo.zustand = null;
  return portion;
}

// Animation: Flasche giesst, Napf füllt sich, Katze schleckt und wird grösser
function milchAnimation(portion, danach) {
  fuettertGerade = true;
  clearTimeout(blaseTimer);
  blaseTimer = null;
  el.blase.innerHTML = '';
  el.szene.classList.remove('fuettern');
  void el.szene.getBBox?.();
  el.szene.classList.add('fuettern');
  starteAnimation('schlecken');
  setTimeout(plaetschern, 500); // Milch fliesst in den Napf
  setTimeout(() => {
    fuettertGerade = false;
    el.szene.classList.remove('fuettern');
    letzteZeichnung = '';
    zeichne();
    starteAnimation('wachsen');
    clearTimeout(blaseTimer);
    blaseTimer = null;
    danach();
  }, 1900);
}

function wackeln(ziel) {
  ziel.classList.remove('wackeln');
  void ziel.getBBox?.();
  ziel.classList.add('wackeln');
}

// Flasche antippen: erklärt, wie das Füttern geht
function flascheAntippen() {
  wackeln(el.flasche);
  kurzeBlase('Milch kommt von selbst, wenn du trinkst 💧', false, 3200);
}
el.flasche.addEventListener('click', flascheAntippen);
el.flasche.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flascheAntippen(); }
});
el.flasche.addEventListener('animationend', () => el.flasche.classList.remove('wackeln'));

// Balken antippen: sagt, wie lange das Kätzchen noch wächst
function wachstumErklaeren() {
  const k = daten.katze;
  if (k.status === 'fertig') { kurzeBlase('Ich bin gross! Ab in den Garten 🏡'); return; }
  if (k.status === 'weg') { kurzeBlase('Hol dir ein neues Kätzchen 🍼'); return; }
  const bis = milchBisGross(katzenArt());
  const st = stufe();
  const bisNaechste = milchFuerStufe(st + 1, bis) - k.milch;
  const rest = bis - k.milch;
  const tage = Math.ceil(rest / ZIEL_ML);
  const naechste = st + 1 < 3 ? `Noch ${liter(bisNaechste)} bis ${STUFEN[st + 1] === 'Junge Katze' ? 'zur jungen Katze' : 'zum Kätzchen'}, ` : 'Noch ';
  kurzeBlase(`Ich bin ${st === 0 ? 'ein Baby' : st === 1 ? 'ein Kätzchen' : 'eine junge Katze'}. ${naechste}${liter(rest)} bis gross (ca. ${tage} ${tage === 1 ? 'Tag' : 'Tage'}) 🐾`, false, 5000);
}
$('#balken-knopf').addEventListener('click', wachstumErklaeren);
$('#balken-knopf').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wachstumErklaeren(); }
});

// ---------- Münzen pro Liter ----------
// Gleicht die Liter-Münzen von heute ab (auch nach «Rückgängig»). Ergebnis: neu dazu (+) oder weg (−).
function literMuenzenAbgleichen() {
  const tag = heute();
  if (daten.literBonus?.tag !== tag) daten.literBonus = { tag, anzahl: 0 };
  const diff = literMuenzen(heuteMl()) - daten.literBonus.anzahl;
  if (diff !== 0) {
    daten.muenzen = Math.max(0, daten.muenzen + diff);
    daten.literBonus.anzahl += diff;
  }
  return diff;
}

// ---------- Gross: in den Garten ----------

// Art für die nächste Katze (im Laden gewählt, sonst gleiche Art)
// Aktionstag: heute sind alle Katzen gratis und man kann jederzeit wechseln (Wunsch 2026-11-21).
// Ab morgen gilt wieder: nur mit Münzen gekaufte Katzen. Eine heute gewählte Katze bleibt, bis sie gross ist.
const AKTIONSTAG = '2026-11-21';
const aktionHeute = () => heute() === AKTIONSTAG;
const istFrei = (id) => daten.freigeschaltet.includes(id) || aktionHeute();

function naechsteArt() {
  const id = daten.naechsteArtId;
  if (id && istFrei(id)) return id;
  // die jetzige Art, wenn sie gekauft ist; sonst (z. B. nach dem Aktionstag) die erste gekaufte
  return istFrei(daten.katze.artId) ? daten.katze.artId : daten.freigeschaltet[0];
}

function neueKatze(artId) {
  daten.katze = { name: neuerName(), artId, milch: 0, status: 'waechst' };
}

function inDenGartenBringen() {
  const k = daten.katze;
  daten.garten.push({ artId: k.artId, name: k.name, datum: heute() });
  daten.muenzen += MUENZEN_GARTEN;
  const name = k.name;
  neueKatze(naechsteArt());
  demo.zustand = null;
  speichern();
  zeichne();
  kurzeBlase(`${name} wohnt jetzt im Garten! +${MUENZEN_GARTEN} 🪙 Ich bin ${daten.katze.name} 🍼`, false, 4500);
  if (daten.garten.length === GARTEN_GROSS_AB) zeigeMeldung('🌳 3 Katzen! Dein Katzengarten ist grösser geworden.', false);
}

function neuesKaetzchenHolen() {
  const weg = daten.katze.name;
  neueKatze(naechsteArt());
  daten.vortagMl = null;
  demo.zustand = null;
  speichern();
  zeichne();
  kurzeBlase(`Hallo! Ich bin ${daten.katze.name}. Ich bleib, wenn du trinkst 🍼`, false, 4500);
  el.ansage.textContent = `${weg} ist weg. ${daten.katze.name} ist neu bei dir.`;
}

// Abgehauene Katze für Münzen zurückholen: Milch bleibt, die Streak ist weg
function zurueckholen() {
  if (daten.katze.status !== 'weg' || daten.muenzen < ZURUECKHOLEN_PREIS) return;
  daten.muenzen -= ZURUECKHOLEN_PREIS;
  daten.katze.status = 'waechst';
  daten.streak = 0;
  daten.vortagMl = null;
  demo.zustand = null;
  speichern();
  letzteZeichnung = '';
  zeichne();
  starteAnimation('huepfen');
  kurzeBlase('Ich bin wieder da! 😻 Die Streak fängt neu an.', false, 4500);
  el.ansage.textContent = `${daten.katze.name} ist zurück. Noch ${daten.muenzen} Münzen.`;
}

el.aktion.addEventListener('click', () => {
  if (daten.katze.status === 'fertig') inDenGartenBringen();
  else if (daten.katze.status === 'weg') {
    if (daten.muenzen >= ZURUECKHOLEN_PREIS) zurueckholen();
    else neuesKaetzchenHolen();
  }
});
el.aktionZweit.addEventListener('click', () => {
  if (daten.katze.status === 'weg') neuesKaetzchenHolen();
});

// Namen ändern (Schild links vom Balken)
function nameAendern() {
  const neu = prompt('Wie heisst dein Kätzchen?', daten.katze.name);
  const name = sauber(neu);
  if (!name) return;
  daten.katze.name = name;
  speichern();
  zeichne();
  kurzeBlase(`Ich heisse jetzt ${name}! 😺`);
}
el.nameKnopf.addEventListener('click', nameAendern);
el.nameKnopf.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nameAendern(); }
});

// ---------- Laden ----------

const laden = {
  huelle: $('#laden'),
  raster: $('#laden-raster'),
  muenzen: $('#laden-muenzen'),
  zurueckFokus: null,
  sicherId: null,      // Art, die gerade auf «Sicher?» wartet
  sicherTimer: null,
};

// Kann die aktuelle Katze sofort gewechselt werden? (nur ein Baby ohne Milch)
function kannSofortWechseln() {
  if (aktionHeute()) return daten.katze.status !== 'fertig'; // heute jederzeit (nicht, wenn sie gross auf den Garten wartet)
  return daten.katze.status === 'weg' || (daten.katze.status === 'waechst' && daten.katze.milch === 0);
}

const LADEN_HINWEIS = document.querySelector('.laden-hinweis').innerHTML;
function zeichneLaden() {
  document.querySelector('.laden-hinweis').innerHTML = (aktionHeute()
    ? '<strong>🎉 Heute sind alle Katzen gratis, und du kannst jederzeit wechseln. Ab morgen gelten wieder die 🪙.</strong><br>' : '') + LADEN_HINWEIS;
  laden.muenzen.textContent = `🪙 ${daten.muenzen}`;
  laden.muenzen.setAttribute('aria-label', `${daten.muenzen} Münzen`);
  const naechste = naechsteArt();
  laden.raster.innerHTML = '';
  for (const art of ARTEN) {
    const gekauft = daten.freigeschaltet.includes(art.id);
    const frei = gekauft || aktionHeute();
    const waechst = art.id === daten.katze.artId;
    const istNaechste = frei && art.id === naechste;
    const karte = document.createElement('article');
    karte.className = 'art-karte' + (frei ? '' : ' gesperrt') + (istNaechste ? ' gewaehlt' : '');

    const { svg } = zeichneKatze({ art, groesse: 1, zustand: 'gluecklich', effekte: false });
    let marke = '';
    if (aktionHeute() && !gekauft) marke = '<span class="art-marke">🎉 Heute gratis</span>';
    if (waechst) marke = '<span class="art-marke">🍼 Bei dir</span>';
    else if (istNaechste) marke = '<span class="art-marke">⏭️ Als Nächstes</span>';

    let knopf;
    let fehlt = '';
    if (frei) {
      if (istNaechste) {
        knopf = `<button class="art-knopf" type="button" disabled>✓ Als Nächstes</button>`;
      } else {
        const text = kannSofortWechseln() ? (aktionHeute() && daten.katze.milch > 0 ? 'Jetzt wechseln' : 'Jetzt adoptieren') : 'Als Nächstes';
        knopf = `<button class="art-knopf blau" type="button" data-waehlen="${art.id}" aria-label="${art.name}: ${text}">${text}</button>`;
      }
    } else if (daten.muenzen >= art.preis) {
      const sicher = laden.sicherId === art.id;
      knopf = `<button class="art-knopf ${sicher ? 'sicher' : 'orange'}" type="button" data-kaufen="${art.id}"
        aria-label="${art.name} für ${art.preis} Münzen freischalten${sicher ? '. Nochmals tippen zum Bestätigen' : ''}">
        ${sicher ? `Sicher? ${art.preis} 🪙` : `Freischalten · ${art.preis} 🪙`}</button>`;
    } else {
      knopf = `<button class="art-knopf" type="button" disabled aria-label="${art.name}: ${art.preis} Münzen nötig">🔒 ${art.preis} 🪙</button>`;
      fehlt = `<p class="art-fehlt">Noch ${art.preis - daten.muenzen} 🪙 sammeln</p>`;
    }

    karte.innerHTML = `${marke}
      <svg class="art-bild" viewBox="-95 -172 200 182" aria-hidden="true">${svg}</svg>
      ${frei ? '' : '<span class="art-schloss" aria-hidden="true">🔒</span>'}
      <h3>${art.name}</h3>
      <p class="art-tage">${art.satz}<br>${zahl(milchBisGross(art) / 1000)} l Wasser bis gross</p>
      ${knopf}${fehlt}`;
    laden.raster.appendChild(karte);
  }
}

function oeffneLaden() {
  laden.zurueckFokus = document.activeElement;
  laden.sicherId = null;
  faecher(false);
  zeichneLaden();
  laden.huelle.hidden = false;
  laden.huelle.querySelector('.schliessen-knopf').focus();
}

function schliesseLaden() {
  if (laden.huelle.hidden) return;
  laden.huelle.hidden = true;
  laden.zurueckFokus?.focus?.();
}

function kaufen(id) {
  const art = artNachId(id);
  if (daten.freigeschaltet.includes(id) || daten.muenzen < art.preis) return;
  // erster Tipp: nachfragen, zweiter Tipp: kaufen
  if (laden.sicherId !== id) {
    laden.sicherId = id;
    clearTimeout(laden.sicherTimer);
    laden.sicherTimer = setTimeout(() => { laden.sicherId = null; if (!laden.huelle.hidden) zeichneLaden(); }, 4000);
    zeichneLaden();
    laden.raster.querySelector(`[data-kaufen="${id}"]`)?.focus();
    return;
  }
  laden.sicherId = null;
  daten.muenzen -= art.preis;
  daten.freigeschaltet.push(id);
  speichern();
  zeichne();
  zeichneLaden();
  el.ansage.textContent = `${art.name} freigeschaltet! Noch ${daten.muenzen} Münzen.`;
  laden.raster.querySelector(`[data-waehlen="${id}"]`)?.focus();
}

function waehleArt(id) {
  const art = artNachId(id);
  if (!istFrei(id)) return;
  daten.naechsteArtId = id;
  if (kannSofortWechseln()) {
    if (daten.katze.status === 'weg') { neueKatze(id); daten.vortagMl = null; }
    daten.katze.artId = id;
    // Aktionstag: die Milch kommt mit, aber nicht so viel, dass die neue Katze sofort gross ist
    daten.katze.milch = Math.min(daten.katze.milch, milchBisGross(art) - 1);
    speichern();
    schliesseLaden();
    zeichne();
    kurzeBlase(daten.katze.milch > 0 ? `Hallo! Ich bin jetzt ${art.name} 🐾` : `Hallo! Ich bin ein ${art.name}-Baby 🍼`, false, 3500);
  } else {
    speichern();
    zeichneLaden();
    el.ansage.textContent = `${art.name} kommt als Nächstes zu dir.`;
    laden.raster.querySelector('.gewaehlt .art-knopf')?.focus();
  }
}

laden.raster.addEventListener('click', (e) => {
  const k = e.target.closest('button');
  if (!k) return;
  if (k.dataset.kaufen) kaufen(k.dataset.kaufen);
  else if (k.dataset.waehlen) waehleArt(k.dataset.waehlen);
});
laden.huelle.querySelectorAll('[data-schliessen]').forEach((x) => x.addEventListener('click', schliesseLaden));
$('#leiste-laden').addEventListener('click', oeffneLaden);
$('#plus-knopf').addEventListener('click', oeffneLaden);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') schliesseLaden(); });

// ---------- Katzengarten (schwebende Insel, isometrisch) ----------
//
// Die Insel ist ein Raster aus Feldern. Jedes Zeichen in INSEL_KARTE ist ein Feld:
//   .  Gras    o  Gras mit Blumen    P  Holzweg    ~  Bach    =  Brücke    S  Schlafkissen
//   H  Katzenhaus    T  Baum    K  Kratzbaum    W  Wollknäuel    N  Futternapf    B  Busch
// Auf . o P = S dürfen die Katzen laufen. Auf den Kissen (S) schlafen sie am liebsten.
// Hat der Garten viele Katzen, kommen vorne weitere Reihen dazu.

// bis 2 Katzen: kleine Insel
const INSEL_KLEIN = [
  'HT.S.',
  '..o.W',
  '~~=~~',
  'Ko.PS',
  'B.P.o',
];
// ab 3 Katzen: grosse Insel mit mehr Wiese, Kissen und Bäumen
const INSEL_GROSS = [
  'HT.S.oB',
  '..o.W..',
  '~~=~~~~',
  'Ko.PS.T',
  'B.P.o.S',
  '.oP.N..',
  'o.P..oW',
];
const INSEL_ZUSATZ = ['.oP.o.N', 'o.P.So.']; // je 3 Katzen mehr (ab 7) eine Reihe dazu
const GARTEN_GROSS_AB = 3;
const BEGEHBAR = '.oP=S';
const INSEL_A = 30;        // halbe Feldbreite (Feld = 60 × 30)
const INSEL_BREITE_KLEIN = 2 * 22 + 10 * 30; // Breite der kleinen Insel (5 × 5 Felder)
const INSEL_TIEFE = 44;    // Dicke der Insel
const INSEL_RAND = 22;
const INSEL_OBEN = 70;     // Platz über der Insel für Haus und Bäume
const GARTEN_MASS = 0.38;  // Grösse der Katzen auf der Insel
const KATZEN_BOX = [-80, -165, 160, 175]; // Zeichenfläche einer Katze (Einheiten der Katze)
const SCHRITT_MS = 560;    // so lange dauert ein Schritt von Feld zu Feld

const garten = {
  seite: $('#garten'),
  insel: $('#insel'),
  boden: $('#insel-boden'),
  raster: $('#garten-raster'),
  leer: $('#garten-leer'),
  titel: $('#garten-titel-text'),
  zurueckFokus: null,
  masse: null,
  felder: [],     // begehbare Felder { c, r, x, y, typ }
  karte: [],
  katzen: [],     // Katzen, die gerade herumlaufen
  quelle: 'ich',  // 'ich' = eigener Garten, 'freundin' = Garten der Freundin (nur anschauen)
  offen: false,
};

// Katzen des Gartens, der gerade offen ist
function gartenListe() {
  return garten.quelle === 'freundin' ? (daten.freundin.garten ||= []) : daten.garten;
}

function inselKarte(anzahl) {
  if (anzahl < GARTEN_GROSS_AB) return [...INSEL_KLEIN];
  const karte = [...INSEL_GROSS];
  const extra = Math.max(0, Math.ceil((anzahl - 6) / 3));
  for (let n = 0; n < extra; n++) karte.splice(karte.length - 1, 0, INSEL_ZUSATZ[n % INSEL_ZUSATZ.length]);
  return karte;
}

function datumText(schluessel) {
  const [j, m, t] = schluessel.split('-');
  return `${Number(t)}.${Number(m)}.${j}`;
}

const rund = (z) => Math.round(z * 10) / 10;
const raute = (x, y, a) => `M${rund(x)} ${rund(y - a / 2)} L${rund(x + a)} ${rund(y)} L${rund(x)} ${rund(y + a / 2)} L${rund(x - a)} ${rund(y)}Z`;

// ---- Zeichnungen der Deko (Ursprung = Mitte des Feldes) ----

function dekoBaum() {
  return `<ellipse cx="0" cy="2" rx="22" ry="8" fill="#2F6B2A" opacity=".2"/>
    <path d="M-4 2 L-3 -26 L3 -26 L4 2Z" fill="#8A5A3A"/>
    <circle cx="-12" cy="-36" r="16" fill="#5FAF3E"/><circle cx="12" cy="-38" r="17" fill="#6DBB45"/>
    <circle cx="0" cy="-54" r="18" fill="#8BCB55"/><circle cx="-6" cy="-60" r="7" fill="#B6E27E" opacity=".7"/>
    <circle cx="14" cy="-46" r="5" fill="#B6E27E" opacity=".5"/>`;
}

function dekoKatzenhaus() {
  return `<ellipse cx="0" cy="4" rx="28" ry="9" fill="#2F6B2A" opacity=".18"/>
    <path d="M-24 -2 L0 10 L0 -18 L-24 -30Z" fill="#FFF3E0"/>
    <path d="M0 10 L24 -2 L24 -30 L0 -18Z" fill="#EBD6B6"/>
    <path d="M-17 -2 L-7 3 L-7 -9 C -7 -16 -17 -21 -17 -14Z" fill="#5B3B26"/>
    <path d="M8 -6 L18 -11 L18 -20 L8 -15Z" fill="#9ED6F7" stroke="#fff" stroke-width="1.5"/>
    <path d="M-29 -29 L0 -15 L0 -58Z" fill="#F08E52"/>
    <path d="M0 -15 L29 -29 L0 -58Z" fill="#D9703A"/>
    <path d="M-10 -50 L-6 -66 L0 -56Z M10 -50 L6 -66 L0 -56Z" fill="#D9703A"/>
    <path d="M-29 -29 L0 -15 L29 -29" stroke="#C25E2C" stroke-width="2" fill="none" stroke-linejoin="round"/>
    <g fill="#fff" opacity=".85" transform="translate(12 -32) scale(.4)"><ellipse cx="0" cy="3" rx="5" ry="4"/><circle cx="-6" cy="-3" r="2.2"/><circle cx="-2" cy="-6" r="2.2"/><circle cx="2" cy="-6" r="2.2"/><circle cx="6" cy="-3" r="2.2"/></g>`;
}

function dekoKratzbaum() {
  return `<ellipse cx="0" cy="3" rx="18" ry="6" fill="#2F6B2A" opacity=".18"/>
    <ellipse cx="0" cy="0" rx="15" ry="6" fill="#D9C2A3"/>
    <rect x="-5" y="-50" width="10" height="50" fill="#E8D2A8"/>
    <path d="M-5 -44 H5 M-5 -36 H5 M-5 -28 H5 M-5 -20 H5 M-5 -12 H5" stroke="#C9A877" stroke-width="2"/>
    <ellipse cx="0" cy="-52" rx="16" ry="6" fill="#B98A5A"/>
    <ellipse cx="0" cy="-55" rx="14" ry="5" fill="#F7A8BC"/>
    <path d="M10 -52 L10 -38" stroke="#8A5A3A" stroke-width="1"/><circle cx="10" cy="-35" r="3.5" fill="#FFD54A"/>`;
}

function dekoWolle() {
  return `<ellipse cx="0" cy="2" rx="12" ry="4" fill="#2F6B2A" opacity=".18"/>
    <circle cx="0" cy="-8" r="9" fill="#F48BA4"/>
    <path d="M-7 -13 C -2 -6 4 -4 8 -6 M-8 -6 C -2 -2 4 -1 7 0 M-3 -16 C 2 -12 6 -10 8 -11" stroke="#D9607E" stroke-width="1.4" fill="none"/>
    <path d="M8 -4 C 14 0 10 4 18 4" stroke="#F48BA4" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
}

function dekoNapf() {
  return `<ellipse cx="0" cy="2" rx="14" ry="4" fill="#2F6B2A" opacity=".18"/>
    <ellipse cx="0" cy="-7" rx="12" ry="3.5" fill="#3E8FD1"/>
    <ellipse cx="0" cy="-6.5" rx="10" ry="2.6" fill="#FFFDF6"/>
    <path d="M-12 -7 Q -11 0 -6 1 H6 Q 11 0 12 -7 Q 0 -2 -12 -7Z" fill="#7FC6F2"/>`;
}

function dekoBusch() {
  return `<ellipse cx="0" cy="3" rx="20" ry="6" fill="#2F6B2A" opacity=".18"/>
    <circle cx="-9" cy="-8" r="10" fill="#7CC245"/><circle cx="8" cy="-9" r="11" fill="#8CCB4E"/>
    <circle cx="0" cy="-16" r="11" fill="#A3D762"/><circle cx="-3" cy="-20" r="3.5" fill="#fff" opacity=".3"/>
    <circle cx="6" cy="-6" r="2" fill="#FF8FA3"/><circle cx="-8" cy="-12" r="1.8" fill="#FFE36E"/>`;
}

const DEKO = {
  H: { svg: dekoKatzenhaus, box: [-32, -70, 64, 80] },
  T: { svg: dekoBaum, box: [-36, -80, 72, 86] },
  K: { svg: dekoKratzbaum, box: [-20, -64, 40, 70] },
  W: { svg: dekoWolle, box: [-14, -20, 34, 26] },
  N: { svg: dekoNapf, box: [-16, -14, 32, 20] },
  B: { svg: dekoBusch, box: [-22, -30, 44, 36] },
};

// ---- Boden der Insel (Felder, Seiten, Bach, Weg, Kissen, Wasserfall) ----

function zeichneInselBoden(karte) {
  const R = karte.length, C = karte[0].length, a = INSEL_A, D = INSEL_TIEFE;
  const x0 = INSEL_RAND + R * a;
  const y0 = INSEL_OBEN + a / 2;
  const breite = 2 * INSEL_RAND + (R + C) * a;
  const hoehe = y0 + (C + R - 1) * a / 2 + D + 60;
  const mitte = (c, r) => [x0 + (c - r) * a, y0 + (c + r) * a / 2];
  garten.masse = { breite, hoehe, mitte, a };

  const links = [mitte(0, R - 1)[0] - a, mitte(0, R - 1)[1]];
  const unten = [mitte(C - 1, R - 1)[0], mitte(C - 1, R - 1)[1] + a / 2];
  const rechts = [mitte(C - 1, 0)[0] + a, mitte(C - 1, 0)[1]];
  const p = (pt, dy = 0) => `${rund(pt[0])} ${rund(pt[1] + dy)}`;

  let s = `<defs>
    <linearGradient id="g-insel-erde" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C99A66"/><stop offset="1" stop-color="#9C6C42"/></linearGradient>
    <linearGradient id="g-insel-erde2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B5854F"/><stop offset="1" stop-color="#875A36"/></linearGradient>
    <linearGradient id="g-wasserfall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7CCBEB"/><stop offset="1" stop-color="#D6F1F7" stop-opacity=".2"/></linearGradient>
  </defs>`;

  // Schatten unter der schwebenden Insel
  s += `<ellipse cx="${rund((links[0] + rechts[0]) / 2)}" cy="${rund(unten[1] + D + 34)}" rx="${rund((rechts[0] - links[0]) * 0.32)}" ry="9" fill="#1F6E9A" opacity=".12"/>`;

  // Seiten: Erde mit Graskante
  s += `<path d="M${p(links)} L${p(unten)} L${p(unten, D)} C ${p([unten[0] - 40, unten[1] + D + 10])} ${p([links[0] + 30, links[1] + D + 4])} ${p(links, D * 0.7)}Z" fill="url(#g-insel-erde)"/>`;
  s += `<path d="M${p(unten)} L${p(rechts)} L${p(rechts, D * 0.7)} C ${p([rechts[0] - 30, rechts[1] + D + 4])} ${p([unten[0] + 40, unten[1] + D + 10])} ${p(unten, D)}Z" fill="url(#g-insel-erde2)"/>`;
  s += `<path d="M${p(links)} L${p(unten)} L${p(rechts)} L${p(rechts, 7)} L${p(unten, 7)} L${p(links, 7)}Z" fill="#8CCB4E"/>`;
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    const x = links[0] + (unten[0] - links[0]) * t, y = links[1] + (unten[1] - links[1]) * t + 18 + (i % 2) * 10;
    s += `<ellipse cx="${rund(x)}" cy="${rund(y)}" rx="4" ry="2.6" fill="#E0BE8E" opacity=".7"/>`;
    const x2 = unten[0] + (rechts[0] - unten[0]) * t, y2 = unten[1] + (rechts[1] - unten[1]) * t + 16 + ((i + 1) % 2) * 12;
    s += `<ellipse cx="${rund(x2)}" cy="${rund(y2)}" rx="3.5" ry="2.2" fill="#C99A66" opacity=".7"/>`;
  }

  // Felder
  const z = zufall(7);
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const [x, y] = mitte(c, r);
      const t = karte[r][c];
      const gras = (c + r) % 2 ? '#A9DA62' : '#B6E06F';
      if (t === '~' || t === '=') {
        s += `<path d="${raute(x, y, a)}" fill="#6FC2E8"/>`;
        s += `<path d="M${rund(x - a)} ${rund(y)} L${rund(x)} ${rund(y - a / 2)} L${rund(x + a)} ${rund(y)} L${rund(x + a * 0.8)} ${rund(y + 1)} L${rund(x)} ${rund(y - a / 2 + 4)} L${rund(x - a * 0.8)} ${rund(y + 1)}Z" fill="#4FA9E3" opacity=".45"/>`;
        s += `<path d="M${rund(x - 10)} ${rund(y + 2)} l8 4 M${rund(x + 6)} ${rund(y - 3)} l7 3.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`;
        if (t === '~' && (c + r) % 2 === 0) {
          s += `<ellipse cx="${rund(x - 6)}" cy="${rund(y + 4)}" rx="6" ry="3" fill="#7CC83F"/><path d="M${rund(x - 6)} ${rund(y + 4)} l5 -2" stroke="#6FC2E8" stroke-width="1.4"/>`;
        }
        if (t === '=') {
          const b = a * 0.78;
          s += `<path d="${raute(x, y - 5, b)}" fill="#E6BE85"/>`;
          s += `<path d="M${rund(x - b)} ${rund(y - 5)} L${rund(x)} ${rund(y - 5 + b / 2)} L${rund(x + b)} ${rund(y - 5)} L${rund(x + b)} ${rund(y - 1)} L${rund(x)} ${rund(y - 1 + b / 2)} L${rund(x - b)} ${rund(y - 1)}Z" fill="#B9834C"/>`;
          for (const k of [0.25, 0.5, 0.75]) {
            const sx = x - b + b * k, sy = y - 5 - b / 2 * k;
            s += `<path d="M${rund(sx)} ${rund(sy)} l${rund(b)} ${rund(b / 2)}" stroke="#C99A66" stroke-width="1.3"/>`;
          }
        }
      } else {
        s += `<path d="${raute(x, y, a)}" fill="${gras}"/>`;
        if (t === 'P') {
          const b = a * 0.72;
          s += `<path d="${raute(x, y, b)}" fill="#EBCFA6"/>`;
          for (const k of [0.33, 0.66]) {
            const sx = x - b + b * k, sy = y - b / 2 * k;
            s += `<path d="M${rund(sx)} ${rund(sy)} l${rund(b)} ${rund(b / 2)}" stroke="#D9B184" stroke-width="1.3"/>`;
          }
        } else if (t === 'S') {
          // rundes Schlafkissen
          s += `<ellipse cx="${rund(x)}" cy="${rund(y + 2)}" rx="${rund(a * 0.62)}" ry="${rund(a * 0.27)}" fill="#D9607E"/>
            <ellipse cx="${rund(x)}" cy="${rund(y)}" rx="${rund(a * 0.62)}" ry="${rund(a * 0.27)}" fill="#F48BA4"/>
            <ellipse cx="${rund(x)}" cy="${rund(y)}" rx="${rund(a * 0.4)}" ry="${rund(a * 0.16)}" fill="#FFC2D0"/>`;
        } else if (t === 'o') {
          for (let i = 0; i < 3; i++) {
            const bx = x + (z() - 0.5) * a, by = y + (z() - 0.5) * a * 0.4;
            s += `<circle cx="${rund(bx)}" cy="${rund(by)}" r="2" fill="${['#fff', '#FFE36E', '#FF8FA3'][i]}"/>`;
          }
        } else if (t === '.' || z() < 0.5) {
          const gx = x + (z() - 0.5) * a, gy = y + (z() - 0.5) * a * 0.4;
          s += `<path d="M${rund(gx)} ${rund(gy)} l-2 -5 M${rund(gx)} ${rund(gy)} l0 -6 M${rund(gx)} ${rund(gy)} l2 -5" stroke="#7BB848" stroke-width="1.3" stroke-linecap="round"/>`;
        }
      }
    }
  }

  // Wasserfall, wo der Bach den rechten Rand erreicht
  for (let r = 0; r < R; r++) {
    if (karte[r][C - 1] !== '~') continue;
    const [x, y] = mitte(C - 1, r);
    const o = [x + a, y], u = [x, y + a / 2];
    s += `<path d="M${p(o)} L${p(u)} L${p(u, D + 28)} L${p(o, D + 28)}Z" fill="url(#g-wasserfall)"/>`;
    s += `<path d="M${p([x + a * 0.7, y + a * 0.15])} l0 ${D + 18} M${p([x + a * 0.35, y + a * 0.33])} l0 ${D + 10}" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>`;
    s += `<ellipse cx="${rund(x + a / 2)}" cy="${rund(y + a / 4 + D + 28)}" rx="${rund(a * 0.7)}" ry="4" fill="#fff" opacity=".45"/>`;
  }

  garten.boden.setAttribute('viewBox', `0 0 ${rund(breite)} ${rund(hoehe)}`);
  garten.boden.innerHTML = s;
  garten.insel.style.aspectRatio = `${rund(breite)} / ${rund(hoehe)}`;
  // Felder bleiben gleich gross: eine grössere Insel ist breiter als der Bildschirm und lässt sich wischen
  garten.insel.style.width = `${Math.max(100, rund((breite / INSEL_BREITE_KLEIN) * 100))}%`;
}

// Ein Element genau über einen Bereich der Insel legen (Masse in Insel-Einheiten)
function legeAuf(e, x, y, [bx, by, bw, bh]) {
  const { breite, hoehe } = garten.masse;
  e.style.left = `${((x + bx) / breite) * 100}%`;
  e.style.top = `${((y + by) / hoehe) * 100}%`;
  e.style.width = `${(bw / breite) * 100}%`;
  e.style.height = `${(bh / hoehe) * 100}%`;
}

const tiefe = (feld) => 10 + (feld.r + feld.c) * 10 + 5;
const KATZEN_BOX_INSEL = KATZEN_BOX.map((z) => z * GARTEN_MASS);

function zeichneGarten() {
  stoppeGartenKatzen();
  const liste = gartenListe();
  const karte = inselKarte(liste.length);
  garten.karte = karte;
  zeichneInselBoden(karte);
  const { mitte } = garten.masse;
  const eigener = garten.quelle === 'ich';
  const frName = daten.freundin.name;
  garten.titel.textContent = eigener ? `Katzengarten · ${liste.length}` : `${frName}s Katzengarten · ${liste.length}`;
  garten.leer.textContent = eigener
    ? 'Noch leer. Wenn dein Kätzchen gross ist, zieht es hier ein 🐾'
    : `${frName} hat noch keine Katze im Garten 🐾`;
  garten.leer.hidden = liste.length > 0;
  $('#garten-tipp').textContent = eigener
    ? 'Tipp: Katzen antippen oder streicheln. Wollknäuel auf eine Katze ziehen, dann spielt sie. Lange drücken und ziehen trägt eine Katze woanders hin.'
    : `Das ist der Garten von ${frName}. Antippen oder streicheln geht auch hier.`;
  garten.seite.classList.toggle('fremd', !eigener);
  garten.raster.innerHTML = '';
  garten.felder = [];

  for (let r = 0; r < karte.length; r++) {
    for (let c = 0; c < karte[r].length; c++) {
      const t = karte[r][c];
      const [x, y] = mitte(c, r);
      if (BEGEHBAR.includes(t)) garten.felder.push({ c, r, x, y, typ: t });
      if (!DEKO[t]) continue;
      const d = document.createElement('div');
      d.className = 'insel-deko';
      d.style.zIndex = 10 + (r + c) * 10 + c;
      legeAuf(d, x, y, DEKO[t].box);
      d.innerHTML = `<svg viewBox="${DEKO[t].box.join(' ')}" aria-hidden="true">${DEKO[t].svg()}</svg>`;
      garten.raster.appendChild(d);
    }
  }

  // Katzen auf zufällige freie Felder setzen
  const frei = [...garten.felder].sort(() => Math.random() - 0.5);
  liste.forEach((eintrag, nr) => {
    const art = artNachId(eintrag.artId);
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'g-katze';
    knopf.dataset.nr = nr;
    knopf.setAttribute('aria-label', `${eintrag.name}, ${art.name}, im Garten seit ${datumText(eintrag.datum)}. Antippen oder streicheln.`);
    knopf.innerHTML = `<span class="g-figur"><svg viewBox="${KATZEN_BOX.join(' ')}" aria-hidden="true"></svg></span>
      <span class="g-name">${eintrag.name} · ${datumText(eintrag.datum)}</span>
      <span class="g-blase" aria-hidden="true"></span>`;
    garten.raster.appendChild(knopf);
    const katze = { nr, eintrag, art, el: knopf, feld: frei[nr % frei.length], pose: '', bild: '', timer: null, links: Math.random() < 0.5 };
    garten.katzen.push(katze);
    setzeAufFeld(katze, katze.feld);
    setzePose(katze, Math.random() < 0.3 ? 'schlafen' : 'sitzen');
    neueGartenWolle(katze);
  });
}

function setzeAufFeld(katze, feld) {
  katze.feld = feld;
  legeAuf(katze.el, feld.x, feld.y, KATZEN_BOX_INSEL);
  katze.el.style.zIndex = tiefe(feld);
}

// pose: 'sitzen' | 'laufen' | 'schlafen'; bild: Zustand für das Gesicht
function setzePose(katze, pose, bild = pose === 'schlafen' ? 'schlafen' : 'gluecklich') {
  const schluessel = pose + bild;
  katze.pose = pose;
  katze.el.classList.toggle('schlaeft', pose === 'schlafen');
  katze.el.classList.toggle('laeuft', pose === 'laufen');
  katze.el.classList.toggle('nach-links', katze.links);
  if (katze.bild === schluessel) return;
  katze.bild = schluessel;
  const { svg } = zeichneKatze({ art: katze.art, groesse: 1, zustand: bild, pose, effekte: pose === 'schlafen' });
  katze.el.querySelector('svg').innerHTML = svg;
}

// ---- Verhalten: herumschlendern, sitzen, schlafen ----

function nachbarn(feld) {
  return garten.felder.filter((f) => Math.abs(f.c - feld.c) + Math.abs(f.r - feld.r) === 1);
}

// kürzester Weg über begehbare Felder (Breitensuche)
function weg(von, nach) {
  const vorher = new Map([[von, null]]);
  const schlange = [von];
  while (schlange.length) {
    const f = schlange.shift();
    if (f === nach) break;
    for (const n of nachbarn(f)) {
      if (!vorher.has(n)) { vorher.set(n, f); schlange.push(n); }
    }
  }
  if (!vorher.has(nach)) return [];
  const pfad = [];
  for (let f = nach; f && f !== von; f = vorher.get(f)) pfad.unshift(f);
  return pfad;
}

function belegt(feld, ausser) {
  return garten.katzen.some((k) => k !== ausser && k.feld === feld);
}

function plane(katze, ms) {
  clearTimeout(katze.timer);
  katze.timer = setTimeout(() => takt(katze), ms);
}

function takt(katze) {
  if (!garten.offen || katze.gehalten || katze.spielt) return;
  if (katze.pose === 'schlafen') { // aufwachen und kurz sitzen
    setzePose(katze, 'sitzen');
    plane(katze, 1500 + Math.random() * 2500);
    return;
  }
  const w = Math.random();
  if (w < 0.55) {
    // zu einem Feld in der Nähe schlendern
    const ziele = garten.felder.filter((f) => !belegt(f, katze) && Math.abs(f.c - katze.feld.c) + Math.abs(f.r - katze.feld.r) <= 3 && f !== katze.feld);
    laufe(katze, zufallsEintrag(ziele) || katze.feld, () => plane(katze, 1800 + Math.random() * 3500));
  } else if (w < 0.78) {
    // schlafen, am liebsten auf einem Kissen
    const kissen = garten.felder.filter((f) => f.typ === 'S' && !belegt(f, katze));
    if (kissen.length && Math.random() < 0.7) laufe(katze, zufallsEintrag(kissen), () => schlafe(katze));
    else schlafe(katze);
  } else {
    setzePose(katze, 'sitzen');
    plane(katze, 2000 + Math.random() * 3000);
  }
}

function schlafe(katze) {
  setzePose(katze, 'schlafen');
  plane(katze, 9000 + Math.random() * 9000);
}

function laufe(katze, ziel, danach) {
  const pfad = weg(katze.feld, ziel);
  if (!pfad.length) { danach(); return; }
  setzePose(katze, 'laufen');
  const schritt = () => {
    if (!garten.offen || katze.gehalten) return;
    const f = pfad.shift();
    if (!f) { setzePose(katze, 'sitzen'); danach(); return; }
    // nach links oder rechts schauen (auf dem Bildschirm)
    if (f.x !== katze.feld.x) katze.links = f.x < katze.feld.x;
    katze.el.classList.toggle('nach-links', katze.links);
    setzeAufFeld(katze, f);
    clearTimeout(katze.timer);
    katze.timer = setTimeout(schritt, SCHRITT_MS);
  };
  schritt();
}

function starteGartenKatzen() {
  garten.offen = true;
  // Schlafende Katzen schlafen erst einmal weiter
  garten.katzen.forEach((k) => plane(k, k.pose === 'schlafen' ? 6000 + Math.random() * 9000 : 600 + Math.random() * 2500));
}

function stoppeGartenKatzen() {
  garten.offen = false;
  garten.katzen.forEach((k) => clearTimeout(k.timer));
  garten.katzen = [];
}

// ---- Antippen, Streicheln, Tragen ----

function gartenBlase(katze, text) {
  const b = katze.el.querySelector('.g-blase');
  b.textContent = text;
  b.classList.remove('zeigt');
  void b.offsetWidth;
  b.classList.add('zeigt');
}

function gartenHerz(clientX, clientY) {
  const r = garten.insel.getBoundingClientRect();
  const h = document.createElement('span');
  h.className = 'g-herz';
  h.textContent = '💗';
  h.style.left = `${clientX - r.left}px`;
  h.style.top = `${clientY - r.top}px`;
  garten.insel.appendChild(h);
  setTimeout(() => h.remove(), 1100);
}

function zeigeGartenName(katze) {
  garten.raster.querySelectorAll('.g-name.zeigt').forEach((x) => x.classList.remove('zeigt'));
  const n = katze.el.querySelector('.g-name');
  n.classList.add('zeigt');
  clearTimeout(zeigeGartenName.timer);
  zeigeGartenName.timer = setTimeout(() => n.classList.remove('zeigt'), 2800);
}

function gartenAntippen(katze) {
  if (katze.art.figur.foto2 && zaehleTipps(katze.tipps ||= [])) {
    katze.tipps.length = 0;
    const f2 = katze.art.figur.foto2;
    clearTimeout(katze.timer);
    katze.bild = '';
    katze.el.querySelector('svg').innerHTML = zeichneKatze({ art: katze.art, groesse: 1, zweite: true, effekte: false }).svg;
    if (!datei(f2.ton, f2.dauer)) miau({ hoch: 0.8, lang: 1.6 });
    gartenBlase(katze, 'Wuiii! 🌀');
    setTimeout(() => { setzePose(katze, 'sitzen'); plane(katze, 2000); }, f2.dauer);
    return;
  }
  miau({ hoch: 0.9 + Math.random() * 0.3 });
  const schlief = katze.pose === 'schlafen';
  setzePose(katze, 'sitzen');
  katze.el.classList.remove('huepft');
  void katze.el.offsetWidth;
  katze.el.classList.add('huepft');
  gartenBlase(katze, schlief ? 'Mrrp? 😪' : zufallsEintrag(['Miau! 😺', 'Mrrp! 🐾', 'Hallo! 💛']));
  zeigeGartenName(katze);
  el.ansage.textContent = `${katze.eintrag.name} sagt Miau.`;
  plane(katze, 2500 + Math.random() * 2000);
}

function feldBeiPunkt(clientX, clientY) {
  const r = garten.insel.getBoundingClientRect();
  const ux = (clientX - r.left) / r.width * garten.masse.breite;
  const uy = (clientY - r.top) / r.height * garten.masse.hoehe;
  let bestes = null, abstand = Infinity;
  for (const f of garten.felder) {
    const d = Math.hypot(ux - f.x, (uy - f.y) * 2);
    if (d < abstand) { abstand = d; bestes = f; }
  }
  return abstand < INSEL_A * 1.6 ? bestes : null;
}

let gartenZug = null;
const HALTEN_MS = 420;

garten.raster.addEventListener('pointerdown', (e) => {
  const knopf = e.target.closest('.g-katze');
  if (!knopf || gartenZug) return;
  const katze = garten.katzen[Number(knopf.dataset.nr)];
  try { knopf.setPointerCapture(e.pointerId); } catch { /* ältere Browser */ }
  gartenZug = { katze, id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, weg: 0, herz: 0, streichelt: false, traegt: false, halten: null };
  if (garten.quelle === 'ich') {
    gartenZug.halten = setTimeout(() => {
      if (!gartenZug || gartenZug.streichelt) return;
      // lange gedrückt: Katze hochheben
      gartenZug.traegt = true;
      katze.gehalten = true;
      clearTimeout(katze.timer);
      setzePose(katze, 'sitzen', 'hungrig');
      knopf.classList.add('gehoben');
      gartenBlase(katze, 'Huch! 🙀');
    }, HALTEN_MS);
  }
});

garten.raster.addEventListener('pointermove', (e) => {
  const z = gartenZug;
  if (!z || e.pointerId !== z.id) return;
  const d = Math.hypot(e.clientX - z.x, e.clientY - z.y);
  z.x = e.clientX; z.y = e.clientY;
  if (z.traegt) {
    z.katze.el.style.transform = `translate(${e.clientX - z.startX}px, ${e.clientY - z.startY - 12}px)`;
    return;
  }
  z.weg += d;
  if (!z.streichelt && z.weg > 14) {
    z.streichelt = true;
    clearTimeout(z.halten);
    clearTimeout(z.katze.timer);
    if (z.katze.pose !== 'schlafen') setzePose(z.katze, 'sitzen', 'gestreichelt');
    z.katze.el.classList.add('schnurrt');
    schnurrenStart();
    gartenBlase(z.katze, z.katze.pose === 'schlafen' ? 'Zzz… prrr 💕' : 'Schnurr… 💕');
  }
  if (z.streichelt && z.weg - z.herz > 30) {
    z.herz = z.weg;
    gartenHerz(e.clientX, e.clientY);
  }
});

function beendeGartenZug(e, abbrechen) {
  const z = gartenZug;
  if (!z || e.pointerId !== z.id) return;
  gartenZug = null;
  clearTimeout(z.halten);
  const katze = z.katze;
  if (z.traegt) {
    katze.gehalten = false;
    katze.el.classList.remove('gehoben');
    katze.el.style.transform = '';
    const ziel = abbrechen ? null : feldBeiPunkt(e.clientX, e.clientY);
    if (ziel && !belegt(ziel, katze)) {
      katze.el.classList.add('abgesetzt');
      setzeAufFeld(katze, ziel);
      setTimeout(() => katze.el.classList.remove('abgesetzt'), 50);
      el.ansage.textContent = `${katze.eintrag.name} sitzt jetzt woanders.`;
    }
    setzePose(katze, 'sitzen');
    plane(katze, 2500);
    return;
  }
  if (z.streichelt) {
    katze.el.classList.remove('schnurrt');
    schnurrenStopp();
    if (katze.pose === 'schlafen') {
      plane(katze, 6000 + Math.random() * 6000); // schläft zufrieden weiter
    } else {
      setTimeout(() => { if (katze.pose === 'sitzen') setzePose(katze, 'sitzen'); }, 900);
      plane(katze, 3000 + Math.random() * 2000);
    }
    return;
  }
  if (!abbrechen) gartenAntippen(katze);
}

garten.raster.addEventListener('pointerup', (e) => beendeGartenZug(e, false));
garten.raster.addEventListener('pointercancel', (e) => beendeGartenZug(e, true));
// Tastatur: Enter/Leertaste = antippen (pointerup kommt dann nicht)
garten.raster.addEventListener('click', (e) => {
  const knopf = e.target.closest('.g-katze');
  if (knopf && e.detail === 0) gartenAntippen(garten.katzen[Number(knopf.dataset.nr)]);
});

function oeffneGarten(quelle = 'ich') {
  garten.quelle = quelle;
  garten.zurueckFokus = quelle === 'ich' ? document.activeElement : $('#freundin-knopf');
  faecher(false);
  garten.seite.hidden = false;
  zeichneGarten();
  starteGartenKatzen();
  garten.seite.scrollTop = 0;
  // grosse Insel: in der Mitte anfangen
  const huelle = garten.insel.parentElement;
  huelle.scrollLeft = (huelle.scrollWidth - huelle.clientWidth) / 2;
  $('#garten-zurueck').focus();
}

function schliesseGarten() {
  if (garten.seite.hidden) return;
  stoppeGartenKatzen();
  garten.seite.hidden = true;
  // vom Garten der Freundin zurück zu ihrer Karte
  if (garten.quelle === 'freundin') { $('#freundin-knopf').focus(); oeffneFreundin(); return; }
  garten.zurueckFokus?.focus?.();
}

// ---- Wollknäuel im Garten: neben jeder Katze einer, auf eine Katze ziehen = sie spielt ----

const WOLLE_BOX = [-9, -9, 18, 18];

function legeWolle(wEl, feld) {
  legeAuf(wEl, feld.x + 22, feld.y + 4, WOLLE_BOX);
  wEl.style.zIndex = tiefe(feld) + 1;
  wEl.style.transform = '';
  wEl.hidden = false;
}

function neueGartenWolle(katze) {
  const w = document.createElement('div');
  w.className = 'g-wolle';
  w.setAttribute('aria-hidden', 'true');
  w.innerHTML = `<svg viewBox="${WOLLE_BOX.join(' ')}"><g transform="scale(.5)">${wollknaeuel(13)}</g></svg>`;
  garten.raster.appendChild(w);
  katze.wolle = w;
  legeWolle(w, katze.feld);
}

function gartenSpielen(katze, wEl) {
  if (katze.spielt) return;
  katze.spielt = true;
  katze.spielSeit = Date.now();
  katze.wolle = wEl; // dieser Knäuel gehört jetzt zu ihr
  wEl.hidden = true;
  clearTimeout(katze.timer);
  katze.el.classList.remove('laeuft');
  setzePose(katze, 'spielen');
  gartenBlase(katze, 'Wolle! 🧶');
  miau({ hoch: 1.1 });
  el.ansage.textContent = `${katze.eintrag.name} spielt mit dem Wollknäuel.`;
}

function gartenSpielenEnde(katze) {
  if (!katze.spielt) return;
  katze.spielt = false;
  setzePose(katze, 'sitzen');
  legeWolle(katze.wolle, katze.feld);
  plane(katze, 2500 + Math.random() * 2000);
}

let gartenWollZug = null;
garten.raster.addEventListener('pointerdown', (e) => {
  const wEl = e.target.closest('.g-wolle');
  if (!wEl) return;
  e.stopPropagation();
  try { wEl.setPointerCapture(e.pointerId); } catch { /* ältere Browser */ }
  gartenWollZug = { wEl, id: e.pointerId, x: e.clientX, y: e.clientY };
  wEl.classList.add('gehoben');
}, true);
window.addEventListener('pointermove', (e) => {
  const z = gartenWollZug;
  if (!z || e.pointerId !== z.id) return;
  z.wEl.style.transform = `translate(${e.clientX - z.x}px, ${e.clientY - z.y}px) scale(1.3)`;
});
function gartenWolleLoslassen(e) {
  const z = gartenWollZug;
  if (!z || e.pointerId !== z.id) return;
  gartenWollZug = null;
  z.wEl.classList.remove('gehoben');
  // Welche Katze liegt unter dem Finger?
  const ziel = garten.katzen.find((k) => {
    const r = k.el.getBoundingClientRect();
    return e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
  });
  if (ziel && !ziel.spielt && !ziel.gehalten) {
    // der eigene Knäuel der Zielkatze bleibt liegen, wenn sie einen anderen bekommt
    if (ziel.wolle && ziel.wolle !== z.wEl) ziel.wolle.hidden = false;
    gartenSpielen(ziel, z.wEl);
  } else {
    z.wEl.style.transform = '';
  }
}
window.addEventListener('pointerup', gartenWolleLoslassen, true);
window.addEventListener('pointercancel', gartenWolleLoslassen, true);

// Jede neue Berührung im Garten (ausser an einem Knäuel) beendet das Spielen
garten.seite.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.g-wolle')) return;
  garten.katzen.filter((k) => k.spielt && Date.now() - (k.spielSeit || 0) > 300).forEach(gartenSpielenEnde);
}, true);

$('#leiste-garten').addEventListener('click', () => oeffneGarten('ich'));
$('#garten-zurueck').addEventListener('click', schliesseGarten);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') schliesseGarten(); });

// ---------- Trinken ----------

function trinken(ml) {
  spielenEnde();
  const vorher = heuteMl();
  const stufeVorher = stufe();
  daten.eintraege.push({ ml, zeit: jetzt() });
  const literMuenze = literMuenzenAbgleichen();
  const portion = fuettereAutomatisch();
  const gross = daten.katze.status === 'fertig';
  speichern();
  if (portion > 0) fuettertGerade = true; // Katze erst nach dem Schlecken grösser zeichnen
  zeichne();

  zeigeTrinkBlase(ml);
  const nachher = heuteMl();
  // Münze und Streak gibt es bei der Abrechnung morgen um 4 Uhr
  const zielSatz = vorher < ZIEL_ML && nachher >= ZIEL_ML ? 'Geschafft! 2 Liter 🎉 Morgen früh gibt es 🪙. ' : '';
  const neueStufe = !gross && stufe() > stufeVorher ? stufe() : null;
  const muenzSatz = literMuenze > 0 ? `+${literMuenze} 🪙 für ${literMuenzen(nachher)} l! ` : '';
  // nach dem Platzen der Tropfen-Blase: Milch giessen (oder nur eine Sprechblase).
  // Eigener Zeitgeber, damit Antippen oder ein weiteres Getränk die Milch nicht verschluckt.
  el.blase.innerHTML = '';
  clearTimeout(blaseTimer);
  blaseTimer = setTimeout(() => { blaseTimer = null; }, 1300); // so lange keine andere Sprechblase
  clearTimeout(trinken.milchTimer);
  trinken.milchTimer = setTimeout(() => {
    if (portion > 0) {
      if (neueStufe !== null) feierBis = Date.now() + 1900 + 4500;
      milchAnimation(portion, () => {
        if (gross) kurzeBlase('Ich bin gross geworden! 🎉', false, 4000);
        else if (neueStufe !== null) {
          miau({ hoch: 1.1, lang: 1.2 });
          kurzeBlase(`Ich bin jetzt ${neueStufe === 1 ? 'ein Kätzchen' : 'eine junge Katze'}! 🎉`, false, 4500);
          setTimeout(() => { letzteZeichnung = ''; zeichne(); }, 4600); // Konfetti wieder weg
        } else kurzeBlase(`${zielSatz || muenzSatz}Mmh, Milch! +${dl(portion)} 😋`, false, 3200);
      });
    } else {
      fuettertGerade = false; // falls ein vorheriges Getränk noch wartete
      letzteZeichnung = '';
      zeichne();
      starteAnimation('huepfen');
      if (zielSatz || muenzSatz) kurzeBlase(zielSatz || muenzSatz, false, 3500);
      else kurzeBlase('Danke! 💧');
    }
  }, 1300);
  el.ansage.textContent = `${dl(ml)} eingetragen. Heute ${liter(nachher)}.${portion > 0 ? ` Dein Kätzchen bekommt ${dl(portion)} Milch.` : ''}`;

  zeigeRueckgaengig();
}

function rueckgaengig() {
  const tag = heute();
  // letzten Eintrag von heute entfernen
  for (let i = daten.eintraege.length - 1; i >= 0; i--) {
    if (tagesSchluessel(daten.eintraege[i].zeit) !== tag) continue;
    const [weg] = daten.eintraege.splice(i, 1);
    // Wurde die Milch davon schon gefüttert, nimmt die Katze sie wieder zurück
    let zuViel = heuteGefuettert() - heuteMl();
    for (let j = daten.fuetterungen.length - 1; j >= 0 && zuViel > 0; j--) {
      const f = daten.fuetterungen[j];
      if (tagesSchluessel(f.zeit) !== tag) continue;
      const ab = Math.min(f.ml, zuViel);
      f.ml -= ab;
      zuViel -= ab;
      daten.katze.milch = Math.max(0, daten.katze.milch - ab);
      if (f.ml <= 0) daten.fuetterungen.splice(j, 1);
    }
    if (daten.katze.status === 'fertig' && daten.katze.milch < milchBisGross(katzenArt())) daten.katze.status = 'waechst';
    literMuenzenAbgleichen(); // Liter-Münze zurück, wenn ein Liter wegfällt
    speichern();
    clearTimeout(blaseTimer);
    blaseTimer = null;
    zeichne();
    el.ansage.textContent = `${dl(weg.ml)} entfernt. Heute ${liter(heuteMl())}.`;
    break;
  }
  versteckeRueckgaengig();
}

function zeigeRueckgaengig() {
  el.rueckgaengig.hidden = false;
  clearTimeout(rueckgaengigTimer);
  rueckgaengigTimer = setTimeout(versteckeRueckgaengig, RUECKGAENGIG_MS);
}

function versteckeRueckgaengig() {
  clearTimeout(rueckgaengigTimer);
  el.rueckgaengig.hidden = true;
}

// ---------- Effekte ----------

const BLOB = 'M-58 -6 C -62 -34 -30 -50 -2 -44 C 30 -52 64 -36 60 -8 C 68 20 38 40 6 35 C -26 42 -66 26 -58 -6Z';
const HERZ = 'M0 4 C -7 -1 -9 -7 -5 -9.5 C -2.5 -11 0 -9 0 -7 C 0 -9 2.5 -11 5 -9.5 C 9 -7 7 -1 0 4Z';

function zeigeTrinkBlase(ml) {
  const y = Math.max(KATZE_Y - katzenHoehe * KATZE_MASS - 40, 170);
  let spritzer = '';
  for (let i = 0; i < 8; i++) {
    const w = (i / 8) * Math.PI * 2;
    const dx = Math.round(Math.cos(w) * 80), dy = Math.round(Math.sin(w) * 60);
    spritzer += `<circle class="spritzer" r="${5 + (i % 3) * 2}" fill="#4FA9E3" style="--dx:${dx}px;--dy:${dy}px"/>`;
  }
  el.trinkBlase.setAttribute('transform', `translate(${KATZE_X} ${y})`);
  el.trinkBlase.innerHTML = `${spritzer}<g class="trink-pop">
      <path d="${BLOB}" fill="#4FA9E3"/>
      <path d="M-40 -26 C -30 -38 -12 -40 2 -38" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".45"/>
      <circle cx="44" cy="-24" r="4" fill="#fff" opacity=".45"/>
      <text class="t-trink" x="0" y="4" text-anchor="middle">+${dl(ml)}</text>
    </g>`;
  clearTimeout(zeigeTrinkBlase.timer);
  zeigeTrinkBlase.timer = setTimeout(() => { el.trinkBlase.innerHTML = ''; }, 1800);
}

function starteAnimation(klasse) {
  el.huelle.classList.remove('federn', 'huepfen', 'wachsen', 'schlecken');
  void el.huelle.getBBox(); // Animation neu starten
  el.huelle.classList.add(klasse);
}

// Herz an der Stelle des Fingers (Bildschirm → Szene umrechnen)
function herzBei(clientX, clientY) {
  let x = KATZE_X, y = KATZE_Y - 80;
  try {
    const p = new DOMPoint(clientX, clientY).matrixTransform(el.szene.getScreenCTM().inverse());
    x = p.x; y = p.y;
  } catch { /* dann über der Katze */ }
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('transform', `translate(${rund(x)} ${rund(y)}) scale(${(1.4 + Math.random() * 0.8).toFixed(2)})`);
  g.innerHTML = `<path class="herz-flug" d="${HERZ}" fill="#FF7A9A" stroke="#fff" stroke-width="1"/>`;
  el.herzen.appendChild(g);
  setTimeout(() => g.remove(), 1200);
}

// ---------- Katze antippen und streicheln ----------

// 3× schnell antippen (Foto-Katze): die zweite Katze erscheint und dreht sich einmal
const DREIFACH_MS = 1500;
let zweiteBis = 0;
function zaehleTipps(liste) {
  const t = Date.now();
  liste.push(t);
  while (liste.length && t - liste[0] > DREIFACH_MS) liste.shift();
  return liste.length >= 3;
}
function zeigeZweiteKatze() {
  const f2 = katzenArt().figur.foto2;
  zweiteBis = Date.now() + f2.dauer;
  letzteZeichnung = '';
  zeichne();
  if (!datei(f2.ton, f2.dauer)) miau({ hoch: 0.8, lang: 1.6 });
  kurzeBlase('Wuiii! 🌀', false, 2500);
  setTimeout(() => { letzteZeichnung = ''; zeichne(); }, f2.dauer + 50);
}
const startTipps = [];

// Mehr als 10× in 15 Sekunden antippen: die Katze wird hässig und kratzt den Bildschirm
const WUETEND_TIPPS = 10, WUETEND_FENSTER_MS = 15000, WUETEND_DAUER_MS = 3500;
const wutTipps = [];
let wuetendBis = 0;
function zuVieleTipps() {
  const t = Date.now();
  wutTipps.push(t);
  while (wutTipps.length && t - wutTipps[0] > WUETEND_FENSTER_MS) wutTipps.shift();
  return wutTipps.length > WUETEND_TIPPS;
}
function wirdHaessig() {
  wutTipps.length = 0;
  startTipps.length = 0;
  wuetendBis = Date.now() + WUETEND_DAUER_MS;
  zweiteBis = 0;
  letzteZeichnung = '';
  zeichne();
  fauchen();
  kurzeBlase('Grrr! Lass mich in Ruhe! 😾', true, WUETEND_DAUER_MS);
  // Kratzer über den ganzen Bildschirm, App wackelt
  const k = $('#kratzer');
  k.hidden = false;
  k.classList.remove('kratzt');
  void k.offsetWidth;
  k.classList.add('kratzt');
  $('.app').classList.remove('schuetteln');
  void $('.app').offsetWidth;
  $('.app').classList.add('schuetteln');
  el.ansage.textContent = `${daten.katze.name} ist hässig und kratzt.`;
  clearTimeout(wirdHaessig.timer);
  wirdHaessig.timer = setTimeout(() => {
    k.hidden = true;
    $('.app').classList.remove('schuetteln');
    letzteZeichnung = '';
    zeichne();
  }, WUETEND_DAUER_MS);
}

function antippen() {
  // UU II AA (Foto-Katze) wird nie hässig (Wunsch 2026-11-21)
  if (daten.katze.status !== 'weg' && !katzenArt().figur.foto && zuVieleTipps()) { wirdHaessig(); return; }
  if (Date.now() < wuetendBis) { kurzeBlase('Grrr! 😾', true, 1500); return; }
  if (katzenArt().figur.foto2 && daten.katze.status !== 'weg' && zaehleTipps(startTipps)) { startTipps.length = 0; zeigeZweiteKatze(); return; }
  starteAnimation('federn');
  if (daten.katze.status !== 'weg') miau({ hoch: aktuellerZustand() === 'hungrig' ? 1.15 : 1, lang: aktuellerZustand() === 'hungrig' ? 1.4 : 1 });
  const zustand = aktuellerZustand();
  const liste = ANTIPP_SAETZE[zustand] || ANTIPP_SAETZE.gluecklich;
  kurzeBlase(zufallsEintrag(liste), zustand === 'hungrig');
}

function beginneStreicheln() {
  if (daten.katze.status === 'weg') return;
  streichelt = true;
  schnurrenStart();
  clearTimeout(beginneStreicheln.ende);
  zeichne();
  el.huelle.classList.add('schnurren');
  kurzeBlase(zufallsEintrag(STREICHEL_SAETZE), false, 2400);
}

function beendeStreicheln() {
  el.huelle.classList.remove('schnurren');
  schnurrenStopp();
  clearTimeout(beginneStreicheln.ende);
  beginneStreicheln.ende = setTimeout(() => { streichelt = false; zeichne(); }, 900);
}

let streich = null;
el.huelle.addEventListener('pointerdown', (e) => {
  streich = { id: e.pointerId, x: e.clientX, y: e.clientY, weg: 0, herz: 0, aktiv: false };
  try { el.huelle.setPointerCapture(e.pointerId); } catch { /* ältere Browser */ }
});
el.huelle.addEventListener('pointermove', (e) => {
  if (!streich || e.pointerId !== streich.id) return;
  streich.weg += Math.hypot(e.clientX - streich.x, e.clientY - streich.y);
  streich.x = e.clientX;
  streich.y = e.clientY;
  if (!streich.aktiv && streich.weg > 18 && daten.katze.status !== 'weg') { streich.aktiv = true; beginneStreicheln(); }
  if (streich.aktiv && streich.weg - streich.herz > 34) { streich.herz = streich.weg; herzBei(e.clientX, e.clientY); }
});
el.huelle.addEventListener('pointerup', (e) => {
  if (!streich || e.pointerId !== streich.id) return;
  if (streich.aktiv) beendeStreicheln();
  else antippen();
  streich = null;
});
el.huelle.addEventListener('pointercancel', () => {
  if (streich?.aktiv) beendeStreicheln();
  streich = null;
});
// Tastatur: Enter = antippen, S = streicheln
el.huelle.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); antippen(); }
  if (e.key === 's' || e.key === 'S') { beginneStreicheln(); beendeStreicheln(); }
});
el.huelle.addEventListener('animationend', (e) => {
  if (['federn', 'huepfen', 'wachsen', 'schlecken'].includes(e.animationName)) el.huelle.classList.remove('federn', 'huepfen', 'wachsen', 'schlecken');
});

// ---------- Getränke-Knöpfe auffächern ----------

const faecherKnoepfe = document.querySelectorAll('.faecher-knopf');

function faecher(offen) {
  el.tropfenPlatz.classList.toggle('faecher-offen', offen);
  el.tropfenKnopf.setAttribute('aria-expanded', String(offen));
  faecherKnoepfe.forEach((k) => { k.tabIndex = offen ? 0 : -1; });
}

el.tropfenKnopf.addEventListener('click', (e) => {
  e.stopPropagation();
  faecher(!el.tropfenPlatz.classList.contains('faecher-offen'));
});
faecherKnoepfe.forEach((k) => k.addEventListener('click', (e) => {
  e.stopPropagation();
  faecher(false);
  trinken(Number(k.dataset.ml));
}));
el.rueckgaengig.addEventListener('click', (e) => {
  e.stopPropagation();
  rueckgaengig();
});
document.addEventListener('click', (e) => {
  if (!el.tropfenPlatz.contains(e.target)) faecher(false);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') faecher(false); });

// ---------- Demo-Leiste ----------

function aktualisiereDemo(zustand) {
  const art = katzenArt();
  const bisGross = milchBisGross(art);
  el.demoMilch.max = bisGross;
  el.demoMilch.value = daten.katze.milch;
  el.demoMilchText.textContent = `${liter(daten.katze.milch)} von ${liter(bisGross)}`;
  el.demoStufe.textContent = `Stufe: ${STUFEN[stufeFuerMilch(daten.katze.milch, bisGross)]} · Heute: ${liter(heuteMl())} getrunken, ${liter(heuteGefuettert())} gefüttert`;
  const versatz = daten.demoVersatz ? ` · Uhr +${daten.demoVersatz} Tage` : '';
  const vortag = daten.vortagMl === null ? '–' : liter(daten.vortagMl);
  $('#demo-info').textContent = `Datum: ${heute()}${versatz} · Letzter Tag: ${vortag} · Garten: ${daten.garten.length}`;
  el.demoUhrText.textContent = demo.stunde === null
    ? `echt (${uhrText(stundeImTag(Date.now()) % 24)})`
    : uhrText(demo.stunde);
  document.querySelectorAll('#demo-zustand button').forEach((b) => {
    const aktiv = demo.zustand ? b.dataset.zustand === demo.zustand
      : daten.katze.status !== 'waechst' ? b.dataset.zustand === daten.katze.status
      : b.dataset.zustand === 'auto';
    b.setAttribute('aria-pressed', String(aktiv));
  });
  document.querySelector('[data-zustand="auto"]').textContent = `🤖 Automatisch${demo.zustand ? '' : ` (${zustand})`}`;
}

el.demoKnopf.addEventListener('click', () => {
  const offen = el.demoPanel.hidden;
  el.demoPanel.hidden = !offen;
  el.demoKnopf.setAttribute('aria-expanded', String(offen));
});

el.demoUhr.addEventListener('input', () => {
  demo.stunde = Number(el.demoUhr.value);
  zeichne();
});
$('#demo-uhr-echt').addEventListener('click', () => {
  demo.stunde = null;
  zeichne();
});

document.querySelectorAll('#demo-zustand button').forEach((b) => {
  b.addEventListener('click', () => {
    const bisGross = milchBisGross(katzenArt());
    const wahl = b.dataset.zustand;
    demo.zustand = null;
    if (wahl === 'fertig') {
      daten.katze.milch = bisGross;
      daten.katze.status = 'fertig';
    } else if (wahl === 'weg') {
      daten.katze.status = 'weg';
    } else {
      if (daten.katze.status === 'fertig') daten.katze.milch = bisGross - 2000;
      daten.katze.status = 'waechst';
      if (wahl !== 'auto') demo.zustand = wahl;
    }
    speichern();
    clearTimeout(blaseTimer);
    blaseTimer = null;
    zeichne();
  });
});

el.demoMilch.addEventListener('input', () => {
  const bisGross = milchBisGross(katzenArt());
  daten.katze.milch = Number(el.demoMilch.value);
  daten.katze.status = daten.katze.milch >= bisGross ? 'fertig' : 'waechst';
  speichern();
  zeichne();
});

// Uhr um einen Tag vorstellen: der heutige Tag wird abgerechnet
$('#demo-abrechnen').addEventListener('click', () => {
  daten.demoVersatz = (daten.demoVersatz || 0) + 1;
  versteckeRueckgaengig();
  clearTimeout(blaseTimer);
  blaseTimer = null;
  abrechnen();
  zeichne();
});

// heute abrechnen und danach 3 Tage ohne Einträge (je 0 ml)
$('#demo-ueberspringen').addEventListener('click', () => {
  daten.demoVersatz = (daten.demoVersatz || 0) + 4;
  versteckeRueckgaengig();
  clearTimeout(blaseTimer);
  blaseTimer = null;
  abrechnen();
  zeichne();
});

$('#demo-garten').addEventListener('click', () => {
  for (let i = 0; i < 3; i++) {
    daten.garten.push({ artId: zufallsEintrag(ARTEN).id, name: neuerName(), datum: heute() });
  }
  speichern();
  zeichne();
  el.ansage.textContent = '3 Beispiel-Katzen sind im Garten.';
});

$('#demo-muenzen').addEventListener('click', () => {
  daten.muenzen += 10;
  speichern();
  zeichne();
});

$('#demo-reset').addEventListener('click', () => {
  if (!confirm('Wirklich alles zurücksetzen? Alle Einträge gehen verloren.')) return;
  try { localStorage.removeItem(SPEICHER_NAME); } catch { /* egal */ }
  const demoAn = daten.demoSichtbar;
  daten = startDaten();
  daten.demoSichtbar = demoAn;
  demo.stunde = null;
  demo.zustand = null;
  versteckeRueckgaengig();
  abrechnen();
  zeichne();
  oeffneWillkommen();
});

// ---------- Freundin ----------

const ANSTUPS_PAUSE_MS = 30 * 60 * 1000; // so lange wartet der Knopf nach dem Anstupsen
const freundinUi = {
  huelle: $('#freundin'),
  bild: $('#freundin-bild'),
  titel: $('#freundin-titel'),
  katze: $('#freundin-katze'),
  ml: $('#fr-ml'),
  mlBalken: $('#fr-ml-balken'),
  streak: $('#fr-streak'),
  zustand: $('#fr-zustand'),
  knopf: $('#anstupsen'),
  hinweis: $('#fr-hinweis'),
  zurueckFokus: null,
  letzteMini: '',
};
const meldungEl = $('#meldung');
let meldungTimer = null;

// rundes Bild der Freundin (eigene Zeichnung)
const FREUNDIN_BILD = `<svg viewBox="0 0 60 60">
  <rect width="60" height="60" fill="#BFE6F5"/>
  <path d="M10 60 C 6 30 14 10 30 10 C 46 10 54 30 50 60Z" fill="#7A4A2C"/>
  <path d="M14 60 C 16 50 22 47 30 47 C 38 47 44 50 46 60Z" fill="#F2734A"/>
  <circle cx="30" cy="32" r="15" fill="#FFE0C8"/>
  <path d="M14 30 C 15 17 25 12 33 13 C 41 14 47 21 46 31 C 40 24 31 22 23 25 C 20 27 17 29 14 30Z" fill="#7A4A2C"/>
  <circle cx="24.5" cy="34" r="2.1" fill="#3B2A20"/><circle cx="35.5" cy="34" r="2.1" fill="#3B2A20"/>
  <circle cx="25.2" cy="33.2" r=".7" fill="#fff"/><circle cx="36.2" cy="33.2" r=".7" fill="#fff"/>
  <ellipse cx="20.5" cy="38.5" rx="3" ry="1.8" fill="#FF8FA3" opacity=".6"/><ellipse cx="39.5" cy="38.5" rx="3" ry="1.8" fill="#FF8FA3" opacity=".6"/>
  <path d="M27 40 Q30 43 33 40" stroke="#3B2A20" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M41 13 L44 7 L47 14Z M47 14 L52 9 L52 17Z" fill="#E8A866"/>
</svg>`;

// Was die Freundin heute getrunken hat (ein Stand von gestern zählt heute nicht mehr)
function freundinHeuteMl() {
  const fr = daten.freundin;
  return fr.stand && tagesSchluessel(fr.stand) !== heute() ? 0 : fr.heuteMl;
}

function freundinZustand() {
  const fr = daten.freundin;
  if (fr.status === 'fertig') return 'fertig';
  if (fr.status === 'weg') return 'weg';
  const t = jetzt();
  // ohne genaue Zeit: Freundin hat vor 1 Stunde zuletzt getrunken
  const letzte = fr.letzteTrinkZeit ?? (fr.stand || t - 60 * 60 * 1000);
  return katzenZustand({ heuteMl: freundinHeuteMl(), jetzt: t, letzteTrinkZeit: letzte });
}
const freundinBild = (zustand) => (zustand === 'weg' ? 'traurig' : zustand);

function zeichneFreundinMini() {
  const fr = daten.freundin;
  const zustand = freundinZustand();
  const g = groesse(fr);
  const schluessel = [fr.artId, zustand, g].join('|');
  if (schluessel === freundinUi.letzteMini) return;
  freundinUi.letzteMini = schluessel;
  const { svg, hoehe } = zeichneKatze({ art: artNachId(fr.artId), groesse: g, zustand: freundinBild(zustand), effekte: false });
  // nur Kopf und Brust zeigen
  const h = Math.max(70, hoehe * 0.75);
  el.freundinMini.setAttribute('viewBox', `${rund(-h * 0.55)} ${rund(-hoehe - 4)} ${rund(h * 1.1)} ${rund(h * 1.1)}`);
  el.freundinMini.innerHTML = svg;
}

const FREUNDIN_SATZ = {
  gluecklich: (k) => `${k} ist satt und glücklich 😺`,
  traurig: (k) => `${k} ist ein bisschen traurig 😿`,
  hungrig: (k, n) => `${k} hat Hunger 🥺 Stups ${n} an!`,
  fertig: (k) => `${k} ist gross geworden 🎉`,
  weg: (k) => `${k} ist abgehauen 😿`,
};

function standText(ms) {
  const d = new Date(ms);
  return `${d.getDate()}.${d.getMonth() + 1}., ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function zeichneFreundinKarte() {
  const fr = daten.freundin;
  const art = artNachId(fr.artId);
  const zustand = freundinZustand();
  const g = groesse(fr);
  const bisGross = milchBisGross(art);

  freundinUi.titel.textContent = fr.name;
  freundinUi.bild.innerHTML = FREUNDIN_BILD;

  const { svg } = zeichneKatze({ art, groesse: g, zustand: freundinBild(zustand) });
  freundinUi.katze.innerHTML = `${svg}
    <g transform="translate(0 14)"><rect x="-44" y="-11" width="88" height="22" rx="11" fill="#fff" opacity=".92"/>
    <text class="t-namensschild" x="0" y="5" text-anchor="middle">${fr.katzenName}</text></g>`;
  freundinUi.katze.setAttribute('aria-label', `${fr.katzenName}, ${art.name}, ${liter(fr.milch)} von ${liter(bisGross)} Milch. ${FREUNDIN_SATZ[zustand](fr.katzenName, fr.name)}`);

  const frMl = freundinHeuteMl();
  freundinUi.ml.textContent = `${zahl(frMl / 1000)} von 2 l`;
  freundinUi.mlBalken.style.width = `${Math.min(100, frMl / ZIEL_ML * 100)}%`;
  freundinUi.streak.textContent = fr.streak;
  const anzahl = (fr.garten || []).length;
  $('#fr-garten-knopf').textContent = `🐾 ${fr.name}s Katzengarten ansehen · ${anzahl}`;
  freundinUi.zustand.textContent = `${FREUNDIN_SATZ[zustand](fr.katzenName, fr.name)} · 🍼 ${zahl(fr.milch / 1000)}/${bisGross / 1000} l`
    + (fr.stand ? ` · Stand ${standText(fr.stand)}` : '');
  $('#fr-beispiel').hidden = !fr.beispiel;
  $('.freundin-blatt').classList.toggle('beispiel', !!fr.beispiel);
  zeichneAnstupsKnopf();
}

function zeichneAnstupsKnopf() {
  const fr = daten.freundin;
  const rest = daten.angestupstUm ? daten.angestupstUm + ANSTUPS_PAUSE_MS - jetzt() : 0;
  if (rest > 0) {
    const min = Math.ceil(rest / 60000);
    freundinUi.knopf.disabled = true;
    freundinUi.knopf.textContent = `Angestupst ✓ · wieder in ${min} Min.`;
  } else {
    freundinUi.knopf.disabled = false;
    freundinUi.knopf.textContent = 'Anstupsen 💧';
  }
  freundinUi.hinweis.textContent = fr.beispiel
    ? ''
    : `${fr.name} bekommt: «${daten.name || 'Deine Freundin'} stupst dich an: Trink was! 💧»`;
}

function oeffneFreundin() {
  freundinUi.zurueckFokus = document.activeElement;
  faecher(false);
  zeichneFreundinKarte();
  freundinUi.huelle.hidden = false;
  freundinUi.huelle.querySelector('.schliessen-knopf').focus();
}

function schliesseFreundin() {
  if (freundinUi.huelle.hidden) return;
  freundinUi.huelle.hidden = true;
  freundinUi.zurueckFokus?.focus?.();
}

async function anstupsen() {
  if (freundinUi.knopf.disabled) return;
  const fr = daten.freundin;
  // die Katze der Freundin hüpft kurz
  freundinUi.katze.querySelector('.katze')?.classList.add('federn');
  if (fr.beispiel) {
    zeigeMeldung('Lea ist nur ein Beispiel. Lade deine Kollegin ein 📨', false);
    return;
  }
  const name = meinName();
  if (!name) return;
  // ohne Server geht das Anstupsen als Nachricht (z. B. über Nachrichten oder WhatsApp)
  const geschickt = await teilen({
    titel: 'Anstupsen 💧',
    text: `${name} stupst dich an: Trink was! 💧 ${fr.katzenName} wartet auf Milch.`,
    url: APP_URL,
  }, `Du hast ${fr.name} angestupst 💧`);
  if (!geschickt) return;
  daten.angestupstUm = jetzt();
  speichern();
  zeichneAnstupsKnopf();
}

function zeigeMeldung(text, mitBild = true) {
  meldungEl.innerHTML = `${mitBild ? `<span class="freundin-bild" aria-hidden="true">${FREUNDIN_BILD}</span>` : ''}<span>${text}</span>`;
  meldungEl.hidden = false;
  clearTimeout(meldungTimer);
  meldungTimer = setTimeout(() => { meldungEl.hidden = true; }, 4000);
}
meldungEl.addEventListener('click', () => { meldungEl.hidden = true; });

$('#freundin-knopf').addEventListener('click', () => oeffneFreunde());
$('#fr-garten-knopf').addEventListener('click', () => {
  freundinUi.huelle.hidden = true;
  oeffneGarten('freundin');
});
freundinUi.knopf.addEventListener('click', anstupsen);
freundinUi.huelle.querySelectorAll('[data-schliessen]').forEach((x) => x.addEventListener('click', schliesseFreundin));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') schliesseFreundin(); });

// Demo: Freundin
$('#demo-fr-trinkt').addEventListener('click', () => {
  const fr = daten.freundin;
  fr.heuteMl = fr.heuteMl >= 2500 ? 0 : fr.heuteMl + 250;
  fr.letzteTrinkZeit = jetzt();
  // sie füttert ihre Katze gleich mit
  fr.milch = Math.min(milchBisGross(artNachId(fr.artId)), fr.milch + 250);
  speichern();
  zeichne();
  el.ansage.textContent = `${fr.name} hat heute ${liter(fr.heuteMl)}.`;
});
$('#demo-fr-stupst').addEventListener('click', () => {
  const fr = daten.freundin;
  zeigeMeldung(`${fr.name} hat dich angestupst 💧`);
  starteAnimation('federn');
  kurzeBlase(`${fr.name} denkt an dich! 💧`, false, 3500);
});
$('#demo-fr-fertig').addEventListener('click', () => {
  const fr = daten.freundin;
  const art = artNachId(fr.artId);
  // ihre Katze zieht in ihren Garten, sie bekommt ein neues Baby
  zeigeMeldung(`${fr.name}s ${art.name} «${fr.katzenName}» ist gross und zieht in den Garten 🏡`);
  fr.garten ||= [];
  fr.garten.push({ artId: fr.artId, name: fr.katzenName, datum: heute() });
  Object.assign(fr, { milch: 0, status: 'waechst', katzenName: 'Kiwi', artId: zufallsEintrag(ARTEN).id });
  speichern();
  zeichne();
});

// ---------- Apple Watch ----------
// Die Uhr öffnet Links aus Nachrichten oder Mail. Der Link nimmt den Stand mit
// (Katze, getrunken, Zustand). Live auf der Uhr geht erst mit dem Server.

function uhrLink() {
  const k = daten.katze;
  // i/x: öffentliche und geheime Nummer, damit die Uhr live anzeigt und Wasser eintragen kann
  const p = new URLSearchParams({ n: k.name, a: k.artId, m: k.milch, s: k.status, h: heuteMl(), z: aktuellerZustand(), t: jetzt(), i: daten.konto.id, x: daten.konto.geheim });
  return new URL(`uhr.html#${p}`, location.href).href;
}

// Teilen über das Teilen-Menü des Handys (Nachrichten, WhatsApp, Mail …), sonst Link kopieren.
// Ergebnis: true, wenn etwas geteilt oder kopiert wurde.
async function teilen({ titel, text, url }, erfolg) {
  if (navigator.share) {
    try {
      await navigator.share({ title: titel, text, url });
      zeigeMeldung(erfolg, false);
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return false;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    zeigeMeldung(`Link kopiert. ${erfolg}`, false);
    return true;
  } catch {
    prompt('Diesen Link kopieren und schicken:', url);
    return true;
  }
}

async function aufDieUhr() {
  await teilen({ titel: 'Katzengarten ⌚', text: `${daten.katze.name} für die Apple Watch`, url: uhrLink() },
    'Schick den Link nur dir selbst (er enthält deine geheime Nummer) und tipp ihn auf der Uhr an ⌚');
}

// ---------- Uhr und Widget (Blatt hinter dem Uhr-Knopf) ----------
// Das Scriptable-Widget (widget/Katzengarten.js) liest den Stand über die öffentliche Nummer.

const geraete = { huelle: $('#geraete'), zurueckFokus: null };

function oeffneGeraete() {
  geraete.zurueckFokus = document.activeElement;
  faecher(false);
  $('#widget-code').textContent = daten.konto.id;
  hochladen(); // damit das Widget gleich Daten findet
  geraete.huelle.hidden = false;
  geraete.huelle.querySelector('.schliessen-knopf').focus();
}

function schliesseGeraete() {
  if (geraete.huelle.hidden) return;
  geraete.huelle.hidden = true;
  geraete.zurueckFokus?.focus?.();
}

async function widgetCodeKopieren() {
  try {
    await navigator.clipboard.writeText(daten.konto.id);
    zeigeMeldung('Widget-Code kopiert 📋 Jetzt das Script in Scriptable öffnen.', false);
  } catch {
    prompt('Widget-Code kopieren:', daten.konto.id);
  }
}

geraete.huelle.querySelectorAll('[data-schliessen]').forEach((x) => x.addEventListener('click', schliesseGeraete));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') schliesseGeraete(); });
$('#uhr-schicken').addEventListener('click', aufDieUhr);
$('#widget-code-kopieren').addEventListener('click', widgetCodeKopieren);

// ---------- Kollegin: einladen, Katze schicken, Katze der Kollegin übernehmen ----------
// Jede hat ihre eigene Katze und ihren eigenen Garten (gespeichert auf ihrem Handy).
// Ohne Server schickt man sich die Katze als Link; wer den Link öffnet, sieht sie unter «Freundin».

const APP_URL = new URL('./', location.href).href;

function meinName() {
  if (!daten.name) {
    const n = sauber(prompt('Wie heisst du? Deine Kollegin sieht diesen Namen.', ''), 20);
    if (!n) return null;
    daten.name = n;
    speichern();
  }
  return daten.name;
}

// Link-Inhalt: kurzer Text aus Buchstaben und Zahlen (Base64), damit er in jede Nachricht passt
function packen(obj) {
  let bin = '';
  new TextEncoder().encode(JSON.stringify(obj)).forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function auspacken(text) {
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}

function meineKatzeAlsLink(name) {
  return `${APP_URL}#freundin=${packen(standInhalt(name))}`;
}

// Daten aus einem fremden Link genau prüfen, bevor sie gespeichert werden
function pruefeFreundin(roh) {
  const artOk = (id) => ARTEN.some((a) => a.id === id);
  const zahlIn = (z, min, max) => { const n = Number(z); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min; };
  if (!roh || roh.v !== 1 || !roh.k || !artOk(roh.k.a)) return null;
  const art = artNachId(roh.k.a);
  const stand = zahlIn(roh.t, 0, Date.now() + 400 * TAG_MS);
  return {
    beispiel: false,
    id: istNummer(roh.i) ? roh.i : null, // mit Server: wird laufend neu geladen
    name: sauber(roh.n, 20) || 'Kollegin',
    katzenName: sauber(roh.k.n) || 'Kätzchen',
    artId: art.id,
    milch: zahlIn(roh.k.m, 0, milchBisGross(art)),
    status: ['waechst', 'fertig', 'weg'].includes(roh.k.s) ? roh.k.s : 'waechst',
    streak: Math.round(zahlIn(roh.st, 0, 9999)),
    heuteMl: zahlIn(roh.h, 0, 20000),
    letzteTrinkZeit: null,
    stand,
    garten: (Array.isArray(roh.g) ? roh.g.slice(0, 300) : [])
      .filter((e) => Array.isArray(e) && artOk(e[0]))
      .map(([a, n, d]) => ({ artId: a, name: sauber(n) || 'Katze', datum: /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : tagesSchluessel(stand) })),
  };
}

// Beim Öffnen: Kommt die App über einen Katzen-Link der Kollegin, diese als Freundin speichern
function freundinAusLink() {
  const treffer = location.hash.match(/^#freundin=([A-Za-z0-9_-]{10,20000})$/);
  if (!treffer) return;
  history.replaceState(null, '', location.pathname + location.search);
  let fr = null;
  try { fr = pruefeFreundin(auspacken(treffer[1])); } catch { /* kaputter Link */ }
  if (!fr) { zeigeMeldung('Dieser Katzen-Link ist kaputt 😿', false); return; }
  if (!confirm(`${fr.name} als Freundin speichern? Du siehst dann ihre Katze ${fr.katzenName} und ihren Katzengarten (Stand ${standText(fr.stand)}).`)) return;
  daten.freundin = fr;
  daten.angestupstUm = null;
  freundinUi.letzteMini = '';
  speichern();
  zeichne();
  oeffneFreundin();
  abgleichen(); // gleich den neusten Stand holen
}

$('#einladen-knopf').addEventListener('click', async () => {
  const name = meinName();
  if (!name) return;
  await teilen({
    titel: 'Katzengarten 🐾',
    text: `${name} lädt dich ein: Hol dir dein eigenes Kätzchen und trink mit mir! 🐾💧`,
    url: APP_URL,
  }, 'Öffnet sie den Link, bekommt sie ihr eigenes Kätzchen und ihren eigenen Garten.');
});

$('#zeigen-knopf').addEventListener('click', async () => {
  const name = meinName();
  if (!name) return;
  await teilen({
    titel: `Meine Katze ${daten.katze.name} 🐾`,
    text: `Das ist meine Katze ${daten.katze.name} mit meinem Katzengarten. Öffne den Link, dann siehst du sie bei dir unter «Freundin».`,
    url: meineKatzeAlsLink(name),
  }, 'Öffnet sie den Link, sieht sie deine Katze und deinen Garten.');
});

$('#uhr-knopf').addEventListener('click', oeffneGeraete);

// ---------- Willkommen (erster Start): Name, erstes Kätzchen ----------

const willkommen = { huelle: $('#willkommen'), wahl: 'toast' };
const ERSTE_KATZEN = ['toast', 'tiger', 'glueck']; // davon darf man eines gratis wählen

function zeichneWillkommenAuswahl() {
  const box = $('#w-auswahl');
  box.innerHTML = '';
  for (const id of ERSTE_KATZEN) {
    const art = artNachId(id);
    const { svg } = zeichneKatze({ art, groesse: 0, zustand: 'gluecklich', effekte: false });
    const k = document.createElement('button');
    k.type = 'button';
    k.className = 'w-karte';
    k.setAttribute('role', 'radio');
    k.setAttribute('aria-checked', String(id === willkommen.wahl));
    k.dataset.art = id;
    k.innerHTML = `<svg viewBox="-60 -110 120 116" aria-hidden="true">${svg}</svg>${art.name}`;
    box.appendChild(k);
  }
}

function oeffneWillkommen() {
  $('#w-name').value = daten.name || '';
  $('#w-katze').value = daten.katze.name;
  zeichneWillkommenAuswahl();
  willkommen.huelle.hidden = false;
  $('#w-name').focus();
}

$('#w-auswahl').addEventListener('click', (e) => {
  const k = e.target.closest('.w-karte');
  if (!k) return;
  willkommen.wahl = k.dataset.art;
  zeichneWillkommenAuswahl();
  $(`.w-karte[data-art="${willkommen.wahl}"]`)?.focus();
});

$('#w-los').addEventListener('click', () => {
  const name = sauber($('#w-name').value, 20);
  $('#w-fehler').hidden = !!name;
  if (!name) { $('#w-name').focus(); return; } // ohne Namen fehlt man in der Freunde-Liste
  daten.name = name;
  daten.katze = { name: sauber($('#w-katze').value) || neuerName(), artId: willkommen.wahl, milch: 0, status: 'waechst' };
  if (!daten.freigeschaltet.includes(willkommen.wahl)) daten.freigeschaltet.push(willkommen.wahl);
  daten.gestartet = true;
  speichern();
  willkommen.huelle.hidden = true;
  letzteZeichnung = '';
  zeichne();
  kurzeBlase(`Hallo${daten.name ? ` ${daten.name}` : ''}! Ich bin ${daten.katze.name}. Trink was, dann krieg ich Milch 🍼`, false, 5000);
  freundinAusLink(); // kam die App über den Katzen-Link einer Kollegin?
});

// ---------- Demo-Knopf: versteckt, 3× schnell auf das Holzschild tippen ----------

function zeigeDemoKnopf() {
  el.demoKnopf.hidden = !daten.demoSichtbar;
  if (!daten.demoSichtbar) { el.demoPanel.hidden = true; el.demoKnopf.setAttribute('aria-expanded', 'false'); }
}
const schildTipps = [];
$('#schild').addEventListener('click', () => {
  const t = Date.now();
  schildTipps.push(t);
  while (schildTipps.length && t - schildTipps[0] > 1500) schildTipps.shift();
  if (schildTipps.length < 3) return;
  schildTipps.length = 0;
  daten.demoSichtbar = !daten.demoSichtbar;
  speichern();
  zeigeDemoKnopf();
  zeigeMeldung(daten.demoSichtbar ? '🧪 Demo-Knopf an' : '🧪 Demo-Knopf aus', false);
});


// ---------- Server (Vercel): immer aktuell ----------
// Jedes Handy hat eine öffentliche Nummer (für Freundinnen) und eine geheime (zum Speichern, für die Uhr).
// Gibt es keinen Server (z. B. auf GitHub Pages), läuft alles wie bisher nur auf dem Handy.

let serverDa = null; // null = noch nicht geprüft, true / false
var hochladenTimer = null;
var serverFehlerUm = 0; // nach einem Fehler 1 Minute warten, dann wieder versuchen

async function api(pfad, optionen = {}) {
  const r = await fetch(`api/${pfad}`, { ...optionen, headers: { 'Content-Type': 'application/json' } });
  if (!r.ok) throw new Error(`Server ${r.status}`);
  return r.json();
}

function standInhalt(name) {
  const k = daten.katze;
  return {
    v: 1, i: daten.konto.id, n: name, t: jetzt(), h: heuteMl(), st: daten.streak,
    k: { n: k.name, a: k.artId, m: k.milch, s: k.status },
    g: daten.garten.map((e) => [e.artId, e.name, e.datum]),
  };
}

function spaeterHochladen() {
  if (serverDa === false && Date.now() - serverFehlerUm < 60 * 1000) return;
  clearTimeout(hochladenTimer);
  hochladenTimer = setTimeout(hochladen, 1500);
}

async function hochladen() {
  clearTimeout(hochladenTimer);
  hochladenTimer = null;
  try {
    // keepalive: klappt auch, wenn die App gerade geschlossen wird
    await api('stand', { method: 'POST', keepalive: true, body: JSON.stringify({ id: daten.konto.id, geheim: daten.konto.geheim, stand: standInhalt(daten.name || '') }) });
    serverDa = true;
  } catch { serverDa = false; serverFehlerUm = Date.now(); }
}

// Wasser von der Uhr abholen und die Katze der Freundin neu laden
async function abgleichen() {
  try {
    const { liste } = await api('trinken', { method: 'POST', body: JSON.stringify({ id: daten.konto.id, geheim: daten.konto.geheim, aktion: 'abholen' }) });
    const warWeg = serverDa === false;
    serverDa = true;
    if (warWeg) spaeterHochladen(); // Server ist wieder da: Stand nachliefern
    if (liste?.length) {
      spielenEnde(); // Neues von der Uhr
      // Demo-Uhr (vorgestellte Tage) gilt auch für Wasser von der Uhr, sonst landet es im falschen Tag
      const versatz = (daten.demoVersatz || 0) * TAG_MS;
      for (const e of liste) daten.eintraege.push({ ml: e.ml, zeit: Math.min(e.zeit + versatz, jetzt()) });
      literMuenzenAbgleichen();
      const portion = fuettereAutomatisch();
      speichern();
      letzteZeichnung = '';
      zeichne();
      const summe = liste.reduce((s, e) => s + e.ml, 0);
      kurzeBlase(`⌚ +${dl(summe)} von der Uhr!${portion > 0 ? ' Mmh, Milch 😋' : ''}`, false, 3500);
    }
  } catch {
    if (serverDa === null) serverDa = false;
    return;
  }
  const frId = daten.freundin.id;
  if (!frId) return;
  try {
    const fr = pruefeFreundin(await api(`stand?id=${frId}`));
    if (fr) {
      daten.freundin = { ...fr, id: frId };
      freundinUi.letzteMini = '';
      speichern();
      zeichne();
    }
  } catch { /* Freundin noch nicht auf dem Server */ }
}

// ---------- Wollknäuel: auf die Katze ziehen → sie spielt ----------
// Sie spielt so lange, bis etwas Neues passiert (Getränk, Abrechnung) oder man wieder etwas antippt.

const WOLLE_X = 112, WOLLE_Y = 696; // Platz neben der Katze
let spielt = false;
let spielBeginn = 0;
const wolle = { el: $('#wolle'), zug: null };
wolle.el.innerHTML = `<g class="wolle-knaeuel">${wollknaeuel(13)}</g>`;

function setzeWolle(x, y) { wolle.el.setAttribute('transform', `translate(${rund(x)} ${rund(y)})`); }
setzeWolle(WOLLE_X, WOLLE_Y);

function szenePunkt(clientX, clientY) {
  return new DOMPoint(clientX, clientY).matrixTransform(el.szene.getScreenCTM().inverse());
}

function spielenStart() {
  spielt = true;
  spielBeginn = Date.now();
  wolle.el.style.display = 'none';
  streichelt = false;
  letzteZeichnung = '';
  zeichne();
  miau({ hoch: 1.15 });
  kurzeBlase('Juhu, Wolle! 🧶', false, 2500);
  el.ansage.textContent = `${daten.katze.name} spielt mit dem Wollknäuel.`;
}

function spielenEnde() {
  if (!spielt) return;
  spielt = false;
  wolle.el.style.display = '';
  setzeWolle(WOLLE_X, WOLLE_Y);
  letzteZeichnung = '';
  zeichne();
}

wolle.el.addEventListener('pointerdown', (e) => {
  if (daten.katze.status === 'weg') { kurzeBlase('Niemand da zum Spielen… 😿'); return; }
  e.stopPropagation();
  try { wolle.el.setPointerCapture(e.pointerId); } catch { /* ältere Browser */ }
  wolle.zug = { id: e.pointerId };
  wolle.el.classList.add('gehoben');
});
// Bewegen und Loslassen am ganzen Fenster abhören: klappt auch, wenn der Finger den Knäuel «verliert»
window.addEventListener('pointermove', (e) => {
  if (!wolle.zug || e.pointerId !== wolle.zug.id) return;
  const p = szenePunkt(e.clientX, e.clientY);
  setzeWolle(p.x, p.y);
});
function wolleLoslassen(e, abbrechen) {
  if (!wolle.zug || e.pointerId !== wolle.zug.id) return;
  wolle.zug = null;
  wolle.el.classList.remove('gehoben');
  const p = szenePunkt(e.clientX, e.clientY);
  // Auf die Katze gezogen? (Bereich über ihrem Boden-Punkt)
  const h = Math.max(60, katzenHoehe * KATZE_MASS);
  const trifft = !abbrechen && Math.abs(p.x - KATZE_X) < 70 && p.y < KATZE_Y + 15 && p.y > KATZE_Y - h - 20;
  if (trifft) spielenStart();
  else setzeWolle(WOLLE_X, WOLLE_Y);
}
window.addEventListener('pointerup', (e) => wolleLoslassen(e, false));
window.addEventListener('pointercancel', (e) => wolleLoslassen(e, true));
// Tastatur: Enter auf dem Knäuel = der Katze zuwerfen
wolle.el.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && daten.katze.status !== 'weg') { e.preventDefault(); spielenStart(); }
});

// Jede neue Berührung irgendwo beendet das Spielen (kurz nach dem Loslassen noch nicht)
document.addEventListener('pointerdown', (e) => {
  if (spielt && Date.now() - spielBeginn > 400 && !wolle.el.contains(e.target)) spielenEnde();
}, true);

// ---------- Geschenk-Link: #geschenk=<geheimer Code> gibt einmalig Münzen ----------
// Hier steht nur die Prüfsumme (SHA-256) des Codes, der Code selbst ist geheim.
const GESCHENKE = {
  ea1692885ac742476a3f9eec9b14899daefb4a9ff34da63291c06547c3e1c7a6: 30, // 2026-11-21 für Elyna
};

async function geschenkAusLink() {
  const treffer = location.hash.match(/^#geschenk=([A-Za-z0-9_-]{8,64})$/);
  if (!treffer) return;
  history.replaceState(null, '', location.pathname + location.search);
  try {
    const roh = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(treffer[1]));
    const summe = [...new Uint8Array(roh)].map((b) => b.toString(16).padStart(2, '0')).join('');
    const anzahl = GESCHENKE[summe];
    daten.geschenke ||= [];
    if (!anzahl) { zeigeMeldung('Dieser Geschenk-Link gilt nicht 😿', false); return; }
    if (daten.geschenke.includes(summe)) { zeigeMeldung('Dieses Geschenk hast du schon bekommen 🎁', false); return; }
    daten.geschenke.push(summe);
    daten.muenzen += anzahl;
    speichern();
    zeichne();
    zeigeMeldung(`🎁 Geschenk: +${anzahl} 🪙`, false);
  } catch { /* ohne Prüfsumme (sehr alter Browser): nichts tun */ }
}
window.addEventListener('hashchange', geschenkAusLink);

// ---------- Freunde-Liste: alle, die die App online nutzen ----------
// Runder Knopf oben rechts → Liste. Antippen → Katze und Garten der Person (nur ansehen).

const freunde = { huelle: $('#freunde'), liste: $('#freunde-liste'), leer: $('#freunde-leer'), timer: null, zurueckFokus: null };
const GERADE_DA_MS = 5 * 60 * 1000;
const FREUNDE_NEU_MS = 30 * 1000;
const GROESSE_PRO_STUFE = [0, 0.4, 0.75, 1];

function vorText(ms) {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 60) return `zuletzt da: vor ${Math.max(1, min)} Min.`;
  const std = Math.round(min / 60);
  if (std < 24) return `zuletzt da: vor ${std} Std.`;
  const tage = Math.round(std / 24);
  return `zuletzt da: vor ${tage} ${tage === 1 ? 'Tag' : 'Tagen'}`;
}

function zeichneFreunde(alle) {
  const jetztMs = Date.now();
  const da = (f) => jetztMs - f.aktiv < GERADE_DA_MS;
  // eigene Person und Personen ohne Namen nicht zeigen; zuerst «gerade da», dann nach letzter Aktivität
  const liste = alle.filter((f) => f.id !== daten.konto.id && f.name)
    .sort((a, b) => (da(b) - da(a)) || (b.aktiv - a.aktiv));
  freunde.leer.hidden = liste.length > 0;
  freunde.liste.innerHTML = '';
  for (const f of liste) {
    const art = artNachId(f.art);
    const { svg, hoehe } = zeichneKatze({ art, groesse: GROESSE_PRO_STUFE[f.stufe] ?? 0, effekte: false });
    const zeile = document.createElement('button');
    zeile.type = 'button';
    zeile.className = 'freund-zeile';
    zeile.dataset.id = f.id;
    const h = Math.max(60, hoehe + 8);
    zeile.innerHTML = `<svg class="freund-katze" viewBox="${rund(-h * 0.55)} ${rund(-h)} ${rund(h * 1.1)} ${rund(h * 1.05)}" aria-hidden="true">${svg}</svg>
      <span class="freund-text"><strong></strong><span class="freund-ml"></span><span class="freund-status"></span></span>`;
    zeile.querySelector('strong').textContent = f.name;
    zeile.querySelector('.freund-ml').textContent = `💧 heute ${liter(f.heuteMl)} · ${art.name}, ${STUFEN[f.stufe] ?? ''}`;
    const status = zeile.querySelector('.freund-status');
    status.textContent = da(f) ? 'gerade da' : vorText(f.aktiv);
    status.classList.toggle('da', da(f));
    zeile.setAttribute('aria-label', `${f.name}, heute ${liter(f.heuteMl)}, ${status.textContent}. Katze und Garten ansehen.`);
    freunde.liste.appendChild(zeile);
  }
}

async function ladeFreunde() {
  try {
    const { freunde: alle } = await api('freunde');
    serverDa = true;
    freunde.leer.querySelector('p').textContent = 'Noch niemand da. Lade jemanden ein!';
    zeichneFreunde(alle);
  } catch {
    freunde.liste.innerHTML = '';
    freunde.leer.hidden = false;
    freunde.leer.querySelector('p').textContent = 'Keine Verbindung zum Server 😿 Die Freunde-Liste gibt es auf katzengarten.vercel.app.';
  }
}

function oeffneFreunde() {
  freunde.zurueckFokus = document.activeElement;
  faecher(false);
  freunde.huelle.hidden = false;
  freunde.huelle.querySelector('.schliessen-knopf').focus();
  hochladen(); // damit ich selbst als «gerade da» gelte
  ladeFreunde();
  clearInterval(freunde.timer);
  freunde.timer = setInterval(ladeFreunde, FREUNDE_NEU_MS); // solange offen: alle 30 s neu
}

function schliesseFreunde() {
  if (freunde.huelle.hidden) return;
  clearInterval(freunde.timer);
  freunde.huelle.hidden = true;
  freunde.zurueckFokus?.focus?.();
}

// Person antippen: ihren Stand holen und wie bei der Kollegin anzeigen (nur ansehen)
freunde.liste.addEventListener('click', async (e) => {
  const zeile = e.target.closest('.freund-zeile');
  if (!zeile) return;
  try {
    const fr = pruefeFreundin(await api(`stand?id=${zeile.dataset.id}`));
    if (!fr) throw new Error('kaputt');
    daten.freundin = { ...fr, id: zeile.dataset.id };
    daten.angestupstUm = null;
    freundinUi.letzteMini = '';
    speichern();
    zeichne();
    clearInterval(freunde.timer);
    freunde.huelle.hidden = true;
    oeffneFreundin();
  } catch {
    zeigeMeldung('Diese Katze konnte ich gerade nicht laden 😿', false);
  }
});
freunde.huelle.querySelectorAll('[data-schliessen]').forEach((x) => x.addEventListener('click', schliesseFreunde));
$('#freunde-einladen').addEventListener('click', () => $('#einladen-knopf').click());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') schliesseFreunde(); });

// ---------- Ton an / aus ----------

function zeigeTonKnopf() {
  tonAn(daten.ton);
  const k = $('#ton-knopf');
  k.textContent = daten.ton ? '🔊' : '🔇';
  k.setAttribute('aria-label', daten.ton ? 'Ton ausschalten' : 'Ton einschalten');
  k.setAttribute('aria-pressed', String(daten.ton));
}
$('#ton-knopf').addEventListener('click', () => {
  daten.ton = !daten.ton;
  speichern();
  zeigeTonKnopf();
  if (daten.ton) miau();
});

// ---------- Start ----------

abrechnen();
zeichne();
zeigeDemoKnopf();
zeigeTonKnopf();
geschenkAusLink();
// iPhone: Töne erst nach einer Berührung erlaubt, darum bei der ersten Berührung freischalten
document.addEventListener('pointerdown', tonEntsperren, { once: true, capture: true });
document.addEventListener('touchstart', tonEntsperren, { once: true, capture: true, passive: true });
if (daten.gestartet) freundinAusLink();
else oeffneWillkommen(); // ein Katzen-Link wird danach übernommen
window.addEventListener('hashchange', freundinAusLink); // Link kommt, während die App schon offen ist
document.fonts?.ready.then(() => { zeigeName(daten.katze.name); if (!blaseTimer) zeigeNormaleBlase(false); });
// Zustand hängt von der Uhrzeit ab: jede Minute neu prüfen
setInterval(() => { abrechnen(); zeichne(); abgleichen(); if (!document.hidden) hochladen(); }, 60 * 1000); // hochladen = «zuletzt da»
// erst hochladen (legt beim allerersten Start die geheime Nummer an), dann abgleichen
hochladen().then(abgleichen);
// Beim Zurückkommen in die App (z. B. am Morgen) gleich abrechnen
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { abrechnen(); zeichne(); abgleichen(); }
  else if (hochladenTimer) hochladen(); // App geht zu: letzte Änderung sofort hochladen
});
// Ohne Internet starten (sw.js)
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { /* z. B. privates Fenster */ });
