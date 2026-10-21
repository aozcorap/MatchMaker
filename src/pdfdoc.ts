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
const LINIE = '#b8b3aa';
const ROT_FLAECHE = '#fbeceb';
const BLAU_FLAECHE = '#e8eef9';

const zahl = (n: number) => String(n).replace('.', ',');

/** Spaltenbreiten, gemeinsam für Kopfzeile, Kämpfe und Pausen (Querformat A4, 28 pt Rand). */
const BREITEN = [20, 34, 74, '*', 104, 70, '*', 104, 70];

const RASTER = {
  hLineWidth: (i: number) => (i === 1 ? 0.5 : 0),
  vLineWidth: () => 0.5,
  hLineColor: () => LINIE,
  vLineColor: () => LINIE,
};

function zelle(text: string, extra: Record<string, unknown> = {}): Content {
  return { text, margin: [3, 1.5, 3, 1.5], ...extra } as Content;
}

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
            margin: [0, 2, 0, 2],
          },
        ],
      ],
    },
    layout: 'noBorders',
    margin: [0, 2, 0, 2],
  };
}

function kampfZeile(k: PdfKampf): Content {
  const ecke = (b: PdfBoxer, flaeche: string): Content[] => [
    zelle(b.name, { bold: true, fillColor: flaeche }),
    zelle(b.verein || '–', { color: '#555555', fillColor: flaeche, fontSize: 8 }),
    zelle(b.klassen, { fillColor: flaeche, fontSize: 7.5 }),
  ];
  return {
    table: {
      widths: BREITEN,
      dontBreakRows: true,
      body: [
        [
          zelle(String(k.nr), { bold: true, alignment: 'center' }),
          zelle(k.start, { bold: true }),
          zelle(`${k.altersklasse} · ${k.runden}×${zahl(k.minuten)}`, { fontSize: 7.5 }),
          ...ecke(k.rot, ROT_FLAECHE),
          ...ecke(k.blau, BLAU_FLAECHE),
        ],
      ],
    },
    layout: RASTER,
  };
}

function kopfZeile(): Content {
  const kopf = (text: string, extra: Record<string, unknown> = {}) =>
    zelle(text, { bold: true, fontSize: 7.5, fillColor: GRAU, ...extra });
  return {
    table: {
      widths: BREITEN,
      body: [
        [
          kopf('Nr.', { alignment: 'center' }),
          kopf('Uhr'),
          kopf('Klasse · Runden'),
          kopf('ROTE ECKE', { color: ROT, colSpan: 3 }),
          {},
          {},
          kopf('BLAUE ECKE', { color: BLAU, colSpan: 3 }),
          {},
          {},
        ],
      ],
    },
    layout: { ...RASTER, hLineWidth: () => 0.5 },
  };
}

/** Kampfkarte als Dokumentbeschreibung: Querformat, eine Zeile je Kampf, Kopfzeile auf jeder Seite. Jeder Kampf bleibt mit den Pausen davor auf einer Seite. */
export function baueKampfkartePdf(karte: PdfKarte): TDocumentDefinitions {
  const inhalt: Content[] = karte.kaempfe.map((k) => ({
    unbreakable: true,
    stack: [...k.pausenDavor.map(pauseBlock), kampfZeile(k)],
  }));
  const kampfWort = karte.kaempfe.length === 1 ? 'Kampf' : 'Kämpfe';
  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [28, 54, 28, 30],
    defaultStyle: { font: 'Roboto', fontSize: 9 },
    info: { title: `${karte.titel} ${karte.datum}` },
    header: {
      margin: [28, 14, 28, 0],
      stack: [
        {
          text: [
            { text: karte.titel, bold: true, fontSize: 12 },
            {
              text: `   ${karte.datum}  ·  Beginn ${karte.beginn} Uhr  ·  Ende ca. ${karte.ende} Uhr  ·  ${karte.kaempfe.length} ${kampfWort}`,
              color: '#555555',
            },
          ],
          margin: [0, 0, 0, 4],
        },
        kopfZeile(),
      ],
    },
    content: inhalt,
    footer: (seite: number, gesamt: number) => ({
      text: `Seite ${seite} von ${gesamt}  ·  Zeiten voraussichtlich, Änderungen vorbehalten`,
      alignment: 'center',
      fontSize: 7,
      color: '#777777',
      margin: [0, 10, 0, 0],
    }),
  };
}
