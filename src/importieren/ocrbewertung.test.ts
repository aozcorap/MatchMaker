import { describe, expect, it } from 'vitest';
import { liesText } from './lesen';
import { ergaenzeAusAnderen } from './ocrbewertung';

const heute = new Date(Date.UTC(2026, 9, 21));

describe('ergaenzeAusAnderen', () => {
  it('füllt ein nicht gelesenes Gewicht aus einem anderen Durchgang', () => {
    const gut = liesText('Kg.\tName\tVerein\tm/w\tgeb.\tK\tS\tN\n\tAnna Test\tBC Nord\tw\t01.02.2008\t5\t3\t2', { heute });
    const andere = liesText('Kg.\tName\tVerein\tm/w\tgeb.\tK\tS\tN\n55\tAnna Test\tBC Nord\tw\t01.02.2008\t\t\t', { heute });
    expect(gut.zeilen[0].gewicht).toBe('');
    ergaenzeAusAnderen(gut, [andere]);
    expect(gut.zeilen[0].gewicht).toBe('55');
    expect(gut.zeilen[0].kaempfe).toBe('5');
  });

  it('ergänzt nichts bei anderem Namen', () => {
    const a = liesText('Kg.\tName\tVerein\tm/w\tgeb.\n\tAnna Test\tBC Nord\tw\t01.02.2008', { heute });
    const b = liesText('Kg.\tName\tVerein\tm/w\tgeb.\n55\tPeter Fremd\tBC Nord\tw\t01.02.2008', { heute });
    ergaenzeAusAnderen(a, [b]);
    expect(a.zeilen[0].gewicht).toBe('');
  });
});
