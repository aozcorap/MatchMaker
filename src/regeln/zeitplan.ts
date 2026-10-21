import type { Rundenzeit } from './typen';

/** Alle Zeiten in Sekunden; Uhrzeiten als Sekunden seit Mitternacht. */
export const PAUSE_ZWISCHEN_RUNDEN = 60; // §22: eine Minute zwischen den Runden
export const PAUSE_ZWISCHEN_KAEMPFEN = 2 * 60;
export const BLOCKDAUER = 2 * 60 * 60;
export const GROSSE_PAUSE = 30 * 60;

export interface Zeitslot {
  start: number;
  ende: number;
  /** Große Pause unmittelbar vor diesem Kampf */
  pauseVorher: { von: number; bis: number } | null;
}

/** Dauer eines Kampfes inklusive der Pausen zwischen den Runden. */
export function kampfdauer(r: Rundenzeit): number {
  return Math.round(r.runden * r.minuten * 60) + (r.runden - 1) * PAUSE_ZWISCHEN_RUNDEN;
}

export function parseUhrzeit(text: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 : 14 * 3600;
}

/** HH:MM, auf die nächste Minute gerundet. */
export function uhrzeit(sekunden: number): string {
  const minuten = Math.round(sekunden / 60) % (24 * 60);
  return `${String(Math.floor(minuten / 60)).padStart(2, '0')}:${String(minuten % 60).padStart(2, '0')}`;
}

/**
 * Zeitplan: zwischen zwei Kämpfen 2 Minuten. Sind seit Beginn (oder seit der letzten großen Pause)
 * 2 Stunden Wettkampf vergangen, folgt nach dem laufenden Kampf eine Pause von 30 Minuten.
 */
export function plane(beginn: string, dauern: number[]): Zeitslot[] {
  const slots: Zeitslot[] = [];
  let blockStart = parseUhrzeit(beginn);
  dauern.forEach((dauer, i) => {
    let start = blockStart;
    let pauseVorher: Zeitslot['pauseVorher'] = null;
    if (i > 0) {
      const vorherEnde = slots[i - 1].ende;
      if (vorherEnde - blockStart >= BLOCKDAUER) {
        pauseVorher = { von: vorherEnde, bis: vorherEnde + GROSSE_PAUSE };
        start = pauseVorher.bis;
        blockStart = start;
      } else {
        start = vorherEnde + PAUSE_ZWISCHEN_KAEMPFEN;
      }
    }
    slots.push({ start, ende: start + dauer, pauseVorher });
  });
  return slots;
}
