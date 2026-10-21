import { ALTERSKLASSEN } from './regeln/klassen';
import { boxerInfo, gewichtsklasseText } from './regeln/info';
import type { Altersklasse, Boxer, Geschlecht } from './regeln/typen';

export interface Filter {
  verein: string;
  geschlecht: '' | Geschlecht;
  altersklasse: '' | Altersklasse | 'keine';
  /** Beschriftung der Gewichtsklasse, z. B. "60–65 kg" oder "keine Klasse" */
  gewichtsklasse: string;
}

export const KEIN_FILTER: Filter = { verein: '', geschlecht: '', altersklasse: '', gewichtsklasse: '' };

export function istAktiv(f: Filter): boolean {
  return Object.values(f).some((v) => v !== '');
}

/** Alle gesetzten Kriterien müssen für denselben Boxer zutreffen. */
export function passt(b: Boxer, f: Filter, veranstaltung: string): boolean {
  if (f.verein && b.verein !== f.verein) return false;
  if (f.geschlecht && b.geschlecht !== f.geschlecht) return false;
  const info = boxerInfo(b, veranstaltung);
  if (f.altersklasse && (info.altersklasse ?? 'keine') !== f.altersklasse) return false;
  if (f.gewichtsklasse && gewichtsklasseText(info.gewichtsklasse) !== f.gewichtsklasse) return false;
  return true;
}

/** Für Kämpfe und Paarungen: mindestens ein Boxer erfüllt alle Kriterien. */
export function passtEiner(boxer: Boxer[], f: Filter, veranstaltung: string): boolean {
  return !istAktiv(f) || boxer.some((b) => passt(b, f, veranstaltung));
}

export interface FilterOptionen {
  vereine: string[];
  altersklassen: (Altersklasse | 'keine')[];
  gewichtsklassen: string[];
}

/** Auswahlmöglichkeiten aus den vorhandenen Boxern; ein gesetzter, aber nicht mehr vorhandener Wert bleibt wählbar. */
export function filterOptionen(boxer: Boxer[], veranstaltung: string, aktuell: Filter = KEIN_FILTER): FilterOptionen {
  const vereine = new Set<string>();
  const alter = new Set<string>();
  const gewicht = new Map<string, number>();
  for (const b of boxer) {
    vereine.add(b.verein);
    const info = boxerInfo(b, veranstaltung);
    alter.add(info.altersklasse ?? 'keine');
    const text = gewichtsklasseText(info.gewichtsklasse);
    gewicht.set(text, info.gewichtsklasse?.ueber ?? Number.POSITIVE_INFINITY);
  }
  if (aktuell.verein) vereine.add(aktuell.verein);
  if (aktuell.altersklasse) alter.add(aktuell.altersklasse);
  if (aktuell.gewichtsklasse && !gewicht.has(aktuell.gewichtsklasse)) gewicht.set(aktuell.gewichtsklasse, Number.POSITIVE_INFINITY);
  return {
    vereine: [...vereine].sort((a, b) => a.localeCompare(b, 'de')),
    altersklassen: [...ALTERSKLASSEN, 'keine' as const].filter((k) => alter.has(k)),
    gewichtsklassen: [...gewicht].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], 'de')).map(([text]) => text),
  };
}
