import { describe, expect, it } from 'vitest';
import { findeBilanz, findeDatum, parseGeschlecht, parseGewicht } from './felder';
import { liesTabelle, liesText, trenneNameVerein } from './lesen';
import { pruefeZeile, zaehleInEingabe } from './pruefen';
import type { Boxer } from '../regeln/typen';

const HEUTE = new Date(Date.UTC(2026, 9, 21));
const o = { heute: HEUTE };

describe('Datum', () => {
  it.each([
    ['12.03.2005', '2005-03-12'],
    ['geb. 2.3.2005', '2005-03-02'],
    ['02.03.05', '2005-03-02'],
    ['02.03.85', '1985-03-02'],
    ['2005-03-12', '2005-03-12'],
    ['12/03/2005', '2005-03-12'],
    ['* 12. 03. 2005', '2005-03-12'],
  ])('%s -> %s', (text, erwartet) => {
    expect(findeDatum(text, HEUTE)?.iso).toBe(erwartet);
  });
  it('ungültige oder unplausible Daten ergeben kein Datum, nennen aber den Text', () => {
    expect(findeDatum('31.02.2005', HEUTE)).toMatchObject({ iso: null, text: '31.02.2005' });
    expect(findeDatum('01.01.2024', HEUTE)?.iso).toBeNull(); // 2-jähriges Kind
    expect(findeDatum('kein Datum', HEUTE)).toBeNull();
  });
  it('Excel-Datumswerte (UTC) bleiben am richtigen Tag', () => {
    expect(findeDatum(new Date(Date.UTC(2005, 2, 12)), HEUTE)?.iso).toBe('2005-03-12');
  });
});

describe('Gewicht, Geschlecht, Bilanz', () => {
  it('Gewicht', () => {
    expect(parseGewicht('72,5 kg')).toBe(72.5);
    expect(parseGewicht('72.5kg')).toBe(72.5);
    expect(parseGewicht(68)).toBe(68);
    expect(parseGewicht('schwer')).toBeNull();
  });
  it('Geschlecht nur bei eindeutiger Angabe', () => {
    expect(parseGeschlecht('m')).toBe('M');
    expect(parseGeschlecht('Weiblich')).toBe('W');
    expect(parseGeschlecht('w.')).toBe('W');
    expect(parseGeschlecht('Max')).toBeNull();
    expect(parseGeschlecht('')).toBeNull();
  });
  it.each([
    ['10/7/3', { kaempfe: 10, siege: 7, niederlagen: 3 }],
    ['10 Kämpfe 7 Siege 3 Niederlagen', { kaempfe: 10, siege: 7, niederlagen: 3 }],
    ['10K 7S 3N', { kaempfe: 10, siege: 7, niederlagen: 3 }],
    ['Kämpfe: 10, Siege: 7', { kaempfe: 10, siege: 7 }],
    ['7 Siege 3 Niederlagen', { kaempfe: 10, siege: 7, niederlagen: 3, berechnet: true }],
    ['Bilanz 7-3', { kaempfe: 10, siege: 7, niederlagen: 3, berechnet: true }],
  ])('Bilanz %s', (text, erwartet) => {
    expect(findeBilanz(text)).toMatchObject(erwartet);
  });
  it('Gewicht und Datum werden nicht als Bilanz gelesen', () => {
    expect(findeBilanz('72 kg')).toBeNull();
    expect(findeBilanz('12.03.2005')).toBeNull();
  });
});

describe('Name und Verein trennen', () => {
  it('am Vereinskürzel', () => {
    expect(trenneNameVerein('Max Mustermann BC Nordstern')).toEqual({ name: 'Max Mustermann', verein: 'BC Nordstern' });
    expect(trenneNameVerein('Anna Weiß Boxring Eiche')).toEqual({ name: 'Anna Weiß', verein: 'Boxring Eiche' });
    expect(trenneNameVerein('Max Mustermann')).toEqual({ name: 'Max Mustermann', verein: '' });
  });
});

