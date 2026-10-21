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
