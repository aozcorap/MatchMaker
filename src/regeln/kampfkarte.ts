import { ALTERSKLASSEN, altersklasseVon, leistungsklasseVon } from './klassen';
import { paarungsGuete, pruefePaarung } from './paarung';
import { STANDARD_OPTIONEN, type Altersklasse, type Boxer, type Pruefung, type RegelOptionen } from './typen';

export interface Kampf {
  /** Erstgenannter Boxer: rote Ecke */
  rot: Boxer;
  /** Gegner: blaue Ecke */
  blau: Boxer;
  /** a ist der leichtere Boxer (für Prüfung und Sortierung) */
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

/** Baut einen Kampf aus zwei Boxern und prüft ihn gegen die Regeln. x boxt in der roten, y in der blauen Ecke. */
export function baueKampf(
  x: Boxer,
  y: Boxer,
  veranstaltung: string,
  optionen: RegelOptionen = STANDARD_OPTIONEN,
): Kampf {
  const [a, b] = leichterZuerst(x, y);
  const akA = altersklasseVon(a.geburtsdatum, veranstaltung);
  const akB = altersklasseVon(b.geburtsdatum, veranstaltung);
  const lkA = akA ? leistungsklasseVon(a, akA) : '?';
  const lkB = akB ? leistungsklasseVon(b, akB) : '?';
  return {
    rot: x,
    blau: y,
    a,
    b,
    altersklasse: akA && akB ? juengereAltersklasse(akA, akB) : null,
    leistungsklasse: lkA === lkB ? lkA : `${lkA}/${lkB}`,
    pruefung: pruefePaarung(a, b, veranstaltung, optionen),
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

/** Warteliste: erst Geschlecht (Männer vor Frauen), dann Altersklasse (jung vor alt), dann Gewicht. */
export function vergleicheWartende(x: Boxer, y: Boxer, veranstaltung: string): number {
  const alter = (b: Boxer) => {
    const k = altersklasseVon(b.geburtsdatum, veranstaltung);
    return k ? ALTERSKLASSEN.indexOf(k) : ALTERSKLASSEN.length;
  };
  const geschlecht = (b: Boxer) => (b.geschlecht === 'M' ? 0 : 1);
  return (
    geschlecht(x) - geschlecht(y) ||
    alter(x) - alter(y) ||
    x.gewicht - y.gewicht ||
    x.name.localeCompare(y.name, 'de') ||
    x.id.localeCompare(y.id)
  );
}
