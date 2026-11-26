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
  else if (cmd === 'SET') { if (a.includes('NX') && db.has(k)) result = null; else { db.set(k, a[0]); result = 'OK'; } }
  else if (cmd === 'DEL') { result = db.delete(k) ? 1 : 0; }
  else if (cmd === 'RPUSH') { db.set(k, [...(db.get(k) || []), a[0]]); result = db.get(k).length; }
  else if (cmd === 'LTRIM') { db.set(k, (db.get(k) || []).slice(Number(a[0]))); result = 'OK'; }
  else if (cmd === 'LPOP') { const l = db.get(k) || []; result = l.length ? l.splice(0, Number(a[0])) : null; }
  else if (cmd === 'EXPIRE') result = 1;
  else if (cmd === 'SADD') { const m = db.get(k) || new Set(); a.forEach((x) => m.add(x)); db.set(k, m); result = 1; }
  else if (cmd === 'SMEMBERS') result = [...(db.get(k) || [])];
  else if (cmd === 'SREM') { const m = db.get(k) || new Set(); a.forEach((x) => m.delete(x)); result = 1; }
  else if (cmd === 'MGET') result = [k, ...a].map((x) => db.get(x) ?? null);
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

// Freunde-Liste: nur Name, Art, Stufe, heute, aktiv, Kennung – keine geheime Nummer; ohne Namen nicht dabei
const { default: freunde } = await import('../api/freunde.js');
const id2 = randomUUID(), g2 = randomUUID(), id3 = randomUUID();
await anfrage(stand, 'POST', { body: { id: id2, geheim: g2, stand: { v: 1, n: 'Mia', t: Date.now(), h: 750, k: { a: 'tiger', m: 10000 } } } });
await anfrage(stand, 'POST', { body: { id: id3, geheim: randomUUID(), stand: { v: 1, n: '', t: Date.now(), k: { a: 'toast', m: 0 } } } });
const liste = (await anfrage(freunde, 'GET')).daten.freunde;
const mia = liste.find((f) => f.id === id2);
assert.deepEqual(Object.keys(mia).sort(), ['aktiv', 'art', 'heuteMl', 'id', 'name', 'stufe']);
assert.equal(mia.name, 'Mia'); assert.equal(mia.stufe, 1); // 10 von 20 l = Kätzchen assert.equal(mia.heuteMl, 750);
assert.ok(!liste.some((f) => f.id === id3), 'ohne Namen nicht in der Liste');
assert.ok(!JSON.stringify(liste).includes(geheim) && !JSON.stringify(liste).includes(g2), 'keine geheime Nummer');

// Mitteilungen (Anstupsen): Abo speichern, anstupsen, Pause, abgelaufenes Abo, fremde Adressen abweisen
const { default: push, versand } = await import('../api/push.js');
const geschickt = [];
versand.senden = async (abo, text) => { if (abo.endpoint.includes('abgelaufen')) throw Object.assign(new Error('weg'), { statusCode: 410 }); geschickt.push({ abo, text: JSON.parse(text) }); };
const schl = await anfrage(push, 'GET', { query: { aktion: 'schluessel' } });
assert.equal(schl.code, 200); assert.ok(schl.daten.schluessel.length > 40);
assert.equal((await anfrage(push, 'GET', { query: { aktion: 'schluessel' } })).daten.schluessel, schl.daten.schluessel, 'Schlüssel bleibt gleich');
const abo = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'p', auth: 'a' } };
assert.equal((await anfrage(push, 'POST', { body: { id: id2, geheim: g2, aktion: 'abo', abo: { ...abo, endpoint: 'https://boese.example.com/x' } } })).code, 400, 'nur bekannte Dienste');
assert.equal((await anfrage(push, 'POST', { body: { id: id2, geheim: randomUUID(), aktion: 'abo', abo } })).code, 403);
assert.equal((await anfrage(push, 'POST', { body: { id, geheim, aktion: 'stupsen', an: id2 } })).daten.grund, 'kein-abo');
assert.equal((await anfrage(push, 'POST', { body: { id: id2, geheim: g2, aktion: 'abo', abo } })).code, 200);
const stups = await anfrage(push, 'POST', { body: { id, geheim, aktion: 'stupsen', an: id2 } });
assert.equal(stups.daten.ok, true);
assert.equal(geschickt.length, 1);
assert.equal(geschickt[0].text.titel, 'Elyna stupst dich an 💧', 'Name kommt vom Server');
assert.equal((await anfrage(push, 'POST', { body: { id, geheim, aktion: 'stupsen', an: id2 } })).code, 429, '30 Minuten Pause');
assert.equal((await anfrage(push, 'POST', { body: { id, geheim, aktion: 'stupsen', an: id } })).code, 400, 'nicht sich selbst');
// abgelaufenes Abo wird gelöscht
await anfrage(push, 'POST', { body: { id, geheim, aktion: 'abo', abo: { ...abo, endpoint: 'https://fcm.googleapis.com/fcm/send/abgelaufen' } } });
assert.equal((await anfrage(push, 'POST', { body: { id: id2, geheim: g2, aktion: 'stupsen', an: id } })).daten.grund, 'kein-abo');
assert.equal(db.has(`push:${id}`), false);
assert.equal((await anfrage(push, 'POST', { body: { id: id2, geheim: g2, aktion: 'ab' } })).code, 200);
assert.equal(db.has(`push:${id2}`), false);

console.log('Server-Funktionen stimmen ✓');
