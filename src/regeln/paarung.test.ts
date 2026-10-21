import { describe, expect, it } from 'vitest';
import {
  altersklasseVon,
  gewichtsklasseVon,
  leistungsklasseVon,
  rundenzeitFuer,
} from './klassen';
import { altersdifferenzMonate, innerhalb24Monate, paarungsGuete, pruefePaarung as pruefe } from './paarung';
import { STANDARD_OPTIONEN, type Boxer, type RegelOptionen } from './typen';

const TAG = '2026-11-14';
const LOCKER: RegelOptionen = { ...STANDARD_OPTIONEN, klassenwechselFreigabe: false };
const pruefePaarung = (a: Boxer, b: Boxer, t: string, o: RegelOptionen = LOCKER) => pruefe(a, b, t, o);
let zaehler = 0;
function boxer(teil: Partial<Boxer>): Boxer {
  zaehler += 1;
  return {
    id: `b${zaehler}`,
    name: `Boxer ${zaehler}`,
    verein: `Verein ${zaehler}`,
    geburtsdatum: '2000-06-15',
    geschlecht: 'M',
    gewicht: 70,
    kaempfe: 5,
    siege: 3,
    niederlagen: 2,
    ...teil,
  };
}

describe('Altersklasse (§11)', () => {
  it.each([
    ['2017-01-01', null],
    ['2016-01-01', 'U13'], // 10 im Jahr 2026, Geburtstag schon vorbei
    ['2016-12-31', null], // wird erst nach dem Kampftag 10 (§11.3)
    ['2014-01-01', 'U13'], // 12
    ['2013-12-31', 'U15'], // 13
    ['2012-01-01', 'U15'], // 14
    ['2011-06-01', 'U17'], // 15
    ['2010-06-01', 'U17'], // 16
    ['2009-06-01', 'U19'], // 17
    ['2008-12-31', 'U19'], // 18
    ['2007-01-01', 'Erwachsene'], // 19
  ])('Geburtsdatum %s -> %s', (geb, erwartet) => {
    expect(altersklasseVon(geb, TAG)).toBe(erwartet);
  });
});

describe('Gewichtsklasse (§19)', () => {
  it('Grenzen: über ist ausgeschlossen, bis ist eingeschlossen', () => {
    expect(gewichtsklasseVon(50, 'Erwachsene', 'M')).toEqual({ ueber: 47, bis: 50 });
    expect(gewichtsklasseVon(50.1, 'Erwachsene', 'M')).toEqual({ ueber: 50, bis: 55 });
    expect(gewichtsklasseVon(47, 'Erwachsene', 'M')).toBeNull();
  });
  it('Offene Klasse', () => {
    expect(gewichtsklasseVon(140, 'Erwachsene', 'M')).toEqual({ ueber: 90, bis: null });
    expect(gewichtsklasseVon(81, 'Erwachsene', 'W')).toEqual({ ueber: 80, bis: null });
  });
  it('Frauen haben eigene Tabelle, U19 nutzt Erwachsenentabelle', () => {
    expect(gewichtsklasseVon(46, 'Erwachsene', 'W')).toEqual({ ueber: 45, bis: 48 });
    expect(gewichtsklasseVon(46, 'U19', 'W')).toEqual({ ueber: 45, bis: 48 });
    expect(gewichtsklasseVon(46, 'U19', 'M')).toBeNull();
  });
  it('U13/U15 haben zusätzlich 38-40, U17 nicht', () => {
    expect(gewichtsklasseVon(39, 'U13', 'M')).toEqual({ ueber: 38, bis: 40 });
    expect(gewichtsklasseVon(39, 'U15', 'W')).toEqual({ ueber: 38, bis: 40 });
    expect(gewichtsklasseVon(39, 'U17', 'M')).toBeNull();
  });
});

describe('Rundenzeit (§22)', () => {
  it('je Altersklasse', () => {
    expect(rundenzeitFuer('U13').minuten).toBe(1);
    expect(rundenzeitFuer('U15').minuten).toBe(1.5);
    expect(rundenzeitFuer('U17').minuten).toBe(2);
    expect(rundenzeitFuer('U19').minuten).toBe(3);
    expect(rundenzeitFuer('Erwachsene').minuten).toBe(3);
    expect(rundenzeitFuer('Erwachsene', 2).minuten).toBe(2);
    expect(rundenzeitFuer('U19', 2).minuten).toBe(2);
    expect(rundenzeitFuer('U17', 2).minuten).toBe(2);
    expect(rundenzeitFuer('U13', 2).minuten).toBe(1);
  });
});

