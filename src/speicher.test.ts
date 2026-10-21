import { describe, expect, it } from 'vitest';
import { kampfSchluessel } from './ablauf';
import type { Boxer } from './regeln/typen';
import { gleicherZustand, istLeer, liesZustand, type Zustand } from './speicher';

function boxer(id: string): Boxer {
  return { id, name: id, verein: `V${id}`, geburtsdatum: '2000-01-01', geschlecht: 'M', gewicht: 70, kaempfe: 5, siege: 3, niederlagen: 2 };
}

const kampfkarte = [
  { aId: 'A', bId: 'B', freigabe: false },
  { aId: 'C', bId: 'D', freigabe: true },
  { aId: 'E', bId: 'F', freigabe: false },
];

const voll: Zustand = {
  datum: '2026-11-14',
  beginn: '13:30',
  boxer: ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(boxer),
  kampfkarte,
  ausfaelle: { G: { grund: 'Verletzung', notiz: 'Nase', gegnerId: 'F' } },
  regeln: { maxGewichtProzent: 8, maxSiegdifferenzFreigabe: 4, klassenwechselFreigabe: false },
  zeit: { kampfPauseMin: 3, grossePauseMin: 20, blockMin: 90, erwachsenenRundeMin: 2 },
  extraPausen: [{ id: 'p1', vorKampf: 2, minuten: 15, text: 'Siegerehrung' }],
  autoPausen: { [kampfSchluessel(kampfkarte[2])]: 10 },
};

// Die Datenbank speichert den Zustand als JSON und gibt ihn beim nächsten Login so zurück.
function durchDatenbank(z: Zustand): Zustand | null {
  return liesZustand(JSON.parse(JSON.stringify(z)));
}

describe('Speichern und Laden', () => {
  it('behält Kampfreihenfolge, Pausen, Ausfälle, Zeiten und Einstellungen', () => {
    expect(durchDatenbank(voll)).toEqual(voll);
  });

  it('behält die Reihenfolge der Kämpfe exakt', () => {
    const umgestellt = { ...voll, kampfkarte: [kampfkarte[2], kampfkarte[0], kampfkarte[1]] };
    expect(durchDatenbank(umgestellt)?.kampfkarte).toEqual(umgestellt.kampfkarte);
  });

  it('behält die Rundenzeit-Einstellung 3 × 2 und 3 × 3', () => {
    expect(durchDatenbank(voll)?.zeit.erwachsenenRundeMin).toBe(2);
    expect(durchDatenbank({ ...voll, zeit: { ...voll.zeit, erwachsenenRundeMin: 3 } })?.zeit.erwachsenenRundeMin).toBe(3);
  });

  it('ergänzt bei älteren Ständen ohne Rundenzeit den Standard 3 × 3', () => {
    const alt = JSON.parse(JSON.stringify(voll));
    delete alt.zeit.erwachsenenRundeMin;
    expect(liesZustand(alt)?.zeit.erwachsenenRundeMin).toBe(3);
  });

  it('wirft einen Kampf mit unbekanntem Boxer nicht ungeprüft in die Karte', () => {
    const kaputt = { ...voll, kampfkarte: [...kampfkarte, { aId: 'A', bId: 'X', freigabe: false }] };
    const z = durchDatenbank(kaputt);
    expect(z === null || z.kampfkarte.every((k) => z.boxer.some((b) => b.id === k.aId) && z.boxer.some((b) => b.id === k.bId))).toBe(true);
  });

  it('lehnt beschädigte Daten ab statt sie halb zu laden', () => {
    expect(liesZustand({ datum: 5 })).toBeNull();
    expect(liesZustand(null)).toBeNull();
  });
});

describe('Vergleich nach dem Speichern', () => {
  it('erkennt einen gleichen Stand, auch wenn die Datenbank die Felder umsortiert', () => {
    const umsortiert = JSON.parse(JSON.stringify(voll));
    const sortiert = Object.fromEntries(Object.entries(umsortiert).sort(([a], [b]) => (a < b ? 1 : -1)));
    const z = liesZustand(sortiert);
    expect(z && gleicherZustand(z, voll)).toBe(true);
  });

  it('erkennt einen anderen Stand', () => {
    expect(gleicherZustand({ ...voll, beginn: '15:00' }, voll)).toBe(false);
    expect(gleicherZustand({ ...voll, kampfkarte: [kampfkarte[1], kampfkarte[0], kampfkarte[2]] }, voll)).toBe(false);
  });

  it('istLeer erkennt eine geleerte Veranstaltung', () => {
    expect(istLeer({ ...voll, boxer: [], kampfkarte: [] })).toBe(true);
    expect(istLeer(voll)).toBe(false);
  });
});
