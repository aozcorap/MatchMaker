import type { Boxer } from '../regeln/typen';
import { findeDatum, parseGewicht, parseZahl } from './felder';
import type { ImportZeile } from './typen';

export interface ZeilenPruefung {
  /** Muss behoben werden, bevor der Boxer übernommen werden kann */
  fehler: string[];
  warnungen: string[];
  /** Fertiger Boxer, nur wenn es keine Fehler gibt */
  boxer: Boxer | null;
  /** Gleicher Name und gleiches Geburtsdatum sind schon vorhanden */
  vorhanden: boolean;
  /** Gar keine Kampfbilanz angegeben: der Boxer würde als Anfänger (C) gelten */
  ohneBilanz: boolean;
}

export function schluessel(name: string, geburtsdatum: string): string {
  return `${name.trim().toLowerCase().replace(/\s+/g, ' ')}|${geburtsdatum}`;
}

/** Prüft eine Zeile und baut den Boxer. `inEingabe` zählt gleiche Boxer innerhalb derselben Eingabe. */
export function pruefeZeile(
  z: ImportZeile,
  vorhandene: Boxer[],
  inEingabe: Map<string, number> = new Map(),
  heute: Date = new Date(),
): ZeilenPruefung {
  const fehler: string[] = [];
  const warnungen: string[] = [];

  if (!z.name.trim()) fehler.push('Name fehlt');
  if (!z.verein.trim()) fehler.push('Verein fehlt');
  const datum = z.geburtsdatum ? findeDatum(z.geburtsdatum, heute) : null;
  if (!z.geburtsdatum) fehler.push('Geburtsdatum fehlt');
  else if (!datum?.iso) fehler.push('Geburtsdatum unplausibel');
  if (z.geschlecht !== 'M' && z.geschlecht !== 'W') fehler.push('Geschlecht fehlt');
  const gewicht = parseGewicht(z.gewicht);
  if (gewicht === null) fehler.push('Gewicht fehlt oder ist nicht lesbar');
  else if (gewicht < 25 || gewicht > 200) fehler.push('Gewicht unplausibel');

  const bilanzLeer = z.kaempfe === '' && z.siege === '' && z.niederlagen === '' && z.unentschieden === '';
  let kaempfe = parseZahl(z.kaempfe === '' ? '0' : z.kaempfe);
  let siege = parseZahl(z.siege === '' ? '0' : z.siege);
  let niederlagen = parseZahl(z.niederlagen === '' ? '0' : z.niederlagen);
  let unentschieden = parseZahl(z.unentschieden === '' ? '0' : z.unentschieden);
  if (kaempfe === null || siege === null || niederlagen === null || unentschieden === null) {
    fehler.push('Kämpfe, Siege, Niederlagen und Unentschieden müssen ganze Zahlen ab 0 sein');
    kaempfe = siege = niederlagen = unentschieden = 0;
  } else if (siege + niederlagen + unentschieden > kaempfe) {
    fehler.push('Siege, Niederlagen und Unentschieden sind zusammen mehr als die Kämpfe');
  } else if (bilanzLeer) {
    warnungen.push('Keine Kampfbilanz angegeben, nicht vorgewählt: mit Haken trotzdem übernehmen (zählt dann als Leistungsklasse C)');
  } else if (z.siege === '') {
    warnungen.push('Siege fehlen, mit 0 angenommen (zählt als Leistungsklasse C)');
  }

  const k = datum?.iso ? schluessel(z.name, datum.iso) : null;
  const vorhanden = k !== null && vorhandene.some((b) => schluessel(b.name, b.geburtsdatum) === k);
  if (vorhanden) warnungen.push('Dieser Boxer ist schon in der Liste');
  if (k !== null && (inEingabe.get(k) ?? 0) > 1) warnungen.push('Kommt in dieser Eingabe mehrfach vor');
  for (const h of z.hinweise) warnungen.push(h);

  const boxer: Boxer | null =
    fehler.length === 0
      ? {
          id: crypto.randomUUID(),
          name: z.name.trim(),
          verein: z.verein.trim(),
          geburtsdatum: datum!.iso!,
          geschlecht: z.geschlecht as 'M' | 'W',
          gewicht: gewicht!,
          kaempfe: kaempfe!,
          siege: siege!,
          niederlagen: niederlagen!,
          ...(unentschieden! > 0 ? { unentschieden: unentschieden! } : {}),
        }
      : null;
  return { fehler, warnungen, boxer, vorhanden, ohneBilanz: bilanzLeer };
}

/** Wie oft jeder Boxer (Name und Geburtsdatum) in der Eingabe vorkommt. */
export function zaehleInEingabe(zeilen: ImportZeile[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const z of zeilen) {
    if (!z.name.trim() || !z.geburtsdatum) continue;
    const k = schluessel(z.name, z.geburtsdatum);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}
