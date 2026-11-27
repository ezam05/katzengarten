// arten.js – Liste aller Katzenarten.
// Eine neue Katze = ein neuer Eintrag in ARTEN. Mehr braucht es nicht.
// Vorlagen der Figuren: bilder/vorlagen/katzen/
//
// Felder:
//   id      – kurzer, eindeutiger Name (für das Speichern)
//   name    – Anzeigename
//   tage    – so viele Tage mit 2 Litern braucht das Baby, bis es gross ist
//             (es braucht tage × 2 Liter Milch, pro Tag höchstens 2 Liter)
//   preis   – Münzen zum Freischalten (halb so viele wie tage, aufgerundet; Wunsch Elyna 2026-11-27)
//   gratis  – true: von Anfang an freigeschaltet
//   satz    – kurzer Charakter-Satz für den Laden
//   farben  – Farben der Figur
//   figur   – Aussehen: muster ('tiger' | 'dreifarbig' | 'stirn' | 'tigerstreifen'),
//             form ('stehend' auf 4 Beinen | 'bohne' Kopf und Körper in einem | sonst sitzend),
//             schwanz ('normal' | 'geringelt' | 'flausch' | 'wolke'),
//             extra ('toast' | 'gloeckchen' | 'maehne' | null), ohren ('rund' | spitz),
//             augen ('gross' | 'verlauf' | 'weiss' | 'rund' | normal), mund ('keiner' | 'lachen' | normal),
//             nase ('tropfen' | normal), wangen (false = keine), wangenGross, schnurrhaare (true | 'lang' | 3),
//             strich (Dicke der Umrisslinie), strichel (Lücken in der Linie), tusche, aquarell,
//             ohrStrich (Ohr innen nur ein Strich), ballen (rosa Pfotenballen), kopfForm ('flausch'),
//             mollig (breiter Körper), babyKopf / babyPfoten (Baby: grösserer Kopf / grössere Pfoten)

