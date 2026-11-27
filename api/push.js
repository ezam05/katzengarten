// /api/push – Mitteilungen aufs Handy (Web Push).
//   GET  ?aktion=schluessel                          → öffentlicher Schlüssel fürs Abo
//   POST { id, geheim, aktion: 'abo', abo }          → Abo dieses Geräts speichern (Handy, Computer …, bis zu 5)
//   POST { id, geheim, aktion: 'ab', endpoint? }     → Abo dieses Geräts löschen (ohne endpoint: alle)
//   POST { id, geheim, aktion: 'stupsen', an }       → Freundin «an» anstupsen (Mitteilung), nur unter Freundinnen
// Die Schlüssel (VAPID) erzeugt der Server beim ersten Mal selbst und legt sie in der Datenbank ab.
import webpush from 'web-push';
import { befehl, istId, pruefeGeheim, antwort, JAHR_S } from './_db.js';

const PAUSE_S = 30 * 60; // so lange nach dem Anstupsen nicht nochmals dieselbe Person
const ABOS_MAX = 5;       // Geräte pro Person (Handy, Computer …)
// Abos nur bei bekannten Mitteilungsdiensten (der Server schickt dorthin)
const DIENSTE = [/\.googleapis\.com$/, /\.push\.apple\.com$/, /\.mozilla\.com$/, /\.mozaws\.net$/, /\.notify\.windows\.com$/];

// austauschbar für die Prüfungen (tests/api.test.mjs)
export const versand = { senden: (abo, text, optionen) => webpush.sendNotification(abo, text, optionen) };

export async function schluessel() {
  let text = await befehl('GET', 'vapid');
  if (!text) {
    await befehl('SET', 'vapid', JSON.stringify(webpush.generateVAPIDKeys()), 'NX');
    text = await befehl('GET', 'vapid');
  }
  return JSON.parse(text);
}

function pruefeAbo(abo) {
  if (!abo || typeof abo !== 'object') return null;
  const { endpoint, keys } = abo;
  if (typeof endpoint !== 'string' || endpoint.length > 1000) return null;
  let url;
  try { url = new URL(endpoint); } catch { return null; }
  if (url.protocol !== 'https:' || !DIENSTE.some((d) => d.test(url.hostname))) return null;
  if (typeof keys?.p256dh !== 'string' || typeof keys?.auth !== 'string' || keys.p256dh.length > 200 || keys.auth.length > 100) return null;
  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

// Abos einer Person: früher ein einzelnes Abo, jetzt eine Liste (mehrere Geräte)
export function aboListe(text) {
  let v;
  try { v = JSON.parse(text); } catch { return []; }
  return (Array.isArray(v) ? v : v ? [v] : []).filter((a) => typeof a?.endpoint === 'string');
}

// An alle Geräte einer Person schicken. Abgelaufene Abos fallen weg.
export async function anAlle(id, liste, inhalt, ttl) {
  const { publicKey, privateKey } = await schluessel();
  const bleiben = [];
  let geschickt = 0;
  for (const abo of liste) {
    try {
      await versand.senden(abo, inhalt, { TTL: ttl, vapidDetails: { subject: 'https://katzengarten.vercel.app', publicKey, privateKey } });
      geschickt++;
      bleiben.push(abo);
    } catch (e) {
      if (e.statusCode !== 404 && e.statusCode !== 410) bleiben.push(abo); // nur abgelaufene löschen
    }
  }
  if (bleiben.length !== liste.length) {
    if (bleiben.length) await befehl('SET', `push:${id}`, JSON.stringify(bleiben), 'EX', JAHR_S);
    else await befehl('DEL', `push:${id}`);
  }
  return { geschickt, bleiben: bleiben.length };
}

const sauber = (s, max) => String(s ?? '').replace(/[<>&"'`]/g, '').trim().slice(0, max);

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (req.query?.aktion !== 'schluessel') return antwort(res, 400, { fehler: 'aktion fehlt' });
      return antwort(res, 200, { schluessel: (await schluessel()).publicKey });
    }
    if (req.method !== 'POST') return antwort(res, 405, { fehler: 'nur GET oder POST' });
    const { id, geheim, aktion } = req.body || {};
    if (!(await pruefeGeheim(id, geheim))) return antwort(res, 403, { fehler: 'falsche Nummer' });

    if (aktion === 'abo') {
      const abo = pruefeAbo(req.body.abo);
      if (!abo) return antwort(res, 400, { fehler: 'Abo ungültig' });
      // gleiches Gerät ersetzen, neustes zuletzt, höchstens ABOS_MAX Geräte
      const liste = aboListe(await befehl('GET', `push:${id}`)).filter((a) => a.endpoint !== abo.endpoint);
      liste.push(abo);
      await befehl('SET', `push:${id}`, JSON.stringify(liste.slice(-ABOS_MAX)), 'EX', JAHR_S);
      return antwort(res, 200, { ok: true });
    }
    if (aktion === 'ab') {
      const endpoint = req.body.endpoint;
      const liste = typeof endpoint === 'string' ? aboListe(await befehl('GET', `push:${id}`)).filter((a) => a.endpoint !== endpoint) : [];
      if (liste.length) await befehl('SET', `push:${id}`, JSON.stringify(liste), 'EX', JAHR_S);
      else await befehl('DEL', `push:${id}`);
      return antwort(res, 200, { ok: true });
    }
    if (aktion === 'stupsen') {
      const an = req.body.an;
      if (!istId(an) || an === id) return antwort(res, 400, { fehler: 'an fehlt' });
      // nur Freundinnen dürfen sich anstupsen (api/freunde.js, «verbinden»)
      if (!Number(await befehl('SISMEMBER', `freunde:${id}`, an))) return antwort(res, 403, { fehler: 'nicht befreundet' });
      const liste = aboListe(await befehl('GET', `push:${an}`));
      if (!liste.length) return antwort(res, 200, { ok: false, grund: 'kein-abo' });
      // höchstens alle 30 Minuten dieselbe Person
      const frei = await befehl('SET', `stups:${id}:${an}`, '1', 'NX', 'EX', PAUSE_S);
      if (frei !== 'OK') return antwort(res, 429, { fehler: 'gerade erst angestupst' });
      // Namen kommen vom Server, nicht vom Handy, das anstupst
      const lies = async (wer) => { try { return JSON.parse(await befehl('GET', `stand:${wer}`)) || {}; } catch { return {}; } };
      const [ich, sie] = await Promise.all([lies(id), lies(an)]);
      const name = sauber(ich.n, 20) || 'Deine Freundin';
      const katze = sauber(sie.k?.n, 16);
      const inhalt = JSON.stringify({
        titel: `${name} stupst dich an 💧`,
        text: katze ? `Trink was! ${katze} wartet auf Milch 🍼` : 'Trink was! Dein Kätzchen wartet auf Milch 🍼',
      });
      const { geschickt, bleiben } = await anAlle(an, liste, inhalt, 6 * 60 * 60);
      if (!geschickt) {
        await befehl('DEL', `stups:${id}:${an}`); // nicht geschickt: gleich nochmals erlauben
        return bleiben ? antwort(res, 502, { fehler: 'Mitteilung ging nicht raus' }) : antwort(res, 200, { ok: false, grund: 'kein-abo' });
      }
      return antwort(res, 200, { ok: true });
    }
    return antwort(res, 400, { fehler: 'aktion muss abo, ab oder stupsen sein' });
  } catch (e) {
    return antwort(res, 503, { fehler: e.message });
  }
}
