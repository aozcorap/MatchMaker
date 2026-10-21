import { useEffect, useRef } from 'react';
import { BoxerZelle } from './BoxerZelle';
import { altersklasseText } from './regeln/info';
import type { Kampf } from './regeln/kampfkarte';
import { altersdifferenzMonate } from './regeln/paarung';
import { rundenzeitFuer } from './regeln/klassen';

const TITEL = {
  ok: 'Entspricht den Regeln',
  freigabe: 'Nur mit Freigabe möglich',
  verboten: 'Verstößt gegen die Regeln',
} as const;

function zahl(n: number): string {
  return n.toFixed(1).replace('.', ',');
}

/** Prüfergebnis für einen selbst angelegten Kampf, als Fenster über der Seite (Browser-Dialoge sind teils gesperrt). */
export function PaarungsDialog(props: {
  kampf: Kampf;
  datum: string;
  onAnlegen: () => void;
  onTauschen: () => void;
  onAbbrechen: () => void;
}) {
  const { kampf, datum, onAnlegen, onTauschen, onAbbrechen } = props;
  const status = kampf.pruefung.status;
  const anlegenRef = useRef<HTMLButtonElement>(null);
  const rz = kampf.altersklasse ? rundenzeitFuer(kampf.altersklasse) : null;

  useEffect(() => anlegenRef.current?.focus(), []);

  useEffect(() => {
    const taste = (e: KeyboardEvent) => e.key === 'Escape' && onAbbrechen();
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, [onAbbrechen]);

  return (
    <div className="dialog-hintergrund" onClick={onAbbrechen}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-titel"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dialog-titel" className={`dialog-status ${status}`}>
          {TITEL[status]}
        </h2>
        <div className="gegner">
          <BoxerZelle b={kampf.rot} datum={datum} ecke="rot" />
          <span className="gegen">gegen</span>
          <BoxerZelle b={kampf.blau} datum={datum} ecke="blau" />
        </div>
        <dl className="fakten">
          <div>
            <dt>Altersklasse</dt>
            <dd>{altersklasseText(kampf.altersklasse)}</dd>
          </div>
          <div>
            <dt>Leistungsklasse</dt>
            <dd>{kampf.leistungsklasse}</dd>
          </div>
          <div>
            <dt>Rundenzeit</dt>
            <dd>{rz ? `${rz.runden} × ${String(rz.minuten).replace('.', ',')} min` : '–'}</dd>
          </div>
          <div>
            <dt>Altersdifferenz</dt>
            <dd>{altersdifferenzMonate(kampf.rot.geburtsdatum, kampf.blau.geburtsdatum)} Monate</dd>
          </div>
          <div>
            <dt>Gewichtsdifferenz</dt>
            <dd>{zahl(Math.abs(kampf.rot.gewicht - kampf.blau.gewicht))} kg</dd>
          </div>
        </dl>
        {(kampf.pruefung.gruende.length > 0 || kampf.pruefung.hinweise.length > 0) && (
          <ul className={`dialog-gruende ${status}`}>
            {kampf.pruefung.gruende.map((g) => (
              <li key={g}>{g}</li>
            ))}
            {kampf.pruefung.hinweise.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}
        <div className="aktionen dialog-aktionen">
          <button onClick={onTauschen}>Ecken tauschen</button>
          <button onClick={onAbbrechen}>Abbrechen</button>
          <button ref={anlegenRef} className="primaer" onClick={onAnlegen}>
            {status === 'verboten' ? 'Trotzdem anlegen' : 'Kampf anlegen'}
          </button>
        </div>
      </div>
    </div>
  );
}
