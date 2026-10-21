import type { ReactNode } from 'react';
import { altersklasseText, boxerInfo, gewichtsklasseText } from './regeln/info';
import type { Boxer } from './regeln/typen';

export function BoxerZelle({
  b,
  datum,
  ecke,
  aktion,
}: {
  b: Boxer;
  datum: string;
  ecke?: 'rot' | 'blau';
  aktion?: ReactNode;
}) {
  const info = boxerInfo(b, datum);
  return (
    <div className={ecke ? `boxer ecke ${ecke}` : 'boxer'}>
      {ecke && <span className="eckenlabel">{ecke === 'rot' ? 'Rote Ecke' : 'Blaue Ecke'}</span>}
      {aktion && <span className="boxeraktion">{aktion}</span>}
      <strong>{b.name}</strong>
      <span>{b.verein}</span>
      <span>
        geb. {b.geburtsdatum.split('-').reverse().join('.')} · {b.gewicht} kg · {b.kaempfe} K / {b.siege} S ·{' '}
        {altersklasseText(info.altersklasse)} · {gewichtsklasseText(info.gewichtsklasse)} ·{' '}
        {info.leistungsklasse ?? '–'}
      </span>
    </div>
  );
}
