import { describe, expect, it } from 'vitest';
import { kampfdauer, plane, uhrzeit } from './zeitplan';

const MIN = 60;

describe('Kampfdauer', () => {
  it('Runden plus eine Minute Pause zwischen den Runden', () => {
    expect(kampfdauer({ runden: 3, minuten: 3 })).toBe(11 * MIN);
    expect(kampfdauer({ runden: 3, minuten: 2 })).toBe(8 * MIN);
    expect(kampfdauer({ runden: 3, minuten: 1.5 })).toBe(6.5 * MIN);
    expect(kampfdauer({ runden: 3, minuten: 1 })).toBe(5 * MIN);
  });
});

describe('Zeitplan', () => {
  it('zwei Minuten zwischen den Kämpfen', () => {
    const s = plane('14:00', [11 * MIN, 11 * MIN, 8 * MIN]);
    expect(s.map((x) => uhrzeit(x.start))).toEqual(['14:00', '14:13', '14:26']);
    expect(uhrzeit(s[2].ende)).toBe('14:34');
  });

  it('nach zwei Stunden folgt eine Pause von 30 Minuten', () => {
    // Kampf n beginnt bei 13 * n Minuten und endet 11 Minuten später; 10 Kämpfe enden bei 128 Minuten.
    const s = plane('14:00', Array(12).fill(11 * MIN));
    const erstePause = s.findIndex((x) => x.pauseVorher);
    expect(erstePause).toBe(10);
    expect(uhrzeit(s[9].ende)).toBe('16:08');
    expect(uhrzeit(s[10].pauseVorher!.von)).toBe('16:08');
    expect(uhrzeit(s[10].start)).toBe('16:38');
    expect(s.slice(0, 10).every((x) => !x.pauseVorher)).toBe(true);
  });

  it('der Zwei-Stunden-Takt beginnt nach der Pause neu', () => {
    const s = plane('14:00', Array(25).fill(11 * MIN));
    const pausen = s.map((x, i) => (x.pauseVorher ? i : -1)).filter((i) => i >= 0);
    expect(pausen).toEqual([10, 20]);
  });

  it('keine Pause vor dem ersten Kampf und keine am Ende', () => {
    const s = plane('14:00', [10 * 3600]);
    expect(s[0].pauseVorher).toBeNull();
    expect(s).toHaveLength(1);
  });

  it('Uhrzeit rundet auf die Minute und läuft über Mitternacht', () => {
    expect(uhrzeit(14 * 3600 + 30)).toBe('14:01');
    expect(uhrzeit(23 * 3600 + 59 * 60 + 40)).toBe('00:00');
  });

  it('leere Liste und ungültige Startzeit', () => {
    expect(plane('14:00', [])).toEqual([]);
    expect(uhrzeit(plane('kaputt', [MIN])[0].start)).toBe('14:00');
  });
});
