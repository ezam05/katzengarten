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

// Miau: wie eine Stimme gebaut. Ein Summton (Stimmbänder) läuft durch drei Filter (Mundraum, «Formanten»),
// die von «m» über «i-a» nach «u» wandern. Dazu leichtes Zittern und etwas Hauch. Jedes Miau klingt etwas anders.
export function baueMiau(a, ziel, t, { hoch = 1, lang = 1, zufall = Math.random } = {}) {
  const z = 0.9 + zufall() * 0.22;               // Stimmlage dieser Katze
  const d = (0.48 + zufall() * 0.25) * lang;     // Dauer
  const f0 = 540 * hoch * z;
  const stopp = t + d + 0.1;

  const stimme = a.createOscillator();
  stimme.type = 'sawtooth';
  stimme.frequency.setValueAtTime(f0 * 0.82, t);
  stimme.frequency.linearRampToValueAtTime(f0 * 1.42, t + d * 0.3);
  stimme.frequency.linearRampToValueAtTime(f0 * 1.3, t + d * 0.55);
  stimme.frequency.exponentialRampToValueAtTime(f0 * 0.78, t + d);
  const zittern = a.createOscillator();
  zittern.frequency.value = 5 + zufall() * 2;
  const zitternTiefe = a.createGain();
  zitternTiefe.gain.value = f0 * 0.018;
  zittern.connect(zitternTiefe).connect(stimme.frequency);

  // «m»: Mund zuerst fast zu, dann offen, am Schluss wieder etwas zu
  const mund = a.createBiquadFilter();
  mund.type = 'lowpass';
  mund.frequency.setValueAtTime(450, t);
  mund.frequency.exponentialRampToValueAtTime(4200, t + d * 0.18);
  mund.frequency.exponentialRampToValueAtTime(1600, t + d);
  stimme.connect(mund);

  const summe = a.createGain();
  summe.gain.value = 1;
  // drei Formanten: [Start, Mitte («a»), Ende («u»), Stärke, Schärfe]
  for (const [f1, f2, f3, staerke, q] of [[420, 880, 430, 1, 7], [2200, 1450, 850, 0.55, 9], [3000, 2800, 2500, 0.22, 10]]) {
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f1, t);
    bp.frequency.linearRampToValueAtTime(f2, t + d * 0.4);
    bp.frequency.linearRampToValueAtTime(f3, t + d);
    const g = a.createGain();
    g.gain.value = staerke * 3.2;
    mund.connect(bp).connect(g).connect(summe);
  }

  // Hauch: leises Rauschen
  const rausch = a.createBufferSource();
  const puffer = a.createBuffer(1, Math.ceil(a.sampleRate * (d + 0.1)), a.sampleRate);
  const r = puffer.getChannelData(0);
  for (let i = 0; i < r.length; i++) r[i] = zufall() * 2 - 1;
  rausch.buffer = puffer;
  const hauchFilter = a.createBiquadFilter();
  hauchFilter.type = 'bandpass';
  hauchFilter.frequency.value = 2600;
  hauchFilter.Q.value = 1.2;
  const hauch = a.createGain();
  hauch.gain.value = 0.05;
  rausch.connect(hauchFilter).connect(hauch).connect(summe);

  const laut = a.createGain();
  laut.gain.setValueAtTime(0.0001, t);
  laut.gain.exponentialRampToValueAtTime(0.42, t + 0.07);
  laut.gain.linearRampToValueAtTime(0.36, t + d * 0.65);
  laut.gain.exponentialRampToValueAtTime(0.0001, t + d);
  summe.connect(laut).connect(ziel);
  for (const q of [stimme, zittern, rausch]) { q.start(t); q.stop(stopp); }
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
    phase = (phase + (aus ? 26 : 23) / sr) % 1;
    const stoss = Math.exp(-phase * 6);
    const weiss = zufall() * 2 - 1;
    braun = (braun + 0.025 * weiss) / 1.025; // tiefes, weiches Rauschen
    s[i] = (braun * 4 + weiss * 0.18) * stoss * atem;
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
  tief.frequency.value = 950;
  // Brustkorb klingt mit; etwas Mitte, damit man es auch auf Handy-Lautsprechern hört (die tiefe Töne kaum spielen)
  const bauch = a.createBiquadFilter();
  bauch.type = 'peaking';
  bauch.frequency.value = 230;
  bauch.Q.value = 0.8;
  bauch.gain.value = 7;
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
