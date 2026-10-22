import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';

export interface PdfBoxer {
  name: string;
  verein: string;
  /** z. B. "U13 · 46–48 kg" */
  klassen: string;
}

export interface PdfKampf {
  nr: number;
  start: string;
  altersklasse: string;
  runden: number;
  minuten: number;
  rot: PdfBoxer;
  blau: PdfBoxer;
  /** Pausen unmittelbar vor diesem Kampf */
  pausenDavor: { text: string; von: string; bis: string; minuten: number }[];
}

export interface PdfKarte {
  titel: string;
  datum: string;
  beginn: string;
  ende: string;
  kaempfe: PdfKampf[];
}

const ROT = '#b3261e';
const BLAU = '#1d4ea0';
const GRAU = '#e6e3de';

const zahl = (n: number) => String(n).replace('.', ',');

function pauseBlock(p: PdfKampf['pausenDavor'][number]): Content {
  return {
    table: {
      widths: ['*'],
      body: [
        [
          {
            text: `${p.text}   ${p.von} – ${p.bis} Uhr (${p.minuten} Min.)`,
            alignment: 'center',
            italics: true,
            fillColor: GRAU,
            margin: [0, 4, 0, 4],
          },
        ],
      ],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 6],
  };
}

function eckenZelle(farbe: string, label: string, b: PdfBoxer): Content {
  return {
    stack: [
      { text: label, bold: true, fontSize: 8, color: farbe, characterSpacing: 0.6 },
      { text: b.name, bold: true, fontSize: 12, margin: [0, 2, 0, 0] },
      { text: b.verein || '–', fontSize: 10, color: '#555555' },
      { text: b.klassen, fontSize: 10, margin: [0, 2, 0, 0] },
    ],
    margin: [6, 5, 6, 5],
  };
}

function kampfBlock(k: PdfKampf): Content {
  return {
    table: {
      widths: ['*', '*'],
      body: [
        [
          {
            colSpan: 2,
            fillColor: GRAU,
            margin: [6, 3, 6, 3],
            columns: [
              { text: `Kampf ${k.nr}`, bold: true, width: 'auto' },
              { text: `ca. ${k.start} Uhr`, bold: true, margin: [14, 0, 0, 0], width: 'auto' },
              {
                text: `${k.altersklasse}  ·  ${k.runden} × ${zahl(k.minuten)} Min.`,
                alignment: 'right',
                width: '*',
              },
            ],
          },
          {},
        ],
        [eckenZelle(ROT, 'ROTE ECKE', k.rot), eckenZelle(BLAU, 'BLAUE ECKE', k.blau)],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: (i: number) => (i === 1 ? 0.5 : 0.5),
      hLineColor: () => '#b8b3aa',
      vLineColor: () => '#b8b3aa',
    },
    margin: [0, 0, 0, 8],
  };
}

/** Kampfpaarungen als Dokumentbeschreibung. Jeder Kampf (mit den Pausen davor) bleibt auf einer Seite zusammen. */
export function baueKampfkartePdf(karte: PdfKarte): TDocumentDefinitions {
  const inhalt: Content[] = [
    { text: karte.titel, fontSize: 20, bold: true },
    {
      text: `${karte.datum}  ·  Beginn ${karte.beginn} Uhr  ·  Ende ca. ${karte.ende} Uhr  ·  ${karte.kaempfe.length} ${
        karte.kaempfe.length === 1 ? 'Kampf' : 'Kämpfe'
      }`,
      color: '#555555',
      margin: [0, 2, 0, 14],
    },
  ];
  for (const k of karte.kaempfe) {
    inhalt.push({ unbreakable: true, stack: [...k.pausenDavor.map(pauseBlock), kampfBlock(k)] });
  }
  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 50],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    info: { title: `${karte.titel} ${karte.datum}` },
    content: inhalt,
    footer: (seite: number, gesamt: number) => ({
      text: `Seite ${seite} von ${gesamt}  ·  Zeiten voraussichtlich, Änderungen vorbehalten`,
      alignment: 'center',
      fontSize: 8,
      color: '#777777',
      margin: [0, 18, 0, 0],
    }),
  };
}
