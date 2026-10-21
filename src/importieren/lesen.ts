import {
  alsText,
  findeBilanz,
  findeDatum,
  parseGeschlecht,
  parseGewicht,
  parseZahl,
  type Zelle,
} from './felder';
import type { ImportZeile, LeseErgebnis } from './typen';

export interface LeseOptionen {
  /** Verein für Zeilen, die keinen angeben */
  standardVerein?: string;
  heute?: Date;
}

export type Feld =
  | 'name'
  | 'nameverein'
  | 'vorname'
  | 'nachname'
  | 'verein'
  | 'geburtsdatum'
  | 'jahrgang'
  | 'geschlecht'
  | 'gewicht'
  | 'kaempfe'
  | 'siege'
  | 'niederlagen'
  | 'bilanz'
  | 'ignoriert';

/** Spaltenüberschriften, wie Trainer sie tatsächlich schreiben: klein, ohne Umlaute und Satzzeichen. */
const SYNONYME: Record<Feld, string[]> = {
  name: ['name', 'boxer', 'boxerin', 'sportler', 'sportlerin', 'athlet', 'kaempfer', 'teilnehmer', 'vollername'],
  nameverein: ['nameverein', 'namevereinteam', 'boxervereinen'],
  vorname: ['vorname'],
  nachname: ['nachname', 'familienname'],
  verein: ['verein', 'club', 'team', 'vereinsname', 'boxverein'],
  geburtsdatum: ['geburtsdatum', 'geb', 'jeb', 'gebdatum', 'gebdat', 'geburtstag', 'geboren', 'gebam', 'geburtsdatumttmmjjjj'],
  jahrgang: ['jahrgang', 'jg', 'geburtsjahr'],
  geschlecht: ['geschlecht', 'mw', 'mf', 'sex', 'gender', 'gesch'],
  gewicht: ['gewicht', 'kg', 'gewichtkg', 'koerpergewicht', 'wiegegewicht', 'meldegewicht', 'aktuellesgewicht'],
  kaempfe: ['kaempfe', 'kampfzahl', 'anzahlkaempfe', 'kaempfegesamt', 'gesamtkaempfe', 'kaempfeanzahl', 'k', 'kampf'],
  // "ss" und "jeb": typische Lesefehler der Texterkennung für "S" und "geb."
  siege: ['siege', 'sieg', 'gewonnen', 's', 'gew', 'ss'],
  niederlagen: ['niederlagen', 'niederlage', 'verloren', 'n', 'verl'],
  bilanz: ['bilanz', 'kampfbilanz', 'bilanzksn', 'bilanzsn'],
  // Spalten, die vorkommen, aber nicht gebraucht werden (Alter wird aus dem Geburtsdatum berechnet)
  ignoriert: ['alter', 'u', 'unentschieden', 'remis', 'nr', 'lfdnr', 'startnr', 'bemerkung', 'bemerkungen', 'anmerkung'],
};

function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

export function erkenneFeld(ueberschrift: Zelle): Feld | null {
  const n = normalisiere(alsText(ueberschrift));
  if (!n) return null;
  for (const [feld, liste] of Object.entries(SYNONYME) as [Feld, string[]][]) {
    if (liste.includes(n)) return feld;
  }
  return null;
}

/** Erste Zeile (unter den ersten zehn), die mindestens zwei bekannte Überschriften samt einem Namensfeld enthält. */
function findeKopfzeile(zeilen: Zelle[][]): { index: number; spalten: (Feld | null)[] } | null {
  for (let i = 0; i < Math.min(zeilen.length, 10); i++) {
    const spalten = zeilen[i].map(erkenneFeld);
    // "K ? N": eine unlesbare Spalte zwischen Kämpfen und Niederlagen sind die Siege
    const k = spalten.indexOf('kaempfe');
    if (k >= 0 && spalten[k + 1] === null && spalten[k + 2] === 'niederlagen' && !spalten.includes('siege')) spalten[k + 1] = 'siege';
    const erkannt = spalten.filter((f) => f !== null && f !== 'ignoriert');
    const hatName = erkannt.some((f) => f === 'name' || f === 'nameverein' || f === 'nachname' || f === 'vorname');
    if (erkannt.length >= 2 && hatName) return { index: i, spalten };
  }
  return null;
}

