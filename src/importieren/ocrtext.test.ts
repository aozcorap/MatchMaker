import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { liesText } from './lesen';
import { zeilenAusTsv } from './ocrtext';

const lade = (name: string) => readFileSync(new URL(`./fixtures/${name}.tsv`, import.meta.url), 'utf8');
const heute = new Date(Date.UTC(2026, 9, 21));

describe('Texterkennung: Zeilen und Spalten aus der Wortliste', () => {
  it('eine saubere Tabelle behält ihre Spalten (Tabulatoren)', () => {
    const text = zeilenAusTsv(lade('excel'));
    expect(text.split('\n')[0]).toBe('Name\tVerein\tGeburtsdatum\tGewicht\tKämpfe\tSiege\tNiederlagen');
    const e = liesText(text, { heute });
    expect(e.zeilen).toHaveLength(4);
    expect(e.zeilen[0]).toMatchObject({ name: 'Niko Brandt', verein: 'BC Nordstern', geburtsdatum: '2010-04-22', gewicht: '80.1', kaempfe: '17', siege: '12', niederlagen: '5' });
    expect(e.zeilen[3]).toMatchObject({ name: 'Mia Winter', geburtsdatum: '2008-09-06', gewicht: '58.5', kaempfe: '9', siege: '5', niederlagen: '2' });
  });

  it('eine WhatsApp-Nachricht wird Zeile für Zeile gelesen, auch mit Umbruch', () => {
    const e = liesText(zeilenAusTsv(lade('chat')), { heute });
    expect(e.zeilen).toHaveLength(2);
    expect(e.zeilen[0]).toMatchObject({ name: 'Tom Beck', verein: 'TSV Dritt', geschlecht: 'M', gewicht: '61', kaempfe: '10', siege: '7', niederlagen: '3' });
    expect(e.zeilen[1]).toMatchObject({ name: 'Lisa Neu', verein: 'TSV Dritt', geschlecht: 'W', gewicht: '52.5', siege: '4', niederlagen: '1', kaempfe: '5' });
  });

  it('eine zerlesene Handy-Tabelle ergibt nie fertige Boxer, sondern Fehler zur Prüfung', () => {
    const e = liesText(zeilenAusTsv(lade('handy')), { heute });
    // Es werden keine vollständigen Angaben erfunden: keine Zeile hat zugleich Name, Verein, Datum, Geschlecht und Gewicht
    expect(e.zeilen.every((z) => !(z.name && z.verein && z.geburtsdatum && z.geschlecht && z.gewicht))).toBe(true);
  });

  it('leere Eingabe ergibt keinen Text', () => {
    expect(zeilenAusTsv('')).toBe('');
  });
});

/** Baut eine Wortliste im Format der Texterkennung (TSV) aus Text und Position. */
function tsvAus(woerter: [string, number, number, number][]): string {
  return woerter.map(([text, links, oben, breite]) => ['5', 1, 1, 1, 1, 1, links, oben, breite, 30, 90, text].join('\t')).join('\n');
}

describe('Tabelle mit Kopfzeile, wie sie echte Screenshots liefern', () => {
  // Zehn Spalten: Kg. | Name | Verein | m/w | geb. | Alter | K | S | N | U. Das Wort "Verein" hat einen viel zu breiten Kasten.
  const kopf: [string, number, number, number][] = [
    ['Kg.', 92, 77, 60], ['Name', 233, 83, 107], ['Verein', 345, 71, 624], ['m/w', 985, 76, 99], ['geb.', 1524, 83, 72],
    ['Alter', 1750, 70, 90], ['K', 2090, 77, 27], ['SS', 2293, 70, 29], ['N', 2503, 77, 25], ['U', 2710, 77, 25],
  ];
  const zeile1: [string, number, number, number][] = [
    ['70', 101, 137, 42], ['Max', 234, 138, 60], ['Muster', 326, 138, 150], ['BC', 821, 138, 40], ['Beispiel', 880, 138, 150], ['m', 1376, 143, 29],
    ['06.06.2010', 1545, 136, 197], ['16', 1875, 136, 38], ['33', 2095, 136, 41], ['26', 2288, 136, 42], ['5', 2506, 136, 19], ['2', 2712, 136, 20],
  ];
  const zeile2: [string, number, number, number][] = [
    ['82', 101, 190, 42], ['Erika', 234, 195, 100], ['Beispiel', 389, 195, 146], ['BC', 821, 190, 40], ['Beispiel', 880, 190, 150], ['m', 1375, 200, 30],
    ['09.10.2006', 1545, 185, 197], ['20', 1873, 190, 40], ['9', 2092, 190, 19], ['7', 2298, 191, 21], ['2', 2506, 190, 19], ['0', 2712, 191, 20],
  ];

  it('die Kopfzeile wird der Reihe nach zugeordnet, auch wenn ein Wortkasten verzerrt ist', () => {
    const text = zeilenAusTsv(tsvAus([...kopf, ...zeile1, ...zeile2]));
    expect(text.split('\n')[0]).toBe('Kg.\tName\tVerein\tm/w\tgeb.\tAlter\tK\tSS\tN\tU');
    const e = liesText(text, { heute });
    expect(e.zeilen).toHaveLength(2);
    expect(e.zeilen[0]).toMatchObject({
      name: 'Max Muster', verein: 'BC Beispiel', gewicht: '70', geschlecht: 'M', geburtsdatum: '2010-06-06', kaempfe: '33', siege: '26', niederlagen: '5',
    });
    expect(e.zeilen[1]).toMatchObject({ name: 'Erika Beispiel', gewicht: '82', geburtsdatum: '2006-10-09', kaempfe: '9', siege: '7', niederlagen: '2' });
  });

  it('eine nicht gelesene Zelle verschiebt die übrigen Spalten nicht', () => {
    const ohneZwei = zeile2.filter(([text]) => text !== '9'); // Kämpfe der zweiten Zeile fehlen
    const e = liesText(zeilenAusTsv(tsvAus([...kopf, ...zeile1, ...ohneZwei])), { heute });
    // Die übrigen Zellen stehen weiter in ihren Spalten; die fehlenden Kämpfe werden aus Siegen und Niederlagen berechnet
    expect(e.zeilen[1]).toMatchObject({ siege: '7', niederlagen: '2', kaempfe: '9', gewicht: '82', geburtsdatum: '2006-10-09' });
    expect(e.zeilen[1].hinweise.join(' ')).toContain('berechnet');
  });

  it('Reste von Tabellenlinien (|, _, [) um die Wörter werden entfernt', () => {
    const verschmutzt = zeile1.map(([t, l, o, b]) => [t === 'Muster' ? '_Muster__' : t === '70' ? '[|' : t, l, o, b] as [string, number, number, number]);
    const text = zeilenAusTsv(tsvAus([...kopf, ...verschmutzt, ...zeile2]));
    expect(text).toContain('Max Muster');
    expect(text).not.toMatch(/[_|[]/);
  });

  it('die Spalten Alter und U werden ignoriert, ohne etwas zu verschieben', () => {
    const e = liesText(zeilenAusTsv(tsvAus([...kopf, ...zeile1])), { heute });
    expect(e.zeilen[0].hinweise).toEqual(expect.not.arrayContaining([expect.stringContaining('Alter')]));
  });
});
