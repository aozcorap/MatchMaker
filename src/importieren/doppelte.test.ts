import { describe, expect, it } from 'vitest';
import type { Boxer } from '../regeln/typen';
import { liesText } from './lesen';
import { gleicherName, pruefeZeile, spaetereDoppelte } from './pruefen';
import type { ImportZeile } from './typen';

const HEUTE = new Date(Date.UTC(2026, 9, 21));

const zeile = (name: string, geb = '2005-03-12', extra: Partial<ImportZeile> = {}): ImportZeile => ({
  id: `${name}|${geb}`,
  quelle: '',
  name,
  verein: 'BC Nord',
  geburtsdatum: geb,
  geschlecht: 'M',
  gewicht: '70',
  kaempfe: '5',
  siege: '3',
  niederlagen: '2',
  unentschieden: '',
  hinweise: [],
  ...extra,
});

const boxer = (name: string, geb = '2005-03-12'): Boxer => ({
  id: name,
  name,
  verein: 'BC Nord',
  geburtsdatum: geb,
  geschlecht: 'M',
  gewicht: 70,
  kaempfe: 5,
  siege: 3,
  niederlagen: 2,
});

describe('Derselbe Boxer in einer zweiten Meldung', () => {
  it.each([
    ['Max Mustermann', 'Max Mustermann'],
    ['max  mustermann', 'Max Mustermann'],
    ['Mustermann, Max', 'Max Mustermann'],
    ['Max Müller', 'Max Mueller'],
    ['Max Muller', 'Max Müller'],
    ['Anna-Lena Schmidt', 'Anna Lena Schmidt'],
    ['Jose Garcia', 'José García'],
    ['Max Mustermann', 'Max Mustermanm'],
  ])('%s = %s', (a, b) => {
    expect(gleicherName(a, b)).toBe(true);
  });

  it.each([
    ['Max Mustermann', 'Moritz Mustermann'],
    ['Max Müller', 'Max Möller-Schulz'],
    ['Li Wu', 'Li Xu'],
  ])('%s ist nicht %s', (a, b) => {
    expect(gleicherName(a, b)).toBe(false);
  });

  it('gleicher Name mit anderem Geburtsdatum ist ein anderer Boxer', () => {
    expect(pruefeZeile(zeile('Max Mustermann', '2005-03-13'), [boxer('Max Mustermann')], new Map(), HEUTE).vorhanden).toBe(false);
  });

  it('wird auch erkannt, wenn der Verein anders geschrieben ist', () => {
    const p = pruefeZeile(zeile('Max Mustermann', '2005-03-12', { verein: 'Boxclub Nord e.V.' }), [boxer('Max Mustermann')], new Map(), HEUTE);
    expect(p.vorhanden).toBe(true);
    expect(p.warnungen.join(' ')).toContain('Verein BC Nord → Boxclub Nord e.V.');
  });

  it('zeigt, was sich gegenüber dem vorhandenen Boxer geändert hat', () => {
    const p = pruefeZeile(zeile('Max Mustermann', '2005-03-12', { gewicht: '72', kaempfe: '6', siege: '4' }), [boxer('Max Mustermann')], new Map(), HEUTE);
    expect(p.vorhanden).toBe(true);
    const w = p.warnungen.join(' ');
    expect(w).toContain('Gewicht 70 → 72 kg');
    expect(w).toContain('Kämpfe 5 → 6');
    expect(w).toContain('Siege 3 → 4');
    expect(w).not.toContain('Niederlagen');
  });

  it('gleiche Angaben werden als solche gemeldet', () => {
    const p = pruefeZeile(zeile('Max Mustermann'), [boxer('Max Mustermann')], new Map(), HEUTE);
    expect(p.warnungen.join(' ')).toContain('gleiche Angaben');
  });

  it('zweite Meldung mit einem neuen Boxer: nur der neue ist nicht vorhanden', () => {
    const erste = 'Max Mustermann, BC Nord, 12.03.2005, m, 72 kg, 10/7/3\nTim Beispiel, BC Nord, 01.02.2008, m, 55 kg, 5/3/2\nAnna Probe, BC Nord, 05.06.2004, w, 60 kg, 8/4/4';
    const zweite = `${erste}\nNoah Neu, BC Nord, 09.09.2009, m, 45 kg, 1/1/0`;
    const schonDa = liesText(erste, { heute: HEUTE }).zeilen.map((z) => pruefeZeile(z, [], new Map(), HEUTE).boxer!);
    expect(schonDa).toHaveLength(3);
    const pruefungen = liesText(zweite, { heute: HEUTE }).zeilen.map((z) => pruefeZeile(z, schonDa, new Map(), HEUTE));
    expect(pruefungen.map((p) => p.vorhanden)).toEqual([true, true, true, false]);
  });
});

describe('Doppelte innerhalb einer Eingabe (zwei Dateien mit überlappender Liste)', () => {
  it('nur die späteren Wiederholungen werden markiert', () => {
    const a = zeile('Max Mustermann');
    const b = zeile('Tim Beispiel', '2008-02-01');
    const c = { ...zeile('Mustermann, Max'), id: 'c' };
    const d = zeile('Noah Neu', '2009-09-09');
    const doppelt = spaetereDoppelte([a, b, c, d], HEUTE);
    expect([...doppelt]).toEqual(['c']);
  });

  it('Zeilen ohne Namen oder Geburtsdatum werden nicht verglichen', () => {
    expect(spaetereDoppelte([zeile('', '2005-03-12'), zeile('', '2005-03-12', { id: 'zwei' }), zeile('Max', '')], HEUTE).size).toBe(0);
  });
});
