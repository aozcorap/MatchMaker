import {
  ALTERSKLASSEN,
  altersklasseVon,
  breiteZehntel,
  gewichtsklasseVon,
  gleicheGewichtsklasse,
  istJugend,
  leistungsklasseVon,
  rundenzeitFuer,
} from './klassen';
import type { Boxer, Pruefung, Status } from './typen';

type Datum = [number, number, number];

function datum(iso: string): Datum {
  const [j, m, t] = iso.split('-').map(Number);
  return [j, m, t];
}

function nichtNach(a: Datum, b: Datum): boolean {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return true;
}

/** Altersunterschied höchstens 24 Monate, exakt nach Geburtsdatum (§11.9). */
export function innerhalb24Monate(a: string, b: string): boolean {
  const [aelter, juenger] = a <= b ? [datum(a), datum(b)] : [datum(b), datum(a)];
  return nichtNach(juenger, [aelter[0] + 2, aelter[1], aelter[2]]);
}

const LEISTUNG_REIHE = ['C', 'B', 'A'];

export function pruefePaarung(a: Boxer, b: Boxer, veranstaltung: string): Pruefung {
  const gruende: string[] = [];
  const hinweise: string[] = [];
  let freigabe = false;

  if (a.verein.trim().toLowerCase() === b.verein.trim().toLowerCase()) {
    gruende.push('Gleicher Verein');
  }
  if (a.geschlecht !== b.geschlecht) {
    gruende.push('Verschiedenes Geschlecht (§19.6)');
  }

  const akA = altersklasseVon(a.geburtsdatum, veranstaltung);
  const akB = altersklasseVon(b.geburtsdatum, veranstaltung);
  if (!akA) gruende.push(`${a.name}: keine Altersklasse (unter 10 Jahre)`);
  if (!akB) gruende.push(`${b.name}: keine Altersklasse (unter 10 Jahre)`);

  if (akA && akB) {
    const jugendA = istJugend(akA);
    const jugendB = istJugend(akB);
    if (jugendA || jugendB) {
      const nurU19gegenErw = akA !== akB && (!jugendA || !jugendB);
      if (nurU19gegenErw) {
        const jugendKlasse = jugendA ? akA : akB;
        if (jugendKlasse !== 'U19') {
          gruende.push('Jugend unter U19 darf nicht gegen Erwachsene (§11.10)');
        } else if (!innerhalb24Monate(a.geburtsdatum, b.geburtsdatum)) {
          gruende.push('Altersunterschied über 24 Monate (§11.10)');
        } else {
          hinweise.push('Jugend gegen Erwachsene: Schutzbestimmungen der Jugend gelten');
        }
      } else if (!innerhalb24Monate(a.geburtsdatum, b.geburtsdatum)) {
        gruende.push('Altersunterschied über 24 Monate (§11.9)');
      }
    }

    const gkA = gewichtsklasseVon(a.gewicht, akA, a.geschlecht);
    const gkB = gewichtsklasseVon(b.gewicht, akB, b.geschlecht);
    if (!gkA) gruende.push(`${a.name}: unter der untersten Gewichtsklasse`);
    if (!gkB) gruende.push(`${b.name}: unter der untersten Gewichtsklasse`);
    if (gkA && gkB && !gleicheGewichtsklasse(gkA, gkB)) {
      const [leicht, schwer, gkLeicht, gkSchwer] =
        a.gewicht <= b.gewicht ? [a, b, gkA, gkB] : [b, a, gkB, gkA];
      const diff = Math.round((schwer.gewicht - leicht.gewicht) * 10);
      const breite = breiteZehntel(gkLeicht);
      if (breite === null) {
        // Offene Klasse des Leichteren: nur erlaubt, wenn auch der Schwerere in einer offenen Klasse liegt.
        if (gkSchwer.bis !== null) {
          gruende.push('Gewichtsdifferenz nicht regelbar (leichterer in offener Klasse, schwererer nicht)');
        }
      } else if (diff > breite) {
        gruende.push(
          `Gewichtsdifferenz ${(diff / 10).toFixed(1)} kg über der Klassenbreite ${(breite / 10).toFixed(1)} kg (§19.6)`,
        );
      }
    }

    const lkA = leistungsklasseVon(a, akA);
    const lkB = leistungsklasseVon(b, akB);
    if (lkA !== lkB) {
      const ia = LEISTUNG_REIHE.indexOf(lkA);
      const ib = LEISTUNG_REIHE.indexOf(lkB);
      if (ia >= 0 && ib >= 0 && Math.abs(ia - ib) === 1) {
        freigabe = true;
        hinweise.push(
          `Nachbar-Leistungsklassen ${lkA}/${lkB}: Zustimmung beider Trainer, des Veranstalters und des obersten Ringrichters nötig`,
        );
      } else {
        gruende.push(`Leistungsklassen ${lkA} und ${lkB} dürfen nicht gegeneinander`);
      }
    }
  }

  const status: Status = gruende.length > 0 ? 'verboten' : freigabe ? 'freigabe' : 'ok';
  const pruefung: Pruefung = { status, gruende, hinweise };
  if (akA && akB) {
    const juenger = ALTERSKLASSEN.indexOf(akA) <= ALTERSKLASSEN.indexOf(akB) ? akA : akB;
    pruefung.rundenzeit = rundenzeitFuer(juenger);
  }
  return pruefung;
}

/**
 * Qualität einer erlaubten Paarung, kleiner ist besser (§ Anforderungen 6):
 * [Leistungsklassen-Abstand, Gewichtsdifferenz in Zehntel-kg, Siegdifferenz]. Lexikographisch vergleichen.
 */
export function paarungsGuete(a: Boxer, b: Boxer, veranstaltung: string): [number, number, number] {
  const akA = altersklasseVon(a.geburtsdatum, veranstaltung);
  const akB = altersklasseVon(b.geburtsdatum, veranstaltung);
  const lkA = akA ? leistungsklasseVon(a, akA) : 'C';
  const lkB = akB ? leistungsklasseVon(b, akB) : 'C';
  return [
    lkA === lkB ? 0 : 1,
    Math.round(Math.abs(a.gewicht - b.gewicht) * 10),
    Math.abs(a.siege - b.siege),
  ];
}
