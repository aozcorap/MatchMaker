import { describe, expect, it } from 'vitest';
import { erzeugePaarungen as erzeuge } from './generator';
import { baueKampf as baue, vergleicheWartende } from './kampfkarte';
import { STANDARD_OPTIONEN, type Boxer, type RegelOptionen } from './typen';

const TAG = '2026-11-14';
const LOCKER: RegelOptionen = { ...STANDARD_OPTIONEN, klassenwechselFreigabe: false };
const erzeugePaarungen = (b: Boxer[], t: string, o: RegelOptionen = LOCKER) => erzeuge(b, t, o);
const baueKampf = (a: Boxer, b: Boxer, t: string, o: RegelOptionen = LOCKER) => baue(a, b, t, o);
function boxer(teil: Partial<Boxer> & { id: string }): Boxer {
  return {
    name: teil.id,
    verein: `Verein ${teil.id}`,
    geburtsdatum: '2000-06-15',
    geschlecht: 'M',
    gewicht: 70,
    kaempfe: 5,
    siege: 3,
    niederlagen: 2,
    ...teil,
  };
}

describe('Ecken', () => {
  it('der Erstgenannte boxt in der roten Ecke, auch wenn er schwerer ist', () => {
    const schwer = boxer({ id: 'S', gewicht: 72 });
    const leicht = boxer({ id: 'L', gewicht: 70 });
    const k = baueKampf(schwer, leicht, TAG);
    expect(k.rot.id).toBe('S');
    expect(k.blau.id).toBe('L');
    const umgekehrt = baueKampf(leicht, schwer, TAG);
    expect(umgekehrt.rot.id).toBe('L');
    expect(umgekehrt.pruefung.status).toBe(k.pruefung.status);
  });

  it('der Generator nennt den leichteren Boxer zuerst (rot)', () => {
    const r = erzeugePaarungen([boxer({ id: 'S', gewicht: 72 }), boxer({ id: 'L', gewicht: 70 })], TAG);
    expect(r.paarungen[0].a.id).toBe('L');
  });
});

describe('Warteliste sortieren', () => {
  it('Geschlecht, dann Altersklasse, dann Gewicht', () => {
    const liste = [
      boxer({ id: 'W-erw-60', geschlecht: 'W', gewicht: 60 }),
      boxer({ id: 'M-erw-90', gewicht: 90 }),
      boxer({ id: 'M-u13-50', geburtsdatum: '2015-01-01', gewicht: 50 }),
      boxer({ id: 'W-u13-40', geschlecht: 'W', geburtsdatum: '2015-01-01', gewicht: 40 }),
      boxer({ id: 'M-erw-60', gewicht: 60 }),
      boxer({ id: 'M-u13-40', geburtsdatum: '2015-01-01', gewicht: 40 }),
      boxer({ id: 'M-klein', geburtsdatum: '2018-01-01', gewicht: 30 }),
    ];
    const ids = [...liste].sort((x, y) => vergleicheWartende(x, y, TAG)).map((b) => b.id);
    expect(ids).toEqual([
      'M-u13-40',
      'M-u13-50',
      'M-erw-60',
      'M-erw-90',
      'M-klein', // keine Altersklasse zuletzt
      'W-u13-40',
      'W-erw-60',
    ]);
  });

  it('die Warteliste des Generators ist so sortiert', () => {
    const r = erzeugePaarungen(
      [
        boxer({ id: 'W', geschlecht: 'W', gewicht: 50 }),
        boxer({ id: 'M2', gewicht: 90 }),
        boxer({ id: 'M1', gewicht: 60 }),
      ],
      TAG,
    );
    expect(r.warteliste.map((w) => w.boxer.id)).toEqual(['M1', 'M2', 'W']);
  });
});
