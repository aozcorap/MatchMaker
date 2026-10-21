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