let zaehler = 0;
function neueId(): string {
  zaehler += 1;
  return `i${Date.now().toString(36)}-${zaehler}`;
}

function leereZeile(quelle: string, verein: string): ImportZeile {
  return {
    id: neueId(),
    quelle,
    name: '',
    verein,
    geburtsdatum: '',
    geschlecht: '',
    gewicht: '',
    kaempfe: '',
    siege: '',
    niederlagen: '',
    hinweise: [],
  };
}

function setzeBilanz(z: ImportZeile, b: { kaempfe?: number; siege?: number; niederlagen?: number; berechnet?: boolean }) {
  if (b.kaempfe !== undefined) z.kaempfe = String(b.kaempfe);
  if (b.siege !== undefined) z.siege = String(b.siege);
  if (b.niederlagen !== undefined) z.niederlagen = String(b.niederlagen);
  if (b.berechnet) z.hinweise.push('Kämpfe aus Siegen und Niederlagen berechnet');
}

/** Ergänzt Kämpfe, wenn nur Siege und Niederlagen angegeben sind. */
function ergaenzeKaempfe(z: ImportZeile) {
  if (z.kaempfe === '' && z.siege !== '' && z.niederlagen !== '') {
    const s = Number(z.siege);
    const n = Number(z.niederlagen);
    if (Number.isFinite(s) && Number.isFinite(n)) {
      z.kaempfe = String(s + n);
      z.hinweise.push('Kämpfe aus Siegen und Niederlagen berechnet');
    }
  }
}

// ---------------------------------------------------------------- Tabellen

function istLeer(zeile: Zelle[]): boolean {
  return zeile.every((z) => alsText(z) === '');
}

/** Tabelle mit Kopfzeile: jede Spalte wird nach ihrer Überschrift gelesen. */
function ausTabelleMitKopf(zeilen: Zelle[][], kopf: { index: number; spalten: (Feld | null)[] }, o: LeseOptionen): LeseErgebnis {
  const heute = o.heute ?? new Date();
  const ergebnis: LeseErgebnis = { zeilen: [], ignoriert: [] };
  for (const zeile of zeilen.slice(kopf.index + 1)) {
    if (istLeer(zeile)) continue;
    const quelle = zeile.map(alsText).filter(Boolean).join(' | ');
    const z = leereZeile(quelle, o.standardVerein ?? '');
    let vorname = '';
    let nachname = '';
    kopf.spalten.forEach((feld, i) => {
      const zelle = zeile[i];
      const text = alsText(zelle);
      if (!feld || text === '') return;
      switch (feld) {
        case 'name':
          z.name = text;
          break;
        case 'nameverein': {
          const t = trenneNameVerein(text);
          z.name = t.name;
          if (t.verein) z.verein = t.verein;
          break;
        }
        case 'vorname':
          vorname = text;
          break;
        case 'nachname':
          nachname = text;
          break;
        case 'verein':
          z.verein = text;
          break;
        case 'geburtsdatum': {
          const d = findeDatum(zelle, heute);
          if (d?.iso) z.geburtsdatum = d.iso;
          else z.hinweise.push(`Geburtsdatum nicht lesbar: ${text}`);
          break;
        }
        case 'jahrgang':
          z.hinweise.push(`Nur Jahrgang ${text} angegeben, das volle Geburtsdatum fehlt`);
          break;
        case 'geschlecht': {
          const g = parseGeschlecht(zelle);
          if (g) z.geschlecht = g;
          else z.hinweise.push(`Geschlecht nicht eindeutig: ${text}`);
          break;
        }
        case 'gewicht': {
          const g = parseGewicht(zelle);
          if (g !== null) z.gewicht = String(g);
          else z.hinweise.push(`Gewicht nicht lesbar: ${text}`);
          break;
        }
        case 'kaempfe':
        case 'siege':
        case 'niederlagen': {
          const n = parseZahl(zelle);
          if (n !== null) z[feld] = String(n);
          else z.hinweise.push(`${feld === 'kaempfe' ? 'Kämpfe' : feld === 'siege' ? 'Siege' : 'Niederlagen'} nicht lesbar: ${text}`);
          break;
        }
        case 'ignoriert':
          break;
        case 'bilanz': {
          const b = findeBilanz(`bilanz ${text}`);
          if (b) setzeBilanz(z, b);
          else z.hinweise.push(`Bilanz nicht lesbar: ${text}`);
          break;
        }
      }
    });
    if (!z.name && (vorname || nachname)) z.name = [vorname, nachname].filter(Boolean).join(' ');
    ergaenzeKaempfe(z);
    ergebnis.zeilen.push(z);
  }
  return ergebnis;
}

