// katze.js – zeichnet die Katzen als SVG (nur aus Formen, ohne Bilddateien).
// Jede Katze hat den Stil ihrer Vorlage (bilder/vorlagen/katzen/). Wie sie aussieht,
// steht in arten.js unter «figur» und «farben»; hier sind die Zeichen-Bausteine.
//
// Eingabe: Art (aus arten.js), Grösse (0 = neugeborenes Baby, 1 = gross), Zustand, Haltung.
// Ausgabe: { svg, hoehe } – svg ist Text für ein <g>. Der Punkt (0,0) ist der Boden
// unter der Katze, die Katze steht nach oben (negative y-Werte).
//
// Zustände: 'gluecklich' | 'traurig' | 'hungrig' | 'fertig' | 'gestreichelt' | 'schlafen'
// Haltungen: 'sitzen' | 'laufen' (von der Seite, Blick nach rechts) | 'schlafen' | 'spielen' (auf dem Rücken mit Wollknäuel)
// «sitzen» heisst bei der Wolkenkatze «stehen auf 4 Beinen» und bei der Tigerkatze «Bohne».
//
// Bewegliche Teile haben eigene Klassen (Animation in style.css):
//   k-atmen (ganze Katze), k-schwanz, k-ohr, k-blinzeln, k-zzz, k-bein-a / k-bein-b (laufen, spielen), k-wolle

let zaehler = 0; // damit jede Zeichnung eigene Namen für Ausschnitte und Filter hat
const r1 = (z) => Math.round(z * 10) / 10;

