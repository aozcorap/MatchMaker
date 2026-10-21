import type {
  Altersklasse,
  Boxer,
  Geschlecht,
  Gewichtsklasse,
  Leistungsklasse,
  Rundenzeit,
} from './typen';

/** Reihenfolge von jung nach alt (auch Reihenfolge der Kampfkarte, §11). */
export const ALTERSKLASSEN: Altersklasse[] = ['U13', 'U15', 'U17', 'U19', 'Erwachsene'];

export function jahrVon(iso: string): number {
  return Number(iso.slice(0, 4));
}

/** Altersklasse = Jahr der Veranstaltung minus Geburtsjahr (§11). Unter 10: keine Klasse. */
export function altersklasseVon(geburtsdatum: string, veranstaltung: string): Altersklasse | null {
  const alter = jahrVon(veranstaltung) - jahrVon(geburtsdatum);
  if (alter < 10) return null;
  if (alter <= 12) return 'U13';
  if (alter <= 14) return 'U15';
  if (alter <= 16) return 'U17';
  if (alter <= 18) return 'U19';
  return 'Erwachsene';
}

export function istJugend(ak: Altersklasse): boolean {
  return ak !== 'Erwachsene';
}

// Gewichtsklassen nach §19: Grenzen aufsteigend, die letzte Klasse ist offen.
const GRENZEN_ERW_M = [47, 50, 55, 60, 65, 70, 75, 80, 85, 90];
const GRENZEN_ERW_W = [45, 48, 51, 54, 57, 60, 65, 70, 75, 80];
const GRENZEN_U17 = [40, 42, 44, 46, 48, 50, 52, 54, 57, 60, 63, 66, 70, 75, 80];
const GRENZEN_U15_U13 = [38, ...GRENZEN_U17];

function klassenAus(grenzen: number[]): Gewichtsklasse[] {
  return grenzen.map((ueber, i) => ({ ueber, bis: grenzen[i + 1] ?? null }));
}

function tabelleFuer(ak: Altersklasse, geschlecht: Geschlecht): Gewichtsklasse[] {
  switch (ak) {
    case 'U13':
    case 'U15':
      return klassenAus(GRENZEN_U15_U13);
    case 'U17':
      return klassenAus(GRENZEN_U17);
    default: // U19 und Erwachsene nutzen die Männer-/Frauentabelle
      return klassenAus(geschlecht === 'M' ? GRENZEN_ERW_M : GRENZEN_ERW_W);
  }
}

/** null = unter der untersten Klasse ("keine Klasse"). */
export function gewichtsklasseVon(
  gewicht: number,
  ak: Altersklasse,
  geschlecht: Geschlecht,
): Gewichtsklasse | null {
  const g = Math.round(gewicht * 10);
  return (
    tabelleFuer(ak, geschlecht).find(
      (k) => g > Math.round(k.ueber * 10) && (k.bis === null || g <= Math.round(k.bis * 10)),
    ) ?? null
  );
}

export function gleicheGewichtsklasse(a: Gewichtsklasse, b: Gewichtsklasse): boolean {
  return a.ueber === b.ueber && a.bis === b.bis;
}

/** Klassenbreite in Zehntel-kg; null bei offener Klasse. */
export function breiteZehntel(k: Gewichtsklasse): number | null {
  return k.bis === null ? null : Math.round((k.bis - k.ueber) * 10);
}

/** §22: Runden je Altersklasse. */
export function rundenzeitFuer(ak: Altersklasse): Rundenzeit {
  switch (ak) {
    case 'U13':
      return { runden: 3, minuten: 1 };
    case 'U15':
      return { runden: 3, minuten: 1.5 };
    case 'U17':
      return { runden: 3, minuten: 2 };
    default:
      return { runden: 3, minuten: 3 };
  }
}

/** §12: C unter 7 Siege, B bis 14, A über 14. Elite: Erwachsenenklasse und über 25 Siege. */
export function leistungsklasseVon(boxer: Boxer, ak: Altersklasse): Leistungsklasse {
  if (ak === 'Erwachsene' && boxer.siege > 25) return 'Elite';
  if (boxer.siege < 7) return 'C';
  if (boxer.siege <= 14) return 'B';
  return 'A';
}
