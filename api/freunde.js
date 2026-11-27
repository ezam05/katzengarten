// /api/freunde – Freundinnen (nur, wer sich über einen Einladungslink verbunden hat).
//   GET  ?id=<öffentliche Nummer>                  → meine Freundinnen
//   POST { id, geheim, aktion: 'verbinden', mit }  → mit dieser Person befreunden (beide Seiten)
//   POST { id, geheim, aktion: 'trennen', mit }    → Freundschaft beenden (beide Seiten)
// Pro Person nur: öffentliche Kennung, Name, Katzenart, Stufe, heute getrunken, zuletzt aktiv, Mitteilungen an/aus.
// Nie die geheime Nummer, nie den ganzen Stand.
import { befehl, istId, pruefeGeheim, antwort, JAHR_S } from './_db.js';
import { artNachId, milchBisGross } from '../js/arten.js';
import { stufeFuerMilch, tagesSchluessel } from '../js/regeln.js';

const HOECHSTENS = 100;

async function liste(id) {
  const ids = ((await befehl('SMEMBERS', `freunde:${id}`)) || []).slice(0, HOECHSTENS);
  if (!ids.length) return [];
  const [staende, abos] = await Promise.all([
    befehl('MGET', ...ids.map((i) => `stand:${i}`)),
    befehl('MGET', ...ids.map((i) => `push:${i}`)),
  ]);
  const heute = tagesSchluessel(Date.now());
  const freunde = [];
  staende.forEach((text, n) => {
    if (!text) return;
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
      mitteilungen: !!abos[n],
    });
  });
  freunde.sort((a, b) => b.aktiv - a.aktiv);
  return freunde;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const id = req.query?.id;
      if (!istId(id)) return antwort(res, 200, { freunde: [] }); // ohne Nummer: niemand (früher: alle)
      return antwort(res, 200, { freunde: await liste(id) });
    }
    if (req.method !== 'POST') return antwort(res, 405, { fehler: 'nur GET oder POST' });
    const { id, geheim, aktion, mit } = req.body || {};
    if (!(await pruefeGeheim(id, geheim))) return antwort(res, 403, { fehler: 'falsche Nummer' });
    if (!istId(mit) || mit === id) return antwort(res, 400, { fehler: 'mit fehlt' });
    if (aktion === 'verbinden') {
      const text = await befehl('GET', `stand:${mit}`);
      if (!text) return antwort(res, 404, { fehler: 'unbekannt' });
      await befehl('SADD', `freunde:${id}`, mit);
      await befehl('SADD', `freunde:${mit}`, id);
      await befehl('EXPIRE', `freunde:${id}`, JAHR_S);
      await befehl('EXPIRE', `freunde:${mit}`, JAHR_S);
      let name = '';
      try { name = String(JSON.parse(text).n ?? '').replace(/[<>&"'`]/g, '').trim().slice(0, 20); } catch { /* ohne Namen */ }
      return antwort(res, 200, { ok: true, name });
    }
    if (aktion === 'trennen') {
      await befehl('SREM', `freunde:${id}`, mit);
      await befehl('SREM', `freunde:${mit}`, id);
      return antwort(res, 200, { ok: true });
    }
    return antwort(res, 400, { fehler: 'aktion muss verbinden oder trennen sein' });
  } catch (e) {
    return antwort(res, 503, { fehler: e.message });
  }
}
