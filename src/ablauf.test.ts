import { describe, expect, it } from 'vitest';
import { fuegeSortiertEin, hebeFreigabeAuf, kampfSchluessel, verschiebe } from './ablauf';
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
