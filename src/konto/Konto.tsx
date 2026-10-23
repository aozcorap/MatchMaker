import { useState } from 'react';
import { bestaetige } from '../umgebung';
import { leereMeineVeranstaltung, loescheMeinKonto } from './cloud';

const BESTAETIGUNGSWORT = 'LÖSCHEN';

/** Eigene Daten selbst löschen: Veranstaltung leeren oder das ganze Konto entfernen. */
export function KontoSeite(props: { admin: boolean; veranstaltungGeleert: () => void; kontoGeloescht: () => void }) {
  const { admin, veranstaltungGeleert, kontoGeloescht } = props;
  const [wort, setWort] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState('');
  const [info, setInfo] = useState('');

  async function leere() {
    if (!bestaetige('Alle Boxer, Kampfpaarungen und Sicherungen Ihrer Veranstaltung endgültig löschen? Ihr Konto bleibt bestehen.')) return;
    setFehler('');
    setInfo('');
    setLaeuft(true);
    try {
      await leereMeineVeranstaltung();
      veranstaltungGeleert();
      setInfo('Ihre Veranstaltung ist geleert.');
    } catch {
      setFehler('Das Leeren hat nicht geklappt. Bitte Verbindung prüfen und neu versuchen.');
    } finally {
      setLaeuft(false);
    }
  }

  async function loescheKonto() {
    setFehler('');
    setInfo('');
    setLaeuft(true);
    try {
      await loescheMeinKonto();
      kontoGeloescht();
    } catch {
      setFehler('Das Löschen hat nicht geklappt. Bitte Verbindung prüfen und neu versuchen, oder per E-Mail melden.');
      setLaeuft(false);
    }
  }

  return (
    <div className="kontoseite">
      <h2>Konto und Daten</h2>
      {fehler && <p className="fehler" role="alert">{fehler}</p>}
      {info && <p className="meldung" role="status">{info}</p>}

      <section className="anmeldekarte">
        <h2>Veranstaltung leeren</h2>
        <p>Löscht alle Boxer, Kampfpaarungen, Ausfälle und Sicherungen. Ihr Konto bleibt bestehen und startet leer.</p>
        <div>
          <button className="gefahr" disabled={laeuft} onClick={() => void leere()}>
            Veranstaltung leeren
          </button>
        </div>
      </section>

      <section className="anmeldekarte">
        <h2>Konto löschen</h2>
        {admin ? (
          <p>Das Admin-Konto kann hier nicht gelöscht werden.</p>
        ) : (
          <>
            <p>
              Löscht Ihr Konto, Ihre Veranstaltung und alle Sicherungen endgültig. Das kann nicht rückgängig gemacht werden. Zur Bestätigung bitte{' '}
              <strong>{BESTAETIGUNGSWORT}</strong> eingeben.
            </p>
            <label>
              Bestätigung
              <input value={wort} onChange={(e) => setWort(e.target.value)} autoComplete="off" />
            </label>
            <div>
              <button className="gefahr" disabled={laeuft || wort.trim() !== BESTAETIGUNGSWORT} onClick={() => void loescheKonto()}>
                Konto endgültig löschen
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