describe('Tabelle mit Kopfzeile', () => {
  const tabelle = [
    ['Meldung Boxabend 14.11.', null, null, null, null, null, null],
    ['Nachname', 'Vorname', 'Verein', 'Geb.-Datum', 'Gewicht (kg)', 'Kämpfe', 'Siege', 'Niederlagen', 'm/w'],
    ['Brandt', 'Niko', 'BC Nordstern', new Date(Date.UTC(2010, 3, 22)), 80.1, 17, 12, 5, 'm'],
    ['Roth', 'Sara', 'BC Nordstern', '27.04.1997', '80,2', 0, 0, 0, 'w'],
    [null, null, null, null, null, null, null, null, null],
  ];
  it('liest Spalten nach Überschrift, auch Vor- und Nachname getrennt', () => {
    const e = liesTabelle(tabelle, o);
    expect(e.zeilen).toHaveLength(2);
    expect(e.zeilen[0]).toMatchObject({
      name: 'Niko Brandt',
      verein: 'BC Nordstern',
      geburtsdatum: '2010-04-22',
      geschlecht: 'M',
      gewicht: '80.1',
      kaempfe: '17',
      siege: '12',
      niederlagen: '5',
    });
    expect(e.zeilen[1]).toMatchObject({ name: 'Sara Roth', geburtsdatum: '1997-04-27', geschlecht: 'W', gewicht: '80.2' });
  });
  it('Bilanz in einer Spalte und Jahrgang statt Geburtsdatum', () => {
    const e = liesTabelle(
      [
        ['Name', 'Jahrgang', 'Gewicht', 'Bilanz'],
        ['Tom Beck', 2009, '61 kg', '10/7/3'],
      ],
      { ...o, standardVerein: 'TSV Falke' },
    );
    expect(e.zeilen[0]).toMatchObject({ name: 'Tom Beck', verein: 'TSV Falke', gewicht: '61', kaempfe: '10', siege: '7', niederlagen: '3', geburtsdatum: '' });
    expect(e.zeilen[0].hinweise.join(' ')).toContain('Nur Jahrgang 2009');
  });
  it('ohne Überschriften wird jede Zeile aus ihren Zellen gelesen', () => {
    const e = liesTabelle([['Tom Beck', 'TSV Falke', '12.03.2009', 'm', '61 kg', '10/7/3']], o);
    expect(e.zeilen[0]).toMatchObject({ name: 'Tom Beck', verein: 'TSV Falke', geburtsdatum: '2009-03-12', geschlecht: 'M', gewicht: '61', siege: '7' });
  });
});

describe('Text und CSV', () => {
  it('CSV mit Semikolon und deutschem Komma', () => {
    const e = liesText('Name;Verein;Geburtsdatum;Gewicht;Kämpfe;Siege\nMax Muster;BC Nord;12.03.2005;72,5;10;7', o);
    expect(e.zeilen).toHaveLength(1);
    expect(e.zeilen[0]).toMatchObject({ name: 'Max Muster', verein: 'BC Nord', gewicht: '72.5', kaempfe: '10', siege: '7', niederlagen: '' });
  });
  it('Excel-Kopie mit Tabulatoren', () => {
    const e = liesText('Name\tVerein\tGeb\tKG\nMax Muster\tBC Nord\t12.03.2005\t72', o);
    expect(e.zeilen[0]).toMatchObject({ name: 'Max Muster', verein: 'BC Nord', geburtsdatum: '2005-03-12', gewicht: '72' });
  });
  it('CSV mit Komma und Anführungszeichen im Namen', () => {
    const e = liesText('Name,Verein,Geburtsdatum,Gewicht\n"Muster, Max",BC Nord,12.03.2005,72', o);
    expect(e.zeilen[0].name).toBe('Muster, Max');
  });
  it('WhatsApp: eine Zeile je Boxer mit Kommas', () => {
    const e = liesText('Max Mustermann, BC Nord, 12.03.2005, m, 72 kg, 10 Kämpfe 7 Siege 3 Niederlagen', o);
    expect(e.zeilen[0]).toMatchObject({
      name: 'Max Mustermann',
      verein: 'BC Nord',
      geburtsdatum: '2005-03-12',
      geschlecht: 'M',
      gewicht: '72',
      kaempfe: '10',
      siege: '7',
      niederlagen: '3',
    });
  });
  it('WhatsApp: Bindestriche und Vereinsüberschrift', () => {
    const e = liesText(
      'Hallo Ahmet, hier die Meldung:\nVerein: SV Rheinkraft\nLeon Winter - 04.09.1999 - 70,8 kg - 10/5/4\nAnna Roth - 01.02.2008 - w - 55kg - 3 Siege 1 Niederlage',
      o,
    );
    expect(e.ignoriert).toEqual(['Hallo Ahmet, hier die Meldung:']);
    expect(e.zeilen).toHaveLength(2);
    expect(e.zeilen[0]).toMatchObject({ name: 'Leon Winter', verein: 'SV Rheinkraft', geburtsdatum: '1999-09-04', gewicht: '70.8', kaempfe: '10', siege: '5', niederlagen: '4' });
    expect(e.zeilen[1]).toMatchObject({ name: 'Anna Roth', geschlecht: 'W', siege: '3', niederlagen: '1', kaempfe: '4' });
  });
  it('Vereinsname aus einem Satz mit Doppelpunkt', () => {
    const e = liesText('Hier die Meldung vom TSV Dritt:\nTom Beck - 12.03.2009 - m - 61 kg - 10/7/3', o);
    expect(e.zeilen[0].verein).toBe('TSV Dritt');
  });
  it('alles in einer Zeile ohne Trennzeichen', () => {
    const e = liesText('Max Mustermann BC Nord 12.03.2005 72kg 10/7/3 m', o);
    expect(e.zeilen[0]).toMatchObject({ name: 'Max Mustermann', verein: 'BC Nord', geburtsdatum: '2005-03-12', gewicht: '72', siege: '7', geschlecht: 'M' });
  });
  it('ein Namenskürzel wie "Anna M." wird nicht als Geschlecht gelesen', () => {
    const e = liesText('Anna M., BC Nord, 12.03.2005, 55 kg', o);
    expect(e.zeilen[0]).toMatchObject({ name: 'Anna M', verein: 'BC Nord', geschlecht: '' });
  });
  it('Standardverein gilt, wenn die Zeile keinen nennt', () => {
    const e = liesText('Max Mustermann, 12.03.2005, m, 72 kg', { ...o, standardVerein: 'BC Nord' });
    expect(e.zeilen[0].verein).toBe('BC Nord');
  });
  it('Gewicht ohne kg wird erkannt und vermerkt', () => {
    const e = liesText('Max Mustermann, BC Nord, 12.03.2005, m, 72', o);
    expect(e.zeilen[0].gewicht).toBe('72');
    expect(e.zeilen[0].hinweise.join(' ')).toContain('ohne "kg"');
  });
  it('leere Zeilen und Grüße werden ignoriert, nichts wird erfunden', () => {
    const e = liesText('\n\nVielen Dank und Gruß\n', o);
    expect(e.zeilen).toEqual([]);
    expect(e.ignoriert).toEqual(['Vielen Dank und Gruß']);
  });
});

