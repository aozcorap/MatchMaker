import { useEffect, useRef, useState } from 'react';
import type { Boxer } from './regeln/typen';
import { AUSFALL_GRUENDE, type AusfallGrund } from './speicher';

/** Ausfall melden, als Fenster über der Seite (Browser-Dialoge sind teils gesperrt). */
export function AusfallDialog(props: {
  boxer: Boxer;
  /** Name des Gegners, wenn der Boxer in einem Kampf steht */
  gegner: string | null;
  onMelden: (grund: AusfallGrund, notiz: string) => void;
  onAbbrechen: () => void;
}) {
  const { boxer, gegner, onMelden, onAbbrechen } = props;
  const [grund, setGrund] = useState<AusfallGrund>('Verletzung');
  const [notiz, setNotiz] = useState('');
  const melden = useRef<HTMLButtonElement>(null);

  useEffect(() => melden.current?.focus(), []);
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
        aria-labelledby="ausfall-titel"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="ausfall-titel">Ausfall melden: {boxer.name}</h2>
        <p className="hinweis">{boxer.verein}</p>
        <fieldset className="ausfall-gruende">
          <legend>Grund</legend>
          {AUSFALL_GRUENDE.map((g) => (
            <label key={g}>
              <input type="radio" name="ausfall-grund" checked={grund === g} onChange={() => setGrund(g)} />
              {g}
            </label>
          ))}
        </fieldset>
        <label className="formular-feld">
          Notiz (optional)
          <input id="ausfall-notiz" value={notiz} onChange={(e) => setNotiz(e.target.value)} />
        </label>
        {gegner && (
          <p className="warn">
            Der Kampf gegen {gegner} entfällt. {gegner} kommt auf die Warteliste.
          </p>
        )}
        <div className="aktionen dialog-aktionen">
          <button onClick={onAbbrechen}>Abbrechen</button>
          <button ref={melden} className="primaer" onClick={() => onMelden(grund, notiz)}>
            Ausfall melden
          </button>
        </div>
      </div>
    </div>
  );
}
