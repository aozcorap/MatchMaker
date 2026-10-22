/** Einzelne Angaben aus freiem Text oder Tabellenzellen erkennen. */

export type Zelle = string | number | boolean | Date | null | undefined;

export function alsText(z: Zelle): string {
  if (z === null || z === undefined) return '';
  if (z instanceof Date) return isoDatum(z.getUTCFullYear(), z.getUTCMonth() + 1, z.getUTCDate());
  return String(z).trim();
}

function isoDatum(j: number, m: number, t: number): string {
  return `${String(j).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(t).padStart(2, '0')}`;
}

function istKalenderdatum(j: number, m: number, t: number): boolean {
  const d = new Date(Date.UTC(j, m - 1, t));
  return d.getUTCFullYear() === j && d.getUTCMonth() === m - 1 && d.getUTCDate() === t;
}

/** Plausibles Geburtsjahr eines Boxers: mindestens 9 Jahre, höchstens 90 Jahre alt. */
function plausibel(j: number, heute: Date): boolean {
  const jahr = heute.getUTCFullYear();
  return j >= jahr - 90 && j <= jahr - 9;
}

const DATUM_PUNKT = /(\d{1,2})\s?\.\s?(\d{1,2})\s?\.\s?(\d{4}|\d{2})(?!\d)/;
const DATUM_ISO = /(\d{4})-(\d{2})-(\d{2})/;
const DATUM_SCHRAEG = /(\d{1,2})\/(\d{1,2})\/(\d{4})(?!\d)/;

export interface DatumTreffer {
  iso: string | null;
  /** Der gefundene Text, damit er aus dem Rest entfernt werden kann */
  text: string;
}

/** Findet ein Datum in der Form TT.MM.JJJJ, TT.MM.JJ, JJJJ-MM-TT oder TT/MM/JJJJ; Excel-Datumswerte kommen als Date. */
export function findeDatum(eingabe: Zelle, heute: Date = new Date()): DatumTreffer | null {
  if (eingabe instanceof Date) {
    const iso = alsText(eingabe);
    return { iso: plausibel(eingabe.getUTCFullYear(), heute) ? iso : null, text: iso };
  }
  const s = alsText(eingabe);
  let j: number;
  let m: number;
  let t: number;
  let treffer: RegExpExecArray | null;
  if ((treffer = DATUM_ISO.exec(s))) {
    [j, m, t] = [Number(treffer[1]), Number(treffer[2]), Number(treffer[3])];
  } else if ((treffer = DATUM_PUNKT.exec(s)) || (treffer = DATUM_SCHRAEG.exec(s))) {
    t = Number(treffer[1]);
    m = Number(treffer[2]);
    j = Number(treffer[3]);
    if (treffer[3].length === 2) {
      // Zweistellig: ein Boxer ist mindestens 9 Jahre alt, daher liegt die Grenze bei Jahr - 9
      const grenze = (heute.getUTCFullYear() - 9) % 100;
      j += j <= grenze ? 2000 : 1900;
    }
  } else {
    return null;
  }
  const ok = istKalenderdatum(j, m, t) && plausibel(j, heute);
  return { iso: ok ? isoDatum(j, m, t) : null, text: treffer[0] };
}

/** "w65 kg", "W 65kg", "m72": Geschlechtsbuchstabe und Gewicht zusammen. */
export function geschlechtMitGewicht(eingabe: Zelle): { geschlecht: 'M' | 'W'; gewicht: number } | null {
  const m = /^([wWmM])\s*(\d{2,3}(?:[.,]\d{1,2})?)\s*(?:kg)?$/.exec(alsText(eingabe));
  return m ? { geschlecht: m[1].toLowerCase() === 'w' ? 'W' : 'M', gewicht: Number(m[2].replace(',', '.')) } : null;
}

/** Gewicht in kg: "72,5 kg", "72.5kg" oder nur die Zahl. */
export function parseGewicht(eingabe: Zelle): number | null {
  if (typeof eingabe === 'number') return Number.isFinite(eingabe) ? eingabe : null;
  const m = /^(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:kg)?$/i.exec(alsText(eingabe));
  return m ? Number(m[1].replace(',', '.')) : null;
}

export function parseZahl(eingabe: Zelle): number | null {
  if (typeof eingabe === 'number') return Number.isInteger(eingabe) && eingabe >= 0 ? eingabe : null;
  const s = alsText(eingabe);
  return /^\d+$/.test(s) ? Number(s) : null;
}

