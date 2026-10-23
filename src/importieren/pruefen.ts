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

/**
 * Name für den Vergleich: Groß-/Kleinschreibung, Akzente, Bindestriche und die Reihenfolge der Namensteile spielen keine Rolle
 * ("Müller, Max" = "Max Mueller" = "max  müller").
 */
function vergleichsname(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

function abstand(a: string, b: string): number {
  let zeile = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const neu = [i];
    for (let j = 1; j <= b.length; j++) {
      neu[j] = Math.min(zeile[j] + 1, neu[j - 1] + 1, zeile[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    zeile = neu;
  }
  return zeile[b.length];
}

/** Gleicher Boxer? Gleicher Name (auch mit einem Tippfehler oder einem Lesefehler der Texterkennung); das Geburtsdatum prüft der Aufrufer. */
export function gleicherName(a: string, b: string): boolean {
  const x = vergleichsname(a);
  const y = vergleichsname(b);
  return x === y || (Math.min(x.length, y.length) >= 6 && abstand(x, y) <= 1);
}

export function schluessel(name: string, geburtsdatum: string): string {
  return `${vergleichsname(name)}|${geburtsdatum}`;
}

/** Was in der neuen Meldung anders ist als beim schon vorhandenen Boxer. */
function unterschiede(alt: Boxer, neu: { verein: string; gewicht: number | null; bilanz: [number, number, number, number] | null }): string[] {
  const u: string[] = [];
  if (neu.gewicht !== null && neu.gewicht !== alt.gewicht) u.push(`Gewicht ${alt.gewicht} → ${neu.gewicht} kg`);
  if (neu.verein.trim() && neu.verein.trim().toLowerCase() !== alt.verein.trim().toLowerCase()) u.push(`Verein ${alt.verein} → ${neu.verein.trim()}`);
  if (neu.bilanz) {
    const [k, s, n, d] = neu.bilanz;
    if (k !== alt.kaempfe) u.push(`Kämpfe ${alt.kaempfe} → ${k}`);
    if (s !== alt.siege) u.push(`Siege ${alt.siege} → ${s}`);
    if (n !== alt.niederlagen) u.push(`Niederlagen ${alt.niederlagen} → ${n}`);
    if (d !== (alt.unentschieden ?? 0)) u.push(`Unentschieden ${alt.unentschieden ?? 0} → ${d}`);
  }
  return u;
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
  const alt = datum?.iso ? vorhandene.find((b) => b.geburtsdatum === datum.iso && gleicherName(b.name, z.name)) : undefined;
  const vorhanden = alt !== undefined;
  if (alt) {
    const u = unterschiede(alt, {
      verein: z.verein,
      gewicht,
      bilanz: bilanzLeer || kaempfe === null || siege === null || niederlagen === null || unentschieden === null ? null : [kaempfe, siege, niederlagen, unentschieden],
    });
    warnungen.push(
      u.length === 0
        ? 'Dieser Boxer ist schon in der Liste (gleiche Angaben)'
        : `Dieser Boxer ist schon in der Liste, mit anderen Angaben: ${u.join(', ')}. Bitte beim vorhandenen Boxer ändern`,
    );
  }
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

/** Zeilen, die denselben Boxer wie eine frühere Zeile derselben Eingabe enthalten (z. B. zwei Dateien mit überlappenden Listen). */
export function spaetereDoppelte(zeilen: ImportZeile[], heute: Date = new Date()): Set<string> {
  const doppelt = new Set<string>();
  const gesehen: { name: string; datum: string }[] = [];
  for (const z of zeilen) {
    const datum = z.geburtsdatum ? findeDatum(z.geburtsdatum, heute)?.iso : null;
    if (!z.name.trim() || !datum) continue;
    if (gesehen.some((g) => g.datum === datum && gleicherName(g.name, z.name))) doppelt.add(z.id);
    else gesehen.push({ name: z.name, datum });
  }
  return doppelt;
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