// kleiner Zufallsgenerator mit Startwert (gibt immer dieselbe Folge)
export function zufall(start) {
  let s = (start >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------- Formen (gross, sitzend) ----------

const KOERPER = 'M-38 -2 C -44 -26 -34 -58 0 -62 C 34 -58 44 -26 38 -2 C 26 4 -26 4 -38 -2Z';
const KOPF = 'M-46 -90 C -47 -114 -28 -126 0 -126 C 28 -126 47 -114 46 -90 C 45 -68 26 -58 0 -58 C -26 -58 -45 -68 -46 -90Z';
// Kopf mit gezackten Flauschwangen (Wolkenkatze)
const KOPF_FLAUSCH = 'M-46 -96 C -47 -116 -28 -126 0 -126 C 28 -126 47 -116 46 -96 L53 -90 L47 -85 L54 -79 L46 -75 L50 -68 L39 -67 C 28 -60 14 -58 0 -58 C -14 -58 -28 -60 -39 -67 L-50 -68 L-46 -75 L-54 -79 L-47 -85 L-53 -90Z';
const OHR = 'M-44 -100 C -46 -120 -42 -138 -35 -147 C -28 -144 -16 -132 -9 -121Z';
const OHR_INNEN = 'M-37 -112 C -38 -124 -36 -133 -33 -139 C -28 -134 -22 -127 -18 -121Z';
const OHR_RUND = 'M-48 -121 A 14 14 0 1 1 -20 -121 A 14 14 0 1 1 -48 -121Z';
const TOAST = 'M-50 -64 C -60 -74 -60 -98 -52 -108 C -66 -122 -56 -148 -32 -145 C -22 -158 22 -158 32 -145 C 56 -148 66 -122 52 -108 C 60 -98 60 -74 50 -64 C 30 -52 -30 -52 -50 -64Z';
const GESICHT_TOAST = 'M-35 -90 C -35 -108 -20 -118 0 -118 C 20 -118 35 -108 35 -90 C 35 -72 20 -62 0 -62 C -20 -62 -35 -72 -35 -90Z';
const SCHWANZ = 'M28 -8 C 58 -8 66 -34 56 -58 C 52 -68 60 -76 67 -69';
const SCHWANZ_SPITZE = 'M56 -56 C 52 -68 60 -76 67 -69';
const FLAUSCH = 'M16 -8 C 50 0 78 -24 72 -62 C 69 -86 50 -102 33 -95 C 24 -91 28 -82 37 -80 C 50 -74 53 -54 45 -38 C 38 -24 26 -20 16 -18Z';
// Wolkenschwanz (grösser als der Kopf), hinter dem Rücken nach oben
const WOLKEN_SCHWANZ = 'M14 -66 C 2 -86 16 -112 38 -106 C 36 -132 66 -142 82 -124 C 102 -134 124 -114 112 -94 C 130 -84 122 -58 100 -62 C 94 -46 68 -44 60 -58 C 48 -46 26 -50 24 -60Z';
const MAEHNE = 'M-30 -66 C -30 -52 -24 -44 -17 -50 C -12 -40 -5 -40 0 -47 C 5 -40 12 -40 17 -50 C 24 -44 30 -52 30 -66Z';
const KRAUSE = 'M-31 -70 L-27 -57 L-21 -64 L-15 -50 L-8 -61 L0 -47 L8 -61 L15 -50 L21 -64 L27 -57 L31 -70Z';
// Tigerkatze: Kopf und Körper als eine Bohne, ohne Hals
const BOHNE = 'M-40 -6 C -52 -32 -50 -72 -42 -98 C -34 -122 -16 -134 2 -134 C 24 -134 42 -122 46 -98 C 52 -70 54 -32 44 -8 C 30 4 -26 4 -40 -6Z';
const ZZZ = '<g class="k-zzz"><text x="22" y="-64">z</text><text x="34" y="-80" style="font-size:15px">z</text><text x="46" y="-98" style="font-size:19px">Z</text></g>';

// Streifen, der an einem Ende dick ist und spitz zuläuft (Tiger)
function spitz(x, y, laenge, dicke, winkel, farbe, extra = '') {
  const l = laenge, d = dicke;
  return `<path transform="translate(${x} ${y}) rotate(${winkel})" fill="${farbe}" ${extra}
    d="M0 ${r1(-d / 2)} Q ${r1(l * 0.55)} ${r1(-d * 0.5)} ${l} 0 Q ${r1(l * 0.55)} ${r1(d * 0.4)} 0 ${r1(d / 2)} Q ${r1(-d * 0.4)} 0 0 ${r1(-d / 2)}Z"/>`;
}
// Streifen, der an beiden Enden spitz ist (Stirn-Muster «王»)
function linse(x, y, laenge, dicke, winkel, farbe) {
  const h = laenge / 2;
  return `<path transform="translate(${x} ${y}) rotate(${winkel})" fill="${farbe}" d="M${-h} 0 Q 0 ${-dicke} ${h} 0 Q 0 ${dicke} ${-h} 0Z"/>`;
}

// Umrisslinie im Stil der Art (Dicke, Lücken bei der Glückskatze)
function linie(art, f, faktor = 1) {
  const fig = art.figur;
  return `stroke="${f.umriss}" stroke-width="${r1(fig.strich * faktor)}"${fig.strichel ? ` stroke-dasharray="${fig.strichel}"` : ''} stroke-linejoin="round" stroke-linecap="round"`;
}
// Tusche-Filter (wechselnde Liniendicke), nur bei Arten mit «tusche»
const tusche = (art, id) => (art.figur.tusche ? ` filter="url(#${id}-tusche)"` : '');

const augenMitte = (art) => (art.figur.augen === 'gross' ? { ax: 19, ay: -84 } : { ax: 17, ay: -90 });

// ---------- Teile ----------

function schwanz(art, f, id) {
  const sw = art.figur.strich;
  let s;
  if (art.figur.schwanz === 'flausch') {
    s = `<path d="${FLAUSCH}" fill="${f.fell}" ${linie(art, f)}/>
      <path d="M52 -40 C 60 -54 60 -70 50 -84 M60 -30 C 68 -44 68 -60 62 -74" stroke="${f.fellDunkel}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  } else {
    s = `<path d="${SCHWANZ}" stroke="${f.umriss}" stroke-width="${12 + sw * 2}" fill="none" stroke-linecap="round"${art.figur.strichel ? ` stroke-dasharray="${art.figur.strichel}"` : ''}${tusche(art, id)}/>
      <path d="${SCHWANZ}" stroke="${f.fell}" stroke-width="12" fill="none" stroke-linecap="round"/>`;
    if (art.figur.schwanz === 'geringelt') {
      s += `<path d="${SCHWANZ}" stroke="${f.streifen}" stroke-width="12" stroke-dasharray="5 7" fill="none"/>`;
      s += `<path d="${SCHWANZ_SPITZE}" stroke="${f.streifen}" stroke-width="12" fill="none" stroke-linecap="round"/>`;
    }
    if (f.fleckB) s += `<path d="${SCHWANZ_SPITZE}" stroke="${f.fleckB}" stroke-width="12" fill="none" stroke-linecap="round"/>`;
  }
  // Drehpunkt am Ansatz des Schwanzes
  return `<g transform="translate(26 -10)"><g class="k-schwanz"><g transform="translate(-26 10)">${s}</g></g></g>`;
}

function koerperMuster(art, f) {
  const m = art.figur.muster;
  let s = `<ellipse cx="0" cy="-22" rx="21" ry="24" fill="${f.bauch}"/>`;
  if (m === 'tiger') {
    const st = 'M-42 -42 q 9 -1 13 4 M-44 -28 q 9 -1 13 4 M-44 -14 q 8 0 12 4';
    s += `<path d="${st}" stroke="${f.streifen}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="${st}" transform="scale(-1 1)" stroke="${f.streifen}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  } else if (m === 'dreifarbig') {
    s += `<ellipse cx="-26" cy="-36" rx="15" ry="13" fill="${f.fleckA}"/><ellipse cx="30" cy="-14" rx="11" ry="9" fill="${f.fleckB}"/>`;
  } else if (m === 'stirn') {
    s += `<ellipse cx="32" cy="-30" rx="14" ry="26" fill="${f.fellDunkel}" opacity=".55"/><ellipse cx="-32" cy="-30" rx="10" ry="22" fill="${f.fellDunkel}" opacity=".35"/>`;
  } else if (m === 'tigerstreifen') {
    // heller Bauch mit weisser Mitte, gebogene Streifen von den Seiten her
    s += `<ellipse cx="0" cy="-20" rx="14" ry="17" fill="#fff"/>`;
    for (const seite of [-1, 1]) {
      s += `<g transform="scale(${seite} 1)">${spitz(-44, -48, 18, 7, 14, f.streifen)}${spitz(-46, -33, 20, 8, 8, f.streifen)}${spitz(-45, -17, 16, 7, -4, f.streifen)}</g>`;
    }
  }
  return s;
}

function pfoten(art, f, gross = 1) {
  const farbe = f.pfote || f.bauch;
  const sw = art.figur.strich;
  let s = '';
  for (const x of [-15, 15]) {
    const px = r1(x * (1 + (gross - 1) * 0.5));
    let ballen = `<path d="M-4 -3 l0 4 M4 -3 l0 4" stroke="${f.umriss}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`;
    if (art.figur.ballen) {
      // rosa Pfotenballen
      ballen = `<g fill="${f.ballen}"><ellipse cx="0" cy="1.8" rx="4.2" ry="3"/><circle cx="-5.4" cy="-2.6" r="1.8"/><circle cx="0" cy="-4.2" r="1.8"/><circle cx="5.4" cy="-2.6" r="1.8"/></g>`;
    }
    s += `<g transform="translate(${px} -3) scale(${r1(gross * 100) / 100}) translate(0 -1)">
      <ellipse cx="0" cy="0" rx="12" ry="7.5" fill="${farbe}" ${linie(art, f, 0.85 / gross)}/>${ballen}</g>`;
  }
  return s;
}

function koerper(art, f, id, pfotenGross = 1) {
  let s = `<path d="${KOERPER}" fill="${f.fell}"/>
    <g clip-path="url(#${id}-koerper)">${koerperMuster(art, f)}</g>
    <path d="${KOERPER}" fill="none" ${linie(art, f)}/>`;
  if (art.figur.extra === 'maehne') {
    s += `<path d="${MAEHNE}" fill="${f.bauch}" ${linie(art, f, 0.8)}/>`;
  }
  s += pfoten(art, f, pfotenGross);
  return art.figur.mollig ? `<g transform="scale(1.16 1)">${s}</g>` : s;
}

function kopfMuster(art, f) {
  const m = art.figur.muster;
  const toast = art.figur.extra === 'toast';
  let s = '';
  if (f.schnauze) s += `<ellipse cx="0" cy="${toast ? -74 : -72}" rx="${toast ? 18 : 21}" ry="${toast ? 12 : 14}" fill="${f.schnauze}"/>`;
  if (m === 'tiger') {
    const stirn = toast ? 'M-6 -117 L-5 -106 M0 -119 L0 -104 M6 -117 L5 -106' : 'M-7 -124 L-5 -111 M0 -127 L0 -109 M7 -124 L5 -111';
    const wange = toast ? 'M-36 -94 l7 2 M-36 -86 l6 2' : 'M-47 -94 l9 2 M-47 -85 l8 3';
    s += `<path d="${stirn}" stroke="${f.streifen}" stroke-width="4.5" stroke-linecap="round"/>
      <path d="${wange}" stroke="${f.streifen}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="${wange}" transform="scale(-1 1)" stroke="${f.streifen}" stroke-width="3.5" stroke-linecap="round"/>`;
    if (art.figur.mollig) s += `<ellipse cx="34" cy="-108" rx="22" ry="17" fill="${f.fellDunkel}" opacity=".75"/>`;
  } else if (m === 'dreifarbig') {
    // hart geteilt: links orange, rechts schwarz, Trennung genau in der Mitte
    s += `<path d="M-60 -140 L0 -140 L0 -102 C -8 -98 -16 -101 -26 -103 C -38 -102 -48 -96 -60 -92Z" fill="${f.fleckA}"/>
      <path d="M60 -140 L0 -140 L0 -102 C 8 -98 16 -101 26 -103 C 38 -102 48 -96 60 -92Z" fill="${f.fleckB}"/>`;
  } else if (m === 'stirn') {
    // 3 dicke Stirnstreifen, lila-graue Schatten an den Seiten
    s += `<path d="M-9 -125 L-7 -110 M0 -127 L0 -108 M9 -125 L7 -110" stroke="${f.streifen}" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="38" cy="-100" rx="14" ry="22" fill="${f.fellDunkel}" opacity=".55"/>
      <ellipse cx="-40" cy="-104" rx="10" ry="16" fill="${f.fellDunkel}" opacity=".35"/>
      <ellipse cx="0" cy="-70" rx="24" ry="13" fill="${f.bauch}"/>`;
  } else if (m === 'tigerstreifen') {
    const sf = f.streifen;
    // weisse Wangen und je ein weisser Fleck über den Augen
    s += `<ellipse cx="-27" cy="-74" rx="15" ry="11" fill="#fff"/><ellipse cx="27" cy="-74" rx="15" ry="11" fill="#fff"/>
      <ellipse cx="-18" cy="-105" rx="6.5" ry="4" fill="#fff"/><ellipse cx="18" cy="-105" rx="6.5" ry="4" fill="#fff"/>`;
    // «王» auf der Stirn
    s += linse(0, -123, 22, 4.2, 0, sf) + linse(0, -116, 17, 3.6, 0, sf) + linse(0, -109, 20, 4, 0, sf) + linse(0, -116, 18, 3.2, 90, sf);
    // je 3 Wangenstreifen
    for (const seite of [-1, 1]) {
      s += `<g transform="scale(${seite} 1)">${spitz(-48, -99, 17, 6.5, 12, sf)}${spitz(-49, -89, 15, 6, 2, sf)}${spitz(-47, -80, 11, 5, -10, sf)}</g>`;
    }
  }
  return s;
}

function augen(art, f, zustand, k, id) {
  const u = f.umriss;
  const stil = art.figur.augen || 'standard';
  const { ax, ay } = augenMitte(art);
  if (zustand === 'gestreichelt' || zustand === 'schlafen') {
    let d = '';
    for (const seite of [-1, 1]) {
      const x = ax * seite;
      d += zustand === 'schlafen'
        ? `M${x - 7} ${ay} Q ${x} ${ay + 6} ${x + 7} ${ay} `
        : `M${x - 7} ${ay + 2} Q ${x} ${ay - 7} ${x + 7} ${ay + 2} `;
    }
    return `<path d="${d}" stroke="${u}" stroke-width="${Math.max(2.6, art.figur.strich)}" fill="none" stroke-linecap="round"/>`;
  }
  const hungrig = zustand === 'hungrig', traurig = zustand === 'traurig';
  const gross = (hungrig ? 1.12 : 1) * (1 + 0.12 * k);
  const basis = { gross: [12, 14], rund: [9, 9.5], weiss: [9, 10], verlauf: [8.5, 10] }[stil] || [7.5, 9];
  const rx = basis[0] * gross, ry = basis[1] * gross * (traurig ? 0.85 : 1);
  const glanz = hungrig ? 1.4 : traurig ? 0.8 : 1;
  let s = '';
  if (stil === 'verlauf') {
    s += `<defs><linearGradient id="${id}-iris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f.irisDunkel}"/><stop offset="1" stop-color="${f.irisHell}"/></linearGradient></defs>`;
  }
  for (const seite of [-1, 1]) {
    const x = ax * seite, y = ay;
    if (stil === 'gross') {
      // sehr grosses schwarzes Auge mit Creme-Sichel unten aussen
      s += `<ellipse cx="${x}" cy="${y}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${f.augenRand}" stroke="${u}" stroke-width="2.4"/>
        <ellipse cx="${r1(x - seite * 2.2)}" cy="${r1(y - 2.6)}" rx="${r1(rx * 0.95)}" ry="${r1(ry * 0.95)}" fill="${f.auge}"/>`;
      if (hungrig) s += `<circle cx="${r1(x - seite * 3)}" cy="${r1(y - 6)}" r="3.2" fill="#fff"/>`;
    } else if (stil === 'verlauf') {
      // Verlauf dunkel- zu hellblau, dicker brauner Lidstrich, Brauen-Punkt
      s += `<ellipse cx="${x}" cy="${y}" rx="${r1(rx)}" ry="${r1(ry)}" fill="url(#${id}-iris)" stroke="${u}" stroke-width="1.2"/>
        <ellipse cx="${x}" cy="${r1(y - 1)}" rx="${r1(rx * 0.48)}" ry="${r1(ry * 0.58)}" fill="${f.auge}"/>
        <circle cx="${r1(x - rx * 0.35)}" cy="${r1(y - ry * 0.4)}" r="${r1(2.8 * glanz)}" fill="#fff"/>
        <circle cx="${r1(x + rx * 0.35)}" cy="${r1(y + ry * 0.4)}" r="${r1(1.3 * glanz)}" fill="#fff" opacity=".9"/>
        <path d="M${r1(x - rx - 2)} ${r1(y - ry * 0.25)} Q ${x} ${r1(y - ry - 4)} ${r1(x + rx + 2)} ${r1(y - ry * 0.25)}" stroke="${f.lid}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
        <ellipse cx="${r1(x - seite * 2)}" cy="${r1(y - ry - 9)}" rx="3" ry="2" fill="${f.lid}"/>`;
    } else if (stil === 'weiss') {
      // weisse Augen, Pupille oben: die Katze schaut nach oben
      const pr = hungrig ? 5.6 : 4.6;
      s += `<ellipse cx="${x}" cy="${y}" rx="${r1(rx)}" ry="${r1(ry)}" fill="#fff" stroke="${u}" stroke-width="2"${tusche(art, id)}/>
        <circle cx="${r1(x + seite * 0.6)}" cy="${r1(y - ry + pr + 1.2)}" r="${pr}" fill="${f.auge}"/>
        <circle cx="${r1(x + seite * 0.6 - 1.6)}" cy="${r1(y - ry + pr - 0.4)}" r="1.4" fill="#fff"/>`;
    } else if (stil === 'rund') {
      // grosse runde braune Augen mit 2 Glanzpunkten
      s += `<ellipse cx="${x}" cy="${y}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${f.auge}"/>
        <circle cx="${r1(x - rx * 0.32)}" cy="${r1(y - ry * 0.35)}" r="${r1(3.2 * glanz)}" fill="#fff"/>
        <circle cx="${r1(x + rx * 0.38)}" cy="${r1(y + ry * 0.38)}" r="${r1(1.6 * glanz)}" fill="#fff"/>`;
    } else {
      if (f.iris) {
        s += `<ellipse cx="${x}" cy="${y}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${f.iris}" stroke="${u}" stroke-width="1.8"/>
          <ellipse cx="${x}" cy="${y + 1}" rx="${r1(rx * 0.55)}" ry="${r1(ry * 0.62)}" fill="${f.auge}"/>
          <path d="M${r1(x - rx * 0.75)} ${r1(y + ry * 0.35)} Q ${x} ${r1(y + ry * 1.05)} ${r1(x + rx * 0.75)} ${r1(y + ry * 0.35)}" stroke="${f.irisGlanz || '#A9DDF7'}" stroke-width="1.8" fill="none"/>`;
      } else {
        s += `<ellipse cx="${x}" cy="${y}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${f.auge}"/>`;
      }
      s += `<circle cx="${r1(x - rx * 0.3)}" cy="${r1(y - ry * 0.38)}" r="${r1(2.7 * glanz)}" fill="#fff"/>
        <circle cx="${r1(x + rx * 0.35)}" cy="${r1(y + ry * 0.35)}" r="${r1(1.3 * glanz)}" fill="#fff" opacity=".9"/>`;
    }
  }
  if (traurig || hungrig) {
    // traurige Augenbrauen (innen höher)
    const by = r1(ay - ry - (stil === 'verlauf' ? 13 : 4));
    s += `<path d="M${-ax - 9} ${by + 4} L${-ax + 5} ${by} M${ax + 9} ${by + 4} L${ax - 5} ${by}" stroke="${u}" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>`;
  }
  // Blinzeln: Drehpunkt auf Augenhöhe
  return `<g transform="translate(0 ${ay})"><g class="k-blinzeln"><g transform="translate(0 ${-ay})">${s}</g></g></g>`;
}

function gesicht(art, f, zustand, k, id) {
  const u = f.umriss;
  const fig = art.figur;
  const toast = fig.extra === 'toast';
  let s = '';
  if (fig.wangen !== false) {
    const wx = toast ? 23 : 31;
    const [rx, ry] = fig.wangenGross ? [10, 6.5] : [6.5, 3.8];
    s += `<ellipse cx="${-wx}" cy="-77" rx="${rx}" ry="${ry}" fill="${f.wange}" opacity=".75"/>
      <ellipse cx="${wx}" cy="-77" rx="${rx}" ry="${ry}" fill="${f.wange}" opacity=".75"/>`;
  }
  s += augen(art, f, zustand, k, id);
  if (fig.nase === 'tropfen') {
    // rosa Tropfen mit Strich darunter
    s += `<path d="M0 -76.5 C -3.6 -76.5 -4.6 -72.5 -2 -70 L0 -68 L2 -70 C 4.6 -72.5 3.6 -76.5 0 -76.5Z" fill="${f.nase}"/>
      <path d="M0 -68 L0 -62" stroke="${u}" stroke-width="2" stroke-linecap="round"/>`;
  } else {
    s += `<path d="M-3.8 -81 Q 0 -82.5 3.8 -81 Q 1.6 -77.5 0 -77 Q -1.6 -77.5 -3.8 -81Z" fill="${f.nase}" stroke="${u}" stroke-width="1.4" stroke-linejoin="round"/>`;
  }
  const froh = zustand === 'gluecklich' || zustand === 'fertig' || zustand === 'gestreichelt';
  if (zustand === 'hungrig') {
    s += `<ellipse cx="0" cy="${fig.nase === 'tropfen' ? -58 : -72}" rx="3.6" ry="4.2" fill="#A24E50" stroke="${u}" stroke-width="1.8"/>`;
  } else if (fig.mund === 'keiner') {
    // Glückskatze: kein Mund
  } else if (zustand === 'traurig') {
    s += `<path d="M-5 -71 Q 0 -75 5 -71" stroke="${u}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  } else if (fig.mund === 'lachen' && froh) {
    // offener Lachmund mit Zunge
    s += `<path d="M-8 -75.5 Q 0 -62 8 -75.5 Q 0 -73 -8 -75.5Z" fill="#9B3B3B" stroke="${u}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M-4 -68.5 Q 0 -65.5 4 -68.5 Q 0 -71 -4 -68.5Z" fill="#F7A0A8"/>`;
  } else {
    s += `<path d="M-7.5 -75 Q -3.8 -70.5 0 -76 Q 3.8 -70.5 7.5 -75" stroke="${u}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (fig.schnurrhaare) {
    const sh = fig.schnurrhaare === 'lang'
      ? 'M-30 -80 L-72 -88 M-30 -75 L-74 -74 M-31 -70 L-68 -58'
      : fig.schnurrhaare === 3
        ? 'M-25 -80 L-44 -84 M-25 -76 L-46 -76 M-25 -72 L-43 -67'
        : 'M-30 -78 L-60 -84 M-30 -74 L-60 -72 M-31 -70 L-56 -61';
    const breite = fig.schnurrhaare === 3 ? 1.1 : 1.3;
    s += `<g${tusche(art, id)}><path d="${sh}" stroke="${u}" stroke-width="${breite}" stroke-linecap="round"/><path d="${sh}" transform="scale(-1 1)" stroke="${u}" stroke-width="${breite}" stroke-linecap="round"/></g>`;
  }
  return s;
}

function ohren(art, f, zustand, versatz = '') {
  const u = f.umriss, sw = art.figur.strich;
  const haengen = zustand === 'traurig' || zustand === 'hungrig';
  let s = '';
  for (const seite of [-1, 1]) {
    const farbe = (seite < 0 ? f.ohrL : f.ohrR) || f.fell;
    let ohr;
    if (art.figur.ohren === 'rund') {
      ohr = `<path d="${OHR_RUND}" fill="${farbe}" stroke="${u}" stroke-width="${sw}"/><circle cx="-34" cy="-124" r="5.5" fill="${f.ohrInnen}"/>`;
    } else {
      ohr = `<path d="${OHR}" fill="${farbe}" ${linie(art, f)}/>`;
      ohr += art.figur.ohrStrich
        ? `<path d="M-35 -113 L-31 -134" stroke="${u}" stroke-width="2.2" stroke-linecap="round"/>`
        : `<path d="${OHR_INNEN}" fill="${f.ohrInnen}"/>`;
      if (art.figur.extra === 'maehne') {
        // gezackte Ohrbüschel
        ohr += `<path d="M-33 -112 L-31 -122 L-28 -116 L-27 -128 L-23 -118 L-20 -123 L-19 -114Z" fill="#fff" stroke="${u}" stroke-width="1"/>`;
      }
    }
    // Drehpunkt am Ohransatz; traurig/hungrig: Ohren hängen nach aussen
    s += `<g transform="scale(${seite} 1)"><g transform="translate(-26 -112)"><g class="${seite > 0 ? 'k-ohr' : ''}"><g transform="rotate(${haengen ? -22 : 0}) translate(26 112)">${ohr}</g></g></g></g>`;
  }
  return versatz ? `<g transform="${versatz}">${s}</g>` : s;
}

function kopf(art, f, zustand, k, id) {
  const fig = art.figur;
  let s = '';
  if (fig.extra === 'toast') {
    // Toastbrot rund um das Gesicht: dünne Kruste, cremiges Brot mit Poren
    s += `<path d="${TOAST}" fill="${f.toast}" ${linie(art, f)}/>
      <path d="${TOAST}" transform="translate(0 -100) scale(.93) translate(0 100)" fill="${f.brot}"/>
      <g fill="${f.poren}">
        <ellipse cx="-44" cy="-104" rx="2" ry="1.4"/><ellipse cx="45" cy="-98" rx="1.8" ry="1.3"/><ellipse cx="-38" cy="-130" rx="1.6" ry="1.2"/>
        <ellipse cx="36" cy="-132" rx="2" ry="1.4"/><ellipse cx="-6" cy="-143" rx="1.8" ry="1.2"/><ellipse cx="18" cy="-140" rx="1.4" ry="1"/>
        <ellipse cx="-22" cy="-139" rx="1.5" ry="1.1"/><ellipse cx="-47" cy="-80" rx="1.6" ry="1.2"/><ellipse cx="46" cy="-78" rx="2" ry="1.4"/>
        <ellipse cx="-50" cy="-118" rx="1.3" ry="1"/><ellipse cx="50" cy="-120" rx="1.5" ry="1.1"/></g>
      <path d="${GESICHT_TOAST}" fill="${f.fell}"/>
      <g clip-path="url(#${id}-kopf)">${kopfMuster(art, f)}</g>
      <path d="${GESICHT_TOAST}" fill="none" ${linie(art, f)}/>`;
  } else {
    const form = fig.kopfForm === 'flausch' ? KOPF_FLAUSCH : KOPF;
    s += ohren(art, f, zustand);
    s += `<path d="${form}" fill="${f.fell}"/>
      <g clip-path="url(#${id}-kopf)">${kopfMuster(art, f)}</g>
      <path d="${form}" fill="none" ${linie(art, f)}/>`;
  }
  s += gesicht(art, f, zustand, k, id);
  if (fig.extra === 'gloeckchen') {
    // Halsband mit Glöckchen (Glöckchen mit Schlitz)
    s += `<path d="M-26 -63 Q 0 -50 26 -63 L 25 -56 Q 0 -43 -25 -56Z" fill="${f.fleckB}" stroke="${f.umriss}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="0" cy="-45" r="7" fill="${f.gold}" stroke="${f.umriss}" stroke-width="2.2"/>
      <path d="M-6.5 -46 Q 0 -44 6.5 -46" stroke="${f.umriss}" stroke-width="1.6" fill="none"/>
      <circle cx="0" cy="-42" r="1.5" fill="${f.umriss}"/><path d="M0 -42 L0 -38.5" stroke="${f.umriss}" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="-2.6" cy="-48.5" r="1.5" fill="#fff" opacity=".8"/>`;
  }
  return s;
}

function ausschnitte(art, id) {
  const fig = art.figur;
  const kopfForm = fig.extra === 'toast' ? GESICHT_TOAST : fig.kopfForm === 'flausch' ? KOPF_FLAUSCH : KOPF;
  let s = `<clipPath id="${id}-kopf"><path d="${kopfForm}"/></clipPath>
    <clipPath id="${id}-koerper"><path d="${KOERPER}"/></clipPath>
    <clipPath id="${id}-liegen"><ellipse cx="6" cy="-24" rx="46" ry="25"/></clipPath>
    <clipPath id="${id}-spielen"><ellipse cx="0" cy="-22" rx="42" ry="20"/></clipPath>
    <clipPath id="${id}-laufen"><ellipse cx="2" cy="-34" rx="40" ry="${fig.mollig ? 25 : 21}"/></clipPath>`;
  if (fig.form === 'bohne') s += `<clipPath id="${id}-bohne"><path d="${BOHNE}"/></clipPath>`;
  if (fig.form === 'stehend') s += `<clipPath id="${id}-rumpf"><ellipse cx="0" cy="-44" rx="40" ry="25"/></clipPath>`;
  if (fig.tusche) {
    // Tusche: Linie wird leicht unruhig und wechselt die Dicke
    s += `<filter id="${id}-tusche" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="4" result="rausch"/>
      <feDisplacementMap in="SourceGraphic" in2="rausch" scale="3.2" xChannelSelector="R" yChannelSelector="G"/></filter>`;
  }
  if (fig.aquarell) s += `<filter id="${id}-aquarell" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>`;
  return `<defs>${s}</defs>`;
}

// ---------- Sonderformen für «sitzen» ----------

// Wolkenkatze: steht auf 4 Beinen, grosser Wolkenschwanz
function figurStehend(art, f, zustand, k, id) {
  const L = linie(art, f);
  const bein = (x, oben, breite, farbe, streifen) => {
    const l = x - breite / 2, r = x + breite / 2;
    let s = `<path d="M${l} ${oben} L${l} -5 Q ${l} 1 ${x} 1 Q ${r} 1 ${r} -5 L${r} ${oben}Z" fill="${farbe}" ${L}/>`;
    if (streifen) s += `<path d="M${l + 1.5} -13 Q ${x} -10 ${r - 1.5} -13 M${l + 1.5} -22 Q ${x} -19 ${r - 1.5} -22" stroke="${f.streifen}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    return s;
  };
  const bs = 1 - 0.28 * k;
  const hs = 1 + 0.15 * k;
  const dy = 66 * (1 - bs);
  const sch = `<path d="${WOLKEN_SCHWANZ}" fill="${f.fell}" ${L}/>
    <path d="M40 -96 C 52 -104 66 -100 72 -90 M78 -114 C 92 -112 102 -102 102 -92 M66 -70 C 78 -64 92 -66 98 -74" stroke="${f.fellDunkel}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M60 -58 C 74 -52 92 -54 100 -62 C 94 -46 68 -44 60 -58Z" fill="${f.fellDunkel}" opacity=".6"/>`;
  const rumpf = `<ellipse cx="0" cy="-44" rx="40" ry="25" fill="${f.fell}"/>
    <g clip-path="url(#${id}-rumpf)"><ellipse cx="18" cy="-26" rx="36" ry="14" fill="${f.fellDunkel}" opacity=".7"/><ellipse cx="34" cy="-50" rx="12" ry="22" fill="${f.fellDunkel}" opacity=".5"/></g>
    <ellipse cx="0" cy="-44" rx="40" ry="25" fill="none" ${L}/>`;
  const koerperTeil = `<g transform="translate(4 -58)"><g class="k-schwanz"><g transform="translate(-24 62) scale(.95)">${sch}</g></g></g>
    ${bein(-29, -30, 13, f.fellDunkel, false)}${bein(29, -30, 13, f.fellDunkel, false)}
    ${rumpf}
    ${bein(-13, -36, 15, f.fell, true)}${bein(13, -36, 15, f.fell, true)}
    <path d="${KRAUSE}" fill="${f.bauch}" ${linie(art, f, 0.9)}/>`;
  const figur = `<g transform="scale(${r1(bs * 100) / 100})">${koerperTeil}</g>
    <g transform="translate(0 ${r1(dy - 64)}) scale(${r1(hs * 100) / 100}) translate(0 64)">${kopf(art, f, zustand, k, id)}</g>`;
  return { figur, hoeheEinheiten: -(dy - 64 + hs * (-147 + 64)) };
}

// Tigerkatze: Kopf und Körper eine Bohne, Tusche-Linie, graue Aquarellfläche, Schwanz am Boden
function figurBohne(art, f, zustand, k, id) {
  const sw = art.figur.strich;
  const T = tusche(art, id);
  const sch = 'M34 -6 C 58 2 82 0 86 -12 C 89 -22 78 -27 73 -19';
  const schwanzTeil = `<path d="${sch}" stroke="${f.umriss}" stroke-width="${11 + sw * 2}" fill="none" stroke-linecap="round"${T}/>
    <path d="${sch}" stroke="${f.fell}" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path d="${sch}" stroke="${f.streifen}" stroke-width="11" stroke-dasharray="4 8" fill="none" opacity=".85"/>
    <path d="M86 -12 C 89 -22 78 -27 73 -19" stroke="${f.streifen}" stroke-width="11" fill="none" stroke-linecap="round"/>`;
  // Pinselstriche: rechts am Rücken und oben auf dem Kopf
  const pinsel = `<g opacity=".9">${spitz(52, -40, 24, 7, 188, f.streifen)}${spitz(52, -56, 22, 6.5, 192, f.streifen)}${spitz(50, -72, 18, 6, 196, f.streifen)}
    ${spitz(-6, -138, 14, 5, 92, f.streifen)}${spitz(4, -139, 16, 5.5, 88, f.streifen)}${spitz(14, -137, 13, 4.5, 84, f.streifen)}
    ${spitz(-52, -48, 16, 5, -8, f.streifen)}${spitz(-53, -34, 14, 4.5, -4, f.streifen)}</g>`;
  const fs = 1 + 0.15 * k; // Babys: grösseres Gesicht
  const figur = `<g transform="translate(34 -6)"><g class="k-schwanz"><g transform="translate(-34 6)">${schwanzTeil}</g></g></g>
    ${ohren(art, f, zustand, 'translate(2 -8)')}
    <path d="${BOHNE}" fill="${f.fell}"/>
    <g clip-path="url(#${id}-bohne)">
      <ellipse cx="-6" cy="-38" rx="26" ry="30" fill="${f.bauch}"/>
      <g filter="url(#${id}-aquarell)" fill="${f.fellDunkel}" opacity=".8">
        <ellipse cx="40" cy="-58" rx="20" ry="46"/><ellipse cx="26" cy="-124" rx="22" ry="13"/><ellipse cx="-44" cy="-70" rx="8" ry="26"/></g>
      ${pinsel}
    </g>
    <path d="${BOHNE}" fill="none" stroke="${f.umriss}" stroke-width="${sw}" stroke-linejoin="round"${T}/>
    <g${T}><path d="M-12 -30 C -13 -18 -13 -10 -12 -2 M12 -30 C 13 -18 13 -10 12 -2" stroke="${f.umriss}" stroke-width="${r1(sw * 0.9)}" fill="none" stroke-linecap="round"/>
      <path d="M-19 -1 Q -12 -6 -5 -1 M5 -1 Q 12 -6 19 -1" stroke="${f.umriss}" stroke-width="${r1(sw * 0.8)}" fill="none" stroke-linecap="round"/></g>
    <g transform="translate(2 -98) scale(${r1(fs * 100) / 100}) translate(0 90)">${gesicht(art, f, zustand, k, id)}</g>`;
  return { figur, hoeheEinheiten: 155 };
}

// Wollknäuel (auch einzeln für die App: Mitte = Mitte des Knäuels)
export function wollknaeuel(r = 17, farbe = '#EF5B6E') {
  return `<circle r="${r}" fill="${farbe}" stroke="#7A2333" stroke-width="2"/>
    <path d="M${-r * 0.8} ${-r * 0.3} C ${-r * 0.2} ${-r * 0.9} ${r * 0.5} ${-r * 0.7} ${r * 0.85} ${-r * 0.1} M${-r * 0.85} ${r * 0.15} C ${-r * 0.2} ${-r * 0.4} ${r * 0.5} ${-r * 0.15} ${r * 0.8} ${r * 0.45} M${-r * 0.55} ${r * 0.65} C ${-r * 0.1} ${r * 0.2} ${r * 0.35} ${r * 0.35} ${r * 0.45} ${r * 0.8} M${-r * 0.2} ${-r * 0.95} C ${-r * 0.6} ${-r * 0.3} ${-r * 0.5} ${r * 0.4} ${-r * 0.1} ${r * 0.95}"
      stroke="#FFC7CF" stroke-width="${r > 12 ? 2 : 1.4}" fill="none" stroke-linecap="round"/>
    <path d="M${r * 0.7} ${r * 0.7} C ${r * 1.3} ${r * 1.1} ${r * 1.6} ${r * 0.6} ${r * 2.2} ${r * 1.0}" stroke="${farbe}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
}

// Auf dem Rücken liegen und mit dem Wollknäuel spielen (Vorlagen: raw/quellen/katzengarten-inspiration/wolle/)
function spielend(art, f, zustand, k, id) {
  const sw = art.figur.strich;
  const L = linie(art, f);
  const pfote = f.pfote || f.bauch;
  const bein = (x, winkel, klasse, laenge = 26) => `<g transform="translate(${x} -34) rotate(${winkel})"><g class="${klasse}">
    <rect x="-5.5" y="${-laenge}" width="11" height="${laenge + 4}" rx="5.5" fill="${f.fell}" ${linie(art, f, 0.85)}/>
    <ellipse cx="0" cy="${-laenge}" rx="6.5" ry="5.5" fill="${pfote}" ${linie(art, f, 0.7)}/></g></g>`;
  let bauch = `<ellipse cx="0" cy="-22" rx="42" ry="20" fill="${f.fell}"/><g clip-path="url(#${id}-spielen)">
    <ellipse cx="2" cy="-34" rx="30" ry="11" fill="${f.bauch}"/>`;
  if (art.figur.muster === 'tiger') bauch += `<path d="M-26 -8 l3 -9 M-12 -4 l1 -10 M4 -4 l0 -10 M18 -6 l-2 -9" stroke="${f.streifen}" stroke-width="4.5" stroke-linecap="round"/>`;
  if (art.figur.muster === 'dreifarbig') bauch += `<ellipse cx="-22" cy="-14" rx="16" ry="10" fill="${f.fleckA}"/><ellipse cx="22" cy="-10" rx="12" ry="9" fill="${f.fleckB}"/>`;
  if (art.figur.muster === 'stirn') bauch += `<ellipse cx="6" cy="-8" rx="34" ry="8" fill="${f.fellDunkel}" opacity=".5"/>`;
  if (art.figur.muster === 'tigerstreifen') bauch += [-26, -12, 4, 18].map((x, i) => spitz(x, -2, 16, 6, -84 + i * 4, f.streifen)).join('');
  if (art.figur.mollig || art.figur.aquarell) bauch += `<ellipse cx="0" cy="-8" rx="36" ry="9" fill="${f.fellDunkel}" opacity=".55"/>`;
  bauch += `</g><ellipse cx="0" cy="-22" rx="42" ry="20" fill="none" ${L}${tusche(art, id)}/>`;
  const schwanzPfad = 'M-40 -16 C -62 -14 -72 -30 -62 -44';
  const sch = ['flausch', 'wolke'].includes(art.figur.schwanz)
    ? `<path d="M-38 -12 C -70 -8 -84 -34 -70 -56 C -62 -66 -50 -62 -52 -52 C -62 -40 -56 -26 -36 -24Z" fill="${f.fell}" ${L}/>`
    : `<path d="${schwanzPfad}" stroke="${f.umriss}" stroke-width="${11 + sw * 2}" fill="none" stroke-linecap="round"/>
       <path d="${schwanzPfad}" stroke="${f.fell}" stroke-width="11" fill="none" stroke-linecap="round"/>
       ${art.figur.schwanz === 'geringelt' ? `<path d="${schwanzPfad}" stroke="${f.streifen}" stroke-width="11" stroke-dasharray="5 7" fill="none"/>` : ''}
       ${f.fleckB ? `<path d="M-66 -34 C -66 -38 -64 -42 -62 -44" stroke="${f.fleckB}" stroke-width="11" fill="none" stroke-linecap="round"/>` : ''}`;
  const hs = 0.72 * (1 + 0.15 * k);
  return `<g transform="translate(-40 -16)"><g class="k-schwanz"><g transform="translate(40 16)">${sch}</g></g></g>
    ${bein(-28, -18, 'k-bein-a')}${bein(-14, 8, 'k-bein-b')}
    ${bauch}
    <g transform="translate(48 -28) rotate(78) scale(${r1(hs * 100) / 100}) translate(0 92)">${kopf(art, f, zustand, k, id)}</g>
    ${bein(8, 14, '', 30)}${bein(26, -8, '', 30)}
    <g transform="translate(17 -84)"><g class="k-wolle">${wollknaeuel(17)}</g></g>
    <ellipse cx="10" cy="-66" rx="6" ry="5" fill="${pfote}" ${linie(art, f, 0.7)}/><ellipse cx="24" cy="-66" rx="6" ry="5" fill="${pfote}" ${linie(art, f, 0.7)}/>`;
}

// ---------- Foto-Katzen (Bilder statt Formen) ----------
// zweite: die zweite Katze zeigen (Einzelbilder nebeneinander, laufen mit CSS durch)
function fotoKatze({ art, groesse, zustand, pose, effekte, zweite, feiern }) {
  const g = Math.max(0, Math.min(1, groesse));
  const s = 0.55 + 0.45 * g;
  const H = 150 * s;
  const foto = zweite && art.figur.foto2 ? art.figur.foto2 : art.figur.foto;
  const B = H * foto.breite / foto.hoehe;
  const x = -B / 2, y = -H * foto.boden;
  let bild;
  if (foto.bilder) {
    // Einzelbilder nebeneinander: mit CSS Bild für Bild durchschieben
    bild = `<svg x="${r1(x)}" y="${r1(y)}" width="${r1(B)}" height="${r1(H)}" viewBox="0 0 ${foto.breite} ${foto.hoehe}" overflow="hidden">
      <image class="k-sprite" href="${foto.bild}" width="${foto.breite * foto.bilder}" height="${foto.hoehe}" style="--sprite-weg:${-foto.breite * foto.bilder}px;--sprite-bilder:${foto.bilder};animation-duration:${foto.ms}ms"/></svg>`;
  } else {
    bild = `<image href="${foto.bild}" x="${r1(x)}" y="${r1(y)}" width="${r1(B)}" height="${r1(H)}"/>`;
  }
  let figur = bild;
  if (pose === 'schlafen') figur = `<g transform="scale(1 .82)" opacity=".85">${bild}</g>${effekte ? `<g transform="scale(${r1(s * 100) / 100})">${ZZZ}</g>` : ''}`;
  if (pose === 'spielen') figur = `${bild}<g transform="translate(0 ${r1(-H * 0.62)})"><g class="k-wolle">${wollknaeuel(14 * s + 4)}</g></g>`;
  let svg = `<ellipse cx="0" cy="0" rx="${r1(40 * s)}" ry="${r1(6 * s)}" fill="#1E4A10" opacity=".18"/>
    <g class="k-atmen">${figur}</g>`;
  const hoehe = H * (pose === 'schlafen' ? 0.75 : 0.95);
  if (effekte && (zustand === 'fertig' || feiern)) svg += konfetti(hoehe, zaehler);
  return { svg: `<g class="katze foto art-${art.id} zustand-${zustand} pose-${pose}${zweite ? ' zweite' : ''}">${svg}</g>`, hoehe };
}

// ---------- Effekte ----------

function funkelStern(x, y, g, nr) {
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${g})"><path class="funkeln" style="animation-delay:${r1(-nr * 0.5)}s"
    d="M0 -7 Q1.3 -1.3 7 0 Q1.3 1.3 0 7 Q-1.3 1.3 -7 0 Q-1.3 -1.3 0 -7Z" fill="#FFF6C2"/></g>`;
}

function konfetti(hoehe, nr) {
  const z = zufall(nr);
  const farben = ['#F2734A', '#FFE36E', '#49B4F0', '#9BD84A', '#F9A8C2'];
  let s = '';
  for (let i = 0; i < 18; i++) {
    const x = (z() - 0.5) * 230;
    const y = -hoehe - 70 + z() * 30;
    const form = i % 3 === 0
      ? `<circle r="3" fill="${farben[i % 5]}"/>`
      : `<rect x="-2.5" y="-4.5" width="5" height="9" rx="1.5" fill="${farben[i % 5]}"/>`;
    s += `<g transform="translate(${r1(x)} ${r1(y)})"><g class="konfetti" style="animation-delay:${r1(-z() * 3)}s;animation-duration:${r1(2.4 + z() * 1.6)}s">${form}</g></g>`;
  }
  return s;
}

// ---------- Ganze Katze ----------

// feiern: Konfetti und Sterne, z. B. wenn die Katze eine neue Stufe erreicht
export function zeichneKatze({ art, groesse = 1, zustand = 'gluecklich', pose = 'sitzen', effekte = true, feiern = false, zweite = false }) {
  if (art.figur.foto) { zaehler++; return fotoKatze({ art, groesse, zustand, pose, effekte, zweite, feiern }); }
  const id = `k${++zaehler}`;
  const f = art.farben;
  const fig = art.figur;
  const g = Math.max(0, Math.min(1, groesse));
  const k = 1 - g;              // 1 = Baby, 0 = gross
  const s = 0.55 + 0.45 * g;    // Gesamtgrösse: Baby halb so gross
  const ohrOben = fig.extra === 'toast' ? -158 : fig.ohren === 'rund' ? -136 : -147;
  const wolke = fig.schwanz === 'flausch' || fig.schwanz === 'wolke';
  const L = linie(art, f);
  let figur;
  let hoeheEinheiten;

  if (pose === 'schlafen') {
    // eingerollt: Körper liegt, Kopf vorne links auf den Pfoten, Schwanz um den Bauch
    const hs = 0.8 * (1 + 0.15 * k);
    const sw = fig.strich;
    let liegen = `<ellipse cx="6" cy="-24" rx="46" ry="25" fill="${f.fell}"/>
      <g clip-path="url(#${id}-liegen)">`;
    if (fig.muster === 'tiger') liegen += `<path d="M-2 -50 l3 14 M12 -50 l1 15 M26 -46 l-1 14 M38 -38 l-3 10" stroke="${f.streifen}" stroke-width="4.5" stroke-linecap="round"/>`;
    if (fig.muster === 'dreifarbig') liegen += `<ellipse cx="0" cy="-44" rx="18" ry="12" fill="${f.fleckA}"/><ellipse cx="34" cy="-36" rx="14" ry="12" fill="${f.fleckB}"/>`;
    if (fig.muster === 'stirn') liegen += `<ellipse cx="20" cy="-40" rx="26" ry="10" fill="${f.fellDunkel}" opacity=".45"/>`;
    if (fig.muster === 'tigerstreifen') liegen += [-4, 10, 24, 38].map((x, i) => spitz(x, -50, 20, 7, 84 - i * 6, f.streifen)).join('');
    if (fig.mollig || fig.aquarell) liegen += `<ellipse cx="22" cy="-42" rx="22" ry="12" fill="${f.fellDunkel}" opacity=".6"/>`;
    liegen += `</g><ellipse cx="6" cy="-24" rx="46" ry="25" fill="none" ${L}${tusche(art, id)}/>`;
    const sch = wolke
      ? `<path d="M48 -18 C 58 2 20 8 -10 4 C -30 2 -46 -2 -50 -10 C -30 -8 0 -6 20 -8 C 34 -10 42 -14 48 -18Z" fill="${f.fell}" ${L}/>`
      : `<path d="M46 -14 C 52 2 24 6 -4 4 C -24 3 -40 0 -46 -6" stroke="${f.umriss}" stroke-width="${10 + sw * 2}" fill="none" stroke-linecap="round"/>
         <path d="M46 -14 C 52 2 24 6 -4 4 C -24 3 -40 0 -46 -6" stroke="${f.fleckB || (fig.schwanz === 'geringelt' ? f.streifen : f.fell)}" stroke-width="10" fill="none" stroke-linecap="round"/>
         ${fig.schwanz === 'geringelt' ? `<path d="M46 -14 C 52 2 24 6 -4 4 C -24 3 -40 0 -46 -6" stroke="${f.fell}" stroke-width="10" stroke-dasharray="6 6" fill="none"/>` : ''}`;
    figur = `${liegen}
      <ellipse cx="-4" cy="-6" rx="11" ry="6.5" fill="${f.pfote || f.bauch}" ${linie(art, f, 0.85)}/>
      <g transform="translate(-24 -30) scale(${r1(hs * 100) / 100}) translate(0 92)">${kopf(art, f, 'schlafen', k, id)}</g>
      ${sch}`;
    hoeheEinheiten = 30 + (-ohrOben - 92) * hs;
    if (effekte) figur += ZZZ;
  } else if (pose === 'laufen') {
    // von der Seite (Blick nach rechts), Kopf schaut nach vorne, Beine bewegen sich
    const hs = 0.85 * (1 + 0.15 * k);
    const sw = fig.strich;
    const ry = fig.mollig ? 25 : 21;
    const bein = (x, klasse, farbe) => `<g transform="translate(${x} -22)"><g class="${klasse}"><rect x="-6" y="0" width="12" height="23" rx="6" fill="${farbe}" ${linie(art, f, 0.85)}/></g></g>`;
    let rumpf = `<ellipse cx="2" cy="-34" rx="40" ry="${ry}" fill="${f.fell}"/>
      <g clip-path="url(#${id}-laufen)"><ellipse cx="4" cy="-16" rx="32" ry="10" fill="${f.bauch}"/>`;
    if (fig.muster === 'tiger') rumpf += `<path d="M-22 -56 l2 14 M-8 -58 l1 15 M6 -58 l0 14 M-32 -48 l4 10" stroke="${f.streifen}" stroke-width="4.5" stroke-linecap="round"/>`;
    if (fig.muster === 'dreifarbig') rumpf += `<ellipse cx="-14" cy="-50" rx="16" ry="11" fill="${f.fleckA}"/><ellipse cx="-34" cy="-34" rx="10" ry="12" fill="${f.fleckB}"/>`;
    if (fig.muster === 'stirn') rumpf += `<ellipse cx="-8" cy="-52" rx="28" ry="9" fill="${f.fellDunkel}" opacity=".45"/>`;
    if (fig.muster === 'tigerstreifen') rumpf += [-30, -16, -2, 12].map((x, i) => spitz(x, -56, 18, 7, 96 - i * 4, f.streifen)).join('');
    if (fig.mollig || fig.aquarell) rumpf += `<ellipse cx="-10" cy="-52" rx="24" ry="10" fill="${f.fellDunkel}" opacity=".6"/>`;
    rumpf += `</g><ellipse cx="2" cy="-34" rx="40" ry="${ry}" fill="none" ${L}${tusche(art, id)}/>`;
    const sch = wolke
      ? `<path d="M-30 -40 C -60 -40 -74 -64 -66 -92 C -62 -104 -48 -104 -46 -94 C -56 -86 -54 -66 -34 -56Z" fill="${f.fell}" ${L}/>`
      : `<path d="M-34 -42 C -52 -46 -58 -66 -52 -84" stroke="${f.umriss}" stroke-width="${11 + sw * 2}" fill="none" stroke-linecap="round"/>
         <path d="M-34 -42 C -52 -46 -58 -66 -52 -84" stroke="${fig.schwanz === 'geringelt' ? f.streifen : f.fell}" stroke-width="11" fill="none" stroke-linecap="round"/>
         ${fig.schwanz === 'geringelt' ? `<path d="M-34 -42 C -52 -46 -58 -66 -52 -84" stroke="${f.fell}" stroke-width="11" stroke-dasharray="6 6" fill="none"/>` : ''}
         ${f.fleckB ? `<path d="M-56 -70 C -56 -76 -54 -80 -52 -84" stroke="${f.fleckB}" stroke-width="11" fill="none" stroke-linecap="round"/>` : ''}`;
    figur = `<g transform="translate(-36 -42)"><g class="k-schwanz"><g transform="translate(36 42)">${sch}</g></g></g>
      ${bein(-16, 'k-bein-b', f.fellDunkel)}${bein(28, 'k-bein-a', f.fellDunkel)}
      ${rumpf}
      ${bein(-26, 'k-bein-a', f.pfote || f.bauch)}${bein(18, 'k-bein-b', f.pfote || f.bauch)}
      <g transform="translate(30 -60) scale(${r1(hs * 100) / 100}) translate(0 92)">${kopf(art, f, zustand, k, id)}</g>`;
    hoeheEinheiten = 60 + (-ohrOben - 92) * hs;
  } else if (pose === 'spielen') {
    figur = spielend(art, f, zustand, k, id);
    hoeheEinheiten = 108;
  } else if (fig.form === 'stehend') {
    ({ figur, hoeheEinheiten } = figurStehend(art, f, zustand, k, id));
  } else if (fig.form === 'bohne') {
    ({ figur, hoeheEinheiten } = figurBohne(art, f, zustand, k, id));
  } else {
    // sitzend: Babys haben einen kleineren Körper und einen grösseren Kopf
    const bs = 1 - 0.28 * k;
    const hs = 1 + (fig.babyKopf ?? 0.12) * k;
    const pfotenGross = 1 + (fig.babyPfoten ?? 0) * k;
    const dy = 62 * (1 - bs);
    figur = `<g transform="scale(${r1(bs * 100) / 100})">${schwanz(art, f, id)}${koerper(art, f, id, pfotenGross)}</g>
      <g transform="translate(0 ${r1(dy - 64)}) scale(${r1(hs * 100) / 100}) translate(0 64)">${kopf(art, f, zustand, k, id)}</g>`;
    hoeheEinheiten = -(dy - 64 + hs * (ohrOben + 64));
  }

  const hoehe = hoeheEinheiten * s;
  let svg = `${ausschnitte(art, id)}
    <ellipse cx="0" cy="0" rx="${r1(46 * s)}" ry="${r1(7 * s)}" fill="#1E4A10" opacity=".18"/>
    <g transform="scale(${r1(s * 1000) / 1000})"><g class="k-atmen">${figur}</g></g>`;

  if (effekte && (zustand === 'fertig' || feiern)) {
    const sterne = [[-70, -hoehe * 0.7, 1], [66, -hoehe * 0.85, 1.2], [-46, -hoehe - 6, 0.8], [80, -hoehe * 0.35, 0.9], [-84, -hoehe * 0.25, 0.7]];
    sterne.forEach(([x, y, gr], i) => { svg += funkelStern(x, y, gr, i); });
    svg += konfetti(hoehe, zaehler);
  }

  return { svg: `<g class="katze art-${art.id} zustand-${zustand} pose-${pose}">${svg}</g>`, hoehe };
}
