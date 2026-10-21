import { describe, expect, it } from 'vitest';
import { erzeugePaarungen } from './generator';
import type { Boxer } from './typen';

const TAG = '2026-11-14';
let n = 0;
function boxer(teil: Partial<Boxer> & { id: string }): Boxer {
  n += 1;
  return {
    name: `Boxer ${teil.id}`,
    verein: `Verein ${n}`,
    geburtsdatum: '2000-06-15',
    geschlecht: 'M',
    gewicht: 70,
    kaempfe: 5,
    siege: 3,
    niederlagen: 2,
    ...teil,
  };
}

describe('erzeugePaarungen', () => {
  it('bildet Paar mit kleinster Gewichtsdifferenz, der Rest wartet', () => {
    const r = erzeugePaarungen(
      [boxer({ id: 'A', gewicht: 70 }), boxer({ id: 'B', gewicht: 71 }), boxer({ id: 'C', gewicht: 74 })],
      TAG,
    );
    expect(r.paarungen).toHaveLength(1);
    expect([r.paarungen[0].a.id, r.paarungen[0].b.id]).toEqual(['A', 'B']);
    expect(r.warteliste.map((w) => w.boxer.id)).toEqual(['C']);
    expect(r.warteliste[0].grund).toBe('Alle passenden Gegner sind bereits vergeben');
  });

  it('Qualität geht vor Anzahl: beste Paarung zuerst, auch wenn dadurch jemand wartet', () => {
    // B-C (1 kg) ist besser als A-B (3 kg); A bleibt übrig
    const r = erzeugePaarungen(
      [boxer({ id: 'A', gewicht: 70 }), boxer({ id: 'B', gewicht: 73 }), boxer({ id: 'C', gewicht: 74 })],
      TAG,
    );
    expect([r.paarungen[0].a.id, r.paarungen[0].b.id]).toEqual(['B', 'C']);
  });

  it('bei gleichem Gewicht entscheidet die Siegzahl', () => {
    const r = erzeugePaarungen(
      [
        boxer({ id: 'A', gewicht: 70, siege: 2 }),
        boxer({ id: 'B', gewicht: 70, siege: 6 }),
        boxer({ id: 'C', gewicht: 70, siege: 3 }),
      ],
      TAG,
    );
    expect([r.paarungen[0].a.id, r.paarungen[0].b.id].sort()).toEqual(['A', 'C']);
  });

  it('nie zwei Boxer desselben Vereins', () => {
    const r = erzeugePaarungen(
      [boxer({ id: 'A', verein: 'BC Nord' }), boxer({ id: 'B', verein: 'BC Nord' })],
      TAG,
    );
    expect(r.paarungen).toHaveLength(0);
    expect(r.warteliste).toHaveLength(2);
    expect(r.warteliste[0].grund).toBe('Kein passender Gegner gemeldet');
  });

  it('Kampfkarte: jüngste Altersklasse zuerst, darin leichteste zuerst', () => {
    const r = erzeugePaarungen(
      [
        boxer({ id: 'E1', gewicht: 60 }),
        boxer({ id: 'E2', gewicht: 61 }),
        boxer({ id: 'K1', geburtsdatum: '2015-03-01', gewicht: 45 }), // U13
        boxer({ id: 'K2', geburtsdatum: '2015-04-01', gewicht: 46 }),
        boxer({ id: 'J1', geburtsdatum: '2010-03-01', gewicht: 58 }), // U17
        boxer({ id: 'J2', geburtsdatum: '2010-04-01', gewicht: 59 }),
        boxer({ id: 'K3', geburtsdatum: '2015-03-02', gewicht: 40 }), // U13, leichter
        boxer({ id: 'K4', geburtsdatum: '2015-03-03', gewicht: 41 }),
      ],
      TAG,
    );
    expect(r.paarungen.map((p) => [p.nr, p.altersklasse, p.a.id])).toEqual([
      [1, 'U13', 'K3'],
      [2, 'U13', 'K1'],
      [3, 'U17', 'J1'],
      [4, 'Erwachsene', 'E1'],
    ]);
  });

  it('Rundenzeit der jüngeren Klasse bei gemischter Paarung', () => {
    const r = erzeugePaarungen(
      [
        boxer({ id: 'A', geburtsdatum: '2010-09-01', gewicht: 60 }), // U17
        boxer({ id: 'B', geburtsdatum: '2009-09-01', gewicht: 61 }), // U19
      ],
      TAG,
    );
    expect(r.paarungen[0].altersklasse).toBe('U17');
    expect(r.paarungen[0].rundenzeit.minuten).toBe(2);
  });

  it('Boxer ohne Klasse kommen mit Grund auf die Warteliste', () => {
    const r = erzeugePaarungen(
      [
        boxer({ id: 'L', gewicht: 44 }), // Männer unter 47 kg
        boxer({ id: 'K', geburtsdatum: '2018-01-01', gewicht: 30 }), // unter 10
      ],
      TAG,
    );
    expect(r.warteliste.map((w) => w.grund)).toEqual([
      'Keine Gewichtsklasse (zu leicht)',
      'Keine Altersklasse (unter 10 Jahre)',
    ]);
  });

  it('Nachbar-Leistungsklassen nur als Vorschlag, nie in der Kampfkarte', () => {
    const r = erzeugePaarungen(
      [boxer({ id: 'C', siege: 4 }), boxer({ id: 'B', siege: 8 })],
      TAG,
    );
    expect(r.paarungen).toHaveLength(0);
    expect(r.freigabeVorschlaege).toHaveLength(1);
    expect(r.warteliste.every((w) => w.freigabeMoeglich)).toBe(true);
  });

  it('Ergebnis ist unabhängig von der Eingabereihenfolge', () => {
    const liste = [
      boxer({ id: 'A', gewicht: 70 }),
      boxer({ id: 'B', gewicht: 70 }),
      boxer({ id: 'C', gewicht: 70 }),
      boxer({ id: 'D', gewicht: 70 }),
    ];
    const paare = (l: Boxer[]) =>
      erzeugePaarungen(l, TAG).paarungen.map((p) => [p.a.id, p.b.id].sort().join('-'));
    expect(paare([...liste].reverse())).toEqual(paare(liste));
  });

  it('leere Eingabe', () => {
    expect(erzeugePaarungen([], TAG)).toEqual({ paarungen: [], warteliste: [], freigabeVorschlaege: [] });
  });
});
