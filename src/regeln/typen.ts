export type Geschlecht = 'M' | 'W';
export type Altersklasse = 'U13' | 'U15' | 'U17' | 'U19' | 'Erwachsene';
export type Leistungsklasse = 'C' | 'B' | 'A' | 'Elite';

export interface Boxer {
  id: string;
  name: string;
  verein: string;
  /** ISO-Datum YYYY-MM-DD */
  geburtsdatum: string;
  geschlecht: Geschlecht;
  /** Meldegewicht in kg */
  gewicht: number;
  kaempfe: number;
  siege: number;
  niederlagen: number;
}

/** "über" ist ausgeschlossen, "bis" eingeschlossen; bis = null ist eine offene Klasse. */
export interface Gewichtsklasse {
  ueber: number;
  bis: number | null;
}

export interface Rundenzeit {
  runden: number;
  minuten: number;
}

export type Status = 'ok' | 'freigabe' | 'verboten';

export interface Pruefung {
  status: Status;
  /** Gründe für "verboten" oder "freigabe" */
  gruende: string[];
  hinweise: string[];
  rundenzeit?: Rundenzeit;
}

/** Einstellbare Grenzen für Paarungen (Erfahrungswerte des Veranstalters, nicht aus den WB). */
export interface RegelOptionen {
  /** Höchste Gewichtsdifferenz in Prozent des leichteren Boxers */
  maxGewichtProzent: number;
  /** Höchste Siegdifferenz bei Nachbar-Leistungsklassen (Freigabe) */
  maxSiegdifferenzFreigabe: number;
}

export const STANDARD_OPTIONEN: RegelOptionen = {
  maxGewichtProzent: 10,
  maxSiegdifferenzFreigabe: 5,
};
