import { entferneTabellenlinien, vergroessern, type Raster } from './bildaufbereitung';
import { bewerteText, DURCHGAENGE, vergroesserungsfaktor } from './ocrbewertung';
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
      const { createWorker } = await import('tesseract.js');
      return createWorker('deu', 1, {
        workerPath: ocrPfad('worker.min.js'),
        corePath: ocrPfad('tesseract-core-relaxedsimd-lstm.wasm.js'),
        langPath: ocrPfad('').replace(/\/$/, ''),
        gzip: true,
      });
    })().catch((fehler) => {
      erkenner = null;
      throw fehler;
    });
  }
  return erkenner;
}

/** Pixel des Bildes in Originalgröße, ohne dass der Browser etwas umrechnet. */
function alsRaster(bitmap: ImageBitmap): Raster {
  const leinwand = document.createElement('canvas');
  leinwand.width = bitmap.width;
  leinwand.height = bitmap.height;
  const stift = leinwand.getContext('2d', { willReadFrequently: true })!;
  stift.fillStyle = '#fff';
  stift.fillRect(0, 0, leinwand.width, leinwand.height);
  stift.drawImage(bitmap, 0, 0);
  const daten = stift.getImageData(0, 0, leinwand.width, leinwand.height);
  return { data: daten.data, width: daten.width, height: daten.height };
}

function alsBlob(r: Raster): Promise<Blob> {
  const leinwand = document.createElement('canvas');
  leinwand.width = r.width;
  leinwand.height = r.height;
  leinwand.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(r.data), r.width, r.height), 0, 0);
  return new Promise((ok, fehler) =>
    leinwand.toBlob((b) => (b ? ok(b) : fehler(new Error('Bild konnte nicht vorbereitet werden'))), 'image/png'),
  );
}

/**
 * Liest den Text eines Screenshots. Weil kein einzelner Einstellungssatz für alle Bilder passt (farbige Kopfzeilen,
 * Tabellenlinien, Chatblasen), werden mehrere Durchgänge versucht und der mit den meisten vollständigen
 * Boxerzeilen vorn einsortiert. Tabellenspalten bleiben als Tabulatoren erhalten. Läuft vollständig im Browser.
 */
export async function erkenneBild(
  bild: Blob,
  meldeStatus: (text: string) => void = () => {},
  protokoll?: (durchgang: { nr: number; punkte: number; text: string; bild: Blob }) => void,
): Promise<string[]> {
  meldeStatus('Erkennungsmodul wird geladen (einmalig, ca. 5 MB) …');
  const [{ PSM }, w, bitmap] = await Promise.all([import('tesseract.js'), holeErkenner(), createImageBitmap(bild, { colorSpaceConversion: 'none' })]);
  const faktor = vergroesserungsfaktor(bitmap.width);
  const roh = vergroessern(alsRaster(bitmap), faktor);
  bitmap.close();
  const ohneLinien = entferneTabellenlinien(roh, faktor);
  const blobs = new Map<boolean, Blob>();

  const ergebnisse: { text: string; punkte: number }[] = [];
  for (const [i, durchgang] of DURCHGAENGE.entries()) {
    meldeStatus(`Text wird erkannt (Durchgang ${i + 1} von ${DURCHGAENGE.length}) …`);
    if (!blobs.has(durchgang.linienEntfernen)) {
      blobs.set(durchgang.linienEntfernen, await alsBlob(durchgang.linienEntfernen ? ohneLinien : roh));
    }
    await w.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, ...durchgang.parameter } as never);
    const { data } = await w.recognize(blobs.get(durchgang.linienEntfernen)!, {}, { text: true, tsv: true });
    const text = zeilenAusTsv(data.tsv ?? '');
    const punkte = bewerteText(text);
    protokoll?.({ nr: i + 1, punkte, text, bild: blobs.get(durchgang.linienEntfernen)! });
    ergebnisse.push({ text, punkte });
  }
  // Bester Durchgang zuerst, die übrigen dahinter
  return ergebnisse.sort((a, b) => b.punkte - a.punkte).map((e) => e.text);
}
