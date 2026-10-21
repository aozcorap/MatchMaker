import { juengereAltersklasse, leichterZuerst, vergleicheKampf, vergleicheWartende } from './kampfkarte';
import { altersklasseVon, gewichtsklasseVon, leistungsklasseVon } from './klassen';
import { paarungsGuete, pruefePaarung } from './paarung';
import {
  STANDARD_OPTIONEN,
  type Altersklasse,
  type Boxer,
  type Leistungsklasse,
  type Pruefung,
  type RegelOptionen,
  type Rundenzeit,
} from './typen';

export type Guete = [number, number, number];

export interface Paarung {
  /** Kampfnummer in der sortierten Kampfkarte, ab 1 */
  nr: number;
  /** a ist der erstgenannte Boxer (rote Ecke) und der leichtere, b der Gegner (blaue Ecke) */
  a: Boxer;
  b: Boxer;
  /** Jüngere der beiden Altersklassen, bestimmt Reihenfolge und Rundenzeit */
  altersklasse: Altersklasse;
  leistungsklasse: Leistungsklasse;
  rundenzeit: Rundenzeit;
  hinweise: string[];
  guete: Guete;
}

export interface Wartender {
  boxer: Boxer;
  grund: string;
  /** Mit Freigabe (Nachbar-Leistungsklasse) wäre ein Gegner möglich */
  freigabeMoeglich: boolean;
}

export interface FreigabeVorschlag {
  a: Boxer;
  b: Boxer;
  pruefung: Pruefung;
  guete: Guete;
}

export interface Ergebnis {
  paarungen: Paarung[];
  warteliste: Wartender[];
  /** Nur Vorschläge unter Wartenden, nie automatisch in der Kampfkarte */
  freigabeVorschlaege: FreigabeVorschlag[];
}

function vergleicheGuete(x: Guete, y: Guete): number {
  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) return x[i] - y[i];
  }
  return 0;
}

interface Kante {
  a: Boxer;
  b: Boxer;
  pruefung: Pruefung;
  guete: Guete;
}

/** Paare absteigend nach Qualität, bei Gleichstand nach ID, damit das Ergebnis stabil bleibt. */
function sortiereKanten(kanten: Kante[]): Kante[] {
  return [...kanten].sort(
    (x, y) =>
      vergleicheGuete(x.guete, y.guete) ||
      x.a.id.localeCompare(y.a.id) ||
      x.b.id.localeCompare(y.b.id),
  );
}

/** Gierig nach bester Qualität: wichtiger als die Zahl der Kämpfe (Anforderungen, Abschnitt 6). */
function waehleExklusiv(kanten: Kante[]): Kante[] {
  const belegt = new Set<string>();
  const gewaehlt: Kante[] = [];
  for (const k of sortiereKanten(kanten)) {
    if (belegt.has(k.a.id) || belegt.has(k.b.id)) continue;
    belegt.add(k.a.id);
    belegt.add(k.b.id);
    gewaehlt.push(k);
  }
  return gewaehlt;
}

export function erzeugePaarungen(
  boxer: Boxer[],
  veranstaltung: string,
  optionen: RegelOptionen = STANDARD_OPTIONEN,
): Ergebnis {
  const okKanten: Kante[] = [];
  const freigabeKanten: Kante[] = [];

  for (let i = 0; i < boxer.length; i++) {
    for (let j = i + 1; j < boxer.length; j++) {
      const [a, b] = leichterZuerst(boxer[i], boxer[j]);
      const pruefung = pruefePaarung(a, b, veranstaltung, optionen);
      if (pruefung.status === 'verboten') continue;
      const kante = { a, b, pruefung, guete: paarungsGuete(a, b, veranstaltung) };
      (pruefung.status === 'ok' ? okKanten : freigabeKanten).push(kante);
    }
  }

  const gewaehlt = waehleExklusiv(okKanten);
  const vergeben = new Set(gewaehlt.flatMap((k) => [k.a.id, k.b.id]));

  const paarungen = gewaehlt
    .map((k) => {
      const akA = altersklasseVon(k.a.geburtsdatum, veranstaltung)!;
      const akB = altersklasseVon(k.b.geburtsdatum, veranstaltung)!;
      return {
        a: k.a,
        b: k.b,
        altersklasse: juengereAltersklasse(akA, akB),
        leistungsklasse: leistungsklasseVon(k.a, akA),
        rundenzeit: k.pruefung.rundenzeit!,
        hinweise: k.pruefung.hinweise,
        guete: k.guete,
      };
    })
    // Jüngste Altersklasse zuerst, darin leichtester Boxer zuerst
    .sort(vergleicheKampf)
    .map((p, i) => ({ nr: i + 1, ...p }));

  const wartende = boxer
    .filter((b) => !vergeben.has(b.id))
    .sort((x, y) => vergleicheWartende(x, y, veranstaltung));
  const wartendeIds = new Set(wartende.map((b) => b.id));
  const freigabeUnterWartenden = freigabeKanten.filter(
    (k) => wartendeIds.has(k.a.id) && wartendeIds.has(k.b.id),
  );
  const freigabeIds = new Set(freigabeUnterWartenden.flatMap((k) => [k.a.id, k.b.id]));
  const hatOkGegner = new Set(okKanten.flatMap((k) => [k.a.id, k.b.id]));

  const warteliste = wartende.map((b) => {
    const ak = altersklasseVon(b.geburtsdatum, veranstaltung);
    let grund: string;
    if (!ak) grund = 'Keine Altersklasse (unter 10 Jahre)';
    else if (!gewichtsklasseVon(b.gewicht, ak, b.geschlecht)) grund = 'Keine Gewichtsklasse (zu leicht)';
    else if (hatOkGegner.has(b.id)) grund = 'Alle passenden Gegner sind bereits vergeben';
    else grund = 'Kein passender Gegner gemeldet';
    return { boxer: b, grund, freigabeMoeglich: freigabeIds.has(b.id) };
  });

  const freigabeVorschlaege = waehleExklusiv(freigabeUnterWartenden).map(
    ({ a, b, pruefung, guete }) => ({ a, b, pruefung, guete }),
  );

  return { paarungen, warteliste, freigabeVorschlaege };
}
