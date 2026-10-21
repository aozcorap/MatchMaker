import type { Boxer } from './regeln/typen';
import { simulation } from './testdaten';
import { DEMO } from './umgebung';

export interface GeplanterKampf {
  aId: string;
  bId: string;
  /** Freigabe für Nachbar-Leistungsklassen liegt vor */
  freigabe: boolean;
}

export type AusfallGrund = 'Verletzung' | 'Krankheit' | 'Sonstiges';
export const AUSFALL_GRUENDE: AusfallGrund[] = ['Verletzung', 'Krankheit', 'Sonstiges'];

export interface Ausfall {
  grund: AusfallGrund;
  notiz: string;
  /** Gegner, dessen Kampf dadurch entfallen ist */
  gegnerId?: string;
}

export interface Zustand {
  datum: string;
  /** Beginn der Veranstaltung, HH:MM */
  beginn: string;
  boxer: Boxer[];
  kampfkarte: GeplanterKampf[];
  /** Ausgefallene Boxer nach ID */
  ausfaelle: Record<string, Ausfall>;
}

export const STANDARD_BEGINN = '14:00';

const SCHLUESSEL = 'matchmaker-v1';

export function heute(): string {
  return new Date().toISOString().slice(0, 10);
}

export function leererZustand(): Zustand {
  return { datum: heute(), beginn: STANDARD_BEGINN, boxer: [], kampfkarte: [], ausfaelle: {} };
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
  const beginn = typeof z.beginn === 'string' && /^\d{1,2}:\d{2}$/.test(z.beginn) ? z.beginn : STANDARD_BEGINN;
  const ausfaelle: Record<string, Ausfall> = {};
  for (const [id, a] of Object.entries(z.ausfaelle ?? {})) {
    if (ids.has(id) && a && AUSFALL_GRUENDE.includes(a.grund)) {
      ausfaelle[id] = { grund: a.grund, notiz: typeof a.notiz === 'string' ? a.notiz : '', gegnerId: a.gegnerId };
    }
  }
  return { datum: z.datum, beginn, boxer: z.boxer, kampfkarte, ausfaelle };
}

export function laden(): Zustand {
  if (DEMO) return simulation(true);
  try {
    const text = localStorage.getItem(SCHLUESSEL);
    if (text) return liesZustand(JSON.parse(text)) ?? leererZustand();
  } catch {
    // Speicher nicht verfügbar oder beschädigt: leer starten
  }
  return leererZustand();
}

export function speichern(z: Zustand): void {
  if (DEMO) return;
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
