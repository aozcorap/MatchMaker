// Erzeugt simulierte Meldungen (nur für Entwicklung, Ausgabe nicht einchecken): npx tsx scripts/simulation.ts
// Feste Zufallsbasis, damit das Ergebnis jedes Mal gleich ist. Alle Namen und Vereine sind erfunden.
import { writeFileSync } from 'node:fs';
import { erzeugePaarungen } from '../src/regeln/generator';
import { altersklasseText, boxerInfo, gewichtsklasseText } from '../src/regeln/info';
import type { Altersklasse, Boxer, Geschlecht } from '../src/regeln/typen';

const DATUM = '2026-11-14';
const SEED = Number(process.env.SEED ?? 3);

function zufall(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = zufall(SEED);
const zahl = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
const waehle = <T,>(liste: T[]) => liste[Math.floor(rng() * liste.length)];
/** Normalverteilung (Box-Muller), begrenzt auf [min, max] */
function normal(mittel: number, streuung: number, min: number, max: number): number {
  const wert = mittel + streuung * Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
  return Math.min(max, Math.max(min, wert));
}

const VORNAMEN_M = ['Jonas', 'Luca', 'Emre', 'Felix', 'Milan', 'Tobias', 'Dario', 'Kevin', 'Marek', 'Samir', 'Leon', 'Niko', 'Paul', 'Yusuf', 'Anton', 'Ben', 'Oskar', 'Rafael', 'Timo', 'Viktor', 'Elias', 'Noah', 'Malik', 'Jakob', 'Aaron', 'Mats', 'Bilal', 'Ruben'];
const VORNAMEN_W = ['Mia', 'Lena', 'Sara', 'Nora', 'Amira', 'Jana', 'Clara', 'Elif', 'Hanna', 'Ida', 'Maja', 'Selin', 'Tessa', 'Vera', 'Lara', 'Emilia', 'Nele', 'Zoe'];
const NACHNAMEN = ['Brandt', 'Keller', 'Yilmaz', 'Hartmann', 'Novak', 'Scholz', 'Ritter', 'Demir', 'Lorenz', 'Vogel', 'Kaiser', 'Petrov', 'Winter', 'Aydin', 'Roth', 'Becker', 'Sommer', 'Kovač', 'Franke', 'Güler', 'Lange', 'Huber', 'Engel', 'Marx', 'Stein', 'Wolf', 'Hahn', 'Bauer', 'Kraus', 'Jung', 'Fuchs', 'Berger', 'Albrecht', 'Schulte', 'Ziegler', 'Horn', 'Peters', 'Arnold', 'Dietrich', 'Otto'];

const JAHRGAENGE: Record<Altersklasse, [number, number]> = {
  U13: [2014, 2016],
  U15: [2012, 2013],
  U17: [2010, 2011],
  U19: [2008, 2009],
  Erwachsene: [1985, 2007],
};
// Mittelwert, Streuung, Grenzen je Altersklasse und Geschlecht
const GEWICHT: Record<Altersklasse, Record<Geschlecht, [number, number, number, number]>> = {
  U13: { M: [46, 6, 38.5, 62], W: [45, 6, 38.5, 60] },
  U15: { M: [54, 8, 40, 70], W: [52, 7, 40, 66] },
  U17: { M: [62, 9, 42, 82], W: [58, 8, 41, 72] },
  U19: { M: [68, 10, 49, 92], W: [62, 8, 46, 78] },
  Erwachsene: { M: [74, 11, 52, 105], W: [62, 8, 47, 84] },
};
const MAX_KAEMPFE: Record<Altersklasse, number> = { U13: 8, U15: 14, U17: 20, U19: 25, Erwachsene: 45 };

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
  const [mittel, streuung, min, max] = GEWICHT[ak][g];
  const gewicht = Math.round(normal(mittel, streuung, min, max) * 10) / 10;
  const kaempfe = Math.floor(MAX_KAEMPFE[ak] * Math.pow(rng(), 2.2));
  const siege = Math.round(kaempfe * (0.2 + rng() * 0.65));
  const rest = kaempfe - siege;
  const niederlagen = rest > 0 && rng() < 0.2 ? rest - 1 : rest;
  return {
    id: `sim-${String(laufnummer).padStart(3, '0')}`,
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

type Mix = Partial<Record<Altersklasse, number>>;
function ziehe(mix: Mix): Altersklasse {
  const eintraege = Object.entries(mix) as [Altersklasse, number][];
  let r = rng() * eintraege.reduce((s, [, w]) => s + w, 0);
  for (const [ak, w] of eintraege) {
    r -= w;
    if (r <= 0) return ak;
  }
  return eintraege[0][0];
}

const ALLE: Mix = { U13: 1, U15: 1, U17: 1.2, U19: 1, Erwachsene: 2.5 };

interface Verein {
  name: string;
  anzahl: number;
  mix: Mix;
  frauen: number;
  sonder?: (() => Boxer)[];
}

const VEREINE: Verein[] = [
  { name: 'BC Nordstern', anzahl: 9, mix: ALLE, frauen: 0.25 },
  { name: 'Boxring Eiche', anzahl: 8, mix: { U13: 3, U15: 3, U17: 2.5, U19: 1, Erwachsene: 0.5 }, frauen: 0.3,
    sonder: [() => boxer('Boxring Eiche', 'U13', 'M', { geburtsdatum: '2017-03-12', gewicht: 33, kaempfe: 0, siege: 0, niederlagen: 0 })] },
  { name: 'SV Rheinkraft', anzahl: 8, mix: { U17: 2, U19: 2.5, Erwachsene: 5.5 }, frauen: 0.1,
    sonder: [
      () => boxer('SV Rheinkraft', 'Erwachsene', 'M', { gewicht: 141.5, kaempfe: 12, siege: 9, niederlagen: 3 }),
      () => boxer('SV Rheinkraft', 'Erwachsene', 'M', { kaempfe: 52, siege: 34, niederlagen: 17 }),
    ] },
  { name: 'Box-Team Südwest', anzahl: 7, mix: ALLE, frauen: 0.6 },
  { name: 'TSV Falke', anzahl: 7, mix: { U15: 1, U17: 3.5, U19: 3.5, Erwachsene: 3 }, frauen: 0.2,
    sonder: [() => boxer('TSV Falke', 'Erwachsene', 'M', { gewicht: 44.5, kaempfe: 3, siege: 1, niederlagen: 2 })] },
  { name: 'BSC Adler', anzahl: 6, mix: { U19: 2, Erwachsene: 8 }, frauen: 0.1,
    sonder: [
      () => boxer('BSC Adler', 'Erwachsene', 'M', { kaempfe: 41, siege: 31, niederlagen: 10 }),
      () => boxer('BSC Adler', 'Erwachsene', 'M', { kaempfe: 66, siege: 48, niederlagen: 18 }),
    ] },
  { name: 'Boxclub Hammer', anzahl: 5, mix: ALLE, frauen: 0.3,
    sonder: [() => boxer('Boxclub Hammer', 'Erwachsene', 'M', { gewicht: 118.2, kaempfe: 20, siege: 16, niederlagen: 4 })] },
  { name: 'FC Stahlfaust', anzahl: 2, mix: { U19: 1 }, frauen: 0 },
  { name: 'Boxfreunde Moor', anzahl: 7, mix: ALLE, frauen: 0.35 },
  { name: 'SG Seehafen', anzahl: 6, mix: { U13: 1, U15: 3, U17: 3, U19: 1.5, Erwachsene: 1 }, frauen: 0.25 },
  { name: 'Boxschule Linde', anzahl: 5, mix: { U13: 4, U15: 3, U17: 1 }, frauen: 0.4 },
  { name: 'TuS Waldkamp', anzahl: 5, mix: { U19: 1.5, Erwachsene: 4.5 }, frauen: 0.2 },
  { name: 'BC Eisenwerk', anzahl: 5, mix: { U17: 1, U19: 2, Erwachsene: 4 }, frauen: 0.15 },
  { name: 'Boxverein Morgenrot', anzahl: 3, mix: ALLE, frauen: 0.75 },
];

const alle: Boxer[] = [];
for (const v of VEREINE) {
  for (let i = 0; i < v.anzahl; i++) alle.push(boxer(v.name, ziehe(v.mix), rng() < v.frauen ? 'W' : 'M'));
  for (const s of v.sonder ?? []) alle.push(s());
}

const ergebnis = erzeugePaarungen(alle, DATUM);
const ausgabe = process.env.NUR_ZAEHLEN
  ? null
  : { datum: DATUM, beginn: '14:00', boxer: alle, kampfkarte: [], ausfaelle: {} };

if (ausgabe) {
  writeFileSync('testdaten/meldungen-simulation.json', JSON.stringify(ausgabe, null, 2) + '\n');
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
}
console.log(`Seed ${SEED}: ${alle.length} Boxer, ${VEREINE.length} Vereine, ${ergebnis.paarungen.length} Paarungen, ${ergebnis.warteliste.length} Wartende, ${ergebnis.freigabeVorschlaege.length} Freigabe-Vorschläge`);
