import { useEffect, useState } from 'react';
import type { Zustand } from '../speicher';
import { bestaetige } from '../umgebung';
import { ladeSicherung, ladeSicherungen, legeSicherungAn, type Sicherung } from './cloud';

function zeit(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

/** Frühere Stände der Veranstaltung: werden automatisch abgelegt (höchstens alle 10 Minuten) oder mit „Jetzt sichern“. */
export function Sicherungen({
  userId,
  aktuell,
  stelleHer,
  schliessen,
}: {
  userId: string;
  aktuell: Zustand;
  stelleHer: (z: Zustand) => void;
  schliessen: () => void;
}) {
  const [liste, setListe] = useState<Sicherung[] | null>(null);
  const [meldung, setMeldung] = useState('');
  const [fehler, setFehler] = useState('');
  const [arbeitet, setArbeitet] = useState(false);

  const lade = () => ladeSicherungen().then(setListe, () => setFehler('Die Sicherungen konnten nicht geladen werden.'));
  useEffect(() => {
    void lade();
  }, []);

  async function jetztSichern() {
    setArbeitet(true);
    setFehler('');
    try {
      await legeSicherungAn(userId, aktuell);
      setMeldung('Sicherung angelegt.');
      await lade();
    } catch {
      setFehler('Die Sicherung konnte nicht angelegt werden.');
    } finally {
      setArbeitet(false);
    }
  }

  async function wiederherstellen(s: Sicherung) {
    if (
      !bestaetige(
        `Stand vom ${zeit(s.erstellt)} (${s.boxer} Boxer, ${s.kaempfe} Kämpfe) wiederherstellen? Der jetzige Stand wird vorher als Sicherung abgelegt.`,
      )
    ) {
      return;
    }
    setArbeitet(true);
    setFehler('');
    try {
      const alt = await ladeSicherung(s.id);
      await legeSicherungAn(userId, aktuell);
      stelleHer(alt);
      setMeldung(`Stand vom ${zeit(s.erstellt)} wiederhergestellt.`);
      await lade();
    } catch {
      setFehler('Wiederherstellen hat nicht geklappt. Der jetzige Stand ist unverändert.');
    } finally {
      setArbeitet(false);
    }
  }

  return (
    <section className="sicherungen">
      <div className="aktionen">
        <h2>Sicherungen</h2>
        <button onClick={() => void jetztSichern()} disabled={arbeitet}>Jetzt sichern</button>
        <button onClick={schliessen}>Schließen</button>
      </div>
      <p className="hinweis">
        Frühere Stände werden bei Änderungen automatisch abgelegt, höchstens alle 10 Minuten. Die letzten 50 werden angezeigt.
      </p>
      {meldung && <p className="meldung" role="status">{meldung}</p>}
      {fehler && <p className="fehler" role="alert">{fehler}</p>}
      {liste === null ? (
        <p className="hinweis">Wird geladen …</p>
      ) : liste.length === 0 ? (
        <p className="leer">Noch keine Sicherungen.</p>
      ) : (
        <table className="adminliste">
          <thead>
            <tr><th>Zeitpunkt</th><th>Art</th><th>Boxer</th><th>Kämpfe</th><th /></tr>
          </thead>
          <tbody>
            {liste.map((s) => (
              <tr key={s.id}>
                <td>{zeit(s.erstellt)}</td>
                <td>{s.manuell ? 'von Hand' : 'automatisch'}</td>
                <td>{s.boxer}</td>
                <td>{s.kaempfe}</td>
                <td><button onClick={() => void wiederherstellen(s)} disabled={arbeitet}>Wiederherstellen</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