// -------------------------------------------------------------- Freitext

const VEREIN_WORT =
  /(?:^|\s)((?:BC|SV|TSV|TuS|FC|SC|BSC|SG|VfL|VfB|PSV|ESV|MTV|BV|Box[\p{L}-]*)\b.*)$/iu;

/** "Max Mustermann BC Nord" in Name und Verein trennen, wenn ein typisches Vereinskürzel vorkommt. */
export function trenneNameVerein(text: string): { name: string; verein: string } {
  const m = VEREIN_WORT.exec(text);
  if (m && m.index > 0) {
    const name = text.slice(0, m.index + (m[0].length - m[1].length)).trim();
    if (name.split(/\s+/).length >= 2) return { name, verein: m[1].trim() };
  }
  return { name: text.trim(), verein: '' };
}

const TRENNER = /[;|\t]|,(?!\d)|\s[-–—]\s/;

function saeubere(text: string): string {
  return text.replace(/[()[\]*]/g, ' ').replace(/^[\s:,;.\-–—]+|[\s:,;.\-–—]+$/g, '').replace(/\s+/g, ' ').trim();
}

interface Funde {
  geburtsdatum?: string;
  gewicht?: string;
  geschlecht?: 'M' | 'W';
  bilanz?: ReturnType<typeof findeBilanz>;
  name?: string;
  verein?: string;
  rest: string;
  hinweise: string[];
}

/** Liest ein Textstück und entfernt dabei alles, was erkannt wurde. */
function entnehme(segment: string, heute: Date): Funde {
  const f: Funde = { rest: segment, hinweise: [] };
  const beschriftet = /^\s*(name|verein|club|team)\s*[:=]\s*(.+)$/i.exec(segment);
  if (beschriftet) {
    if (beschriftet[1].toLowerCase() === 'name') f.name = saeubere(beschriftet[2]);
    else f.verein = saeubere(beschriftet[2]);
    f.rest = '';
    return f;
  }
  const d = findeDatum(segment, heute);
  if (d) {
    if (d.iso) f.geburtsdatum = d.iso;
    else f.hinweise.push(`Geburtsdatum nicht plausibel: ${d.text}`);
    f.rest = f.rest.replace(d.text, ' ');
  }
  const g = /(\d{1,3}(?:[.,]\d{1,2})?)\s*kg\b/i.exec(f.rest);
  if (g) {
    f.gewicht = g[1].replace(',', '.');
    f.rest = `${f.rest.slice(0, g.index)} ${f.rest.slice(g.index + g[0].length)}`;
  }
  const klammer = /\(\s*(m|w|f|männlich|weiblich)\s*\)/i.exec(f.rest);
  if (klammer) {
    f.geschlecht = parseGeschlecht(klammer[1]) ?? undefined;
    f.rest = `${f.rest.slice(0, klammer.index)} ${f.rest.slice(klammer.index + klammer[0].length)}`;
  }
  const b = findeBilanz(f.rest);
  if (b) {
    f.bilanz = b;
    f.rest = b.rest;
  }
  // Loses Geschlecht am Ende ("... 72kg 10/7/3 m"): nur kleingeschriebenes m/w ohne Punkt oder ein ganzes Wort,
  // damit ein Namenskürzel wie "Anna M." nicht als Geschlecht gelesen wird
  if (!f.geschlecht) {
    const ende = /\s(m|w)\s*$/.exec(f.rest) ?? /\s(männlich|weiblich)\s*$/i.exec(f.rest);
    if (ende) {
      f.geschlecht = parseGeschlecht(ende[1]) ?? undefined;
      f.rest = f.rest.slice(0, ende.index);
    }
  }
  const nurGeschlecht = parseGeschlecht(saeubere(f.rest));
  if (!f.geschlecht && nurGeschlecht) {
    f.geschlecht = nurGeschlecht;
    f.rest = '';
  }
  f.rest = saeubere(f.rest);
  return f;
}

