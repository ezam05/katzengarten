// ton.js – Katzengeräusche, im Browser erzeugt (Web Audio, keine Tondateien).
// Miau beim Antippen, Schnurren beim Streicheln, Plätschern beim Trinken.
// Auf dem iPhone sind die Töne stumm, wenn der Lautlos-Schalter an ist.

let ctx = null;
let an = true;
let schnurren = null; // laufendes Schnurren { quelle, lautstaerke }

export function tonAn(wert) {
  an = wert;
  if (!an) schnurrenStopp();
}

// Der Browser erlaubt Töne erst nach einer Berührung: darum erst beim ersten Ton starten
function audio() {
  if (!an) return null;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

// Bei der ersten Berührung aufrufen: schaltet die Töne frei (iPhone, Safari)
export function tonEntsperren() {
  const a = audio();
  if (!a) return;
  // ein ganz kurzer stiller Ton entsperrt ältere iPhones
  const b = a.createBuffer(1, 1, 22050);
  const q = a.createBufferSource();
  q.buffer = b;
  q.connect(a.destination);
  q.start(0);
}

// Miau: Ton gleitet hoch und wieder runter, durch einen «Mund»-Filter (das alte Miau, Wunsch Elyna 2026-11-27)
export function baueMiau(a, ziel, t, { hoch = 1, lang = 1 } = {}) {
  const d = 0.55 * lang;
  const osz = a.createOscillator();
  osz.type = 'sawtooth';
  osz.frequency.setValueAtTime(520 * hoch, t);
  osz.frequency.linearRampToValueAtTime(880 * hoch, t + d * 0.35);
  osz.frequency.linearRampToValueAtTime(600 * hoch, t + d);
  const mund = a.createBiquadFilter();
  mund.type = 'bandpass';
  mund.Q.value = 4;
  mund.frequency.setValueAtTime(900, t);
  mund.frequency.linearRampToValueAtTime(1800, t + d * 0.4); // «i-a-u»
  mund.frequency.linearRampToValueAtTime(700, t + d);
  const laut = a.createGain();
  laut.gain.setValueAtTime(0.0001, t);
  laut.gain.exponentialRampToValueAtTime(0.35, t + 0.06);
  laut.gain.setValueAtTime(0.35, t + d * 0.6);
  laut.gain.exponentialRampToValueAtTime(0.0001, t + d);
  osz.connect(mund).connect(laut).connect(ziel);
  osz.start(t);
  osz.stop(t + d + 0.05);
  return d;
}

export function miau(optionen = {}) {
  const a = audio();
  if (a) baueMiau(a, a.destination, a.currentTime, optionen);
}

// Schnurren: rund 25 kleine Stösse pro Sekunde (tiefes Rauschen, das jedes Mal kurz anschlägt),
// beim Ausatmen lauter, beim Einatmen leiser und etwas langsamer, dazwischen eine kurze Pause.
// Zwei Atemzüge werden einmal berechnet und dann endlos wiederholt.
const ATEMZUG = 2.1; // Sekunden
export function schnurrPuffer(a, zufall = Math.random) {
  const sr = a.sampleRate;
  const puffer = a.createBuffer(1, Math.round(sr * ATEMZUG * 2), sr);
  const s = puffer.getChannelData(0);
  let braun = 0, phase = 0, groesster = 0;
  for (let i = 0; i < s.length; i++) {
    const zt = (i / sr) % ATEMZUG;
    const aus = zt < 1.2;
    const atem = aus ? Math.sin(Math.PI * zt / 1.2) ** 0.5
      : zt > 1.3 && zt < 2.05 ? 0.55 * Math.sin(Math.PI * (zt - 1.3) / 0.75) ** 0.5 : 0;
    phase = (phase + (aus ? 24 : 21) / sr) % 1;
    const stoss = Math.sin(Math.PI * phase) ** 2; // runde, weiche Stösse (Wunsch Elyna: tiefer und weicher)
    const weiss = zufall() * 2 - 1;
    braun = (braun + 0.025 * weiss) / 1.025; // tiefes, weiches Rauschen
    s[i] = (braun * 4 + weiss * 0.04) * stoss * atem;
    groesster = Math.max(groesster, Math.abs(s[i]));
  }
  for (let i = 0; i < s.length; i++) s[i] /= groesster || 1;
  return puffer;
}

export function baueSchnurren(a, ziel, t) {
  const quelle = a.createBufferSource();
  quelle.buffer = schnurrPuffer(a);
  quelle.loop = true;
  const tief = a.createBiquadFilter();
  tief.type = 'lowpass';
  tief.frequency.value = 480;
  // Brustkorb klingt mit; etwas Mitte, damit man es auch auf Handy-Lautsprechern hört (die tiefe Töne kaum spielen)
  const bauch = a.createBiquadFilter();
  bauch.type = 'peaking';
  bauch.frequency.value = 140;
  bauch.Q.value = 0.8;
  bauch.gain.value = 6;
  const lautstaerke = a.createGain();
  lautstaerke.gain.setValueAtTime(0.0001, t);
  lautstaerke.gain.exponentialRampToValueAtTime(0.7, t + 0.4);
  quelle.connect(tief).connect(bauch).connect(lautstaerke).connect(ziel);
  quelle.start(t);
  return { quellen: [quelle], lautstaerke };
}

export function schnurrenStart() {
  const a = audio();
  if (!a || schnurren) return;
  schnurren = baueSchnurren(a, a.destination, a.currentTime);
}

export function schnurrenStopp() {
  if (!schnurren || !ctx) return;
  const t = ctx.currentTime;
  schnurren.lautstaerke.gain.cancelScheduledValues(t);
  schnurren.lautstaerke.gain.setValueAtTime(schnurren.lautstaerke.gain.value, t);
  schnurren.lautstaerke.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  schnurren.quellen.forEach((q) => q.stop(t + 0.45));
  schnurren = null;
}

// Tondatei abspielen (z. B. Soundeffekt der zweiten Katze). bis: nach so vielen ms leise ausblenden.
let laufend = null;
export function datei(url, bis = 0) {
  if (!an || !url) return false;
  try {
    laufend?.pause();
    const a = new Audio(url);
    laufend = a;
    a.play().catch(() => {});
    if (bis) {
      setTimeout(() => {
        const schritt = setInterval(() => {
          a.volume = Math.max(0, a.volume - 0.2);
          if (a.volume <= 0.01) { clearInterval(schritt); a.pause(); }
        }, 40);
      }, Math.max(0, bis - 200));
    }
    return true;
  } catch { return false; }
}

// Fauchen: kurzes Rauschen (Zischen), laut einsetzend und abklingend
export function fauchen() {
  const a = audio();
  if (!a) return;
  const dauer = 0.9;
  const puffer = a.createBuffer(1, Math.floor(a.sampleRate * dauer), a.sampleRate);
  const d = puffer.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const q = a.createBufferSource();
  q.buffer = puffer;
  const filter = a.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2200;
  const laut = a.createGain();
  const t = a.currentTime;
  laut.gain.setValueAtTime(0.0001, t);
  laut.gain.exponentialRampToValueAtTime(0.5, t + 0.05);
  laut.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  q.connect(filter).connect(laut).connect(a.destination);
  q.start(t);
}

// Plätschern: ein paar kurze «Blubb»-Töne (Milch in den Napf)
export function plaetschern() {
  const a = audio();
  if (!a) return;
  for (let i = 0; i < 4; i++) {
    const t = a.currentTime + i * 0.12;
    const osz = a.createOscillator();
    osz.type = 'sine';
    osz.frequency.setValueAtTime(500 + Math.random() * 300, t);
    osz.frequency.exponentialRampToValueAtTime(1100 + Math.random() * 400, t + 0.08);
    const laut = a.createGain();
    laut.gain.setValueAtTime(0.0001, t);
    laut.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
    laut.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    osz.connect(laut).connect(a.destination);
    osz.start(t);
    osz.stop(t + 0.12);
  }
}
