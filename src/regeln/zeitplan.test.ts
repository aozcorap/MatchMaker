import { describe, expect, it } from 'vitest';
import { kampfdauer, plane, uhrzeit, type ExtraPause } from './zeitplan';

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
    const erstePause = s.findIndex((x) => x.auto);
    expect(erstePause).toBe(10);
    expect(uhrzeit(s[9].ende)).toBe('16:08');
    expect(uhrzeit(s[10].auto!.von)).toBe('16:08');
    expect(uhrzeit(s[10].start)).toBe('16:38');
    expect(s.slice(0, 10).every((x) => !x.auto)).toBe(true);
  });

  it('der Zwei-Stunden-Takt beginnt nach der Pause neu', () => {
    const s = plane('14:00', Array(25).fill(11 * MIN));
    const pausen = s.map((x, i) => (x.auto ? i : -1)).filter((i) => i >= 0);
    expect(pausen).toEqual([10, 20]);
  });

  it('keine Pause vor dem ersten Kampf und keine am Ende', () => {
    const s = plane('14:00', [10 * 3600]);
    expect(s[0].auto).toBeNull();
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

describe('Zeitplan: anpassbare Pausen', () => {
  const kampf = 11 * MIN;
  const pause = (vorKampf: number, minuten: number, text = 'Pause'): ExtraPause => ({ id: `p${vorKampf}`, vorKampf, minuten, text });

  it('Pause zwischen Kämpfen einstellbar', () => {
    const s = plane('14:00', [kampf, kampf, kampf], { zeit: { kampfPauseMin: 5, grossePauseMin: 30, blockMin: 120, erwachsenenRundeMin: 3 } });
    expect(s.map((x) => uhrzeit(x.start))).toEqual(['14:00', '14:16', '14:32']);
  });

  it('eingefügte Pause schiebt alle folgenden Kämpfe', () => {
    const s = plane('14:00', [kampf, kampf, kampf], { extraPausen: [pause(2, 15, 'Siegerehrung')] });
    expect(s.map((x) => uhrzeit(x.start))).toEqual(['14:00', '14:28', '14:41']); // 14:11 + 2 + 15
    expect(s[1].extra).toHaveLength(1);
    expect(uhrzeit(s[1].extra[0].von)).toBe('14:13');
    expect(uhrzeit(s[1].extra[0].bis)).toBe('14:28');
    expect(s[1].extra[0].pause.text).toBe('Siegerehrung');
  });

  it('mehrere Pausen an derselben Stelle und Pause vor dem ersten Kampf', () => {
    const s = plane('14:00', [kampf, kampf], { extraPausen: [pause(1, 10, 'Eröffnung'), pause(2, 5, 'A'), pause(2, 5, 'B')] });
    expect(s.map((x) => uhrzeit(x.start))).toEqual(['14:10', '14:33']); // 14:10 + 11 = 14:21, +2, +5, +5
    expect(s[1].extra.map((e) => e.pause.text)).toEqual(['A', 'B']);
  });

  it('Pause hinter dem letzten Kampf wird ignoriert', () => {
    const s = plane('14:00', [kampf], { extraPausen: [pause(5, 30)] });
    expect(s.every((x) => x.extra.length === 0)).toBe(true);
  });

  it('automatische große Pause kann je Kampf verkürzt oder verlängert werden', () => {
    const dauern = Array(12).fill(kampf);
    const kurz = plane('14:00', dauern, { autoDauerMin: (i) => (i === 10 ? 10 : undefined) });
    expect(uhrzeit(kurz[10].auto!.bis)).toBe('16:18'); // 16:08 + 10
    const ohne = plane('14:00', dauern, { autoDauerMin: (i) => (i === 10 ? 0 : undefined) });
    expect(uhrzeit(ohne[10].start)).toBe('16:08');
  });

  it('große Pause und Blockdauer einstellbar', () => {
    const s = plane('14:00', Array(12).fill(kampf), { zeit: { kampfPauseMin: 2, grossePauseMin: 20, blockMin: 60, erwachsenenRundeMin: 3 } });
    const erste = s.findIndex((x) => x.auto);
    expect(erste).toBe(5); // 5 Kämpfe enden bei 11 + 13 * 4 = 63 Minuten
    expect(uhrzeit(s[5].auto!.bis)).toBe('15:23');
    expect(plane('14:00', Array(12).fill(kampf), { zeit: { kampfPauseMin: 2, grossePauseMin: 30, blockMin: 0, erwachsenenRundeMin: 3 } }).some((x) => x.auto)).toBe(false);
  });

  it('eine eingefügte Pause von mindestens 30 Minuten setzt den Zwei-Stunden-Takt zurück', () => {
    const dauern = Array(25).fill(kampf);
    const ohne = plane('14:00', dauern).map((x, i) => (x.auto ? i : -1)).filter((i) => i >= 0);
    expect(ohne).toEqual([10, 20]);
    const mit = plane('14:00', dauern, { extraPausen: [pause(5, 30)] }).map((x, i) => (x.auto ? i : -1)).filter((i) => i >= 0);
    expect(mit[0]).toBeGreaterThan(10); // erste automatische Pause kommt später
    const kurz = plane('14:00', dauern, { extraPausen: [pause(5, 10)] }).map((x, i) => (x.auto ? i : -1)).filter((i) => i >= 0);
    expect(kurz[0]).toBeLessThanOrEqual(10); // eine kurze Pause setzt nichts zurück
  });

  it('eine eigene Pause ab großer Pause ersetzt die automatische vor demselben Kampf (keine Doppelpause)', () => {
    const dauern = Array(15).fill(kampf);
    // Kampf 11 (Index 10) löst ohne eigene Pause die automatische große Pause aus
    expect(plane('14:00', dauern)[10].auto).not.toBeNull();
    const mit = plane('14:00', dauern, { extraPausen: [pause(11, 45)] });
    expect(mit[10].auto).toBeNull();
    expect(mit[10].extra).toHaveLength(1);
    // Beginn des Kampfes: Ende Kampf 10 + 2 min Kampfpause + 45 min eigene Pause, nicht zusätzlich 30 min
    const ohne = plane('14:00', dauern);
    const ende10 = mit[9].ende;
    expect(mit[10].start).toBe(ende10 + 2 * 60 + 45 * 60);
    expect(mit[10].start).toBeLessThan(ohne[10].start + 45 * 60);
  });
});

