/** Eine eingelesene Zeile vor der Übernahme; alle Felder sind Text, damit sie in der Prüfansicht bearbeitet werden können. */
export interface ImportZeile {
  id: string;
  /** Ursprünglicher Text, zum Vergleichen */
  quelle: string;
  name: string;
  verein: string;
  /** ISO-Datum JJJJ-MM-TT oder leer */
  geburtsdatum: string;
  geschlecht: '' | 'M' | 'W';
  gewicht: string;
  kaempfe: string;
  siege: string;
  niederlagen: string;
  /** Hinweise vom Einlesen, z. B. "Kämpfe aus Siegen und Niederlagen berechnet" */
  hinweise: string[];
}

export interface LeseErgebnis {
  zeilen: ImportZeile[];
  /** Zeilen ohne Boxerdaten (Begrüßung, Grüße usw.) */
  ignoriert: string[];
}
