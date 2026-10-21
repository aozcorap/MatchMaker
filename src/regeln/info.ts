import { altersklasseVon, gewichtsklasseVon, leistungsklasseVon } from './klassen';
import type { Altersklasse, Boxer, Gewichtsklasse, Leistungsklasse } from './typen';

export interface BoxerInfo {
  altersklasse: Altersklasse | null;
  gewichtsklasse: Gewichtsklasse | null;
  leistungsklasse: Leistungsklasse | null;
}

export function boxerInfo(b: Boxer, veranstaltung: string): BoxerInfo {
  const altersklasse = altersklasseVon(b.geburtsdatum, veranstaltung);
  if (!altersklasse) return { altersklasse, gewichtsklasse: null, leistungsklasse: null };
  return {
    altersklasse,
    gewichtsklasse: gewichtsklasseVon(b.gewicht, altersklasse, b.geschlecht),
    leistungsklasse: leistungsklasseVon(b, altersklasse),
  };
}

export function gewichtsklasseText(k: Gewichtsklasse | null): string {
  if (!k) return 'keine Klasse';
  return k.bis === null ? `über ${k.ueber} kg` : `${k.ueber}–${k.bis} kg`;
}

export function altersklasseText(k: Altersklasse | null): string {
  if (!k) return 'keine Klasse';
  return k === 'Erwachsene' ? 'Erwachsene' : k;
}
