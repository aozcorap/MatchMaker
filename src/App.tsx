import { useEffect, useRef, useState } from 'react';
import { BoxerTab } from './BoxerTab';
import { KampfkarteTab } from './KampfkarteTab';
import { exportiere, laden, liesZustand, speichern, type Zustand } from './speicher';
import { simulation } from './testdaten';
import { bestaetige, DEMO } from './umgebung';

type Tab = 'boxer' | 'kampfkarte';

export function App() {
  const [zustand, setZustand] = useState<Zustand>(laden);
  const [tab, setTab] = useState<Tab>('boxer');
  const [meldung, setMeldung] = useState('');
  const dateiRef = useRef<HTMLInputElement>(null);

  useEffect(() => speichern(zustand), [zustand]);

  function importiere(datei: File) {
    datei
      .text()
      .then((text) => {
        const neu = liesZustand(JSON.parse(text));
        if (!neu) throw new Error('Ungültiges Format');
        setZustand(neu);
        setMeldung(`Geladen: ${neu.boxer.length} Boxer`);
      })
      .catch(() => setMeldung('Datei konnte nicht gelesen werden'));
  }

  return (
    <div className="seite">
      <header className="kopf">
        <h1>Matchmaking Boxen</h1>
        <label className="datum">
          Veranstaltungsdatum
          <input
            type="date"
            value={zustand.datum}
            onChange={(e) => e.target.value && setZustand({ ...zustand, datum: e.target.value })}
          />
        </label>
        <div className="aktionen" hidden={DEMO}>
          <button
            onClick={() => {
              if (zustand.boxer.length === 0 || bestaetige('Alle Daten durch die Simulation ersetzen?')) {
                setZustand(simulation(false));
              }
            }}
          >
            Testdaten laden
          </button>
          <button onClick={() => exportiere(zustand)}>Sichern</button>
          <button onClick={() => dateiRef.current?.click()}>Laden</button>
          <input
            ref={dateiRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const datei = e.target.files?.[0];
              if (datei) importiere(datei);
              e.target.value = '';
            }}
          />
        </div>
      </header>
      {meldung && (
        <p className="meldung" role="status">
          {meldung}
        </p>
      )}
      {DEMO && (
        <p className="hinweis">
          Demo mit simulierten Meldungen von 9 erfundenen Vereinen. Änderungen werden nicht gespeichert.
        </p>
      )}
      <p className="hinweis" hidden={DEMO}>
        Die Daten liegen nur in diesem Browser. Mit „Sichern“ speichern Sie eine Datei als Kopie. Die
        Vorschläge ersetzen nicht die Prüfung durch Veranstalter und Supervisor.
      </p>
      <nav className="tabs">
        <button className={tab === 'boxer' ? 'aktiv' : ''} onClick={() => setTab('boxer')}>
          Boxer ({zustand.boxer.length})
        </button>
        <button className={tab === 'kampfkarte' ? 'aktiv' : ''} onClick={() => setTab('kampfkarte')}>
          Kampfkarte ({zustand.kampfkarte.length})
        </button>
      </nav>
      {tab === 'boxer' ? (
        <BoxerTab zustand={zustand} setZustand={setZustand} />
      ) : (
        <KampfkarteTab zustand={zustand} setZustand={setZustand} />
      )}
    </div>
  );
}
