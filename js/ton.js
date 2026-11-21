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

// Miau: Ton gleitet hoch und wieder runter, durch einen «Mund»-Filter
export function miau({ hoch = 1, lang = 1 } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime, d = 0.55 * lang;
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
  osz.connect(mund).connect(laut).connect(a.destination);
  osz.start(t);
  osz.stop(t + d + 0.05);
}

// Schnurren: tiefes Brummen, das 25-mal pro Sekunde pulsiert
export function schnurrenStart() {
  const a = audio();
  if (!a || schnurren) return;
  const t = a.currentTime;
  const brumm = a.createOscillator();
  brumm.type = 'sawtooth';
  brumm.frequency.value = 48;
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 260;
  const puls = a.createGain();
  puls.gain.value = 0.5;
  const pulsOsz = a.createOscillator();
  pulsOsz.frequency.value = 25;
  const pulsTiefe = a.createGain();
  pulsTiefe.gain.value = 0.5;
  pulsOsz.connect(pulsTiefe).connect(puls.gain);
  const lautstaerke = a.createGain();
  lautstaerke.gain.setValueAtTime(0.0001, t);
  lautstaerke.gain.exponentialRampToValueAtTime(0.5, t + 0.3);
  brumm.connect(filter).connect(puls).connect(lautstaerke).connect(a.destination);
  brumm.start(t);
  pulsOsz.start(t);
  schnurren = { quellen: [brumm, pulsOsz], lautstaerke };
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
