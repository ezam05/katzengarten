// Kurzer Selbsttest der Rechenregeln. Starten mit: node tests/regeln.test.mjs
import assert from 'node:assert/strict';
import { milchPortion, rechneTagAb, hautAb, stufeFuerMilch, tagesSchluessel, zuerichZuMs } from '../js/regeln.js';

// Milch nur für heute getrunkenes Wasser, höchstens 3 l pro Tag (2 l ist nicht die Grenze), nicht mehr als nötig
assert.equal(milchPortion({ heuteGetrunken: 500, heuteGefuettert: 0, milch: 0, bisGross: 14000 }), 500);
assert.equal(milchPortion({ heuteGetrunken: 500, heuteGefuettert: 500, milch: 500, bisGross: 14000 }), 0);
assert.equal(milchPortion({ heuteGetrunken: 2500, heuteGefuettert: 2000, milch: 0, bisGross: 14000 }), 500);
assert.equal(milchPortion({ heuteGetrunken: 4000, heuteGefuettert: 2500, milch: 0, bisGross: 14000 }), 500);
assert.equal(milchPortion({ heuteGetrunken: 2000, heuteGefuettert: 0, milch: 13800, bisGross: 14000 }), 200);

// Abrechnung: 2 l = Streak + Münze, 1,25–2 l = Streak bleibt, darunter Streak weg
assert.deepEqual(rechneTagAb({ streak: 3, muenzen: 1, vortagMl: null }, 2000), { stand: { streak: 4, muenzen: 2, vortagMl: 2000 }, ergebnis: 'geschafft' });
assert.deepEqual(rechneTagAb({ streak: 3, muenzen: 1, vortagMl: 2000 }, 1500), { stand: { streak: 3, muenzen: 1, vortagMl: 1500 }, ergebnis: 'knapp' });
assert.deepEqual(rechneTagAb({ streak: 3, muenzen: 1, vortagMl: 2000 }, 1100), { stand: { streak: 0, muenzen: 1, vortagMl: 1100 }, ergebnis: 'streakWeg' });

// Abhauen: unter 1 l, oder zwei Tage hintereinander unter 1,5 l – nur wenn ein Kätzchen da ist
assert.equal(hautAb(900, null), true);
assert.equal(hautAb(1400, 1400), true);
assert.equal(hautAb(1400, 1600), false);
assert.equal(rechneTagAb({ streak: 3, muenzen: 1, vortagMl: null }, 500, true).ergebnis, 'abgehauen');
assert.equal(rechneTagAb({ streak: 3, muenzen: 1, vortagMl: null }, 500, true).stand.vortagMl, null);
assert.equal(rechneTagAb({ streak: 3, muenzen: 1, vortagMl: null }, 500, false).ergebnis, 'streakWeg');

// Stufen und Tageswechsel um 4 Uhr
assert.equal(stufeFuerMilch(0, 14000), 0);
assert.equal(stufeFuerMilch(14000, 14000), 4);
assert.equal(tagesSchluessel(zuerichZuMs(2026, 11, 21, 3, 59)), '2026-11-20');
assert.equal(tagesSchluessel(zuerichZuMs(2026, 11, 21, 4, 0)), '2026-11-21');

console.log('Alle Regeln stimmen ✓');
