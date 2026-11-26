// /api/erinnern – die Katze erinnert ans Trinken: «Ich hab Hunger auf Milch 🥺» als Mitteilung.
// Wird alle 30 Minuten aufgerufen (GitHub Actions, .github/workflows/erinnern.yml).
// Erinnert wird, wer Mitteilungen eingeschaltet hat, 5 Stunden nichts getrunken hat und hinter dem Plan
// zu 2 Litern liegt (nur 8–22 Uhr, gleiche Regel wie in der App: js/regeln.js). Höchstens alle 3 Stunden.
import { createHash } from 'node:crypto';
import { befehl, antwort } from './_db.js';
import { versand, schluessel } from './push.js';
import { erinnerungFaellig, tagesSchluessel, ZIEL_ML } from '../js/regeln.js';

const PAUSE_S = 3 * 60 * 60;
const HOECHSTENS = 300;
const hash = (s) => createHash('sha256').update(s).digest('hex');
const sauber = (s, max) => String(s ?? '').replace(/[<>&"'`]/g, '').trim().slice(0, max);
const liter = (ml) => `${String(Math.round(ml / 100) / 10).replace('.', ',')} l`;

// Zugang nur mit Passwort (steht als Secret bei GitHub). Das erste Passwort wird gespeichert, danach muss es stimmen.
async function zugang(req) {
  const pw = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
  if (pw.length < 20) return false;
  const h = hash(pw);
  await befehl('SET', 'erinnern-geheim', h, 'NX');
  return (await befehl('GET', 'erinnern-geheim')) === h;
}

const lies = (text) => { try { return JSON.parse(text); } catch { return null; } };

export async function erinnern(jetzt = Date.now()) {
  const ids = ((await befehl('SMEMBERS', 'profile')) || []).slice(0, HOECHSTENS);
  if (!ids.length) return { geprueft: 0, geschickt: 0 };
  const abos = await befehl('MGET', ...ids.map((i) => `push:${i}`));
  const mitAbo = ids.map((id, n) => ({ id, abo: lies(abos[n]) })).filter((x) => x.abo);
  if (!mitAbo.length) return { geprueft: 0, geschickt: 0 };
  const staende = await befehl('MGET', ...mitAbo.map((x) => `stand:${x.id}`));
  const heute = tagesSchluessel(jetzt);
  const { publicKey, privateKey } = await schluessel();
  let geschickt = 0;

  for (const [n, { id, abo }] of mitAbo.entries()) {
    const s = lies(staende[n]);
    if (!s || s.k?.s === 'weg') continue;
    // Wasser von der Uhr, das das iPhone noch nicht abgeholt hat, zählt auch
    const offen = ((await befehl('LRANGE', `trinken:${id}`, 0, -1)) || []).map(lies)
      .filter((e) => e && Number.isFinite(e.ml) && Number.isFinite(e.zeit) && tagesSchluessel(e.zeit) === heute);
    const heuteMl = (s.t && tagesSchluessel(s.t) === heute ? Number(s.h) || 0 : 0) + offen.reduce((summe, e) => summe + e.ml, 0);
    const letzte = Math.max(Number(s.lt) || 0, ...offen.map((e) => e.zeit));
    if (!erinnerungFaellig({ heuteMl, jetzt, letzteTrinkZeit: letzte || null })) continue;
    if ((await befehl('SET', `erinnert:${id}`, '1', 'NX', 'EX', PAUSE_S)) !== 'OK') continue; // vor kurzem erinnert
    const katze = sauber(s.k?.n, 16) || 'Dein Kätzchen';
    const inhalt = JSON.stringify({
      titel: `${katze} 🥺`,
      text: `Ich hab Hunger auf Milch! Trink ein Glas Wasser 💧 Noch ${liter(Math.max(0, ZIEL_ML - heuteMl))} bis 2 l.`,
      tag: 'erinnerung',
    });
    try {
      await versand.senden(abo, inhalt, { TTL: 60 * 60, vapidDetails: { subject: 'https://katzengarten.vercel.app', publicKey, privateKey } });
      geschickt++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await befehl('DEL', `push:${id}`); // Abo abgelaufen
    }
  }
  return { geprueft: mitAbo.length, geschickt };
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return antwort(res, 405, { fehler: 'nur POST' });
    if (!(await zugang(req))) return antwort(res, 403, { fehler: 'kein Zugang' });
    return antwort(res, 200, await erinnern());
  } catch (e) {
    return antwort(res, 503, { fehler: e.message });
  }
}
