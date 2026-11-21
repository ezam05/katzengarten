// regeln.js – reine Rechenregeln, ohne Anzeige.
// Alle Zeiten sind Millisekunden (wie Date.now()). Zeitzone: Europe/Zurich.

export const ZIEL_ML = 2000;
export const GLAS_ML = 250;
export const PLAN_START = 8;   // Uhr
export const PLAN_ENDE = 22;   // Uhr
export const TAGESWECHSEL = 4; // Uhr: Hier endet ein Tag
export const HUNGER_NACH_MS = 5 * 60 * 60 * 1000; // 5 Stunden

// Wachstumsstufen nach dem Anteil der getrunkenen Milch
export const STUFEN = ['Neugeboren', 'Baby', 'Kätzchen', 'Junge Katze', 'Gross'];

// 0 = neugeboren, 1 = Baby, 2 = Kätzchen, 3 = junge Katze, 4 = gross
export function stufeFuerMilch(milch, bisGross) {
  if (milch >= bisGross) return 4;
  if (milch <= 0) return 0;
  const anteil = milch / bisGross;
  if (anteil < 1 / 3) return 1;
  if (anteil < 2 / 3) return 2;
  return 3;
}

// ---------- Zeit in Zürich ----------

const zuerichFormat = new Intl.DateTimeFormat('de-CH', {
  timeZone: 'Europe/Zurich',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

// Zerlegt einen Zeitpunkt in Datum und Uhrzeit von Zürich.
export function zuerichTeile(ms) {
  const t = {};
  for (const p of zuerichFormat.formatToParts(new Date(ms))) t[p.type] = p.value;
  return {
    jahr: Number(t.year), monat: Number(t.month), tag: Number(t.day),
    stunde: Number(t.hour), minute: Number(t.minute),
  };
}

// Umgekehrt: Datum + Uhrzeit in Zürich → Zeitpunkt
export function zuerichZuMs(jahr, monat, tag, stunde, minute = 0) {
  const schaetzung = Date.UTC(jahr, monat - 1, tag, stunde, minute);
  const t = zuerichTeile(schaetzung);
  const alsUtc = Date.UTC(t.jahr, t.monat - 1, t.tag, t.stunde, t.minute);
  return schaetzung - (alsUtc - schaetzung);
}

// Zu welchem Trink-Tag gehört dieser Zeitpunkt? (Ein Tag endet um 4 Uhr.)
// Ergebnis z. B. '2026-11-07'
export function tagesSchluessel(ms) {
  const t = zuerichTeile(ms - TAGESWECHSEL * 60 * 60 * 1000);
  return `${t.jahr}-${String(t.monat).padStart(2, '0')}-${String(t.tag).padStart(2, '0')}`;
}

// Zeitpunkt «Trink-Tag um x Uhr»
export function zeitImTag(schluessel, stunde) {
  const [j, m, t] = schluessel.split('-').map(Number);
  const h = Math.floor(stunde);
  return zuerichZuMs(j, m, t, h, Math.round((stunde - h) * 60));
}

// Uhrzeit als Zahl im Trink-Tag (14:30 → 14.5). Nach Mitternacht bis 4 Uhr: 24–28.
export function stundeImTag(ms) {
  const t = zuerichTeile(ms);
  const s = t.stunde + t.minute / 60;
  return s < TAGESWECHSEL ? s + 24 : s;
}

// ---------- Trinken und Füttern ----------

// Funktioniert für Getränke und für Milch-Mahlzeiten (beide { ml, zeit })
export function summeMl(eintraege) {
  return eintraege.reduce((s, e) => s + e.ml, 0);
}

export function eintraegeVomTag(eintraege, schluessel) {
  return eintraege.filter((e) => tagesSchluessel(e.zeit) === schluessel);
}

export function glaeserBisZiel(ml) {
  return Math.ceil(Math.max(0, ZIEL_ML - ml) / GLAS_ML);
}

// Wie viel Milch darf das Kätzchen jetzt trinken?
// Milch gibt es nur für heute getrunkenes Wasser, höchstens 2 l pro Tag,
// und nicht mehr, als es bis zum Grosswerden noch braucht.
export function milchPortion({ heuteGetrunken, heuteGefuettert, milch, bisGross }) {
  const flasche = Math.max(0, heuteGetrunken - heuteGefuettert);
  return Math.max(0, Math.min(flasche, ZIEL_ML - heuteGefuettert, bisGross - milch));
}

// ---------- Plan und Hunger ----------

// Soll-Menge zu dieser Stunde: 2000 ml gleichmässig verteilt über 8–22 Uhr.
export function sollMenge(stunde) {
  const roh = ZIEL_ML * (stunde - PLAN_START) / (PLAN_ENDE - PLAN_START);
  return Math.max(0, Math.min(ZIEL_ML, roh));
}

export function hinterDemPlan(ml, stunde) {
  return ml < sollMenge(stunde);
}

// Erinnerung fällig: 5 h nichts getrunken UND hinter dem Plan, nur 8–22 Uhr.
// Gezählt wird ab dem letzten Getränk, frühestens ab 8 Uhr des Tages.
export function erinnerungFaellig({ heuteMl, jetzt, letzteTrinkZeit }) {
  const stunde = stundeImTag(jetzt);
  if (stunde < PLAN_START || stunde >= PLAN_ENDE) return false;
  if (!hinterDemPlan(heuteMl, stunde)) return false;
  const tagStart = zeitImTag(tagesSchluessel(jetzt), PLAN_START);
  const seit = Math.max(letzteTrinkZeit ?? 0, tagStart);
  return jetzt - seit >= HUNGER_NACH_MS;
}

// Laufender Zustand der Katze: 'gluecklich' | 'traurig' | 'hungrig'
export function katzenZustand({ heuteMl, jetzt, letzteTrinkZeit }) {
  if (heuteMl >= ZIEL_ML) return 'gluecklich';
  const stunde = stundeImTag(jetzt);
  if (!hinterDemPlan(heuteMl, stunde)) return 'gluecklich';
  if (erinnerungFaellig({ heuteMl, jetzt, letzteTrinkZeit })) return 'hungrig';
  return 'traurig';
}

// ---------- Tage zählen ----------

// Tag verschieben: ('2026-11-07', 1) → '2026-11-08'
export function verschiebeTag(schluessel, anzahl) {
  const [j, m, t] = schluessel.split('-').map(Number);
  const d = new Date(Date.UTC(j, m - 1, t + anzahl));
  return d.toISOString().slice(0, 10);
}

// Alle Tage, die noch abgerechnet werden müssen: nach «abgerechnetBis» bis vor «heute».
export function offeneTage(abgerechnetBis, heute, hoechstens = 400) {
  const liste = [];
  let k = verschiebeTag(abgerechnetBis, 1);
  while (k < heute && liste.length < hoechstens) {
    liste.push(k);
    k = verschiebeTag(k, 1);
  }
  return liste;
}

// ---------- Abrechnung um 4 Uhr ----------
// Die Katze wächst nur durch Milch (siehe milchPortion). Die Abrechnung
// zählt Streak und Münzen. Eine Katze stirbt nie, aber sie haut ab,
// wenn man sich zu wenig um sie kümmert.

export const SCHWELLE_STREAK = 1250;  // darunter: Streak auf 0
export const SCHWELLE_WEG = 1000;     // darunter: Katze haut ab
export const SCHWELLE_ZWEITER = 1500; // zweiter Tag hintereinander darunter: Katze haut ab

// Haut die Katze ab? (unter 1 l, oder zwei Tage hintereinander unter 1,5 l)
export function hautAb(ml, vortagMl) {
  const zweiterSchlechterTag = vortagMl !== null && vortagMl !== undefined
    && vortagMl < SCHWELLE_ZWEITER && ml < SCHWELLE_ZWEITER;
  return ml < SCHWELLE_WEG || zweiterSchlechterTag;
}

/**
 * Rechnet einen abgelaufenen Tag ab.
 * @param {object}  stand    { streak, muenzen, vortagMl }
 * @param {number}  ml       an diesem Tag getrunken
 * @param {boolean} katzeDa  true: ein Kätzchen wächst gerade (nur das kann abhauen)
 * @returns {{ stand: object, ergebnis: 'abgehauen' | 'geschafft' | 'knapp' | 'streakWeg' | 'ruhe' }}
 */
export function rechneTagAb(stand, ml, katzeDa = false) {
  const neu = { ...stand, vortagMl: ml };
  let ergebnis;
  if (katzeDa && hautAb(ml, stand.vortagMl)) {
    neu.streak = 0;
    neu.vortagMl = null; // beim nächsten Kätzchen zählt es neu
    ergebnis = 'abgehauen';
  } else if (ml >= ZIEL_ML) {
    neu.streak += 1;
    neu.muenzen += 1;
    ergebnis = 'geschafft';
  } else if (ml >= SCHWELLE_STREAK) {
    ergebnis = 'knapp'; // Streak bleibt stehen
  } else {
    ergebnis = stand.streak > 0 ? 'streakWeg' : 'ruhe';
    neu.streak = 0;
  }
  return { stand: neu, ergebnis };
}
