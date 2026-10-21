import type { Rundenzeit } from './typen';

/** Alle Zeiten intern in Sekunden; Uhrzeiten als Sekunden seit Mitternacht. */
export const PAUSE_ZWISCHEN_RUNDEN = 60; // §22: eine Minute zwischen den Runden

export interface Zeiteinstellungen {
  /** Pause zwischen zwei Kämpfen, Minuten */
  kampfPauseMin: number;
  /** Große Pause, Minuten */
  grossePauseMin: number;
  /** Nach so vielen Minuten Wettkampf folgt die große Pause */
  blockMin: number;
  /** Minuten je Runde bei U19 und Erwachsenen (WB: 3, viele Veranstaltungen boxen 2) */
  erwachsenenRundeMin: number;
}

export const STANDARD_ZEIT: Zeiteinstellungen = { kampfPauseMin: 2, grossePauseMin: 30, blockMin: 120, erwachsenenRundeMin: 3 };

/** Vom Veranstalter eingefügte Pause vor dem Kampf an Position `vorKampf` (ab 1). */
export interface ExtraPause {
  id: string;
  vorKampf: number;
  minuten: number;
  text: string;
}

export interface Zeitslot {
  start: number;
  ende: number;
  /** Automatische große Pause unmittelbar vor diesem Kampf */
  auto: { von: number; bis: number } | null;
  /** Eingefügte Pausen vor diesem Kampf, in der Reihenfolge der Liste */
  extra: { pause: ExtraPause; von: number; bis: number }[];
}

/** Dauer eines Kampfes inklusive der Pausen zwischen den Runden. */
export function kampfdauer(r: Rundenzeit): number {
  return Math.round(r.runden * r.minuten * 60) + (r.runden - 1) * PAUSE_ZWISCHEN_RUNDEN;
}

export function parseUhrzeit(text: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text);
  // Ungültige Eingaben wie "29:99" fallen auf die Standardzeit zurück
  return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? Number(m[1]) * 3600 + Number(m[2]) * 60 : 14 * 3600;
}

/** HH:MM, auf die nächste Minute gerundet. */
export function uhrzeit(sekunden: number): string {
  const minuten = Math.round(sekunden / 60) % (24 * 60);
  return `${String(Math.floor(minuten / 60)).padStart(2, '0')}:${String(minuten % 60).padStart(2, '0')}`;
}

/**
 * Zeitplan. Zwischen zwei Kämpfen liegt die Kampfpause. Sind seit Beginn (oder seit der letzten großen
 * Pause) die eingestellten Minuten Wettkampf vergangen, folgt nach dem laufenden Kampf die große Pause.
 * Eingefügte Pausen kommen zusätzlich dazu; eine mindestens so lange wie die große Pause setzt den Takt zurück.
 */
export function plane(
  beginn: string,
  dauern: number[],
  optionen: {
    zeit?: Zeiteinstellungen;
    extraPausen?: ExtraPause[];
    /** Eigene Dauer (Minuten) der automatischen Pause vor dem Kampf mit diesem Index */
    autoDauerMin?: (index: number) => number | undefined;
  } = {},
): Zeitslot[] {
  const zeit = optionen.zeit ?? STANDARD_ZEIT;
  const extraPausen = optionen.extraPausen ?? [];
  const slots: Zeitslot[] = [];
  let blockStart = parseUhrzeit(beginn);

  dauern.forEach((dauer, i) => {
    let t = blockStart;
    let auto: Zeitslot['auto'] = null;
    if (i > 0) {
      const vorherEnde = slots[i - 1].ende;
      // Liegt vor diesem Kampf schon eine eigene Pause von mindestens der großen Pause, ersetzt sie die automatische
      const langeExtra = extraPausen.some((p) => p.vorKampf === i + 1 && p.minuten >= zeit.grossePauseMin);
      if (zeit.blockMin > 0 && vorherEnde - blockStart >= zeit.blockMin * 60 && !langeExtra) {
        const minuten = optionen.autoDauerMin?.(i) ?? zeit.grossePauseMin;
        auto = { von: vorherEnde, bis: vorherEnde + minuten * 60 };
        t = auto.bis;
        blockStart = t;
      } else {
        t = vorherEnde + zeit.kampfPauseMin * 60;
      }
    }
    const extra: Zeitslot['extra'] = [];
    for (const pause of extraPausen.filter((p) => p.vorKampf === i + 1)) {
      const von = t;
      t += pause.minuten * 60;
      extra.push({ pause, von, bis: t });
      if (pause.minuten >= zeit.grossePauseMin) blockStart = t;
    }
    slots.push({ start: t, ende: t + dauer, auto, extra });
  });
  return slots;
}
