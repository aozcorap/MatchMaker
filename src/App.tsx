import { useCallback, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { richtePausenAus } from './ablauf';
import { BoxerTab } from './BoxerTab';
import { KEIN_FILTER, type Filter } from './filter';
import { ImportTab } from './ImportTab';
import { KampfkarteTab } from './KampfkarteTab';
import { Sicherungen } from './konto/Sicherungen';
import { useCloud } from './konto/useCloud';
import { exportiere, liesZustand, speichern, type Zustand } from './speicher';
import { simulation } from './testdaten';
import { bestaetige, DEMO } from './umgebung';

type Tab = 'boxer' | 'kampfkarte' | 'import';

interface Props {
  start: Zustand;
  /** Angemeldeter Nutzer: Änderungen werden in der Datenbank gespeichert statt im Browser */
  userId?: string | null;
  startVersion?: number;
  /** Ansicht einer fremden Veranstaltung (Admin): nichts ist änderbar, nichts wird gespeichert */
  nurLesen?: boolean;
  /** Testdaten-Knopf auch mit Konto zeigen (nur Admin) */
  testdaten?: boolean;
  /** Leiste mit Konto-Angaben; bekommt die Anzeige des Speicherstands */
  kontoLeiste?: (speicherstand: ReactNode) => ReactNode;
}

export function App({ start, userId = null, startVersion = 1, nurLesen = false, testdaten = false, kontoLeiste }: Props) {
  const [zustand, setRohZustand] = useState<Zustand>(start);
  // Jede Änderung hält die eigenen Pausen an ihrem Kampf fest (siehe richtePausenAus)
  const setZustand: Dispatch<SetStateAction<Zustand>> = useCallback(
    (neu) => setRohZustand((alt) => richtePausenAus(typeof neu === 'function' ? neu(alt) : neu)),
    [],
  );
  const cloudNutzer = nurLesen ? null : userId;
  const { status, erzwinge, konfliktGrund } = useCloud(zustand, cloudNutzer, startVersion);
  const [tab, setTab] = useState<Tab>('boxer');
  const [meldung, setMeldung] = useState('');
  const [sicherungenOffen, setSicherungenOffen] = useState(false);
  const [filter, setFilter] = useState<Filter>(KEIN_FILTER);
  const dateiRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId && !nurLesen) speichern(zustand);
  }, [zustand, userId, nurLesen]);

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

  const speicherstand = cloudNutzer ? (
    <span className={`speicherstatus ${status}`} role="status">
      {status === 'gespeichert' && '✓ Gespeichert'}
      {status === 'speichert' && 'Speichert …'}
      {status === 'fehler' && '⚠ Nicht gespeichert (keine Verbindung?) – es wird erneut versucht'}
      {status === 'konflikt' && (konfliktGrund === 'neuer' ? '⚠ Woanders wurde neuer gespeichert' : '⚠ Veranstaltung wurde zurückgesetzt')}
    </span>
  ) : null;

  return (
    <div className="seite">
      {kontoLeiste?.(speicherstand)}
      {status === 'konflikt' && cloudNutzer && (
        <p className="fehler" role="alert">
          {konfliktGrund === 'neuer'
            ? 'In einem anderen Fenster oder auf einem anderen Gerät wurde eine neuere Version gespeichert. Laden Sie die Seite neu, um sie zu sehen (Ihre letzten Änderungen hier gehen dann verloren), oder speichern Sie Ihre Version trotzdem.'
            : 'Diese Veranstaltung wurde vom Administrator geleert oder gelöscht. Wenn das nicht gewollt war, speichern Sie Ihre Version hier jetzt: Dann ist sie wiederhergestellt. Sonst laden Sie die Seite neu.'}{' '}
          <button onClick={() => window.location.reload()}>Neu laden</button>{' '}
          <button onClick={() => void erzwinge()}>Meine Version speichern</button>
        </p>
      )}
      {nurLesen && <p className="hinweis">Nur Ansicht: Diese Veranstaltung gehört einem anderen Konto und kann hier nicht geändert werden.</p>}
      <fieldset className="nurlesen" disabled={nurLesen}>
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
        <label className="datum">
          Beginn
          <input
            type="time"
            value={zustand.beginn}
            onChange={(e) => e.target.value && setZustand({ ...zustand, beginn: e.target.value })}
          />
        </label>
        <div className="aktionen" hidden={DEMO || (!!userId && !testdaten)}>
          <button
            onClick={() => {
              if (zustand.boxer.length === 0 || bestaetige('Alle Daten durch die Simulation ersetzen?')) {
                setZustand(simulation(false));
              }
            }}
          >
            Testdaten laden
          </button>
          {!userId && <button onClick={() => exportiere(zustand)}>Sichern</button>}
          {!userId && <button onClick={() => dateiRef.current?.click()}>Laden</button>}
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
      </fieldset>
      {userId && !nurLesen && (
        <div className="aktionen">
          <button onClick={() => setSicherungenOffen((o) => !o)}>Sicherungen</button>
        </div>
      )}
      {sicherungenOffen && userId && !nurLesen && (
        <Sicherungen
          userId={userId}
          aktuell={zustand}
          stelleHer={(z) => {
            setZustand(z);
            setFilter(KEIN_FILTER);
          }}
          schliessen={() => setSicherungenOffen(false)}
        />
      )}
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
        {userId
          ? 'Die Daten werden automatisch in Ihrem Konto gespeichert. '
          : 'Die Daten liegen nur in diesem Browser. Mit „Sichern“ speichern Sie eine Datei als Kopie. '}
        Die Vorschläge ersetzen nicht die Prüfung durch Veranstalter und Supervisor.
      </p>
      <nav className="tabs">
        <button className={tab === 'boxer' ? 'aktiv' : ''} onClick={() => setTab('boxer')}>
          Boxer ({zustand.boxer.length})
        </button>
        <button className={tab === 'kampfkarte' ? 'aktiv' : ''} onClick={() => setTab('kampfkarte')}>
          Kampfkarte ({zustand.kampfkarte.length})
        </button>
        <button className={tab === 'import' ? 'aktiv' : ''} onClick={() => setTab('import')}>
          Import
        </button>
      </nav>
      <fieldset className="nurlesen" disabled={nurLesen}>
      {tab === 'import' ? (
        <ImportTab
          zustand={zustand}
          setZustand={setZustand}
          onUebernommen={(n) => {
            setMeldung(`${n} ${n === 1 ? 'Boxer' : 'Boxer'} übernommen`);
            setTab('boxer');
          }}
        />
      ) : tab === 'boxer' ? (
        <BoxerTab zustand={zustand} setZustand={setZustand} filter={filter} setFilter={setFilter} />
      ) : (
        <KampfkarteTab zustand={zustand} setZustand={setZustand} filter={filter} setFilter={setFilter} />
      )}
      </fieldset>
    </div>
  );
}
