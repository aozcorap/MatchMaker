import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { App } from './App';
import { Anmeldung, NeuesPasswort } from './konto/Anmeldung';
import { supabase } from './konto/client';
import { istAdmin, ladeAlle, ladeVeranstaltung, legeAn, loescheVeranstaltung, type Gespeichert, type Uebersicht } from './konto/cloud';
import { heute, laden, leererZustand, liesZustand, type Zustand } from './speicher';
import { bestaetige, DEMO } from './umgebung';

const LOKAL = 'matchmaker-v1';

/** Daten, die vor der Anmeldung in diesem Browser gespeichert wurden. */
function lokaleDaten(): Zustand | null {
  try {
    const text = localStorage.getItem(LOKAL);
    const z = text ? liesZustand(JSON.parse(text)) : null;
    return z && (z.boxer.length > 0 || z.kampfkarte.length > 0) ? z : null;
  } catch {
    return null;
  }
}

export function Wurzel() {
  if (DEMO) return <App start={laden()} />;
  return <MitKonto />;
}

type Ansicht = { art: 'eigene' } | { art: 'uebersicht' } | { art: 'fremde'; eintrag: Uebersicht };

function MitKonto() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [neuesPasswort, setNeuesPasswort] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((ereignis, s) => {
      if (ereignis === 'PASSWORD_RECOVERY') setNeuesPasswort(true);
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="seite"><p className="hinweis">Wird geladen …</p></div>;
  if (!session) return <Anmeldung />;
  if (neuesPasswort) return <NeuesPasswort fertig={() => setNeuesPasswort(false)} />;
  return <Angemeldet key={session.user.id} userId={session.user.id} email={session.user.email ?? ''} />;
}

function Angemeldet({ userId, email }: { userId: string; email: string }) {
  const [daten, setDaten] = useState<Gespeichert | null>(null);
  const [fehler, setFehler] = useState('');
  const [admin, setAdmin] = useState(false);
  const [ansicht, setAnsicht] = useState<Ansicht>({ art: 'eigene' });
  const [liste, setListe] = useState<Uebersicht[] | null>(null);
  const [listenFehler, setListenFehler] = useState('');

  const lade = useCallback(async () => {
    setFehler('');
    try {
      let g = await ladeVeranstaltung(userId);
      if (!g) {
        let start = leererZustand();
        let uebernommen = false;
        const lokal = lokaleDaten();
        if (lokal && bestaetige(`In diesem Browser liegen noch ${lokal.boxer.length} Boxer aus der Zeit vor der Anmeldung. In Ihr Konto übernehmen?`)) {
          start = lokal;
          uebernommen = true;
        }
        try {
          const version = await legeAn(userId, start);
          g = { zustand: start, version };
          if (uebernommen) {
            try {
              localStorage.removeItem(LOKAL);
            } catch {
              // egal
            }
          }
        } catch {
          // Gleichzeitig angelegt (z. B. in einem zweiten Fenster): vorhandene laden
          g = await ladeVeranstaltung(userId);
          if (!g) throw new Error('Anlegen fehlgeschlagen');
        }
      }
      setDaten(g);
    } catch {
      setFehler('Ihre Veranstaltung konnte nicht geladen werden. Bitte Verbindung prüfen und neu versuchen.');
    }
  }, [userId]);

  useEffect(() => {
    void lade();
    void istAdmin().then(setAdmin);
  }, [lade]);

  useEffect(() => {
    if (ansicht.art === 'uebersicht') {
      setListe(null);
      ladeAlle().then(setListe, () => setListe([]));
    }
  }, [ansicht]);

  async function loesche(e: Uebersicht) {
    const datum = e.zustand.datum.split('-').reverse().join('.');
    setListenFehler('');
    if (
      !bestaetige(
        `Veranstaltung von ${e.email} (${datum}, ${e.zustand.boxer.length} Boxer, ${e.zustand.kampfkarte.length} Kämpfe) mit allen Boxern, Kämpfen und Sicherungen endgültig löschen? Das Konto (E-Mail und Anmeldung) bleibt bestehen und startet leer.`,
      )
    ) {
      return;
    }
    try {
      await loescheVeranstaltung(e.userId);
      setListe((alt) => alt?.map((x) => (x.userId === e.userId ? { ...x, aktualisiert: new Date().toISOString(), zustand: leererZustand() } : x)) ?? null);
      if (e.userId === userId) {
        setDaten(null);
        void lade();
      }
    } catch {
      setListenFehler('Löschen hat nicht geklappt.');
    }
  }

  async function abmelden() {
    await supabase.auth.signOut();
  }

  const leiste = (status: React.ReactNode) => (
    <div className="kontoleiste">
      <span>
        Angemeldet als {email}
        {admin && ' (Admin)'}
      </span>
      <span className="aktionen">
        {status}
        {admin && ansicht.art === 'eigene' && <button onClick={() => setAnsicht({ art: 'uebersicht' })}>Alle Veranstaltungen</button>}
        {admin && ansicht.art !== 'eigene' && <button onClick={() => setAnsicht({ art: 'eigene' })}>Meine Veranstaltung</button>}
        {ansicht.art === 'fremde' && <button onClick={() => setAnsicht({ art: 'uebersicht' })}>Zur Übersicht</button>}
        <button onClick={() => void abmelden()}>Abmelden</button>
      </span>
    </div>
  );

  if (fehler) {
    return (
      <div className="seite">
        {leiste(null)}
        <p className="fehler" role="alert">{fehler}</p>
        <button onClick={() => void lade()}>Erneut versuchen</button>
      </div>
    );
  }
  if (!daten) return <div className="seite"><p className="hinweis">Veranstaltung wird geladen …</p></div>;

  if (ansicht.art === 'uebersicht') {
    return (
      <div className="seite">
        {leiste(null)}
        <h2>Alle Veranstaltungen</h2>
        {listenFehler && <p className="fehler" role="alert">{listenFehler}</p>}
        {liste === null ? (
          <p className="hinweis">Wird geladen …</p>
        ) : liste.length === 0 ? (
          <p className="leer">Noch keine Veranstaltungen.</p>
        ) : (
          <table className="adminliste">
            <thead>
              <tr>
                <th>Veranstalter (E-Mail)</th>
                <th>Datum</th>
                <th>Boxer</th>
                <th>Kämpfe</th>
                <th>Zuletzt geändert</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {liste.map((e) => (
                <tr key={e.userId}>
                  <td>{e.email}</td>
                  <td>
                    {e.zustand.datum.split('-').reverse().join('.')}
                    {e.zustand.datum < heute() && <span className="hinweis"> (vorbei)</span>}
                  </td>
                  <td>{e.zustand.boxer.length}</td>
                  <td>{e.zustand.kampfkarte.length}</td>
                  <td>{new Date(e.aktualisiert).toLocaleString('de-DE')}</td>
                  <td>
                    <button onClick={() => setAnsicht({ art: 'fremde', eintrag: e })}>Ansehen</button>{' '}
                    <button onClick={() => void loesche(e)}>Löschen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  if (ansicht.art === 'fremde') {
    return (
      <App
        key={`${ansicht.eintrag.userId}-${ansicht.eintrag.aktualisiert}`}
        start={ansicht.eintrag.zustand}
        nurLesen
        kontoLeiste={(s) => leiste(s)}
      />
    );
  }

  return <App key="eigene" start={daten.zustand} userId={userId} startVersion={daten.version} testdaten={admin} kontoLeiste={leiste} />;
}
