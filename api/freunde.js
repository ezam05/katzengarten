// /api/freunde – alle Personen, die die App online nutzen (Freunde-Liste).
// Liefert pro Person nur: öffentliche Kennung, Name, Katzenart, Stufe, heute getrunken, zuletzt aktiv.
// Nie die geheime Nummer, nie den ganzen Stand.
import { befehl, antwort } from './_db.js';
import { artNachId, milchBisGross } from '../js/arten.js';
import { stufeFuerMilch, tagesSchluessel } from '../js/regeln.js';

const HOECHSTENS = 300;

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return antwort(res, 405, { fehler: 'nur GET' });
    const ids = ((await befehl('SMEMBERS', 'profile')) || []).slice(0, HOECHSTENS);
    if (!ids.length) return antwort(res, 200, { freunde: [] });
    const staende = await befehl('MGET', ...ids.map((i) => `stand:${i}`));
    const heute = tagesSchluessel(Date.now());
    const freunde = [];
    const abgelaufen = [];
    staende.forEach((text, n) => {
      if (!text) { abgelaufen.push(ids[n]); return; }
      let s;
      try { s = JSON.parse(text); } catch { return; }
      const name = String(s.n ?? '').replace(/[<>&"'`]/g, '').trim().slice(0, 20);
      if (!name) return; // ohne Namen nicht zeigen
      const art = artNachId(s.k?.a);
      const t = Number(s.t) || 0;
      freunde.push({
        id: ids[n],
        name,
        art: art.id,
        stufe: stufeFuerMilch(Number(s.k?.m) || 0, milchBisGross(art)),
        heuteMl: t && tagesSchluessel(t) === heute ? Math.min(20000, Math.max(0, Number(s.h) || 0)) : 0,
        aktiv: Number(s.aktiv) || t,
      });
    });
    if (abgelaufen.length) await befehl('SREM', 'profile', ...abgelaufen); // aufräumen
    freunde.sort((a, b) => b.aktiv - a.aktiv);
    return antwort(res, 200, { freunde });
  } catch (e) {
    return antwort(res, 503, { fehler: e.message });
  }
}