function istUeberschrift(zeile: string): string | null {
  const beschriftet = /^\s*(?:verein|club|team)\s*[:=]\s*([^\d]+?)\s*$/i.exec(zeile);
  if (beschriftet) return saeubere(beschriftet[1]);
  const meldung = /^\s*meldung(?:en)?\s+(?:vom|von|des|der|für)?\s*([^\d:]+?)\s*:?\s*$/i.exec(zeile);
  if (meldung) return saeubere(meldung[1]);
  const mitDoppelpunkt = /^\s*([^\d:]{3,60}):\s*$/.exec(zeile);
  if (mitDoppelpunkt) {
    // Vom Vereinskürzel an, damit ein Satz wie "hier die Meldung vom TSV Dritt:" nur "TSV Dritt" ergibt
    const verein = VEREIN_WORT.exec(mitDoppelpunkt[1]);
    if (verein) return saeubere(verein[1]);
  }
  return null;
}

/** Beginnt mit einer Einheit wie "Niederlage" oder "Siege": der Rest einer umgebrochenen Zeile. */
const FORTSETZUNG = /^\s*(?:niederlagen?|siege?|kämpfe|kaempfe|kampf|kg|verloren)\b/i;

/** Hängt umgebrochene Zeilen (typisch bei Screenshots und Chatblasen) an die vorige Zeile an. */
function fuegeUmbrueche(zeilen: string[]): string[] {
  const ergebnis: string[] = [];
  for (const zeile of zeilen) {
    if (ergebnis.length > 0 && FORTSETZUNG.test(zeile)) ergebnis[ergebnis.length - 1] += ` ${zeile.trim()}`;
    else ergebnis.push(zeile);
  }
  return ergebnis;
}

