// Variables used by Scriptable.
// These must be at the top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: cat;

// Katzengarten-Widget für Scriptable (iPhone)
// Zeigt deine Katze in einem Wasser-Ring und wie viel du heute noch trinken musst.
// Die Daten kommen live vom Katzengarten-Server (gleicher Stand wie die App).
//
// Einrichten:
// 1. In der Katzengarten-App: Uhr-Knopf → «Widget» → Widget-Code kopieren.
// 2. Homescreen gedrückt halten → ＋ → Scriptable → Grösse wählen → hinzufügen.
// 3. Widget gedrückt halten → «Widget bearbeiten» → Script: Katzengarten,
//    Parameter: Widget-Code einfügen.
// Grössen: klein, mittel, gross und Sperrbildschirm (rund und rechteckig).

const BASIS = 'https://katzengarten.vercel.app';
const ZIEL_ML = 2000;
const PLAN_START = 8, PLAN_ENDE = 22, TAGESWECHSEL = 4; // wie in der App (js/regeln.js)

// Wie lange jede Katze braucht (Tage × 2 l Milch), wie in der App (js/arten.js)
const ARTEN = {
  toast: { name: 'Toastkatze', tage: 7 },
  tiger: { name: 'Mollige Tigerkatze', tage: 10 },
  glueck: { name: 'Glückskatze', tage: 14 },
  wolke: { name: 'Wolkenkatze', tage: 21 },
  tigerbaby: { name: 'Kleiner Tiger', tage: 30 },
  tanzkatze: { name: 'UU II AA', tage: 20 },
};
const STUFEN = ['Baby', 'Kätzchen', 'Junge Katze', 'Gross'];

const FARBE = {
  text: new Color('#3E3128'),
  leise: new Color('#6B7A6E'),
  wasser: new Color('#2F8FE0'),
  ring: new Color('#D7ECF7'),
  orange: new Color('#F2734A'),
  himmelOben: new Color('#BFE8FB'),
  himmelUnten: new Color('#EAF8E0'),
};

const fm = FileManager.local();
const ordner = fm.joinPath(fm.cacheDirectory(), 'katzengarten');
if (!fm.fileExists(ordner)) fm.createDirectory(ordner, true);

// ---------- Daten ----------

// Widget-Code: aus dem Parameter des Widgets, sonst der gemerkte Code (Schlüsselbund).
// Startet man das Script in Scriptable selbst, fragt es nach dem Code und merkt ihn sich.
const SCHLUESSEL = 'katzengarten-widget-code';
const findeCode = (s) => String(s || '').trim().toLowerCase().match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?.[0];
let code = findeCode(args.widgetParameter) || (Keychain.contains(SCHLUESSEL) ? findeCode(Keychain.get(SCHLUESSEL)) : null);
if (!config.runsInWidget && !findeCode(args.widgetParameter)) {
  const frage = new Alert();
  frage.title = 'Katzengarten-Widget';
  frage.message = 'Füge deinen Widget-Code aus der App ein (Uhr-Knopf → «Widget» → Code kopieren).';
  frage.addTextField('Widget-Code', code || findeCode(Pasteboard.paste()) || '');
  frage.addAction('Speichern');
  frage.addCancelAction('Abbrechen');
  if (await frage.present() === 0) {
    const neu = findeCode(frage.textFieldValue(0));
    if (neu) { Keychain.set(SCHLUESSEL, neu); code = neu; }
  }
}

async function ladeStand(id) {
  const datei = fm.joinPath(ordner, `stand-${id}.json`);
  try {
    const r = new Request(`${BASIS}/api/stand?id=${id}`);
    r.timeoutInterval = 10;
    const daten = await r.loadJSON();
    if (r.response.statusCode === 200 && daten?.k) {
      fm.writeString(datei, JSON.stringify(daten));
      return { daten, offline: false };
    }
    if (r.response.statusCode === 404) return { daten: null, offline: false };
  } catch { /* kein Netz: letzten Stand zeigen */ }
  if (fm.fileExists(datei)) return { daten: JSON.parse(fm.readString(datei)), offline: true };
  return { daten: null, offline: true };
}

async function ladeBild(name) {
  const datei = fm.joinPath(ordner, `${name}.png`);
  if (fm.fileExists(datei)) return fm.readImage(datei);
  try {
    const bild = await new Request(`${BASIS}/bilder/widget/${name}.png`).loadImage();
    fm.writeImage(datei, bild);
    return bild;
  } catch { return null; }
}

