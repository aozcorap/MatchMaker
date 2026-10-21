import { useState, type Dispatch, type SetStateAction } from 'react';
import { altersklasseText, boxerInfo, gewichtsklasseText } from './regeln/info';
import type { Boxer, Geschlecht } from './regeln/typen';
import type { Zustand } from './speicher';
import { bestaetige } from './umgebung';

interface Eingabe {
  name: string;
  verein: string;
  geburtsdatum: string;
  geschlecht: Geschlecht;
  gewicht: string;
  kaempfe: string;
  siege: string;
  niederlagen: string;
}

const LEER: Eingabe = {
  name: '',
  verein: '',
  geburtsdatum: '',
  geschlecht: 'M',
  gewicht: '',
  kaempfe: '0',
  siege: '0',
  niederlagen: '0',
};

function ganzeZahl(text: string): number | null {
  const n = Number(text);
  return text.trim() !== '' && Number.isInteger(n) && n >= 0 ? n : null;
}

/** Liefert den fertigen Boxer oder eine Fehlermeldung. */
function pruefeEingabe(e: Eingabe, id: string): Boxer | string {
  if (!e.name.trim()) return 'Name fehlt';
  if (!e.verein.trim()) return 'Verein fehlt';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.geburtsdatum)) return 'Geburtsdatum fehlt';
  const gewicht = Number(e.gewicht.replace(',', '.'));
  if (!(gewicht > 0 && gewicht < 300)) return 'Gewicht ungültig';
  const kaempfe = ganzeZahl(e.kaempfe);
  const siege = ganzeZahl(e.siege);
  const niederlagen = ganzeZahl(e.niederlagen);
  if (kaempfe === null || siege === null || niederlagen === null) {
    return 'Kämpfe, Siege und Niederlagen müssen ganze Zahlen ab 0 sein';
  }
  if (siege + niederlagen > kaempfe) return 'Siege plus Niederlagen sind mehr als die Kämpfe';
  return {
    id,
    name: e.name.trim(),
    verein: e.verein.trim(),
    geburtsdatum: e.geburtsdatum,
    geschlecht: e.geschlecht,
    gewicht,
    kaempfe,
    siege,
    niederlagen,
  };
}

function alsEingabe(b: Boxer): Eingabe {
  return {
    name: b.name,
    verein: b.verein,
    geburtsdatum: b.geburtsdatum,
    geschlecht: b.geschlecht,
    gewicht: String(b.gewicht),
    kaempfe: String(b.kaempfe),
    siege: String(b.siege),
    niederlagen: String(b.niederlagen),
  };
}

