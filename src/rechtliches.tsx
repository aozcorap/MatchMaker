import { useEffect, useState } from 'react';

/** Angaben zum Betreiber (Impressum und Datenschutzerklärung). */
export const BETREIBER = {
  name: 'Ahmet Özcorapci',
  anschrift: ['Hospitalgasse 36d', '61169 Friedberg'],
  email: 'ahmet@ozcorapci.de',
};

export type Rechtsseite = 'impressum' | 'datenschutz';

function leseHash(): Rechtsseite | null {
  const h = window.location.hash;
  if (h === '#/impressum') return 'impressum';
  if (h === '#/datenschutz') return 'datenschutz';
  return null;
}

/** Welche Rechtsseite gerade angezeigt werden soll (über die Adresse, damit Links auch vor der Anmeldung gehen). */
export function useRechtsseite(): Rechtsseite | null {
  const [seite, setSeite] = useState<Rechtsseite | null>(leseHash);
  useEffect(() => {
    const aktualisiere = () => {
      setSeite(leseHash());
      if (leseHash()) window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', aktualisiere);
    return () => window.removeEventListener('hashchange', aktualisiere);
  }, []);
  return seite;
}

export function Fuss() {
  return (
    <footer className="fuss">
      <a href="#/impressum">Impressum</a>
      <a href="#/datenschutz">Datenschutz</a>
    </footer>
  );
}

function Anschrift() {
  return (
    <>
      {BETREIBER.name}
      {BETREIBER.anschrift.map((zeile) => (
        <span key={zeile}>
          <br />
          {zeile}
        </span>
      ))}
    </>
  );
}

function Impressum() {
  return (
    <>
      <h1>Impressum</h1>
      <h2>Angaben nach § 5 DDG</h2>
      <p>
        <Anschrift />
      </p>
      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href={`mailto:${BETREIBER.email}`}>{BETREIBER.email}</a>
      </p>
      <h2>Hinweis</h2>
      <p>
        „Matchmaking Boxen“ ist ein Prototyp in der Testphase. Die Paarungsvorschläge sind ein Entwurf nach den DBV-Wettkampfbestimmungen 2025 und ersetzen nicht die Entscheidung des Veranstalters. Für die Richtigkeit der
        eingegebenen Daten und der fertigen Kampfpaarungen ist der Veranstalter verantwortlich.
      </p>
    </>
  );
}

function Datenschutz() {
  return (
    <>
      <h1>Datenschutzerklärung</h1>
      <p className="hinweis">Stand: 22.10.2026</p>

      <h2>Prototyp: bitte nur erfundene Daten</h2>
      <p>
        Diese Seite ist ein Prototyp und wird nur mit einem kleinen Kreis von Testpersonen erprobt. Bitte geben Sie in der Testphase ausschließlich erfundene Namen und Daten ein, keine echten Boxer, insbesondere keine Daten
        Minderjähriger. Eine Vereinbarung zur Auftragsverarbeitung (siehe unten) liegt noch nicht vor.
      </p>

      <h2>Verantwortlicher</h2>
      <p>
        <Anschrift />
        <br />
        E-Mail: <a href={`mailto:${BETREIBER.email}`}>{BETREIBER.email}</a>
      </p>

      <h2>Wer ist wofür verantwortlich?</h2>
      <p>
        Für die Daten Ihres Kontos (E-Mail-Adresse, Anmeldung) ist der oben genannte Betreiber verantwortlich. Die Daten der Boxer, die ein Veranstalter eingibt, sind Daten des Veranstalters: Er entscheidet, welche Daten er
        eingibt, und muss selbst sicherstellen, dass er dazu berechtigt ist, auch gegenüber den Boxern, Trainern und bei Minderjährigen den Erziehungsberechtigten. Der Betreiber verarbeitet diese Daten nur, um die Seite
        bereitzustellen, und für den Echtbetrieb ist dafür eine Vereinbarung zur Auftragsverarbeitung (Art. 28 DSGVO) vorgesehen.
      </p>

      <h2>Welche Daten werden verarbeitet?</h2>
      <ul>
        <li>
          <strong>Konto:</strong> E-Mail-Adresse und Passwort. Das Passwort wird nicht im Klartext gespeichert. Für die Bestätigungs- und Passwort-zurücksetzen-E-Mails wird Ihre Adresse an den E-Mail-Versand des
          Anbieters weitergegeben.
        </li>
        <li>
          <strong>Veranstaltung:</strong> Von den Boxern Name, Verein, Geburtsdatum, Geschlecht, Gewicht und Kampfbilanz, dazu die Kampfpaarungen, Ausfälle, Einstellungen und Pausen.
        </li>
        <li>
          <strong>Sicherungen:</strong> Frühere Stände Ihrer Veranstaltung, damit Sie sie wiederherstellen können.
        </li>
        <li>
          <strong>Technische Daten:</strong> Beim Aufruf der Seite wird Ihre IP-Adresse an den Hosting-Anbieter übertragen (siehe unten).
        </li>
      </ul>
      <p>Dateien und Screenshots, die Sie importieren, werden direkt in Ihrem Browser gelesen. Die Texterkennung läuft lokal, die Bilder verlassen Ihren Rechner nicht.</p>

      <h2>Wozu und auf welcher Grundlage?</h2>
      <p>
        Zur Bereitstellung der Seite und Ihres Kontos (Art. 6 Abs. 1 lit. b DSGVO) und zur sicheren und stabilen Bereitstellung des Dienstes (Art. 6 Abs. 1 lit. f DSGVO). Die Daten der Boxer verarbeitet der Betreiber im
        Auftrag des Veranstalters.
      </p>

      <h2>Wer hat Zugriff?</h2>
      <p>
        Der Betreiber kann zur Wartung alle Veranstaltungen einsehen und löschen. Andere Veranstalter sehen Ihre Daten nicht. Die Zugriffsregeln der Datenbank beschränken jedes Konto auf die eigenen Daten.
      </p>

      <h2>Dienstleister</h2>
      <ul>
        <li>
          <strong>Datenbank, Anmeldung und E-Mail-Versand:</strong> Supabase. Die Datenbank liegt in der Region Frankfurt (EU). Der Anbieter hat seinen Sitz in den USA; es kann ein Zugriff aus den USA nicht ausgeschlossen werden.
        </li>
        <li>
          <strong>Hosting der Webseite:</strong> GitHub Pages (GitHub, USA). Beim Aufruf der Seite wird Ihre IP-Adresse an GitHub übertragen. Weitere Informationen finden Sie in der Datenschutzerklärung von GitHub.
        </li>
      </ul>
      <p>Es werden keine Werbe- oder Analysedienste eingesetzt und keine Tracking-Cookies gesetzt.</p>

      <h2>Speicher im Browser</h2>
      <p>
        Die Seite nutzt den lokalen Speicher Ihres Browsers, um Ihre Anmeldung zu halten und Daten zwischenzuspeichern. Das ist für den Betrieb notwendig. Über die Einstellungen Ihres Browsers können Sie ihn löschen.
      </p>

      <h2>Speicherdauer und Löschung</h2>
      <p>
        Die Daten bleiben gespeichert, bis die Veranstaltung samt Sicherungen gelöscht wird. Sie können die Löschung Ihrer Veranstaltung und Ihres Kontos jederzeit per E-Mail verlangen.
      </p>

      <h2>Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Außerdem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren. Schreiben
        Sie dazu an die oben genannte E-Mail-Adresse.
      </p>
    </>
  );
}

export function Rechtliches({ seite }: { seite: Rechtsseite }) {
  return (
    <div className="seite rechtstext">
      <p>
        <a href="#/">← Zurück</a>
      </p>
      {seite === 'impressum' ? <Impressum /> : <Datenschutz />}
      <Fuss />
    </div>
  );
}
