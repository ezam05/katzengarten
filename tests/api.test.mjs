// Test der Server-Funktionen mit einer nachgebauten Datenbank. Starten: node tests/api.test.mjs
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Mini-Redis im Speicher, beantwortet die REST-Aufrufe wie Upstash
const db = new Map();
process.env.KV_REST_API_URL = 'https://test.local';
process.env.KV_REST_API_TOKEN = 'test';
globalThis.fetch = async (_url, { body }) => {
  const [cmd, k, ...a] = JSON.parse(body);
  let result = null;
  if (cmd === 'GET') result = db.get(k) ?? null;
  else if (cmd === 'SET') { if (!(a.includes('NX') && db.has(k))) db.set(k, a[0]); result = 'OK'; }
  else if (cmd === 'RPUSH') { db.set(k, [...(db.get(k) || []), a[0]]); result = db.get(k).length; }
  else if (cmd === 'LTRIM') { db.set(k, (db.get(k) || []).slice(Number(a[0]))); result = 'OK'; }
  else if (cmd === 'LPOP') { const l = db.get(k) || []; result = l.length ? l.splice(0, Number(a[0])) : null; }
  else if (cmd === 'EXPIRE') result = 1;
  return { json: async () => ({ result }) };
};
const anfrage = async (handler, method, { query, body } = {}) => {
  let code, daten;
  const res = { setHeader() {}, status(c) { code = c; return this; }, json(d) { daten = d; } };
  await handler({ method, query, body }, res);
  return { code, daten };
};

const { default: stand } = await import('../api/stand.js');
const { default: trinken } = await import('../api/trinken.js');
const id = randomUUID(), geheim = randomUUID();

// Stand speichern und öffentlich lesen
assert.equal((await anfrage(stand, 'POST', { body: { id, geheim, stand: { v: 1, n: 'Elyna' } } })).code, 200);
const gelesen = await anfrage(stand, 'GET', { query: { id } });
assert.equal(gelesen.daten.n, 'Elyna');
assert.equal(gelesen.daten.i, id);
// Fremde Nummer darf nicht überschreiben
assert.equal((await anfrage(stand, 'POST', { body: { id, geheim: randomUUID(), stand: { n: 'Böse' } } })).code, 403);
assert.equal((await anfrage(stand, 'GET', { query: { id: 'kaputt' } })).code, 400);
assert.equal((await anfrage(stand, 'GET', { query: { id: randomUUID() } })).code, 404);

// Uhr trägt ein, iPhone holt ab (danach ist die Liste leer)
assert.equal((await anfrage(trinken, 'POST', { body: { id, geheim, aktion: 'eintragen', ml: 250 } })).code, 200);
assert.equal((await anfrage(trinken, 'POST', { body: { id, geheim, aktion: 'eintragen', ml: 999 } })).code, 400);
assert.equal((await anfrage(trinken, 'POST', { body: { id, geheim: randomUUID(), aktion: 'eintragen', ml: 250 } })).code, 403);
const abgeholt = await anfrage(trinken, 'POST', { body: { id, geheim, aktion: 'abholen' } });
assert.equal(abgeholt.daten.liste.length, 1);
assert.equal(abgeholt.daten.liste[0].ml, 250);
assert.equal((await anfrage(trinken, 'POST', { body: { id, geheim, aktion: 'abholen' } })).daten.liste.length, 0);

console.log('Server-Funktionen stimmen ✓');