describe('Leistungsklasse (§12)', () => {
  const lk = (siege: number, geb = '2000-01-01') =>
    leistungsklasseVon(boxer({ siege, geburtsdatum: geb }), altersklasseVon(geb, TAG)!);
  it('Schwellen', () => {
    expect(lk(0)).toBe('C');
    expect(lk(6)).toBe('C');
    expect(lk(7)).toBe('B');
    expect(lk(14)).toBe('B');
    expect(lk(15)).toBe('A');
    expect(lk(25)).toBe('A');
    expect(lk(26)).toBe('Elite');
  });
  it('Elite nur Erwachsene', () => {
    expect(lk(40, '2009-06-01')).toBe('A'); // U19
  });
});

describe('Altersunterschied 24 Monate', () => {
  it('exakt nach Geburtsdatum', () => {
    expect(innerhalb24Monate('2010-05-10', '2012-05-10')).toBe(true);
    expect(innerhalb24Monate('2010-05-10', '2012-05-11')).toBe(false);
    expect(innerhalb24Monate('2012-05-11', '2010-05-10')).toBe(false);
  });
});

describe('Altersdifferenz Anzeige', () => {
  it('volle Monate', () => {
    expect(altersdifferenzMonate('2010-05-10', '2012-05-10')).toBe(24);
    expect(altersdifferenzMonate('2010-05-10', '2012-05-09')).toBe(23);
    expect(altersdifferenzMonate('2012-05-09', '2010-05-10')).toBe(23);
  });
});

describe('pruefePaarung', () => {
  it('normale Paarung ist ok', () => {
    const r = pruefePaarung(boxer({ gewicht: 70 }), boxer({ gewicht: 72 }), TAG);
    expect(r.status).toBe('ok');
    expect(r.rundenzeit).toEqual({ runden: 3, minuten: 3 });
  });
  it('gleicher Verein verboten', () => {
    const r = pruefePaarung(boxer({ verein: 'BC Nord' }), boxer({ verein: ' bc nord ' }), TAG);
    expect(r.status).toBe('verboten');
  });
  it('Männer gegen Frauen verboten', () => {
    const r = pruefePaarung(boxer({ geschlecht: 'M' }), boxer({ geschlecht: 'W' }), TAG);
    expect(r.status).toBe('verboten');
  });
  it('U17 gegen U19 innerhalb 24 Monate: 3x2 Minuten', () => {
    const a = boxer({ geburtsdatum: '2010-09-01', gewicht: 60 }); // U17
    const b = boxer({ geburtsdatum: '2009-09-01', gewicht: 61 }); // U19
    const r = pruefePaarung(a, b, TAG);
    expect(r.status).toBe('ok');
    expect(r.rundenzeit).toEqual({ runden: 3, minuten: 2 });
  });
  it('Jugend über 24 Monate Unterschied verboten', () => {
    const a = boxer({ geburtsdatum: '2012-09-01', gewicht: 50 }); // U15
    const b = boxer({ geburtsdatum: '2009-09-01', gewicht: 50 }); // U19
    expect(pruefePaarung(a, b, TAG).status).toBe('verboten');
  });
  it('U19 gegen Erwachsene bis 24 Monate erlaubt, U17 nie', () => {
    const erw = boxer({ geburtsdatum: '2007-06-01', gewicht: 70 });
    const u19 = boxer({ geburtsdatum: '2008-06-01', gewicht: 70 });
    const u17 = boxer({ geburtsdatum: '2010-06-01', gewicht: 70 });
    expect(pruefePaarung(erw, u19, TAG).status).toBe('ok');
    expect(pruefePaarung(erw, u17, TAG).status).toBe('verboten');
  });
  it('Gewichtstoleranz = Breite der Klasse des Leichteren', () => {
    // Leichtgewicht 55-60 (Breite 5 kg) gegen Weltergewicht 60-65
    const leicht = boxer({ gewicht: 56 });
    expect(pruefePaarung(leicht, boxer({ gewicht: 61 }), TAG).status).toBe('ok');
    expect(pruefePaarung(leicht, boxer({ gewicht: 61.1 }), TAG).status).toBe('verboten');
  });
  it('Offene Klasse: keine Prozentgrenze, 92 kg gegen 140 kg erlaubt', () => {
    const r = pruefePaarung(boxer({ gewicht: 92, siege: 30 }), boxer({ gewicht: 140, siege: 30 }), TAG);
    expect(r.status).toBe('ok');
  });
  it('Prozentgrenze gilt in geschlossenen Klassen, genau an der Grenze noch erlaubt', () => {
    const vier = { maxGewichtProzent: 4, maxSiegdifferenzFreigabe: 5, klassenwechselFreigabe: false };
    const leicht = boxer({ gewicht: 50 }); // Klasse 47-50
    expect(pruefePaarung(leicht, boxer({ gewicht: 52 }), TAG, vier).status).toBe('ok'); // 4,0 %
    const r = pruefePaarung(leicht, boxer({ gewicht: 52.1 }), TAG, vier); // 4,2 %
    expect(r.status).toBe('verboten');
    expect(r.gruende.join(' ')).toContain('über der Grenze von 4 %');
  });
  it('Standard 10 %: bei geschlossenen Klassen schränkt die Klassenbreite zuerst ein', () => {
    expect(pruefePaarung(boxer({ gewicht: 55.1 }), boxer({ gewicht: 60.1 }), TAG).status).toBe('ok');
    expect(pruefePaarung(boxer({ gewicht: 55.1 }), boxer({ gewicht: 60.2 }), TAG).status).toBe('verboten');
  });
  it('Schwergewicht (85-90) gegen 140 kg verboten', () => {
    const r = pruefePaarung(boxer({ gewicht: 88 }), boxer({ gewicht: 140 }), TAG);
    expect(r.status).toBe('verboten');
  });
  it('unter der untersten Klasse verboten', () => {
    const r = pruefePaarung(boxer({ gewicht: 45 }), boxer({ gewicht: 48 }), TAG);
    expect(r.status).toBe('verboten');
  });
  it('Nachbar-Leistungsklasse braucht Freigabe, A gegen C verboten', () => {
    const c = boxer({ siege: 4 }); // C
    const b = boxer({ siege: 8 }); // B
    const b12 = boxer({ siege: 12 }); // B
    const a = boxer({ siege: 16 }); // A
    expect(pruefePaarung(c, b, TAG).status).toBe('freigabe');
    expect(pruefePaarung(b12, a, TAG).status).toBe('freigabe');
    expect(pruefePaarung(b, a, TAG).status).toBe('verboten'); // 8 Siege Unterschied
    expect(pruefePaarung(c, a, TAG).status).toBe('verboten'); // C gegen A nie
  });
  it('Nachbar-Leistungsklassen: Siegdifferenz über 5 wird nicht vorgeschlagen', () => {
    // 12 Siege (B) gegen 1 Sieg (C), wie im Praxisbeispiel
    const r = pruefePaarung(boxer({ siege: 12 }), boxer({ siege: 1 }), TAG);
    expect(r.status).toBe('verboten');
    expect(r.gruende.join(' ')).toContain('Siegdifferenz 11');
    // 12 gegen 7 ist mit Freigabe möglich
    expect(pruefePaarung(boxer({ siege: 12 }), boxer({ siege: 7 }), TAG).status).toBe('ok'); // beide B
    expect(pruefePaarung(boxer({ siege: 6 }), boxer({ siege: 11 }), TAG).status).toBe('freigabe'); // Differenz genau 5
    expect(pruefePaarung(boxer({ siege: 6 }), boxer({ siege: 12 }), TAG).status).toBe('verboten'); // Differenz 6
  });
  it('Elite nur gegen Elite, auch nicht mit Freigabe', () => {
    const elite = boxer({ siege: 30 });
    expect(pruefePaarung(elite, boxer({ siege: 20 }), TAG).status).toBe('verboten');
    expect(pruefePaarung(elite, boxer({ siege: 40 }), TAG).status).toBe('ok');
  });
});

