import { ALTERSKLASSEN, altersklasseVon, leistungsklasseVon } from './klassen';
import { paarungsGuete, pruefePaarung } from './paarung';
import type { Altersklasse, Boxer, Pruefung } from './typen';

export interface Kampf {
  /** a ist der leichtere Boxer */
  a: Boxer;
  b: Boxer;
  /** Jüngere der beiden Altersklassen, null wenn eine fehlt */
  altersklasse: Altersklasse | null;
  /** z. B. "B" oder "B/C" bei Nachbarklassen */
  leistungsklasse: string;
  pruefung: Pruefung;
}

export function juengereAltersklasse(x: Altersklasse, y: Altersklasse): Altersklasse {
  return ALTERSKLASSEN.indexOf(x) <= ALTERSKLASSEN.indexOf(y) ? x : y;
}

export function leichterZuerst(a: Boxer, b: Boxer): [Boxer, Boxer] {
  return a.gewicht < b.gewicht || (a.gewicht === b.gewicht && a.id <= b.id) ? [a, b] : [b, a];
}

/** Baut einen Kampf aus zwei beliebigen Boxern und prüft ihn gegen die Regeln. */
export function baueKampf(x: Boxer, y: Boxer, veranstaltung: string): Kampf {
  const [a, b] = leichterZuerst(x, y);
  const akA = altersklasseVon(a.geburtsdatum, veranstaltung);
  const akB = altersklasseVon(b.geburtsdatum, veranstaltung);
  const lkA = akA ? leistungsklasseVon(a, akA) : '?';
  const lkB = akB ? leistungsklasseVon(b, akB) : '?';
  return {
    a,
    b,
    altersklasse: akA && akB ? juengereAltersklasse(akA, akB) : null,
    leistungsklasse: lkA === lkB ? lkA : `${lkA}/${lkB}`,
    pruefung: pruefePaarung(a, b, veranstaltung),
  };
}

export function guete(k: Kampf, veranstaltung: string): [number, number, number] {
  return paarungsGuete(k.a, k.b, veranstaltung);
}

/** Kampfkarte: jüngste Altersklasse zuerst, darin leichtester Boxer zuerst. */
export function vergleicheKampf(
  x: { altersklasse: Altersklasse | null; a: Boxer; b: Boxer },
  y: { altersklasse: Altersklasse | null; a: Boxer; b: Boxer },
): number {
  const index = (k: Altersklasse | null) => (k ? ALTERSKLASSEN.indexOf(k) : ALTERSKLASSEN.length);
  return (
    index(x.altersklasse) - index(y.altersklasse) ||
    x.a.gewicht - y.a.gewicht ||
    x.b.gewicht - y.b.gewicht ||
    x.a.id.localeCompare(y.a.id)
  );
}
