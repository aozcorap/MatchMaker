import type { ExtraPause } from './regeln/zeitplan';
import type { GeplanterKampf } from './speicher';

/** Verschiebt den Eintrag von Position `von` nach Position `nach` (beide ab 0, `nach` wird begrenzt). */
export function verschiebe<T>(liste: T[], von: number, nach: number): T[] {
  if (von < 0 || von >= liste.length) return liste;
  const ziel = Math.max(0, Math.min(liste.length - 1, nach));
  if (ziel === von) return liste;
  const kopie = [...liste];
  const [eintrag] = kopie.splice(von, 1);
  kopie.splice(ziel, 0, eintrag);
  return kopie;
}

/** Fügt einen Kampf vor dem ersten Eintrag ein, der laut Sortierung nach ihm kommt, sonst am Ende. */
export function fuegeSortiertEin(
  liste: GeplanterKampf[],
  neu: GeplanterKampf,
  vergleiche: (x: GeplanterKampf, y: GeplanterKampf) => number,
): GeplanterKampf[] {
  const index = liste.findIndex((k) => vergleiche(neu, k) < 0);
  return index < 0 ? [...liste, neu] : [...liste.slice(0, index), neu, ...liste.slice(index)];
}

/** Schlüssel eines Kampfes unabhängig von der Eckenwahl. */
export function kampfSchluessel(k: Pick<GeplanterKampf, 'aId' | 'bId'>): string {
  return [k.aId, k.bId].sort().join('|');
}

/** Wurden Daten eines Boxers geändert, die eine Paarung betreffen, gilt die Zustimmung der Trainer nicht mehr. */
export function hebeFreigabeAuf(kampfkarte: GeplanterKampf[], boxerId: string): GeplanterKampf[] {
  return kampfkarte.map((k) => ((k.aId === boxerId || k.bId === boxerId) && k.freigabe ? { ...k, freigabe: false } : k));
}

/**
 * Hält die eigenen Pausen an ihrem Kampf fest: Wird ein Kampf verschoben, wandert die Pause mit.
 * Fehlt der Kampf (entfernt oder noch nicht zugeordnet), bleibt die Pause an ihrer Position und hängt sich an den
 * Kampf, der jetzt dort steht. Steht sie hinter dem letzten Kampf, bleibt sie ohne Kampf stehen.
 */
export function richtePausenAus<T extends { kampfkarte: GeplanterKampf[]; extraPausen: ExtraPause[] }>(z: T): T {
  const schluessel = z.kampfkarte.map(kampfSchluessel);
  let geaendert = false;
  const extraPausen = z.extraPausen.map((p) => {
    const index = p.kampf ? schluessel.indexOf(p.kampf) : -1;
    let neu: ExtraPause;
    if (index >= 0) neu = { ...p, vorKampf: index + 1 };
    else if (p.vorKampf >= 1 && p.vorKampf <= schluessel.length) neu = { ...p, kampf: schluessel[p.vorKampf - 1] };
    else {
      neu = { ...p };
      delete neu.kampf;
    }
    if (neu.vorKampf !== p.vorKampf || neu.kampf !== p.kampf) geaendert = true;
    return neu;
  });
  return geaendert ? { ...z, extraPausen } : z;
}