const MAENNLICH = new Set(['m', 'männlich', 'maennlich', 'mann', 'männer', 'herr', 'herren', 'junge']);
const WEIBLICH = new Set(['w', 'weiblich', 'frau', 'frauen', 'damen', 'dame', 'f', 'mädchen']);

/** Nur eindeutige Angaben; vom Namen wird nie auf das Geschlecht geschlossen. */
export function parseGeschlecht(eingabe: Zelle): 'M' | 'W' | null {
  const s = alsText(eingabe).toLowerCase().replace(/\.$/, '');
  if (MAENNLICH.has(s)) return 'M';
  if (WEIBLICH.has(s)) return 'W';
  return null;
}

export interface Bilanz {
  kaempfe?: number;
  siege?: number;
  niederlagen?: number;
  unentschieden?: number;
  /** Kämpfe wurden aus Siegen und Niederlagen berechnet */
  berechnet?: boolean;
}

export interface BilanzTreffer extends Bilanz {
  /** Rest des Textes ohne die erkannten Angaben */
  rest: string;
}

function entferne(s: string, m: RegExpExecArray): string {
  return `${s.slice(0, m.index)} ${s.slice(m.index + m[0].length)}`;
}

/**
 * Kampfbilanz in den Formen "10/7/3" (Kämpfe/Siege/Niederlagen), "10 Kämpfe 7 Siege 3 Niederlagen",
 * "10K 7S 3N" oder, nur mit dem Wort "Bilanz", "7-3" (Siege-Niederlagen).
 */
export function findeBilanz(eingabe: string): BilanzTreffer | null {
  let rest = eingabe;
  const ergebnis: Bilanz = {};
  let gefunden = false;

  const dreifach = /(?<![\d.,])(\d{1,3})\s*[/-]\s*(\d{1,3})\s*[/-]\s*(\d{1,3})(?![\d.,])/.exec(rest);
  if (dreifach && !DATUM_PUNKT.test(dreifach[0])) {
    ergebnis.kaempfe = Number(dreifach[1]);
    ergebnis.siege = Number(dreifach[2]);
    ergebnis.niederlagen = Number(dreifach[3]);
    rest = entferne(rest, dreifach);
    gefunden = true;
  } else {
    const muster: [keyof Bilanz, RegExp[]][] = [
      ['kaempfe', [/(\d+)\s*(?:kämpfe|kaempfe|kampf|k)(?![\p{L}\d])/iu, /(?:kämpfe|kaempfe|kampf)\p{L}*\s*[:=]?\s*(\d+)/iu]],
      ['siege', [/(\d+)\s*(?:siege|sieg|s)(?![\p{L}\d])/iu, /(?:siege|sieg)\p{L}*\s*[:=]?\s*(\d+)/iu]],
      ['niederlagen', [/(\d+)\s*(?:niederlagen|niederlage|verloren|n)(?![\p{L}\d])/iu, /(?:niederlagen|niederlage|verloren)\s*[:=]?\s*(\d+)/iu]],
      ['unentschieden', [/(\d+)\s*(?:unentschieden|unent|remis|u)(?![\p{L}\d])/iu, /(?:unentschieden|unent|remis)\s*[:=]?\s*(\d+)/iu]],
    ];
    for (const [feld, regexe] of muster) {
      for (const re of regexe) {
        const m = re.exec(rest);
        if (m) {
          (ergebnis as Record<string, number>)[feld] = Number(m[1]);
          rest = entferne(rest, m);
          gefunden = true;
          break;
        }
      }
    }
    if (!gefunden) {
      const zwei = /bilanz\s*[:=]?\s*(\d{1,3})\s*[-:]\s*(\d{1,3})(?![\d.,])/i.exec(rest);
      if (zwei) {
        ergebnis.siege = Number(zwei[1]);
        ergebnis.niederlagen = Number(zwei[2]);
        rest = entferne(rest, zwei);
        gefunden = true;
      }
    }
  }
  if (!gefunden) return null;
  if (ergebnis.kaempfe === undefined && ergebnis.siege !== undefined && ergebnis.niederlagen !== undefined) {
    ergebnis.kaempfe = ergebnis.siege + ergebnis.niederlagen;
    ergebnis.berechnet = true;
  }
  return { ...ergebnis, rest: rest.replace(/\bbilanz\b\s*[:=]?/i, ' ') };
}
