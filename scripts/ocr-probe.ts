// Zeigt, was aus Texterkennungs-Ergebnissen (TSV) wird: npx tsx scripts/ocr-probe.ts src/importieren/fixtures/excel.tsv
import { readFileSync } from 'node:fs';
import { liesText } from '../src/importieren/lesen';
import { zeilenAusTsv } from '../src/importieren/ocrtext';

for (const datei of process.argv.slice(2)) {
  const text = zeilenAusTsv(readFileSync(datei, 'utf8'));
  console.log(`\n=== ${datei}\n${text.replace(/\t/g, ' ⇥ ')}`);
  const e = liesText(text, { heute: new Date(Date.UTC(2026, 9, 21)) });
  for (const z of e.zeilen) {
    console.log(
      '  →',
      [z.name, z.verein, z.geburtsdatum, z.geschlecht, z.gewicht, `${z.kaempfe}/${z.siege}/${z.niederlagen}`].join(' | '),
      z.hinweise.length ? `(${z.hinweise.join('; ')})` : '',
    );
  }
  if (e.ignoriert.length) console.log('  ignoriert:', e.ignoriert);
}
