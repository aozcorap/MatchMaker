import { describe, expect, it } from 'vitest';
import { filterOptionen, istAktiv, KEIN_FILTER, passt, passtEiner } from './filter';
import type { Boxer } from './regeln/typen';

const TAG = '2026-11-14';
function boxer(teil: Partial<Boxer> & { id: string }): Boxer {
  return {
    name: teil.id,
    verein: 'BC Nord',
    geburtsdatum: '2000-06-15',
    geschlecht: 'M',
    gewicht: 62,
    kaempfe: 0,
    siege: 0,
    niederlagen: 0,
    ...teil,
  };
}

const m = boxer({ id: 'm' }); // Männer, Erwachsene, 60-65
const w = boxer({ id: 'w', geschlecht: 'W', verein: 'SV Süd', gewicht: 50 }); // Frauen, 48-51
const u13 = boxer({ id: 'u13', geburtsdatum: '2015-01-01', gewicht: 41, verein: 'SV Süd' }); // U13, 40-42
const klein = boxer({ id: 'klein', geburtsdatum: '2018-01-01', gewicht: 30 }); // keine Altersklasse
const leicht = boxer({ id: 'leicht', gewicht: 40 }); // Erwachsene zu leicht

describe('Filter', () => {
  it('ohne Filter passt jeder', () => {
    expect(istAktiv(KEIN_FILTER)).toBe(false);
    expect([m, w, u13, klein].every((b) => passt(b, KEIN_FILTER, TAG))).toBe(true);
  });

  it('einzelne Kriterien', () => {
    expect(passt(m, { ...KEIN_FILTER, verein: 'BC Nord' }, TAG)).toBe(true);
    expect(passt(w, { ...KEIN_FILTER, verein: 'BC Nord' }, TAG)).toBe(false);
    expect(passt(w, { ...KEIN_FILTER, geschlecht: 'W' }, TAG)).toBe(true);
    expect(passt(m, { ...KEIN_FILTER, geschlecht: 'W' }, TAG)).toBe(false);
    expect(passt(u13, { ...KEIN_FILTER, altersklasse: 'U13' }, TAG)).toBe(true);
    expect(passt(m, { ...KEIN_FILTER, altersklasse: 'U13' }, TAG)).toBe(false);
    expect(passt(klein, { ...KEIN_FILTER, altersklasse: 'keine' }, TAG)).toBe(true);
    expect(passt(m, { ...KEIN_FILTER, gewichtsklasse: '60–65 kg' }, TAG)).toBe(true);
    expect(passt(w, { ...KEIN_FILTER, gewichtsklasse: '60–65 kg' }, TAG)).toBe(false);
    expect(passt(leicht, { ...KEIN_FILTER, gewichtsklasse: 'keine Klasse' }, TAG)).toBe(true);
  });

  it('mehrere Kriterien gelten zusammen für denselben Boxer', () => {
    const f = { ...KEIN_FILTER, verein: 'SV Süd', geschlecht: 'M' as const };
    expect(passt(u13, f, TAG)).toBe(true);
    expect(passt(w, f, TAG)).toBe(false);
    expect(passtEiner([w, m], f, TAG)).toBe(false); // einer ist Verein, der andere Geschlecht
    expect(passtEiner([w, u13], f, TAG)).toBe(true);
  });

  it('Kämpfe: mindestens ein Boxer genügt, ohne Filter immer', () => {
    expect(passtEiner([m, w], { ...KEIN_FILTER, verein: 'SV Süd' }, TAG)).toBe(true);
    expect(passtEiner([m, m], { ...KEIN_FILTER, verein: 'SV Süd' }, TAG)).toBe(false);
    expect(passtEiner([m, m], KEIN_FILTER, TAG)).toBe(true);
  });
});

describe('filterOptionen', () => {
  it('nur vorhandene Werte, sortiert', () => {
    const o = filterOptionen([m, w, u13, klein, leicht], TAG);
    expect(o.vereine).toEqual(['BC Nord', 'SV Süd']);
    expect(o.altersklassen).toEqual(['U13', 'Erwachsene', 'keine']);
    expect(o.gewichtsklassen).toEqual(['40–42 kg', '48–51 kg', '60–65 kg', 'keine Klasse']);
  });

  it('ein gesetzter, nicht mehr vorhandener Wert bleibt wählbar', () => {
    const o = filterOptionen([m], TAG, { ...KEIN_FILTER, verein: 'Alt e.V.', gewichtsklasse: '99–100 kg' });
    expect(o.vereine).toContain('Alt e.V.');
    expect(o.gewichtsklassen).toContain('99–100 kg');
  });
});
