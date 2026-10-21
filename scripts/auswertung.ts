// Kurzauswertung einer Simulation: npx tsx scripts/auswertung.ts testdaten/meldungen-simulation.json
import { readFileSync } from 'node:fs';
import { erzeugePaarungen } from '../src/regeln/generator';
import type { Boxer } from '../src/regeln/typen';

const z = JSON.parse(readFileSync(process.argv[2], 'utf8')) as { datum: string; boxer: Boxer[] };
const e = erzeugePaarungen(z.boxer, z.datum);
const nach = (liste: string[]) => {
  const m = new Map<string, number>();
  for (const k of liste) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m].sort().map(([k, n]) => `${k}: ${n}`).join(', ');
};
console.log('Kämpfe je Altersklasse:', nach(e.paarungen.map((p) => p.altersklasse)));
console.log('Kämpfe je Leistungsklasse:', nach(e.paarungen.map((p) => p.leistungsklasse)));
console.log('Kämpfe Frauen/Männer:', nach(e.paarungen.map((p) => p.a.geschlecht)));
console.log('Wartegründe:', nach(e.warteliste.map((w) => w.grund)));
