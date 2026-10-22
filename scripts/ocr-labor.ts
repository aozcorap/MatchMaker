// Probiert Bildaufbereitung und Texterkennung an PNG-Dateien aus (nutzt dieselben Schritte wie die App):
//   npx tsx scripts/ocr-labor.ts bild1.png bild2.png ...
// Umgebungsvariable KONFIG wählt die Einstellung der Texterkennung (siehe unten).
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { createWorker } from 'tesseract.js';
import { entferneTabellenlinien, vergroessern, type Raster } from '../src/importieren/bildaufbereitung';
import { liesText } from '../src/importieren/lesen';
import { bewerteText, DURCHGAENGE, vergroesserungsfaktor } from '../src/importieren/ocrbewertung';
import { zeilenAusTsv } from '../src/importieren/ocrtext';

const worker = await createWorker('deu', 1, {
  langPath: 'node_modules/@tesseract.js-data/deu/4.0.0_best_int',
  gzip: true,
  cachePath: '/tmp/ocr-cache',
});
const heute = new Date(Date.UTC(2026, 9, 21));

for (const datei of process.argv.slice(2)) {
  const png = PNG.sync.read(readFileSync(datei));
  const original: Raster = { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
  const faktor = process.env.FAKTOR ? Number(process.env.FAKTOR) : vergroesserungsfaktor(original.width);
  const roh = vergroessern(original, faktor);
  const ohneLinien = entferneTabellenlinien(roh, faktor);
  const farbHell = entferneTabellenlinien(roh, faktor, true);
  console.log(`\n=== ${datei.split('/').pop()}  (${original.width}x${original.height}, Faktor ${faktor})`);
  let beste = { text: '', punkte: -Infinity, nr: 0 };
  for (const [i, d] of DURCHGAENGE.entries()) {
    const bild = d.farbflaechenHell ? farbHell : d.linienEntfernen ? ohneLinien : roh;
    const aus = new PNG({ width: bild.width, height: bild.height });
    aus.data = Buffer.from(bild.data);
    writeFileSync('/tmp/labor-bild.png', PNG.sync.write(aus));
    await worker.setParameters({ tessedit_pageseg_mode: '6', ...d.parameter } as never);
    const { data } = await worker.recognize('/tmp/labor-bild.png', {}, { text: true, tsv: true });
    const text = zeilenAusTsv(data.tsv ?? '');
    const punkte = bewerteText(text, heute);
    console.log(`  Durchgang ${i + 1} (${d.linienEntfernen ? 'ohne Linien' : 'roh'}, Schwellwert ${d.parameter.thresholding_method}): ${punkte} Punkte`);
    if (punkte > beste.punkte) beste = { text, punkte, nr: i + 1 };
  }
  console.log(`  → gewählt: Durchgang ${beste.nr} mit ${beste.punkte} Punkten`);
  if (!process.env.KURZ) console.log(beste.text.replace(/\t/g, ' ⇥ ').split('\n').map((z) => '    ' + z).join('\n'));
  const e = liesText(beste.text, { heute });
  for (const z of e.zeilen) {
    console.log('  →', [z.name, z.verein, z.geburtsdatum, z.geschlecht, z.gewicht, `${z.kaempfe}/${z.siege}/${z.niederlagen}`].join(' | '), z.hinweise.length ? `(${z.hinweise.join('; ')})` : '');
  }
}
await worker.terminate();