// ---------- Zeit in Zürich (ein Tag endet um 4 Uhr, wie in der App) ----------

function zuerich(ms) {
  const t = {};
  for (const p of new Intl.DateTimeFormat('de-CH', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms))) t[p.type] = p.value;
  return t;
}
const tagesSchluessel = (ms) => { const t = zuerich(ms - TAGESWECHSEL * 3600e3); return `${t.year}-${t.month}-${t.day}`; };
function stundeImTag(ms) {
  const t = zuerich(ms);
  const s = Number(t.hour) + Number(t.minute) / 60;
  return s < TAGESWECHSEL ? s + 24 : s;
}
const sollMenge = (stunde) => Math.max(0, Math.min(ZIEL_ML, ZIEL_ML * (stunde - PLAN_START) / (PLAN_ENDE - PLAN_START)));

function stufeFuerMilch(milch, bisGross) {
  if (milch >= bisGross) return 3;
  const anteil = Math.max(0, milch) / bisGross;
  return anteil < 1 / 3 ? 0 : anteil < 2 / 3 ? 1 : 2;
}

const zahl = (z) => String(Math.round(z * 10) / 10).replace('.', ',');
const liter = (ml) => `${zahl(ml / 1000)} l`;
const uhrzeit = (ms) => { const t = zuerich(ms); return `${t.hour}:${t.minute}`; };

function auswerten(d) {
  const jetzt = Date.now();
  const art = ARTEN[d.k?.a] ? d.k.a : 'toast';
  const heute = d.t && tagesSchluessel(d.t) === tagesSchluessel(jetzt) ? Math.max(0, Number(d.h) || 0) : 0;
  const bisGross = ARTEN[art].tage * 2000;
  const milch = Math.max(0, Number(d.k?.m) || 0);
  const stufe = d.k?.s === 'fertig' ? 3 : stufeFuerMilch(milch, bisGross);
  const status = d.k?.s === 'weg' ? 'weg' : d.k?.s === 'fertig' ? 'gross' : heute >= ZIEL_ML ? 'geschafft'
    : heute < sollMenge(stundeImTag(jetzt)) ? 'hungrig' : 'gut';
  return {
    art, stufe, status, heute,
    noch: Math.max(0, ZIEL_ML - heute),
    bisGross: Math.max(0, bisGross - milch),
    katze: String(d.k?.n || 'Mimi').slice(0, 16),
    streak: Number(d.st) || 0,
    garten: Array.isArray(d.g) ? d.g.length : 0,
    stand: d.t || d.aktiv || jetzt,
  };
}

function satz(w) {
  switch (w.status) {
    case 'weg': return { gross: `${w.katze} ist weg 🧳`, klein: 'Öffne die App und hol sie zurück' };
    case 'gross': return { gross: 'Ich bin gross! 🎉', klein: 'Bring mich in den Garten' };
    case 'geschafft': return { gross: 'Geschafft! 2 l 🎉', klein: `${w.katze} ist satt` };
    case 'hungrig': return { gross: `Noch ${liter(w.noch)} 💧`, klein: 'Ich hab Hunger auf Milch 🥺' };
    default: return { gross: `Noch ${liter(w.noch)} 💧`, klein: `${w.katze} geht es gut` };
  }
}

// ---------- Ring mit Katze ----------

function kreisPunkte(cx, cy, r, von, bis, n = 72) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const w = von + (bis - von) * (i / n);
    pts.push(new Point(cx + Math.cos(w) * r, cy + Math.sin(w) * r));
  }
  return pts;
}

