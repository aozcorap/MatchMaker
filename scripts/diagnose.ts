// Prüft den Generator gegen eine Gesamtlösung: npx tsx scripts/diagnose.ts testdaten/meldungen-simulation.json
import { readFileSync } from 'node:fs';
import { erzeugePaarungen } from '../src/regeln/generator';
import { pruefePaarung } from '../src/regeln/paarung';
import type { Boxer } from '../src/regeln/typen';

const z = JSON.parse(readFileSync(process.argv[2], 'utf8')) as { datum: string; boxer: Boxer[] };
const boxer = z.boxer;
const kanten: [number, number][] = [];
for (let i = 0; i < boxer.length; i++)
  for (let j = i + 1; j < boxer.length; j++)
    if (pruefePaarung(boxer[i], boxer[j], z.datum).status === 'ok') kanten.push([i, j]);

// Größtmögliche Zahl Kämpfe: je Boxer entweder ohne Kampf oder mit einem Nachbarn, mit Zwischenspeicher
const nachbarn = new Map<number, number[]>();
for (const [a, b] of kanten) {
  nachbarn.set(a, [...(nachbarn.get(a) ?? []), b]);
  nachbarn.set(b, [...(nachbarn.get(b) ?? []), a]);
}
const knoten = [...nachbarn.keys()].sort((x, y) => x - y);
const speicher = new Map<string, number>();
function maximum(frei: number[]): number {
  if (frei.length < 2) return 0;
  const schluessel = frei.join(',');
  const bekannt = speicher.get(schluessel);
  if (bekannt !== undefined) return bekannt;
  const [v, ...rest] = frei;
  let beste = maximum(rest);
  for (const n of nachbarn.get(v) ?? []) {
    if (rest.includes(n)) beste = Math.max(beste, 1 + maximum(rest.filter((x) => x !== n)));
  }
  speicher.set(schluessel, beste);
  return beste;
}

const ergebnis = erzeugePaarungen(boxer, z.datum);
console.log(`Erlaubte Paarungen insgesamt: ${kanten.length}`);
console.log(`Generator: ${ergebnis.paarungen.length} Kämpfe, Gesamtoptimum: ${maximum(knoten)} Kämpfe`);

console.log('\nWartende: nächstliegender Gegner gleichen Geschlechts und warum er nicht passt');
for (const w of ergebnis.warteliste) {
  const naechster = boxer
    .filter((b) => b.id !== w.boxer.id && b.geschlecht === w.boxer.geschlecht)
    .sort((x, y) => Math.abs(x.gewicht - w.boxer.gewicht) - Math.abs(y.gewicht - w.boxer.gewicht))[0];
  if (!naechster) continue;
  const p = pruefePaarung(w.boxer, naechster, z.datum);
  console.log(
    `- ${w.boxer.name} (${w.boxer.gewicht} kg) ~ ${naechster.name} (${naechster.gewicht} kg): ${p.status === 'ok' ? 'passt, aber vergeben' : p.gruende.join('; ')}`,
  );
}
