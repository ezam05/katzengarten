// /api/stand – Stand einer Katze speichern (POST, mit geheimer Nummer) oder lesen (GET, öffentliche Nummer).
// Der Stand ist das, was Freundinnen und die Uhr sehen: Name, Katze, heute getrunken, Streak, Garten.
import { befehl, istId, pruefeGeheim, antwort, JAHR_S } from './_db.js';

const MAX_ZEICHEN = 30000;

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const id = req.query?.id;
      if (!istId(id)) return antwort(res, 400, { fehler: 'id fehlt' });
      const text = await befehl('GET', `stand:${id}`);
      return text ? antwort(res, 200, JSON.parse(text)) : antwort(res, 404, { fehler: 'unbekannt' });
    }
    if (req.method === 'POST') {
      const { id, geheim, stand } = req.body || {};
      if (!stand || typeof stand !== 'object' || Array.isArray(stand)) return antwort(res, 400, { fehler: 'stand fehlt' });
      const text = JSON.stringify({ ...stand, i: id });
      if (text.length > MAX_ZEICHEN) return antwort(res, 413, { fehler: 'zu gross' });
      if (!(await pruefeGeheim(id, geheim, true))) return antwort(res, 403, { fehler: 'falsche Nummer' });
      await befehl('SET', `stand:${id}`, text, 'EX', JAHR_S);
      return antwort(res, 200, { ok: true });
    }
    return antwort(res, 405, { fehler: 'nur GET oder POST' });
  } catch (e) {
    return antwort(res, 503, { fehler: e.message });
  }
}
