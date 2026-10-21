/** Aus der Wortliste der Texterkennung (TSV mit Positionen) Zeilen und Spalten wieder zusammensetzen. */

interface Wort {
  links: number;
  oben: number;
  breite: number;
  hoehe: number;
  text: string;
}

const RAUSCHEN = /^[|¦_=~]+$/;

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
    const text = f.slice(11).join('\t').trim();
    if (!text || RAUSCHEN.test(text)) continue;
    woerter.push({ links: Number(f[6]), oben: Number(f[7]), breite: Number(f[8]), hoehe: Number(f[9]), text });
  }
  return woerter;
}

/**
 * Wörter mit ähnlicher Höhe gehören in eine Zeile. Ist der Abstand zwischen zwei Wörtern deutlich größer als
 * ein Leerraum im Satz, wird ein Tabulator eingefügt, damit Tabellenspalten als Spalten erhalten bleiben.
 */
export function zeilenAusTsv(tsv: string): string {
  const woerter = leseWoerter(tsv);
  if (woerter.length === 0) return '';
  const hoehe = median(woerter.map((w) => w.hoehe));
  const zeichenBreite = median(woerter.filter((w) => w.text.length >= 3).map((w) => w.breite / w.text.length)) || hoehe * 0.5;

  const gruppen: Wort[][] = [];
  const mitte = (w: Wort) => w.oben + w.hoehe / 2;
  for (const w of [...woerter].sort((a, b) => mitte(a) - mitte(b))) {
    const letzte = gruppen[gruppen.length - 1];
    if (letzte && Math.abs(mitte(w) - median(letzte.map(mitte))) <= hoehe * 0.6) letzte.push(w);
    else gruppen.push([w]);
  }

  return gruppen
    .map((gruppe) => {
      const sortiert = [...gruppe].sort((a, b) => a.links - b.links);
      return sortiert
        .map((w, i) => {
          if (i === 0) return w.text;
          const luecke = w.links - (sortiert[i - 1].links + sortiert[i - 1].breite);
          return (luecke > zeichenBreite * 2.2 ? '\t' : ' ') + w.text;
        })
        .join('');
    })
    .join('\n');
}
