import { describe, expect, it } from 'vitest';
import { baueKampfkartePdf, einzeilig, type PdfKampf, type PdfKarte } from './pdfdoc';

const kampf = (nr: number, pause = false): PdfKampf => ({
  nr,
  start: '14:00',
  klasse: 'Männer B',
  rot: { name: 'A', verein: 'V1', gewicht: 72.5 },
  blau: { name: 'B', verein: 'V2', gewicht: 73 },
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

describe('einzeilig', () => {
  it('lässt kurze Texte unverändert groß', () => {
    expect(einzeilig('Max Mustermann', 160, 9, true)).toEqual({ text: 'Max\u00a0Mustermann', fontSize: 9 });
  });

  it('verkleinert lange Texte und kürzt sie zuletzt mit …', () => {
    const lang = 'Maximilian Mustermann-Schmidt-Beispiel-Hintertupfingen';
    const e = einzeilig(lang, 160, 9, true);
    expect(e.fontSize).toBeLessThan(9);
    expect(e.text.endsWith('…')).toBe(true);
    expect(e.text.length).toBeLessThan(lang.length);
  });

  it('enthält keine normalen Leerzeichen, an denen umgebrochen werden könnte', () => {
    expect(einzeilig('BC Beispielstadt e.V.', 100, 8).text).not.toContain(' ');
  });
});