export const ARTEN = [
  {
    id: 'toast', name: 'Toastkatze', tage: 7, preis: 4, gratis: true,
    satz: 'Kuschelt sich am liebsten in ihr Brot.',
    farben: {
      fell: '#F6BE78', fellDunkel: '#E19A55', bauch: '#FFF3DF', schnauze: '#FFF3DF',
      streifen: '#D9853F', umriss: '#8A5A3C', ohrInnen: '#F7A9A0', nase: '#EE8A88',
      auge: '#6B3E22', wange: '#FF9FB0', toast: '#E9BA7C', brot: '#FFF3D9', poren: '#EFD3A3',
    },
    // dünne weiche braune Linie, grosse runde braune Augen, grosse Bäckchen, Lachmund
    figur: { muster: 'tiger', schwanz: 'geringelt', extra: 'toast', strich: 1.8, augen: 'rund', mund: 'lachen', wangenGross: true, schnurrhaare: 3 },
  },
  {
    id: 'tiger', name: 'Mollige Tigerkatze', tage: 10, preis: 5,
    satz: 'Schaut immer nach oben, ob es Milch gibt.',
    farben: {
      fell: '#F1ECE4', fellDunkel: '#9E9893', bauch: '#FCF8F0', schnauze: '#FCF8F0',
      streifen: '#4F4A46', umriss: '#262220', ohrInnen: '#EF6F5A',
      nase: '#E5604F', auge: '#1F1A18', wange: '#FFB0A8',
    },
    // Bohnenform ohne Hals, Tusche-Linie, graue Aquarellfläche, weisse Augen schauen nach oben
    figur: { form: 'bohne', muster: 'tiger', schwanz: 'geringelt', augen: 'weiss', schnurrhaare: 'lang', tusche: true, aquarell: true, strich: 2.6 },
  },
  {
    id: 'glueck', name: 'Glückskatze', tage: 14, preis: 7,
    satz: 'Dreifarbig, mit Glöckchen. Bringt Glück!',
    farben: {
      fell: '#FFFFFF', fellDunkel: '#ECE6DA', bauch: '#FFFFFF', fleckA: '#E5A86A', fleckB: '#3A3533',
      umriss: '#141010', ohrInnen: '#F4C6CF', ohrL: '#E5A86A', ohrR: '#3A3533',
      nase: '#E6A9B4', auge: '#141010', augenRand: '#EFE9C4', ballen: '#E9B3C2', gold: '#E9D08A',
    },
    // dicke schwarze Linie mit kleinen Lücken, flache Farben, sehr grosse Augen, kein Mund
    figur: { muster: 'dreifarbig', schwanz: 'normal', extra: 'gloeckchen', strich: 4, strichel: '30 3', augen: 'gross', mund: 'keiner', nase: 'tropfen', wangen: false, ohrStrich: true, ballen: true },
  },
  {
    id: 'wolke', name: 'Wolkenkatze', tage: 21, preis: 11,
    satz: 'Flauschig wie eine Wolke, mit blauen Augen.',
    farben: {
      fell: '#F2F2F8', fellDunkel: '#C4BED8', bauch: '#FFFFFF',
      streifen: '#A7A6C2', umriss: '#6B7394', ohrInnen: '#F6C3C8',
      nase: '#E9A7B0', auge: '#16224A', irisDunkel: '#1F4E9A', irisHell: '#8FD3F7', lid: '#6B3B2A', wange: '#F9C9D0',
    },
    // steht auf 4 Beinen, dünne blaugraue Linie, Flauschkanten, Augen mit Verlauf, Wolkenschwanz
    figur: { form: 'stehend', muster: 'stirn', schwanz: 'wolke', extra: 'maehne', kopfForm: 'flausch', augen: 'verlauf', strich: 1.8 },
  },
  {
    id: 'tigerbaby', name: 'Kleiner Tiger', tage: 30, preis: 15,
    satz: 'Rund, gestreift und brüllt nur aus Spass.',
    farben: {
      fell: '#F08A2C', fellDunkel: '#D8741E', bauch: '#F7B25A', pfote: '#FFFFFF', schnauze: '#FFFFFF',
      streifen: '#2A1E18', umriss: '#2A1E18', ohrInnen: '#FFFFFF', ohrL: '#2A1E18', ohrR: '#2A1E18',
      nase: '#F08C8C', auge: '#2A1E18', iris: '#E8A33A', irisGlanz: '#FFE2A8', wange: '#FFB7A8',
    },
    // babyKopf / babyPfoten: so viel grösser sind Kopf und Pfoten beim neugeborenen Baby
    figur: { muster: 'tigerstreifen', schwanz: 'geringelt', ohren: 'rund', mollig: true, strich: 3, babyKopf: 0.3, babyPfoten: 0.45 },
  },
];

// Foto-Katze «UU II AA» (Elynas GIFs, Hintergrund entfernt). 3× schnell antippen: die zweite Katze dreht sich.
ARTEN.push({
  id: 'tanzkatze', name: 'UU II AA', tage: 20, preis: 10,
  satz: 'Tanzt den ganzen Tag. Tipp 3× schnell drauf!',
  farben: { fell: '#B9AFA6', fellDunkel: '#8E847C', bauch: '#FFFFFF', streifen: '#6F6A66', umriss: '#3A3330', ohrInnen: '#F2B8B0', nase: '#E9A7B0', auge: '#1F1A18', wange: '#FFB0A8' },
  figur: {
    strich: 2.6,
    // tanzt immer: alle 53 Bilder der GIF nebeneinander, ein Durchgang dauert 4,4 s
    foto: { bild: 'bilder/katzen/tanzkatze-bilder.png', breite: 200, hoehe: 200, bilder: 53, ms: 4380, boden: 1 },
    // zweite Katze: 30 Einzelbilder nebeneinander. ms = eine Drehung (3× schneller als das Original),
    // dauer = so lange bleibt sie, danach wieder das Tanzkätzchen. ton = Soundeffekt (Datei), kommt noch.
    foto2: { bild: 'bilder/katzen/drehkatze-bilder.png', breite: 200, hoehe: 200, bilder: 30, ms: 1700, dauer: 3000, boden: 0.9, ton: 'ton/drehkatze.mp3' },
  },
});

export function artNachId(id) {
  return ARTEN.find((a) => a.id === id) ?? ARTEN[0];
}

// So viel Milch braucht ein Baby dieser Art, bis es gross ist (ml)
export function milchBisGross(art) {
  return art.tage * 2000;
}
