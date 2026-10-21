/** Aus der Wortliste der Texterkennung (TSV mit Positionen) Zeilen und Spalten wieder zusammensetzen. */

import { erkenneFeld } from './lesen';

interface Wort {
  links: number;
  oben: number;
  breite: number;
  hoehe: number;
  text: string;
}

interface Spalte {
  links: number;
  rechts: number;
  text: string;
}

/** Reste von Tabellenlinien, die als Zeichen gelesen wurden. */
const RAUSCHEN = /^[|¦_=~[\]]+$/;
const LINIENRAND = /^[_|¦=~[\]]+|[_|¦=~[\]]+$/g;

function median(werte: number[]): number {
  if (werte.length === 0) return 0;
  const s = [...werte].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function leseWoerter(tsv: string): Wort[] {
  const woerter: Wort[] = [];
  for (const zeile of tsv.split('\n')) {
    const f = zeile.replace(/\r$/, '').split('\t');
    if (f.length < 12 || f[0] !== '5') continue;
    const roh = f.slice(11).join('\t').trim();
    if (!roh || RAUSCHEN.test(roh)) continue;
    const text = roh.replace(LINIENRAND, '');
    if (!text) continue;
    woerter.push({ links: Number(f[6]), oben: Number(f[7]), breite: Number(f[8]), hoehe: Number(f[9]), text });
  }
  return woerter;
}

/** Wörter mit ähnlicher Höhe gehören in eine Zeile. */
function gruppiereZeilen(woerter: Wort[], hoehe: number): Wort[][] {
  const gruppen: Wort[][] = [];
  const mitte = (w: Wort) => w.oben + w.hoehe / 2;
  for (const w of [...woerter].sort((a, b) => mitte(a) - mitte(b))) {
    const letzte = gruppen[gruppen.length - 1];
    if (letzte && Math.abs(mitte(w) - median(letzte.map(mitte))) <= hoehe * 0.6) letzte.push(w);
    else gruppen.push([w]);
  }
  return gruppen.map((g) => [...g].sort((a, b) => a.links - b.links));
}

/** Teilt eine Zeile an großen Abständen in Zellen; kleine Abstände sind Leerzeichen im Text. */
function teileInZellen(zeile: Wort[], zeichenBreite: number): Spalte[] {
  const zellen: Spalte[] = [];
  zeile.forEach((w, i) => {
    const luecke = i === 0 ? Infinity : w.links - (zeile[i - 1].links + zeile[i - 1].breite);
    if (luecke > zeichenBreite * 2.2) zellen.push({ links: w.links, rechts: w.links + w.breite, text: w.text });
    else {
      const z = zellen[zellen.length - 1];
      z.text += ` ${w.text}`;
      z.rechts = w.links + w.breite;
    }
  });
  return zellen;
}

/**
 * Die Kopfzeile einer Tabelle: mindestens drei Wörter, die bekannte Überschriften sind, darunter ein Name.
 * Es zählen einzelne Wörter, weil die Wortkästen der Überschrift oft zu breit sind, um Zellen zu trennen.
 */
function istKopfzeile(zeile: Wort[]): boolean {
  const felder = zeile.map((w) => erkenneFeld(w.text));
  const bekannt = felder.filter((f) => f !== null && f !== 'ignoriert');
  return bekannt.length >= 3 && felder.some((f) => f === 'name' || f === 'nameverein' || f === 'nachname' || f === 'vorname');
}

/**
 * Spalten aus den Datenzeilen: übereinanderliegende Zellen gehören zu einer Spalte. Die Zellen der Datenzeilen
 * haben saubere Grenzen, die der Kopfzeile oft nicht.
 */
function spaltenAusDaten(datenzeilen: Wort[][], zeichenBreite: number): Spalte[] {
  const zellen = datenzeilen.flatMap((z) => teileInZellen(z, zeichenBreite));
  const sortiert = [...zellen].sort((a, b) => a.links - b.links);
  const spalten: Spalte[] = [];
  for (const z of sortiert) {
    const letzte = spalten[spalten.length - 1];
    if (letzte && z.links <= letzte.rechts) {
      letzte.rechts = Math.max(letzte.rechts, z.rechts);
      letzte.text += ` ${z.text}`;
    } else {
      spalten.push({ ...z });
    }
  }
  return spalten;
}

/** Ordnet ein Wort der Spalte zu, mit der es sich am meisten überlappt, sonst der nächsten. */
function waehleSpalte(w: Wort, spalten: Spalte[]): number {
  const rechts = w.links + w.breite;
  const mitte = w.links + w.breite / 2;
  let beste = 0;
  let besterAbstand = Infinity;
  let besteMitteDistanz = Infinity;
  spalten.forEach((s, j) => {
    const ueberlappung = Math.min(rechts, s.rechts) - Math.max(w.links, s.links);
    const abstand = ueberlappung > 0 ? -ueberlappung : Math.max(s.links - rechts, w.links - s.rechts);
    const mitteDistanz = Math.abs(mitte - (s.links + s.rechts) / 2);
    if (abstand < besterAbstand || (abstand === besterAbstand && mitteDistanz < besteMitteDistanz)) {
      beste = j;
      besterAbstand = abstand;
      besteMitteDistanz = mitteDistanz;
    }
  });
  return beste;
}

/**
 * Zeilen und Spalten aus den Wörtern. Gibt es eine erkennbare Kopfzeile, wird jedes Wort der Spalte unter
 * der passenden Überschrift zugeordnet; so verschiebt eine nicht gelesene Zelle die übrigen nicht.
 * Sonst werden Wörter mit großem Abstand durch einen Tabulator getrennt.
 */
export function zeilenAusTsv(tsv: string): string {
  const woerter = leseWoerter(tsv);
  if (woerter.length === 0) return '';
  const hoehe = median(woerter.map((w) => w.hoehe));
  const zeichenBreite = median(woerter.filter((w) => w.text.length >= 3).map((w) => w.breite / w.text.length)) || hoehe * 0.5;
  const zeilen = gruppiereZeilen(woerter, hoehe);
  const zellen = zeilen.map((z) => teileInZellen(z, zeichenBreite));

  const kopf = zeilen.findIndex(istKopfzeile);
  if (kopf < 0) return zellen.map((z) => z.map((s) => s.text).join('\t')).join('\n');

  const spalten = spaltenAusDaten(zeilen.slice(kopf + 1), zeichenBreite);
  if (spalten.length === 0) return zellen.map((z) => z.map((s) => s.text).join('\t')).join('\n');
  return zeilen
    .map((zeile, i) => {
      if (i < kopf) return zellen[i].map((s) => s.text).join('\t');
      // Hat die Kopfzeile genauso viele Wörter wie die Daten Spalten, gilt die Reihenfolge; die Kästen der
      // Überschriften sind oft verzerrt und würden Wörter in die falsche Spalte legen
      if (i === kopf && zeile.length === spalten.length) return zeile.map((w) => w.text).join('\t');
      const inhalt: string[][] = spalten.map(() => []);
      for (const w of zeile) inhalt[waehleSpalte(w, spalten)].push(w.text);
      return inhalt.map((teile) => teile.join(' ')).join('\t');
    })
    .join('\n');
}
