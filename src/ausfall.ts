import type { AusfallGrund, Zustand } from './speicher';

/**
 * Meldet einen Boxer als Ausfall. Steht er in einem Kampf, entfällt dieser Kampf,
 * und der Gegner kommt zurück auf die Warteliste.
 */
export function meldeAusfall(z: Zustand, boxerId: string, grund: AusfallGrund, notiz: string): Zustand {
  const kampf = z.kampfkarte.find((k) => k.aId === boxerId || k.bId === boxerId);
  const gegnerId = kampf ? (kampf.aId === boxerId ? kampf.bId : kampf.aId) : undefined;
  return {
    ...z,
    kampfkarte: z.kampfkarte.filter((k) => k !== kampf),
    ausfaelle: { ...z.ausfaelle, [boxerId]: { grund, notiz: notiz.trim(), gegnerId } },
  };
}

/** Nimmt den Boxer wieder auf. Er kommt auf die Warteliste, nicht zurück in den alten Kampf. */
export function hebeAusfallAuf(z: Zustand, boxerId: string): Zustand {
  const rest = { ...z.ausfaelle };
  delete rest[boxerId];
  return { ...z, ausfaelle: rest };
}