describe('Prüfen', () => {
  const vollstaendig = () =>
    liesText('Max Mustermann, BC Nord, 12.03.2005, m, 72 kg, 10/7/3', o).zeilen[0];

  it('vollständige Zeile ergibt einen Boxer', () => {
    const p = pruefeZeile(vollstaendig(), [], new Map(), HEUTE);
    expect(p.fehler).toEqual([]);
    expect(p.boxer).toMatchObject({ name: 'Max Mustermann', verein: 'BC Nord', geburtsdatum: '2005-03-12', geschlecht: 'M', gewicht: 72, kaempfe: 10, siege: 7, niederlagen: 3 });
  });

  it('fehlende Pflichtangaben sind Fehler, es entsteht kein Boxer', () => {
    const z = liesText('Max Mustermann, 72 kg', o).zeilen[0];
    const p = pruefeZeile(z, [], new Map(), HEUTE);
    expect(p.boxer).toBeNull();
    expect(p.fehler).toEqual(expect.arrayContaining(['Verein fehlt', 'Geburtsdatum fehlt', 'Geschlecht fehlt']));
  });

  it('fehlende Bilanz ist nur eine Warnung mit klarem Hinweis', () => {
    const z = liesText('Max Mustermann, BC Nord, 12.03.2005, m, 72 kg', o).zeilen[0];
    const p = pruefeZeile(z, [], new Map(), HEUTE);
    expect(p.fehler).toEqual([]);
    expect(p.boxer).toMatchObject({ kaempfe: 0, siege: 0, niederlagen: 0 });
    expect(p.warnungen.join(' ')).toContain('Leistungsklasse C');
  });

  it('Siege plus Niederlagen über den Kämpfen ist ein Fehler', () => {
    const z = { ...vollstaendig(), kaempfe: '5', siege: '4', niederlagen: '3' };
    expect(pruefeZeile(z, [], new Map(), HEUTE).fehler).toContain('Siege plus Niederlagen sind mehr als die Kämpfe');
  });

  it('unplausibles Gewicht ist ein Fehler', () => {
    expect(pruefeZeile({ ...vollstaendig(), gewicht: '7' }, [], new Map(), HEUTE).fehler).toContain('Gewicht unplausibel');
  });

  it('bereits vorhandener Boxer wird erkannt, auch mit anderer Schreibweise', () => {
    const vorhanden: Boxer = { id: 'x', name: 'max  mustermann', verein: 'BC Nord', geburtsdatum: '2005-03-12', geschlecht: 'M', gewicht: 70, kaempfe: 0, siege: 0, niederlagen: 0 };
    const p = pruefeZeile(vollstaendig(), [vorhanden], new Map(), HEUTE);
    expect(p.vorhanden).toBe(true);
  });

  it('doppelte Zeilen in der Eingabe werden gemeldet', () => {
    const a = vollstaendig();
    const b = { ...vollstaendig(), id: 'zweite' };
    const zaehler = zaehleInEingabe([a, b]);
    expect(pruefeZeile(a, [], zaehler, HEUTE).warnungen.join(' ')).toContain('mehrfach');
  });
});
