// /api/trinken – Wasser von der Uhr. Die Uhr trägt ein (aktion «eintragen»),
// das iPhone holt die Getränke ab (aktion «abholen») und füttert damit die Katze.
import { befehl, pruefeGeheim, antwort } from './_db.js';

const GROESSEN = [100, 250, 500];
const WOCHE_S = 7 * 24 * 60 * 60;

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return antwort(res, 405, { fehler: 'nur POST' });
    const { id, geheim, aktion, ml } = req.body || {};
    if (!(await pruefeGeheim(id, geheim))) return antwort(res, 403, { fehler: 'falsche Nummer' });
    const schluessel = `trinken:${id}`;
    if (aktion === 'eintragen') {
      if (!GROESSEN.includes(ml)) return antwort(res, 400, { fehler: 'ml muss 100, 250 oder 500 sein' });
      await befehl('RPUSH', schluessel, JSON.stringify({ ml, zeit: Date.now() }));
      await befehl('LTRIM', schluessel, -50, -1);
      await befehl('EXPIRE', schluessel, WOCHE_S);
      return antwort(res, 200, { ok: true });
    }
    if (aktion === 'abholen') {
      const liste = (await befehl('LPOP', schluessel, 50)) || [];
      return antwort(res, 200, { liste: liste.map((t) => JSON.parse(t)).filter((e) => GROESSEN.includes(e.ml) && Number.isFinite(e.zeit)) });
    }
    return antwort(res, 400, { fehler: 'aktion muss eintragen oder abholen sein' });
  } catch (e) {
    return antwort(res, 503, { fehler: e.message });
  }
}
