// /api/push – Mitteilungen aufs Handy (Web Push).
//   GET  ?aktion=schluessel                          → öffentlicher Schlüssel fürs Abo
//   POST { id, geheim, aktion: 'abo', abo }          → Abo dieses Handys speichern
//   POST { id, geheim, aktion: 'ab' }                → Abo löschen
//   POST { id, geheim, aktion: 'stupsen', an }       → Freundin «an» anstupsen (Mitteilung)
// Die Schlüssel (VAPID) erzeugt der Server beim ersten Mal selbst und legt sie in der Datenbank ab.
import webpush from 'web-push';
import { befehl, istId, pruefeGeheim, antwort, JAHR_S } from './_db.js';

const PAUSE_S = 30 * 60; // so lange nach dem Anstupsen nicht nochmals dieselbe Person
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
      await befehl('SET', `push:${id}`, JSON.stringify(abo), 'EX', JAHR_S);
      return antwort(res, 200, { ok: true });
    }
    if (aktion === 'ab') {
      await befehl('DEL', `push:${id}`);
      return antwort(res, 200, { ok: true });
    }
    if (aktion === 'stupsen') {
      const an = req.body.an;
      if (!istId(an) || an === id) return antwort(res, 400, { fehler: 'an fehlt' });
      const text = await befehl('GET', `push:${an}`);
      if (!text) return antwort(res, 200, { ok: false, grund: 'kein-abo' });
      // höchstens alle 30 Minuten dieselbe Person
      const frei = await befehl('SET', `stups:${id}:${an}`, '1', 'NX', 'EX', PAUSE_S);
      if (frei !== 'OK') return antwort(res, 429, { fehler: 'gerade erst angestupst' });
      // Namen kommen vom Server, nicht vom Handy, das anstupst
      const lies = async (wer) => { try { return JSON.parse(await befehl('GET', `stand:${wer}`)) || {}; } catch { return {}; } };
      const [ich, sie] = await Promise.all([lies(id), lies(an)]);
      const name = sauber(ich.n, 20) || 'Deine Freundin';
      const katze = sauber(sie.k?.n, 16);
      const { publicKey, privateKey } = await schluessel();
      const inhalt = JSON.stringify({
        titel: `${name} stupst dich an 💧`,
        text: katze ? `Trink was! ${katze} wartet auf Milch 🍼` : 'Trink was! Dein Kätzchen wartet auf Milch 🍼',
      });
      try {
        await versand.senden(JSON.parse(text), inhalt, {
          TTL: 6 * 60 * 60,
          vapidDetails: { subject: 'https://katzengarten.vercel.app', publicKey, privateKey },
        });
      } catch (e) {
        await befehl('DEL', `stups:${id}:${an}`); // nicht geschickt: gleich nochmals erlauben
        if (e.statusCode === 404 || e.statusCode === 410) { // Abo abgelaufen
          await befehl('DEL', `push:${an}`);
          return antwort(res, 200, { ok: false, grund: 'kein-abo' });
        }
        return antwort(res, 502, { fehler: 'Mitteilung ging nicht raus' });
      }
      return antwort(res, 200, { ok: true });
    }
    return antwort(res, 400, { fehler: 'aktion muss abo, ab oder stupsen sein' });
  } catch (e) {
    return antwort(res, 503, { fehler: e.message });
  }
}