describe('Paarungsgüte', () => {
  it('gleiche Klasse vor Gewicht vor Siegen', () => {
    const basis = boxer({ gewicht: 70, siege: 3 });
    const gut = paarungsGuete(basis, boxer({ gewicht: 70.5, siege: 3 }), TAG);
    const schlecht = paarungsGuete(basis, boxer({ gewicht: 72, siege: 3 }), TAG);
    expect(gut[1]).toBeLessThan(schlecht[1]);
    expect(paarungsGuete(basis, boxer({ siege: 9 }), TAG)[0]).toBe(1);
  });
});

describe('Klassenwechsel nur mit Freigabe (Standard)', () => {
  const strikt = STANDARD_OPTIONEN;
  it('U13 gegen U15 ist nur mit Freigabe möglich', () => {
    const a = boxer({ geburtsdatum: '2015-05-28', gewicht: 48 });
    const b = boxer({ geburtsdatum: '2013-06-17', gewicht: 49 });
    const r = pruefe(a, b, TAG, strikt);
    expect(r.status).toBe('freigabe');
    expect(r.hinweise.join(' ')).toContain('Altersklassen');
    expect(pruefe(a, b, TAG, LOCKER).status).not.toBe('freigabe');
  });
  it('verschiedene Gewichtsklassen sind nur mit Freigabe möglich', () => {
    const r = pruefe(boxer({ gewicht: 89 }), boxer({ gewicht: 91.5 }), TAG, strikt);
    expect(r.status).toBe('freigabe');
    expect(r.hinweise.join(' ')).toContain('Gewichtsklassen');
  });
  it('gleiche Alters- und Gewichtsklasse bleibt ohne Freigabe', () => {
    expect(pruefe(boxer({ gewicht: 83 }), boxer({ gewicht: 84.5 }), TAG, strikt).status).toBe('ok');
  });
});