function ausFreitext(rohzeilen: string[], o: LeseOptionen): LeseErgebnis {
  const zeilen = fuegeUmbrueche(rohzeilen);
  const heute = o.heute ?? new Date();
  const ergebnis: LeseErgebnis = { zeilen: [], ignoriert: [] };
  let aktuellerVerein = o.standardVerein ?? '';
  for (const roh of zeilen) {
    const zeile = roh.trim();
    if (!zeile) continue;
    const ueberschrift = istUeberschrift(zeile);
    if (ueberschrift) {
      aktuellerVerein = ueberschrift;
      continue;
    }
    const z = leereZeile(zeile, aktuellerVerein);
    const rest: string[] = [];
    let erkannt = false;
    for (const segment of zeile.split(TRENNER)) {
      const f = entnehme(segment, heute);
      if (f.geburtsdatum !== undefined || f.hinweise.length) erkannt = true;
      if (f.geburtsdatum) z.geburtsdatum = f.geburtsdatum;
      if (f.gewicht) {
        z.gewicht = f.gewicht;
        erkannt = true;
      }
      if (f.geschlecht) {
        z.geschlecht = f.geschlecht;
        erkannt = true;
      }
      if (f.bilanz) {
        setzeBilanz(z, f.bilanz);
        erkannt = true;
      }
      if (f.name) z.name = f.name;
      if (f.verein) z.verein = f.verein;
      z.hinweise.push(...f.hinweise);
      if (f.rest) rest.push(f.rest);
    }
    if (!erkannt) {
      ergebnis.ignoriert.push(zeile);
      continue;
    }
    // Gewicht ohne "kg": eine einzelne plausible Zahl unter den Resttexten
    if (!z.gewicht) {
      const i = rest.findIndex((r) => {
        const g = parseGewicht(r);
        return g !== null && g >= 25 && g <= 200;
      });
      if (i >= 0) {
        z.gewicht = String(parseGewicht(rest[i]));
        z.hinweise.push('Gewicht ohne "kg" erkannt');
        rest.splice(i, 1);
      }
    }
    const mitBuchstaben = rest.filter((r) => /\p{L}/u.test(r));
    if (!z.name && mitBuchstaben.length) {
      const erstes = mitBuchstaben.shift()!;
      if (mitBuchstaben.length === 0 && !z.verein) {
        const t = trenneNameVerein(erstes);
        z.name = t.name;
        if (t.verein) z.verein = t.verein;
      } else {
        z.name = erstes;
      }
    }
    if (mitBuchstaben.length && (!z.verein || z.verein === aktuellerVerein) && !o.standardVerein && aktuellerVerein === '') {
      z.verein = mitBuchstaben.shift()!;
    } else if (mitBuchstaben.length && !z.verein) {
      z.verein = mitBuchstaben.shift()!;
    }
    if (mitBuchstaben.length) z.hinweise.push(`Nicht zugeordnet: ${mitBuchstaben.join(', ')}`);
    ergaenzeKaempfe(z);
    ergebnis.zeilen.push(z);
  }
  return ergebnis;
}

// ----------------------------------------------------------- Eingang

/** Teilt eine Zeile an einem Trennzeichen und beachtet Anführungszeichen (CSV). */
export function teileZeile(zeile: string, trenner: string): string[] {
  const felder: string[] = [];
  let aktuell = '';
  let inAnfuehrung = false;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (c === '"') {
      if (inAnfuehrung && zeile[i + 1] === '"') {
        aktuell += '"';
        i++;
      } else {
        inAnfuehrung = !inAnfuehrung;
      }
    } else if (c === trenner && !inAnfuehrung) {
      felder.push(aktuell);
      aktuell = '';
    } else {
      aktuell += c;
    }
  }
  felder.push(aktuell);
  return felder;
}

/** Excel-Tabelle (Zeilen aus Zellen), mit oder ohne Kopfzeile. */
export function liesTabelle(zeilen: Zelle[][], o: LeseOptionen = {}): LeseErgebnis {
  const kopf = findeKopfzeile(zeilen);
  if (kopf) return ausTabelleMitKopf(zeilen, kopf, o);
  // Ohne Überschriften wird jede Zeile wie Freitext aus ihren Zellen gelesen
  return ausFreitext(
    zeilen.filter((z) => !istLeer(z)).map((z) => z.map(alsText).filter(Boolean).join(' ; ')),
    o,
  );
}

/** Eingefügter Text oder CSV: Tabelle mit Kopfzeile, sonst Freitext (eine Zeile je Boxer). */
export function liesText(text: string, o: LeseOptionen = {}): LeseErgebnis {
  const zeilen = text.split(/\r?\n/);
  for (const trenner of ['\t', ';', ',']) {
    const tabelle = zeilen.map((z) => teileZeile(z, trenner));
    if (findeKopfzeile(tabelle)) return liesTabelle(tabelle, o);
  }
  return ausFreitext(zeilen, o);
}