function ringBild(katze, anteil, w) {
  const S = 220, c = S / 2, R = 96, dick = 16, innen = R - dick / 2 - 6;
  const dc = new DrawContext();
  dc.size = new Size(S, S);
  dc.opaque = false;
  dc.respectScreenScale = true;

  // Himmel und Wiese im Kreis (wie die Uhr-Ansicht der App)
  dc.setFillColor(FARBE.himmelOben);
  dc.fillEllipse(new Rect(c - innen, c - innen, innen * 2, innen * 2));
  const wiese = new Path();
  const a = Math.asin(0.22); // Wiese ab etwas unter der Mitte
  wiese.addLines(kreisPunkte(c, c, innen, a, Math.PI - a));
  wiese.closeSubpath();
  dc.addPath(wiese);
  dc.setFillColor(new Color(w.status === 'weg' ? '#B9D99A' : '#8FD06A'));
  dc.fillPath();

  // Ring: Hintergrund und Fortschritt (heute getrunken)
  dc.setLineWidth(dick);
  dc.setStrokeColor(FARBE.ring);
  dc.strokeEllipse(new Rect(c - R, c - R, R * 2, R * 2));
  if (anteil > 0) {
    const bogen = new Path();
    bogen.addLines(kreisPunkte(c, c, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, anteil)));
    dc.addPath(bogen);
    dc.setStrokeColor(w.status === 'geschafft' ? new Color('#4CB944') : FARBE.wasser);
    dc.strokePath();
  }

  // Katze (oder Koffer, wenn sie abgehauen ist)
  if (w.status === 'weg') {
    dc.setFont(Font.systemFont(64));
    dc.setTextAlignedCenter();
    dc.drawTextInRect('🧳', new Rect(0, c - 44, S, 90));
  } else if (katze) {
    const k = innen * 1.62;
    dc.drawImageInRect(katze, new Rect(c - k / 2, c - k / 2 + 4, k, k));
  }
  return dc.getImage();
}

function balkenBild(anteil, breite = 300, hoehe = 14) {
  const dc = new DrawContext();
  dc.size = new Size(breite, hoehe);
  dc.opaque = false;
  dc.respectScreenScale = true;
  const p = new Path();
  p.addRoundedRect(new Rect(0, 0, breite, hoehe), hoehe / 2, hoehe / 2);
  dc.addPath(p);
  dc.setFillColor(FARBE.ring);
  dc.fillPath();
  const b = Math.max(hoehe, breite * Math.min(1, anteil));
  if (anteil > 0) {
    const f = new Path();
    f.addRoundedRect(new Rect(0, 0, b, hoehe), hoehe / 2, hoehe / 2);
    dc.addPath(f);
    dc.setFillColor(FARBE.wasser);
    dc.fillPath();
  }
  return dc.getImage();
}

// ---------- Widget bauen ----------

function hintergrund(widget) {
  const g = new LinearGradient();
  g.colors = [FARBE.himmelOben, FARBE.himmelUnten];
  g.locations = [0, 1];
  widget.backgroundGradient = g;
}

function text(stack, inhalt, groesse, { fett = false, farbe = FARBE.text, zeilen = 1 } = {}) {
  const t = stack.addText(inhalt);
  t.font = fett ? Font.boldRoundedSystemFont(groesse) : Font.mediumRoundedSystemFont(groesse);
  t.textColor = farbe;
  t.lineLimit = zeilen;
  t.minimumScaleFactor = 0.6;
  return t;
}

function hinweisWidget(titel, zeile) {
  const w = new ListWidget();
  hintergrund(w);
  w.setPadding(14, 14, 14, 14);
  text(w, '🐱 Katzengarten', 13, { fett: true, farbe: FARBE.wasser });
  w.addSpacer(6);
  text(w, titel, 15, { fett: true, zeilen: 2 });
  w.addSpacer(4);
  text(w, zeile, 11, { farbe: FARBE.leise, zeilen: 5 });
  w.url = BASIS;
  return w;
}

