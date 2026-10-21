import { describe, expect, it } from 'vitest';
import { fuegeSortiertEin, hebeFreigabeAuf, kampfSchluessel, richtePausenAus, verschiebe } from './ablauf';
import type { GeplanterKampf } from './speicher';

const k = (aId: string, bId = `${aId}2`): GeplanterKampf => ({ aId, bId, freigabe: false });

describe('verschiebe', () => {
  it('nach oben, unten und auf eine Position', () => {
    expect(verschiebe(['a', 'b', 'c', 'd'], 2, 1)).toEqual(['a', 'c', 'b', 'd']);
    expect(verschiebe(['a', 'b', 'c', 'd'], 1, 2)).toEqual(['a', 'c', 'b', 'd']);
    expect(verschiebe(['a', 'b', 'c', 'd'], 0, 3)).toEqual(['b', 'c', 'd', 'a']);
  });
  it('begrenzt das Ziel und ändert die Eingabe nicht', () => {
    const liste = ['a', 'b', 'c'];
    expect(verschiebe(liste, 0, 99)).toEqual(['b', 'c', 'a']);
    expect(verschiebe(liste, 2, -5)).toEqual(['c', 'a', 'b']);
    expect(liste).toEqual(['a', 'b', 'c']);
  });
  it('ungültige oder gleiche Position lässt alles unverändert', () => {
    const liste = ['a', 'b'];
    expect(verschiebe(liste, 5, 0)).toBe(liste);
    expect(verschiebe(liste, 1, 1)).toBe(liste);
  });
});

describe('fuegeSortiertEin', () => {
  const nachName = (x: GeplanterKampf, y: GeplanterKampf) => x.aId.localeCompare(y.aId);
  it('setzt den Kampf an die sortierte Stelle, sonst ans Ende', () => {
    expect(fuegeSortiertEin([k('a'), k('c')], k('b'), nachName).map((x) => x.aId)).toEqual(['a', 'b', 'c']);
    expect(fuegeSortiertEin([k('a'), k('c')], k('d'), nachName).map((x) => x.aId)).toEqual(['a', 'c', 'd']);
    expect(fuegeSortiertEin([], k('a'), nachName).map((x) => x.aId)).toEqual(['a']);
  });
  it('respektiert eine von Hand geänderte Reihenfolge', () => {
    // c steht von Hand vor a; neues b kommt vor dem ersten, der nach ihm einzuordnen ist: vor c
    expect(fuegeSortiertEin([k('c'), k('a')], k('b'), nachName).map((x) => x.aId)).toEqual(['b', 'c', 'a']);
  });
});

describe('kampfSchluessel', () => {
  it('ist unabhängig von den Ecken', () => {
    expect(kampfSchluessel({ aId: 'x', bId: 'y' })).toBe(kampfSchluessel({ aId: 'y', bId: 'x' }));
  });
});

describe('hebeFreigabeAuf', () => {
  const karte = [
    { aId: 'A', bId: 'B', freigabe: true },
    { aId: 'C', bId: 'A', freigabe: true },
    { aId: 'D', bId: 'E', freigabe: true },
  ];

  it('nimmt die Zustimmung nur bei Kämpfen mit dem geänderten Boxer zurück', () => {
    expect(hebeFreigabeAuf(karte, 'A').map((k) => k.freigabe)).toEqual([false, false, true]);
  });

  it('ändert nichts bei einem Boxer ohne Kampf', () => {
    expect(hebeFreigabeAuf(karte, 'Z')).toEqual(karte);
  });
});

describe('richtePausenAus: Pausen bleiben am Kampf', () => {
  const k = (a: string, b: string) => ({ aId: a, bId: b, freigabe: false });
  const karte = [k('A', 'B'), k('C', 'D'), k('E', 'F'), k('G', 'H')];
  const pause = (vorKampf: number, kampf?: string) => ({ id: 'p', vorKampf, kampf, minuten: 15, text: 'Pause' });

  it('hängt eine neue Pause an den Kampf an ihrer Position', () => {
    const z = richtePausenAus({ kampfkarte: karte, extraPausen: [pause(3)] });
    expect(z.extraPausen[0]).toMatchObject({ vorKampf: 3, kampf: kampfSchluessel(karte[2]) });
  });

  it('die Pause wandert mit, wenn ihr Kampf verschoben wird', () => {
    const angehaengt = richtePausenAus({ kampfkarte: karte, extraPausen: [pause(3)] });
    const verschoben = richtePausenAus({ ...angehaengt, kampfkarte: verschiebe(karte, 2, 0) });
    expect(verschoben.extraPausen[0].vorKampf).toBe(1);
    const andererVerschoben = richtePausenAus({ ...verschoben, kampfkarte: verschiebe(verschoben.kampfkarte, 3, 0) });
    expect(andererVerschoben.extraPausen[0].vorKampf).toBe(2); // ein Kampf kam davor
  });

  it('wird der Kampf entfernt, hängt die Pause am Kampf, der jetzt an der Stelle steht', () => {
    const angehaengt = richtePausenAus({ kampfkarte: karte, extraPausen: [pause(2)] });
    const ohne = richtePausenAus({ ...angehaengt, kampfkarte: karte.filter((x) => x !== karte[1]) });
    expect(ohne.extraPausen[0]).toMatchObject({ vorKampf: 2, kampf: kampfSchluessel(karte[2]) });
  });

  it('steht sie nach dem Entfernen hinter dem letzten Kampf, hat sie keinen Kampf mehr', () => {
    const angehaengt = richtePausenAus({ kampfkarte: karte, extraPausen: [pause(4)] });
    const ohne = richtePausenAus({ ...angehaengt, kampfkarte: karte.slice(0, 3) });
    expect(ohne.extraPausen[0].vorKampf).toBe(4);
    expect(ohne.extraPausen[0].kampf).toBeUndefined();
  });

  it('Ecken tauschen ändert nichts, und ohne Änderung bleibt das Objekt gleich', () => {
    const angehaengt = richtePausenAus({ kampfkarte: karte, extraPausen: [pause(1)] });
    const getauscht = richtePausenAus({ ...angehaengt, kampfkarte: [k('B', 'A'), ...karte.slice(1)] });
    expect(getauscht.extraPausen[0].vorKampf).toBe(1);
    expect(richtePausenAus(angehaengt)).toBe(angehaengt);
  });
});