export function BoxerTab(props: {
  zustand: Zustand;
  setZustand: Dispatch<SetStateAction<Zustand>>;
}) {
  const { zustand, setZustand } = props;
  const [eingabe, setEingabe] = useState<Eingabe>(LEER);
  const [bearbeiteId, setBearbeiteId] = useState<string | null>(null);
  const [fehler, setFehler] = useState('');
  const [filterVerein, setFilterVerein] = useState('');

  const feld = <K extends keyof Eingabe>(k: K, v: Eingabe[K]) => setEingabe({ ...eingabe, [k]: v });

  function speichere(e: React.FormEvent) {
    e.preventDefault();
    const id = bearbeiteId ?? crypto.randomUUID();
    const ergebnis = pruefeEingabe(eingabe, id);
    if (typeof ergebnis === 'string') {
      setFehler(ergebnis);
      return;
    }
    setZustand((z) => ({
      ...z,
      boxer: bearbeiteId
        ? z.boxer.map((b) => (b.id === id ? ergebnis : b))
        : [...z.boxer, ergebnis],
    }));
    setEingabe(LEER);
    setBearbeiteId(null);
    setFehler('');
  }

  function loesche(b: Boxer) {
    if (!bestaetige(`${b.name} löschen? Geplante Kämpfe mit diesem Boxer entfallen.`)) return;
    setZustand((z) => ({
      ...z,
      boxer: z.boxer.filter((x) => x.id !== b.id),
      kampfkarte: z.kampfkarte.filter((k) => k.aId !== b.id && k.bId !== b.id),
    }));
    if (bearbeiteId === b.id) {
      setBearbeiteId(null);
      setEingabe(LEER);
    }
  }

  const vereine = [...new Set(zustand.boxer.map((b) => b.verein))].sort((a, b) => a.localeCompare(b, 'de'));
  const sortiert = zustand.boxer
    .filter((b) => !filterVerein || b.verein === filterVerein)
    .sort((a, b) => a.verein.localeCompare(b.verein, 'de') || a.name.localeCompare(b.name, 'de'));

  return (
    <section>
      <form className="formular" onSubmit={speichere}>
        <h2>{bearbeiteId ? 'Boxer bearbeiten' : 'Boxer erfassen'}</h2>
        <div className="raster">
          <label>
            Name
            <input value={eingabe.name} onChange={(e) => feld('name', e.target.value)} />
          </label>
          <label>
            Verein
            <input value={eingabe.verein} onChange={(e) => feld('verein', e.target.value)} />
          </label>
          <label>
            Geburtsdatum
            <input
              type="date"
              value={eingabe.geburtsdatum}
              onChange={(e) => feld('geburtsdatum', e.target.value)}
            />
          </label>
          <label>
            Geschlecht
            <select
              value={eingabe.geschlecht}
              onChange={(e) => feld('geschlecht', e.target.value as Geschlecht)}
            >
              <option value="M">männlich</option>
              <option value="W">weiblich</option>
            </select>
          </label>
          <label>
            Gewicht (kg)
            <input
              inputMode="decimal"
              value={eingabe.gewicht}
              onChange={(e) => feld('gewicht', e.target.value)}
            />
          </label>
          <label>
            Kämpfe
            <input
              inputMode="numeric"
              value={eingabe.kaempfe}
              onChange={(e) => feld('kaempfe', e.target.value)}
            />
          </label>
          <label>
            Siege
            <input
              inputMode="numeric"
              value={eingabe.siege}
              onChange={(e) => feld('siege', e.target.value)}
            />
          </label>
          <label>
            Niederlagen
            <input
              inputMode="numeric"
              value={eingabe.niederlagen}
              onChange={(e) => feld('niederlagen', e.target.value)}
            />
          </label>
        </div>
        {fehler && (
          <p className="fehler" role="alert">
            {fehler}
          </p>
        )}
        <div className="aktionen">
          <button type="submit" className="primaer">
            {bearbeiteId ? 'Änderung speichern' : 'Boxer hinzufügen'}
          </button>
          {bearbeiteId && (
            <button
              type="button"
              onClick={() => {
                setBearbeiteId(null);
                setEingabe(LEER);
                setFehler('');
              }}
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>

      <h2>Gemeldete Boxer</h2>
      {vereine.length > 1 && (
        <label className="filter">
          Verein
          <select id="filter-verein" value={filterVerein} onChange={(e) => setFilterVerein(e.target.value)}>
            <option value="">Alle ({zustand.boxer.length})</option>
            {vereine.map((v) => (
              <option key={v} value={v}>
                {v} ({zustand.boxer.filter((b) => b.verein === v).length})
              </option>
            ))}
          </select>
        </label>
      )}
      {sortiert.length === 0 ? (
        <p className="leer">Noch keine Boxer erfasst.</p>
      ) : (
        <div className="tabelle-rahmen">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Verein</th>
                <th>Geboren</th>
                <th>m/w</th>
                <th>kg</th>
                <th>K/S/N</th>
                <th>Altersklasse</th>
                <th>Gewichtsklasse</th>
                <th>Leistung</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sortiert.map((b) => {
                const info = boxerInfo(b, zustand.datum);
                return (
                  <tr key={b.id}>
                    <td>{b.name}</td>
                    <td>{b.verein}</td>
                    <td>{b.geburtsdatum.split('-').reverse().join('.')}</td>
                    <td>{b.geschlecht === 'M' ? 'm' : 'w'}</td>
                    <td>{b.gewicht}</td>
                    <td>
                      {b.kaempfe}/{b.siege}/{b.niederlagen}
                    </td>
                    <td>{altersklasseText(info.altersklasse)}</td>
                    <td className={info.gewichtsklasse ? '' : 'warn'}>
                      {gewichtsklasseText(info.gewichtsklasse)}
                    </td>
                    <td>{info.leistungsklasse ?? '–'}</td>
                    <td className="zeilenaktion">
                      <button
                        onClick={() => {
                          setBearbeiteId(b.id);
                          setEingabe(alsEingabe(b));
                          setFehler('');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        Bearbeiten
                      </button>
                      <button onClick={() => loesche(b)}>Löschen</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
