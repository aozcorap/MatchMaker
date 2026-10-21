import type { Boxer } from './regeln/typen';

export interface GeplanterKampf {
  aId: string;
  bId: string;
  /** Freigabe für Nachbar-Leistungsklassen liegt vor */
  freigabe: boolean;
}

export interface Zustand {
  datum: string;
  boxer: Boxer[];
  kampfkarte: GeplanterKampf[];
}

const SCHLUESSEL = 'matchmaker-v1';

export function heute(): string {
  return new Date().toISOString().slice(0, 10);
}

export function leererZustand(): Zustand {
  return { datum: heute(), boxer: [], kampfkarte: [] };
}

/** Prüft grob die Form, damit kaputte Dateien die App nicht lahmlegen. */
export function liesZustand(roh: unknown): Zustand | null {
  if (!roh || typeof roh !== 'object') return null;
  const z = roh as Partial<Zustand>;
  if (typeof z.datum !== 'string' || !Array.isArray(z.boxer) || !Array.isArray(z.kampfkarte)) {
    return null;
  }
  const ids = new Set<string>();
  for (const b of z.boxer) {
    if (!b || typeof b.id !== 'string' || typeof b.geburtsdatum !== 'string') return null;
    if (typeof b.gewicht !== 'number' || (b.geschlecht !== 'M' && b.geschlecht !== 'W')) return null;
    ids.add(b.id);
  }
  const kampfkarte = z.kampfkarte.filter(
    (k) => k && ids.has(k.aId) && ids.has(k.bId) && k.aId !== k.bId,
  );
  return { datum: z.datum, boxer: z.boxer, kampfkarte };
}

export function laden(): Zustand {
  try {
    const text = localStorage.getItem(SCHLUESSEL);
    if (text) return liesZustand(JSON.parse(text)) ?? leererZustand();
  } catch {
    // Speicher nicht verfügbar oder beschädigt: leer starten
  }
  return leererZustand();
}

export function speichern(z: Zustand): void {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(z));
  } catch {
    // z. B. privater Modus: App läuft weiter, nur ohne Speicherung
  }
}

export function exportiere(z: Zustand): void {
  const blob = new Blob([JSON.stringify(z, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `matchmaking-${z.datum}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
