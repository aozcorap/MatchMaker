import { useState, type FormEvent } from 'react';
import { supabase } from './client';

type Modus = 'anmelden' | 'registrieren' | 'vergessen';

const MIN_PASSWORT = 8;

function umleitung(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

function fehlertext(meldung: string): string {
  const m = meldung.toLowerCase();
  if (m.includes('invalid login')) return 'E-Mail-Adresse oder Passwort stimmt nicht.';
  if (m.includes('email not confirmed')) return 'Die E-Mail-Adresse ist noch nicht bestätigt. Bitte den Link in der E-Mail anklicken.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Diese E-Mail-Adresse ist schon registriert. Bitte anmelden oder „Passwort vergessen“ nutzen.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Zu viele Versuche. Bitte ein paar Minuten warten.';
  if (m.includes('password')) return `Das Passwort ist zu schwach oder zu kurz (mindestens ${MIN_PASSWORT} Zeichen).`;
  return `Das hat nicht geklappt: ${meldung}`;
}

export function Anmeldung({ hinweis = '' }: { hinweis?: string }) {
  const [modus, setModus] = useState<Modus>('anmelden');
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState('');
  const [info, setInfo] = useState('');
  const [datenschutz, setDatenschutz] = useState(false);

  function wechsle(m: Modus) {
    setModus(m);
    setFehler('');
    setInfo('');
  }

  async function senden(e: FormEvent) {
    e.preventDefault();
    setFehler('');
    setInfo('');
    if (modus !== 'vergessen' && passwort.length < MIN_PASSWORT) {
      setFehler(`Das Passwort braucht mindestens ${MIN_PASSWORT} Zeichen.`);
      return;
    }
    if (modus === 'registrieren' && !datenschutz) {
      setFehler('Bitte bestätigen, dass Sie die Datenschutzerklärung gelesen haben.');
      return;
    }
    setLaeuft(true);
    try {
      if (modus === 'anmelden') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: passwort });
        if (error) setFehler(fehlertext(error.message));
      } else if (modus === 'registrieren') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: passwort,
          options: { emailRedirectTo: umleitung() },
        });
        if (error) setFehler(fehlertext(error.message));
        else if (!data.session) setInfo('Fast geschafft: Wir haben Ihnen eine E-Mail geschickt. Bitte den Link darin anklicken, danach können Sie sich anmelden.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: umleitung() });
        if (error) setFehler(fehlertext(error.message));
        else setInfo('Wenn es zu dieser Adresse ein Konto gibt, ist eine E-Mail mit einem Link zum Zurücksetzen unterwegs.');
      }
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="seite anmeldung">
      <h1>Matchmaking Boxen</h1>
      {hinweis && <p className="meldung" role="status">{hinweis}</p>}
      <p className="hinweis">Prototyp in der Testphase: Bitte nur erfundene Namen und Daten eingeben, keine echten Boxer.</p>
      <form className="anmeldekarte" onSubmit={senden}>
        <h2>{modus === 'anmelden' ? 'Anmelden' : modus === 'registrieren' ? 'Registrieren' : 'Passwort vergessen'}</h2>
        <label>
          E-Mail-Adresse
          <input id="konto-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {modus !== 'vergessen' && (
          <label>
            Passwort
            <input
              id="konto-passwort"
              type="password"
              autoComplete={modus === 'anmelden' ? 'current-password' : 'new-password'}
              required
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
            />
          </label>
        )}
        {modus === 'registrieren' && (
          <label className="zustimmung">
            <input type="checkbox" checked={datenschutz} onChange={(e) => setDatenschutz(e.target.checked)} />
            <span>
              Ich habe die <a href="#/datenschutz">Datenschutzerklärung</a> gelesen.
            </span>
          </label>
        )}
        {fehler && <p className="fehler" role="alert">{fehler}</p>}
        {info && <p className="meldung" role="status">{info}</p>}
        <button className="primaer" type="submit" disabled={laeuft}>
          {modus === 'anmelden' ? 'Anmelden' : modus === 'registrieren' ? 'Konto anlegen' : 'Link zum Zurücksetzen senden'}
        </button>
        <p className="anmelde-links">
          {modus !== 'anmelden' && <button type="button" className="link" onClick={() => wechsle('anmelden')}>Zur Anmeldung</button>}
          {modus === 'anmelden' && <button type="button" className="link" onClick={() => wechsle('registrieren')}>Neu registrieren</button>}
          {modus === 'anmelden' && <button type="button" className="link" onClick={() => wechsle('vergessen')}>Passwort vergessen?</button>}
        </p>
      </form>
    </div>
  );
}

/** Nach dem Klick auf den Link in der E-Mail "Passwort vergessen": neues Passwort festlegen. */
export function NeuesPasswort({ fertig }: { fertig: () => void }) {
  const [passwort, setPasswort] = useState('');
  const [fehler, setFehler] = useState('');
  const [laeuft, setLaeuft] = useState(false);

  async function senden(e: FormEvent) {
    e.preventDefault();
    if (passwort.length < MIN_PASSWORT) {
      setFehler(`Das Passwort braucht mindestens ${MIN_PASSWORT} Zeichen.`);
      return;
    }
    setLaeuft(true);
    const { error } = await supabase.auth.updateUser({ password: passwort });
    setLaeuft(false);
    if (error) setFehler(fehlertext(error.message));
    else fertig();
  }

  return (
    <div className="seite anmeldung">
      <h1>Matchmaking Boxen</h1>
      <form className="anmeldekarte" onSubmit={senden}>
        <h2>Neues Passwort festlegen</h2>
        <label>
          Neues Passwort
          <input id="konto-neu" type="password" autoComplete="new-password" required value={passwort} onChange={(e) => setPasswort(e.target.value)} />
        </label>
        {fehler && <p className="fehler" role="alert">{fehler}</p>}
        <button className="primaer" type="submit" disabled={laeuft}>Passwort speichern</button>
      </form>
    </div>
  );
}