async function katzenWidget(daten, offline, familie) {
  const w = auswerten(daten);
  const zustand = w.status === 'hungrig' ? 'hungrig' : 'gluecklich';
  const katze = w.status === 'weg' ? null : await ladeBild(`${w.art}-${w.stufe}-${zustand}`);
  const anteil = w.heute / ZIEL_ML;
  const s = satz(w);
  const widget = new ListWidget();
  widget.url = BASIS;
  widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);

  // Sperrbildschirm
  if (familie === 'accessoryCircular') {
    widget.addAccessoryWidgetBackground = true;
    const st = widget.addStack();
    st.layoutVertically();
    st.centerAlignContent();
    const o = st.addText('💧'); o.font = Font.systemFont(11); o.centerAlignText();
    const z = st.addText(w.status === 'geschafft' ? '✓' : zahl(w.noch / 1000)); z.font = Font.boldRoundedSystemFont(18); z.centerAlignText();
    const u = st.addText('Liter'); u.font = Font.mediumRoundedSystemFont(9); u.centerAlignText();
    return widget;
  }
  if (familie === 'accessoryRectangular') {
    text(widget, `🐱 ${w.katze}`, 13, { fett: true, farbe: Color.white() });
    text(widget, s.gross, 15, { fett: true, farbe: Color.white() });
    text(widget, `heute ${liter(w.heute)} von 2 l`, 11, { farbe: Color.white() });
    return widget;
  }

  hintergrund(widget);
  const ring = ringBild(katze, anteil, w);

  if (familie === 'small') {
    widget.setPadding(10, 10, 10, 10);
    const oben = widget.addStack();
    oben.addSpacer();
    const b = oben.addImage(ring);
    b.imageSize = new Size(88, 88);
    oben.addSpacer();
    widget.addSpacer(4);
    const t = text(widget, s.gross, 17, { fett: true, farbe: w.status === 'hungrig' ? FARBE.orange : FARBE.text });
    t.centerAlignText();
    const u = text(widget, `${w.katze} · 🔥 ${w.streak}`, 11, { farbe: FARBE.leise });
    u.centerAlignText();
    return widget;
  }

  // mittel und gross
  widget.setPadding(12, 14, 12, 14);
  const reihe = widget.addStack();
  reihe.centerAlignContent();
  const b = reihe.addImage(ring);
  b.imageSize = familie === 'large' ? new Size(130, 130) : new Size(112, 112);
  reihe.addSpacer(12);
  const rechts = reihe.addStack();
  rechts.layoutVertically();
  text(rechts, s.gross, familie === 'large' ? 24 : 21, { fett: true });
  rechts.addSpacer(2);
  text(rechts, s.klein, 12, { farbe: w.status === 'hungrig' ? FARBE.orange : FARBE.leise });
  rechts.addSpacer(8);
  const balken = rechts.addImage(balkenBild(anteil));
  balken.imageSize = new Size(150, 8);
  rechts.addSpacer(4);
  text(rechts, `heute ${liter(w.heute)} von 2 l`, 11, { farbe: FARBE.leise });
  rechts.addSpacer(6);
  text(rechts, `${w.katze} · ${STUFEN[w.stufe]} · 🔥 ${w.streak}`, 12, { fett: true });

  if (familie === 'large') {
    widget.addSpacer(16);
    text(widget, w.status === 'gross' ? `${w.katze} ist gross geworden 🎉` : `Bis ${w.katze} gross ist: noch ${liter(w.bisGross)} Wasser`, 14, { fett: true });
    widget.addSpacer(14);
    text(widget, `Im Katzengarten 🏡 · ${w.garten} ${w.garten === 1 ? 'Katze' : 'Katzen'}`, 14, { fett: true });
    widget.addSpacer(6);
    // die letzten 5 Katzen aus dem Garten
    const reiheGarten = widget.addStack();
    reiheGarten.centerAlignContent();
    const liste = (Array.isArray(daten.g) ? daten.g : []).slice(-5);
    if (!liste.length) text(reiheGarten, 'Noch leer. Ist deine Katze gross, zieht sie hier ein.', 12, { farbe: FARBE.leise, zeilen: 2 });
    for (const [artId, name] of liste) {
      const bild = await ladeBild(`${ARTEN[artId] ? artId : 'toast'}-3-gluecklich`);
      const spalte = reiheGarten.addStack();
      spalte.layoutVertically();
      spalte.centerAlignContent();
      if (bild) { const b = spalte.addImage(bild); b.imageSize = new Size(52, 52); }
      text(spalte, String(name || '').slice(0, 8), 10, { farbe: FARBE.leise }).centerAlignText();
      reiheGarten.addSpacer(8);
    }
    widget.addSpacer();
  }
  widget.addSpacer(familie === 'large' ? 0 : 6);
  const fuss = text(widget, `${offline ? 'Offline · ' : ''}Stand ${uhrzeit(w.stand)}`, 9, { farbe: FARBE.leise });
  fuss.rightAlignText();
  return widget;
}

// ---------- Start ----------

const familie = config.widgetFamily || 'medium';
let widget;
if (!code) {
  widget = hinweisWidget('Widget-Code fehlt', 'In der App: Uhr-Knopf → «Widget» → Code kopieren. Dann dieses Script einmal in Scriptable öffnen und den Code einfügen.');
} else {
  const { daten, offline } = await ladeStand(code);
  widget = daten
    ? await katzenWidget(daten, offline, familie)
    : hinweisWidget(offline ? 'Kein Internet' : 'Noch keine Daten', 'Öffne die Katzengarten-App einmal auf diesem Handy, dann erscheint deine Katze hier.');
}

if (config.runsInWidget) Script.setWidget(widget);
else if (familie === 'small') await widget.presentSmall();
else if (familie === 'large') await widget.presentLarge();
else await widget.presentMedium();
Script.complete();
