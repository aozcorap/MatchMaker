import simulationJson from '../testdaten/meldungen-simulation.json';
import { erzeugePaarungen } from './regeln/generator';
import type { Boxer } from './regeln/typen';
import type { Zustand } from './speicher';

const roh = simulationJson as unknown as { datum: string; boxer: Boxer[] };

/** Simulierte Meldungen von 9 erfundenen Vereinen, optional mit bereits erzeugter Kampfkarte. */
export function simulation(mitKampfkarte: boolean): Zustand {
  const kampfkarte = mitKampfkarte
    ? erzeugePaarungen(roh.boxer, roh.datum).paarungen.map((p) => ({
        aId: p.a.id,
        bId: p.b.id,
        freigabe: false,
      }))
    : [];
  return { datum: roh.datum, boxer: roh.boxer, kampfkarte };
}
