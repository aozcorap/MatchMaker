import { describe, expect, it } from 'vitest';
import { baueKampfkartePdf, type PdfKampf, type PdfKarte } from './pdfdoc';

const kampf = (nr: number, pause = false): PdfKampf => ({
  nr,
  start: '14:00',
  altersklasse: 'Erwachsene',
  runden: 3,
  minuten: 3,
  rot: { name: 'A', verein: 'V1', klassen: 'Erw. · 71–75 kg' },
  blau: { name: 'B', verein: 'V2', klassen: 'Erw. · 71–75 kg' },
  pausenDavor: pause ? [{ text: 'Große Pause', von: '15:30', bis: '16:00', minuten: 30 }] : [],
});

describe('Kampfkarte als PDF', () => {
  const karte: PdfKarte = { titel: 'Kampfkarte', datum: '14.11.2026', beginn: '14:00', ende: '17:00', kaempfe: [kampf(1), kampf(2, true)] };
  const doc = baueKampfkartePdf(karte);

  it('ist Querformat A4', () => {
    expect(doc.pageSize).toBe('A4');
    expect(doc.pageOrientation).toBe('landscape');
  });

  it('hat je Kampf einen Block, der mit seinen Pausen zusammenbleibt', () => {
    const inhalt = doc.content as { unbreakable?: boolean; stack: unknown[] }[];
    expect(inhalt).toHaveLength(2);
    expect(inhalt.every((b) => b.unbreakable)).toBe(true);
    expect(inhalt[0].stack).toHaveLength(1);
    expect(inhalt[1].stack).toHaveLength(2);
  });
});
