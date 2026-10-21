import { zeilenAusTsv } from './ocrtext';

type Erkenner = import('tesseract.js').Worker;

let erkenner: Promise<Erkenner> | null = null;

/** Pfad einer Datei der Texterkennung, die zusammen mit der Seite ausgeliefert wird. */
function ocrPfad(datei: string): string {
  return new URL(`ocr/${datei}`, document.baseURI).href;
}

function holeErkenner(): Promise<Erkenner> {
  if (!erkenner) {
    erkenner = (async () => {
      const { createWorker, PSM } = await import('tesseract.js');
      const w = await createWorker('deu', 1, {
        workerPath: ocrPfad('worker.min.js'),
        corePath: ocrPfad('tesseract-core-simd-lstm.wasm.js'),
        langPath: ocrPfad('').replace(/\/$/, ''),
        gzip: true,
      });
      await w.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
      return w;
    })().catch((fehler) => {
      erkenner = null;
      throw fehler;
    });
  }
  return erkenner;
}

/** Kleine Screenshots werden vergrößert, das verbessert das Lesen kleiner Schrift deutlich. */
async function vorbereiten(bild: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(bild);
  const faktor = bitmap.width < 1000 ? 2 : 1;
  if (faktor === 1) {
    bitmap.close();
    return bild;
  }
  const leinwand = document.createElement('canvas');
  leinwand.width = bitmap.width * faktor;
  leinwand.height = bitmap.height * faktor;
  const stift = leinwand.getContext('2d')!;
  stift.imageSmoothingQuality = 'high';
  stift.drawImage(bitmap, 0, 0, leinwand.width, leinwand.height);
  bitmap.close();
  return new Promise((ok, fehler) =>
    leinwand.toBlob((b) => (b ? ok(b) : fehler(new Error('Bild konnte nicht vorbereitet werden'))), 'image/png'),
  );
}

/** Liest den Text eines Screenshots; Tabellenspalten bleiben als Tabulatoren erhalten. Läuft vollständig im Browser. */
export async function erkenneBild(
  bild: Blob,
  meldeStatus: (text: string) => void = () => {},
): Promise<string> {
  meldeStatus('Erkennungsmodul wird geladen (einmalig, ca. 5 MB) …');
  const w = await holeErkenner();
  meldeStatus('Text wird erkannt …');
  const { data } = await w.recognize(await vorbereiten(bild), {}, { text: true, tsv: true });
  return zeilenAusTsv(data.tsv ?? '');
}
