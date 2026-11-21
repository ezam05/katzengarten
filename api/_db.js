// Datenbank: Upstash Redis über REST. Vercel setzt die Zugangsdaten, wenn der Speicher
// mit dem Projekt verbunden ist (KV_REST_API_* oder UPSTASH_REDIS_REST_*).
import { createHash } from 'node:crypto';

export async function befehl(...args) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Datenbank nicht verbunden');
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args.map(String)),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const istId = (s) => typeof s === 'string' && UUID.test(s);
const hash = (s) => createHash('sha256').update(s).digest('hex');
export const JAHR_S = 365 * 24 * 60 * 60;

// Jede Person hat eine öffentliche Nummer (id) und eine geheime (geheim).
// Das erste Speichern legt die geheime Nummer fest, danach muss sie stimmen.
export async function pruefeGeheim(id, geheim, anlegen = false) {
  if (!istId(id) || !istId(geheim)) return false;
  const h = hash(geheim);
  const gespeichert = await befehl('GET', `geheim:${id}`);
  if (gespeichert) return gespeichert === h;
  if (!anlegen) return false;
  await befehl('SET', `geheim:${id}`, h, 'NX', 'EX', JAHR_S);
  return (await befehl('GET', `geheim:${id}`)) === h;
}

export function antwort(res, code, daten) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(code).json(daten);
}
