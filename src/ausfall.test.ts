import { describe, expect, it } from 'vitest';
import { hebeAusfallAuf, meldeAusfall } from './ausfall';
import { liesZustand, type Zustand } from './speicher';
import type { Boxer } from './regeln/typen';

function boxer(id: string): Boxer {
  return {
    id,
    name: id,
    verein: `V${id}`,
    geburtsdatum: '2000-01-01',
    geschlecht: 'M',
    gewicht: 70,
    kaempfe: 0,
    siege: 0,
    niederlagen: 0,
  };
}

const start: Zustand = {
  datum: '2026-11-14',
  beginn: '14:00',
  boxer: [boxer('A'), boxer('B'), boxer('C')],
  kampfkarte: [{ aId: 'A', bId: 'B', freigabe: false }],
  ausfaelle: {},
  regeln: { maxGewichtProzent: 10, maxSiegdifferenzFreigabe: 5, klassenwechselFreigabe: true },
  zeit: { kampfPauseMin: 2, grossePauseMin: 30, blockMin: 120, erwachsenenRundeMin: 3 },
  extraPausen: [],
  autoPausen: {},
};

describe('Ausfall', () => {
  it('Boxer im Kampf: Kampf entfällt, Gegner wird vermerkt', () => {
    const z = meldeAusfall(start, 'B', 'Verletzung', ' Nase ');
    expect(z.kampfkarte).toEqual([]);
    expect(z.ausfaelle.B).toEqual({ grund: 'Verletzung', notiz: 'Nase', gegnerId: 'A' });
  });

  it('auch der Erstgenannte kann ausfallen', () => {
    expect(meldeAusfall(start, 'A', 'Krankheit', '').ausfaelle.A.gegnerId).toBe('B');
  });

  it('Wartender ohne Kampf: nur Eintrag, übrige Kämpfe bleiben', () => {
    const z = meldeAusfall(start, 'C', 'Sonstiges', '');
    expect(z.kampfkarte).toHaveLength(1);
    expect(z.ausfaelle.C.gegnerId).toBeUndefined();
  });

  it('Aufheben entfernt nur den Eintrag', () => {
    const z = hebeAusfallAuf(meldeAusfall(start, 'B', 'Krankheit', ''), 'B');
    expect(z.ausfaelle).toEqual({});
    expect(z.kampfkarte).toEqual([]);
  });

  it('liesZustand ergänzt fehlende Felder alter Sicherungen und verwirft ungültige Ausfälle', () => {
    const alt = { datum: '2026-11-14', boxer: start.boxer, kampfkarte: [] };
    expect(liesZustand(alt)).toMatchObject({ beginn: '14:00', ausfaelle: {} });
    const mix = {
      ...alt,
      beginn: '18:30',
      ausfaelle: { A: { grund: 'Krankheit', notiz: 'x' }, Z: { grund: 'Krankheit', notiz: '' }, B: { grund: 'Laune', notiz: '' } },
    };
    const z = liesZustand(mix)!;
    expect(z.beginn).toBe('18:30');
    expect(Object.keys(z.ausfaelle)).toEqual(['A']);
  });
});
