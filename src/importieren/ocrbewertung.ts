import { liesText } from './lesen';
import type { ImportZeile, LeseErgebnis } from './typen';

/**
 * Bewertet einen erkannten Text danach, wie viele vollständige Boxerzeilen daraus entstehen.
 * Je mehr Felder pro Zeile gelesen werden, desto besser; Zeilen mit fast nichts zählen als Rauschen.
 * Damit lässt sich unter mehreren Erkennungsdurchgängen der beste auswählen.
 */
export function bewerteText(text: string, heute: Date = new Date()): number {
  const { zeilen } = liesText(text, { heute });
  let punkte = 0;
  for (const z of zeilen) {
    const felder = [z.name, z.verein, z.geburtsdatum, z.geschlecht, z.gewicht, z.kaempfe, z.siege, z.niederlagen].filter(
      (f) => f !== '',
    ).length;
    punkte += felder + (z.geburtsdatum ? 1 : 0) + (z.gewicht ? 1 : 0);
    if (felder < 3) punkte -= 2;
    // Eine stimmige Bilanz (Kämpfe mindestens Siege plus Niederlagen) ist ein starkes Zeichen für richtig gelesene Zahlen
    const bilanz = [z.kaempfe, z.siege, z.niederlagen].map(Number);
    if ([z.kaempfe, z.siege, z.niederlagen].every((f) => f !== '') && bilanz[0] >= bilanz[1] + bilanz[2]) punkte += 3;
  }
  return punkte;
}

/** Vergrößerung vor der Erkennung: Ziel sind etwa 2900 Pixel Breite, mindestens 1-fach und höchstens 4-fach. */
export function vergroesserungsfaktor(breite: number): number {
  return Math.max(1, Math.min(4, Math.round(2900 / breite)));
}

/** Durchgänge, die nacheinander versucht werden; das beste Ergebnis gewinnt. */
export const DURCHGAENGE: { linienEntfernen: boolean; parameter: Record<string, string> }[] = [
  { linienEntfernen: true, parameter: { thresholding_method: '1' } },
  { linienEntfernen: true, parameter: { thresholding_method: '0' } },
  { linienEntfernen: false, parameter: { thresholding_method: '0' } },
];

function gleicherName(a: string, b: string): boolean {
  const k = (s: string) => s.toLowerCase().replace(/[^a-zäöüß]/g, '');
  return k(a).slice(0, 3) !== '' && k(a).slice(0, 3) === k(b).slice(0, 3);
}

/**
 * Was ein Durchgang nicht gelesen hat, hat ein anderer oft gelesen (z. B. eine einzelne Zahl in der ersten Spalte).
 * Leere Felder der besten Zeilen werden aus den anderen Durchgängen gefüllt, wenn die Zeile zum selben Boxer gehört.
 */
export function ergaenzeAusAnderen(beste: LeseErgebnis, andere: LeseErgebnis[]): void {
  for (const [i, z] of beste.zeilen.entries()) {
    const quellen = andere
      .map((e) => (e.zeilen.length === beste.zeilen.length ? e.zeilen[i] : undefined))
      .filter((q): q is ImportZeile => q !== undefined && gleicherName(q.name, z.name));
    const eingefuellt: string[] = [];
    for (const feld of ['verein', 'geburtsdatum', 'geschlecht', 'gewicht'] as const) {
      if (z[feld] !== '') continue;
      // Ein Gewicht, das genau einer Zahl der Bilanz entspricht, ist meist eine verrutschte Spalte
      const verrutscht = (x: ImportZeile) =>
        feld === 'gewicht' && [z.kaempfe, z.siege, z.niederlagen, x.kaempfe, x.siege, x.niederlagen].includes(x.gewicht);
      const q = quellen.find((x) => x[feld] !== '' && !verrutscht(x));
      if (q) {
        (z as unknown as Record<string, string>)[feld] = q[feld];
        eingefuellt.push(feld);
      }
    }
    if (z.kaempfe === '' && z.siege === '' && z.niederlagen === '') {
      const q = quellen.find((x) => x.kaempfe !== '' && x.siege !== '' && x.niederlagen !== '');
      if (q) {
        z.kaempfe = q.kaempfe;
        z.siege = q.siege;
        z.niederlagen = q.niederlagen;
        z.hinweise = z.hinweise.filter((h) => !h.startsWith('Keine Kampfbilanz'));
        eingefuellt.push('Bilanz');
      }
    }
    if (eingefuellt.length > 0) z.hinweise.push(`Aus einem anderen Lesedurchgang ergänzt (${eingefuellt.join(', ')}), bitte prüfen`);
  }
}
