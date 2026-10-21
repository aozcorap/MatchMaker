// Erzeugt simulierte Meldungen: npx tsx scripts/simulation.ts
// Feste Zufallsbasis, damit das Ergebnis jedes Mal gleich ist. Alle Namen und Vereine sind erfunden.
import { writeFileSync } from 'node:fs';
import { altersklasseText, boxerInfo, gewichtsklasseText } from '../src/regeln/info';
import type { Altersklasse, Boxer, Geschlecht } from '../src/regeln/typen';

const DATUM = '2026-11-14';

function zufall(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = zufall(2026);
const zahl = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
const waehle = <T,>(liste: T[]) => liste[Math.floor(rng() * liste.length)];

const VORNAMEN_M = ['Jonas', 'Luca', 'Emre', 'Felix', 'Milan', 'Tobias', 'Dario', 'Kevin', 'Marek', 'Samir', 'Leon', 'Niko', 'Paul', 'Yusuf', 'Anton', 'Ben', 'Oskar', 'Rafael', 'Timo', 'Viktor'];
const VORNAMEN_W = ['Mia', 'Lena', 'Sara', 'Nora', 'Amira', 'Jana', 'Clara', 'Elif', 'Hanna', 'Ida', 'Maja', 'Selin', 'Tessa', 'Vera'];
const NACHNAMEN = ['Brandt', 'Keller', 'Yilmaz', 'Hartmann', 'Novak', 'Scholz', 'Ritter', 'Demir', 'Lorenz', 'Vogel', 'Kaiser', 'Petrov', 'Winter', 'Aydin', 'Roth', 'Becker', 'Sommer', 'Kovač', 'Franke', 'Güler', 'Lange', 'Huber', 'Engel', 'Marx', 'Stein', 'Wolf', 'Hahn', 'Bauer', 'Kraus', 'Jung'];

const JAHRGAENGE: Record<Altersklasse, [number, number]> = {
  U13: [2014, 2016],
  U15: [2012, 2013],
  U17: [2010, 2011],
  U19: [2008, 2009],
  Erwachsene: [1982, 2007],
};
const GEWICHT: Record<Altersklasse, Record<Geschlecht, [number, number]>> = {
  U13: { M: [36, 62], W: [36, 60] },
  U15: { M: [38, 70], W: [38, 66] },
  U17: { M: [42, 82], W: [40, 72] },
  U19: { M: [48, 92], W: [45, 78] },
  Erwachsene: { M: [52, 108], W: [46, 84] },
};
const MAX_KAEMPFE: Record<Altersklasse, number> = { U13: 8, U15: 14, U17: 20, U19: 25, Erwachsene: 60 };

let laufnummer = 0;
const benutzt = new Set<string>();

function boxer(verein: string, ak: Altersklasse, g: Geschlecht, fest: Partial<Boxer> = {}): Boxer {
  laufnummer += 1;
  let name = '';
  do {
    name = `${waehle(g === 'M' ? VORNAMEN_M : VORNAMEN_W)} ${waehle(NACHNAMEN)}`;
  } while (benutzt.has(name));
  benutzt.add(name);
  const [j0, j1] = JAHRGAENGE[ak];
  const geb = `${zahl(j0, j1)}-${String(zahl(1, 12)).padStart(2, '0')}-${String(zahl(1, 28)).padStart(2, '0')}`;
  const [w0, w1] = GEWICHT[ak][g];
  const gewicht = Math.round((w0 + rng() * (w1 - w0)) * 10) / 10;
  const r = rng();
  const kaempfe = Math.floor(MAX_KAEMPFE[ak] * r * r);
  const siege = Math.round(kaempfe * (0.2 + rng() * 0.65));
  const rest = kaempfe - siege;
  const niederlagen = rest > 0 && rng() < 0.2 ? rest - 1 : rest;
  return {
    id: `sim-${String(laufnummer).padStart(2, '0')}`,
    name,
    verein,
    geburtsdatum: geb,
    geschlecht: g,
    gewicht,
    kaempfe,
    siege,
    niederlagen,
    ...fest,
  };
}

type Profil = [Altersklasse, Geschlecht];
const M = (...a: Altersklasse[]): Profil[] => a.map((x) => [x, 'M']);
const W = (...a: Altersklasse[]): Profil[] => a.map((x) => [x, 'W']);

// Pro Verein: Zusammensetzung (Altersklasse, Geschlecht) und gezielte Sonderfälle.
const VEREINE: { name: string; profile: Profil[]; sonder?: (Boxer | (() => Boxer))[] }[] = [
  {
    name: 'BC Nordstern',
    profile: [...M('U13', 'U15', 'U17', 'U19', 'Erwachsene', 'Erwachsene'), ...W('U17', 'Erwachsene', 'Erwachsene')],
  },
  {
    name: 'Boxring Eiche',
    profile: [...M('U13', 'U13', 'U13', 'U15', 'U15', 'U17'), ...W('U13', 'U15')],
    sonder: [() => boxer('Boxring Eiche', 'U13', 'M', { geburtsdatum: '2017-03-12', gewicht: 33, kaempfe: 0, siege: 0, niederlagen: 0 })],
  },
  {
    name: 'SV Rheinkraft',
    profile: [...M('Erwachsene', 'Erwachsene', 'Erwachsene', 'U19', 'Erwachsene'), ...W('U19')],
    sonder: [
      () => boxer('SV Rheinkraft', 'Erwachsene', 'M', { gewicht: 141.5, kaempfe: 12, siege: 9, niederlagen: 3 }),
      () => boxer('SV Rheinkraft', 'Erwachsene', 'M', { kaempfe: 52, siege: 34, niederlagen: 17 }),
    ],
  },
  {
    name: 'Box-Team Südwest',
    profile: [...W('U15', 'U17', 'U19', 'Erwachsene'), ...M('Erwachsene')],
  },
  {
    name: 'TSV Falke',
    profile: [...M('U17', 'U17', 'U19'), ...W('U19')],
    sonder: [() => boxer('TSV Falke', 'Erwachsene', 'M', { gewicht: 44.5, kaempfe: 3, siege: 1, niederlagen: 2 })],
  },
  {
    name: 'BSC Adler',
    profile: [...M('Erwachsene', 'Erwachsene')],
    sonder: [
      () => boxer('BSC Adler', 'Erwachsene', 'M', { kaempfe: 41, siege: 31, niederlagen: 10 }),
      () => boxer('BSC Adler', 'Erwachsene', 'M', { kaempfe: 66, siege: 48, niederlagen: 18 }),
    ],
  },
  { name: 'Boxclub Hammer', profile: [...W('Erwachsene')], sonder: [() => boxer('Boxclub Hammer', 'Erwachsene', 'M', { gewicht: 118.2, kaempfe: 20, siege: 16, niederlagen: 4 })] },
  { name: 'FC Stahlfaust', profile: [...M('U19')] },
  {
    name: 'Boxfreunde Moor',
    profile: [...M('U13', 'U15', 'U17', 'U19', 'Erwachsene', 'Erwachsene'), ...W('U13', 'U19', 'Erwachsene')],
  },
];

const alle: Boxer[] = [];
for (const v of VEREINE) {
  for (const [ak, g] of v.profile) alle.push(boxer(v.name, ak, g));
  for (const s of v.sonder ?? []) alle.push(typeof s === 'function' ? s() : s);
}

writeFileSync(
  'testdaten/meldungen-simulation.json',
  JSON.stringify({ datum: DATUM, boxer: alle, kampfkarte: [] }, null, 2) + '\n',
);

const zeilen: string[] = [`# Simulierte Meldungen, Veranstaltung ${DATUM}`, ''];
for (const v of VEREINE) {
  const eigene = alle.filter((b) => b.verein === v.name);
  zeilen.push(`## ${v.name} (${eigene.length})`, '', '| Name | m/w | Geboren | Altersklasse | kg | Gewichtsklasse | K/S/N | Leistung |', '|---|---|---|---|---|---|---|---|');
  for (const b of eigene) {
    const i = boxerInfo(b, DATUM);
    zeilen.push(
      `| ${b.name} | ${b.geschlecht === 'M' ? 'm' : 'w'} | ${b.geburtsdatum.split('-').reverse().join('.')} | ${altersklasseText(i.altersklasse)} | ${b.gewicht} | ${gewichtsklasseText(i.gewichtsklasse)} | ${b.kaempfe}/${b.siege}/${b.niederlagen} | ${i.leistungsklasse ?? '–'} |`,
    );
  }
  zeilen.push('');
}
writeFileSync('testdaten/uebersicht.md', zeilen.join('\n'));
console.log(`${alle.length} Boxer, ${VEREINE.length} Vereine`);
