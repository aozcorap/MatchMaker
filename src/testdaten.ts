import simulationJson from '../testdaten/meldungen-simulation.json';
import { erzeugePaarungen } from './regeln/generator';
import { STANDARD_OPTIONEN } from './regeln/typen';
import { STANDARD_ZEIT } from './regeln/zeitplan';
import type { Boxer } from './regeln/typen';
import { STANDARD_BEGINN, type Zustand } from './speicher';

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
  return { datum: roh.datum, beginn: STANDARD_BEGINN, boxer: roh.boxer, kampfkarte, ausfaelle: {}, regeln: { ...STANDARD_OPTIONEN },
    zeit: { ...STANDARD_ZEIT },
    extraPausen: [],
    autoPausen: {},
  };
}
